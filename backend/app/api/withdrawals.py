from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Annotated
import uuid

from backend.app.core.database import get_db, set_tenant_id
from backend.app.models import models
from backend.app.schemas import schemas
from backend.app.api.deps import get_current_tenant_id

router = APIRouter(prefix="/api/withdrawals", tags=["Withdrawals"])

@router.get("/", response_model=List[schemas.Withdrawal])
async def list_withdrawals(
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.Withdrawal).where(models.Withdrawal.tenant_id == tenant_id)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/", response_model=schemas.Withdrawal)
async def create_withdrawal(
    withdrawal_in: schemas.WithdrawalCreate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    
    # Create withdrawal
    new_withdrawal = models.Withdrawal(
        tenant_id=tenant_id,
        partner_id=withdrawal_in.partner_id,
        production_order_id=withdrawal_in.production_order_id,
        notes=withdrawal_in.notes,
        status="Pendente"
    )
    db.add(new_withdrawal)
    await db.flush() # Get ID
    
    # Add items
    for item in withdrawal_in.items:
        new_item = models.WithdrawalItem(
            withdrawal_id=new_withdrawal.id,
            size=item.size,
            quantity=item.quantity
        )
        db.add(new_item)
        
    await db.commit()
    await db.refresh(new_withdrawal)
    return new_withdrawal

@router.patch("/{withdrawal_id}", response_model=schemas.Withdrawal)
async def update_withdrawal_status(
    withdrawal_id: uuid.UUID,
    status_update: schemas.WithdrawalUpdate,
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
        raise HTTPException(status_code=404, detail="Withdrawal not found")
        
    withdrawal.status = status_update.status
    if status_update.notes:
        withdrawal.notes = status_update.notes
        
    await db.commit()
    await db.refresh(withdrawal)
    return withdrawal
