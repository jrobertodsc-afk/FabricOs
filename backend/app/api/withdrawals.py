from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Annotated
import uuid
from datetime import datetime, timezone
from jose import jwt

from backend.app.core.database import get_db, set_tenant_id
from backend.app.models import models
from backend.app.schemas import schemas
from backend.app.api.deps import get_current_tenant_id, oauth2_scheme
from backend.app.core.auth import SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/api/withdrawals", tags=["Withdrawals"])


@router.get("/", response_model=schemas.PaginatedResponse[schemas.Withdrawal])
async def list_withdrawals(
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0, description="Número de registros a pular"),
    limit: int = Query(50, ge=1, le=200, description="Máximo de registros retornados"),
):
    await set_tenant_id(db, str(tenant_id))

    # Conta o total para a resposta paginada
    count_query = select(func.count()).where(models.Withdrawal.tenant_id == tenant_id)
    total: int = (await db.execute(count_query)).scalar_one()

    query = (
        select(models.Withdrawal)
        .options(selectinload(models.Withdrawal.items))
        .where(models.Withdrawal.tenant_id == tenant_id)
        .order_by(models.Withdrawal.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    items = result.scalars().all()

    return schemas.PaginatedResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit,
        has_more=(skip + limit) < total,
    )


@router.post("/", response_model=schemas.Withdrawal, status_code=status.HTTP_201_CREATED)
async def create_withdrawal(
    withdrawal_in: schemas.WithdrawalCreate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme),
):
    await set_tenant_id(db, str(tenant_id))

    now = datetime.now(timezone.utc)

    # 1. CHECK FOR OVERDUE ACERVO WITHDRAWALS TO AUTO-BLOCK & SUSPEND
    overdue_query = select(models.Withdrawal).where(
        models.Withdrawal.tenant_id == tenant_id,
        models.Withdrawal.expected_return < now,
        models.Withdrawal.status.in_(["pendente", "Pendente", "retirado", "atrasado"])
    )
    if withdrawal_in.partner_id:
        overdue_query = overdue_query.where(models.Withdrawal.partner_id == withdrawal_in.partner_id)
    elif withdrawal_in.employee_id:
        overdue_query = overdue_query.where(models.Withdrawal.employee_id == withdrawal_in.employee_id)
    else:
        overdue_query = None

    if overdue_query is not None:
        overdue_res = await db.execute(overdue_query)
        overdue_items = overdue_res.scalars().all()
        if overdue_items:
            # Auto-suspend partner or employee
            if withdrawal_in.partner_id:
                partner_query = select(models.Partner).where(models.Partner.id == withdrawal_in.partner_id)
                partner_res = await db.execute(partner_query)
                partner = partner_res.scalar_one_or_none()
                if partner and partner.status == "ATIVO":
                    partner.status = "SUSPENSO_ATRASO"
            elif withdrawal_in.employee_id:
                emp_query = select(models.Employee).where(models.Employee.id == withdrawal_in.employee_id)
                emp_res = await db.execute(emp_query)
                emp = emp_res.scalar_one_or_none()
                if emp and emp.status == "ATIVO":
                    emp.status = "SUSPENSO_ATRASO"
            await db.commit()

    # 2. VALIDATE STATUS AND LOCKS
    # Check Partner
    if withdrawal_in.partner_id:
        partner_query = select(models.Partner).where(
            models.Partner.id == withdrawal_in.partner_id,
            models.Partner.tenant_id == tenant_id
        )
        partner_res = await db.execute(partner_query)
        partner = partner_res.scalar_one_or_none()
        if partner and partner.status != "ATIVO":
            if withdrawal_in.override:
                # Validate admin role for override
                try:
                    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                    user_id = payload.get("sub")
                    user_query = select(models.User).where(models.User.id == uuid.UUID(user_id))
                    user_res = await db.execute(user_query)
                    user = user_res.scalar_one_or_none()
                    if not user or user.role not in ["admin", "manager"]:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail=f"Parceiro bloqueado ({partner.status}). Apenas admins podem liberar via override."
                        )
                except Exception as e:
                    if isinstance(e, HTTPException):
                        raise e
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Erro ao validar permissões de administrador para liberação manual."
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Operação bloqueada. Parceiro com status suspenso ({partner.status}) devido a atraso ou sinistro."
                )

    # Check Employee
    if withdrawal_in.employee_id:
        emp_query = select(models.Employee).where(
            models.Employee.id == withdrawal_in.employee_id,
            models.Employee.tenant_id == tenant_id
        )
        emp_res = await db.execute(emp_query)
        employee = emp_res.scalar_one_or_none()
        if employee and employee.status != "ATIVO":
            if withdrawal_in.override:
                # Validate admin role for override
                try:
                    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                    user_id = payload.get("sub")
                    user_query = select(models.User).where(models.User.id == uuid.UUID(user_id))
                    user_res = await db.execute(user_query)
                    user = user_res.scalar_one_or_none()
                    if not user or user.role not in ["admin", "manager"]:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail=f"Colaborador bloqueado ({employee.status}). Apenas admins podem liberar via override."
                        )
                except Exception as e:
                    if isinstance(e, HTTPException):
                        raise e
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Erro ao validar permissões de administrador para liberação manual."
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Operação bloqueada. Colaborador com status suspenso ({employee.status}) devido a atraso ou sinistro."
                )

    # Busca max seq_id
    max_seq_query = select(func.max(models.Withdrawal.seq_id)).where(models.Withdrawal.tenant_id == tenant_id)
    max_seq = (await db.execute(max_seq_query)).scalar() or 0
    new_seq_id = max_seq + 1
    new_tracking = f"RET-{new_seq_id:04d}"

    # Determine custody details if override or confirmed
    custody_confirmed = True if withdrawal_in.override else False
    custody_confirmed_by = "Admin Override" if withdrawal_in.override else None

    # Retrieve replacement cost reference from products if possible
    replacement_cost = 0.0
    if withdrawal_in.items:
        # Just grab the first item's product standard cost as an approximate reference if showroom is simulated
        pass

    new_withdrawal = models.Withdrawal(
        tenant_id=tenant_id,
        partner_id=withdrawal_in.partner_id,
        employee_id=withdrawal_in.employee_id,
        item_name=withdrawal_in.item_name,
        person_name=withdrawal_in.person_name,
        phone_number=withdrawal_in.phone_number,
        reason=withdrawal_in.reason,
        type=withdrawal_in.type,
        destination=withdrawal_in.destination,
        expected_return=withdrawal_in.expected_return,
        notes=withdrawal_in.notes,
        photo_urls=withdrawal_in.photo_urls,
        signature_url=withdrawal_in.signature_url,
        seq_id=new_seq_id,
        tracking_code=new_tracking,
        custody_confirmed=custody_confirmed,
        custody_confirmed_by=custody_confirmed_by,
        replacement_cost_agreed=replacement_cost,
        status="Pendente",
        items=[]
    )

    for item in withdrawal_in.items:
        new_withdrawal.items.append(models.WithdrawalItem(
            size=item.size,
            quantity=item.quantity,
        ))

    db.add(new_withdrawal)
    await db.commit()
    db.expunge_all()
    
    query = (
        select(models.Withdrawal)
        .options(selectinload(models.Withdrawal.items))
        .where(models.Withdrawal.id == new_withdrawal.id)
    )
    result = await db.execute(query)
    withdrawal_obj = result.scalar_one()
    return schemas.Withdrawal.model_validate(withdrawal_obj)


@router.put("/{withdrawal_id}/return", response_model=schemas.Withdrawal)
async def return_withdrawal(
    withdrawal_id: uuid.UUID,
    data: schemas.ReturnCreate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db),
):
    """Registra a devolução de uma retirada."""
    await set_tenant_id(db, str(tenant_id))
    query = (
        select(models.Withdrawal)
        .options(selectinload(models.Withdrawal.items))
        .where(
            models.Withdrawal.id == withdrawal_id,
            models.Withdrawal.tenant_id == tenant_id,
        )
    )
    result = await db.execute(query)
    withdrawal = result.scalar_one_or_none()

    if not withdrawal:
        raise HTTPException(status_code=404, detail="Retirada não encontrada")

    withdrawal.status = data.return_status
    if data.return_notes:
        withdrawal.notes = data.return_notes
    if data.return_photo_urls:
        withdrawal.return_photo_urls = data.return_photo_urls
    if data.return_signature_url:
        withdrawal.return_signature_url = data.return_signature_url

    await db.commit()
    db.expunge_all()
    
    query = (
        select(models.Withdrawal)
        .options(selectinload(models.Withdrawal.items))
        .where(models.Withdrawal.id == withdrawal_id)
    )
    result = await db.execute(query)
    withdrawal_obj = result.scalar_one()
    return schemas.Withdrawal.model_validate(withdrawal_obj)


@router.patch("/{withdrawal_id}", response_model=schemas.Withdrawal)
async def update_withdrawal(
    withdrawal_id: uuid.UUID,
    status_update: schemas.WithdrawalUpdate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db),
):
    await set_tenant_id(db, str(tenant_id))
    query = (
        select(models.Withdrawal)
        .options(selectinload(models.Withdrawal.items))
        .where(
            models.Withdrawal.id == withdrawal_id,
            models.Withdrawal.tenant_id == tenant_id,
        )
    )
    result = await db.execute(query)
    withdrawal = result.scalar_one_or_none()

    if not withdrawal:
        raise HTTPException(status_code=404, detail="Retirada não encontrada")

    # Atualiza apenas os campos enviados (PATCH parcial)
    update_data = status_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(withdrawal, field, value)

    await db.commit()
    db.expunge_all()
    
    query = (
        select(models.Withdrawal)
        .options(selectinload(models.Withdrawal.items))
        .where(models.Withdrawal.id == withdrawal_id)
    )
    result = await db.execute(query)
    withdrawal_obj = result.scalar_one()
    return schemas.Withdrawal.model_validate(withdrawal_obj)


@router.get("/track/{tracking_code}", response_model=schemas.Withdrawal)
async def track_withdrawal(
    tracking_code: str,
    db: AsyncSession = Depends(get_db),
):
    """Busca pública de retirada pelo código de rastreamento."""
    query = (
        select(models.Withdrawal)
        .options(selectinload(models.Withdrawal.items))
        .where(models.Withdrawal.tracking_code == tracking_code)
    )
    result = await db.execute(query)
    withdrawal = result.scalar_one_or_none()

    if not withdrawal:
        raise HTTPException(status_code=404, detail="Retirada não encontrada")

    return schemas.Withdrawal.model_validate(withdrawal)

@router.delete("/{withdrawal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_withdrawal(
    withdrawal_id: uuid.UUID,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.Withdrawal).where(
        models.Withdrawal.id == withdrawal_id,
        models.Withdrawal.tenant_id == tenant_id
    )
    result = await db.execute(query)
    withdrawal = result.scalar_one_or_none()
    
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Retirada não encontrada")
        
    await db.delete(withdrawal)
    await db.commit()


