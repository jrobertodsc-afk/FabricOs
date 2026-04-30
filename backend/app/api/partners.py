from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Annotated
import uuid

from backend.app.core.database import get_db, set_tenant_id
from backend.app.models import models
from backend.app.schemas import schemas
from backend.app.api.deps import get_current_tenant_id

router = APIRouter(prefix="/api/partners", tags=["Partners"])

@router.get("/", response_model=List[schemas.Partner])
async def list_partners(
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.Partner).where(models.Partner.tenant_id == tenant_id)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/", response_model=schemas.Partner, status_code=status.HTTP_201_CREATED)
async def create_partner(
    partner_in: schemas.PartnerCreate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    try:
        new_partner = models.Partner(
            tenant_id=tenant_id,
            **partner_in.model_dump()
        )
        db.add(new_partner)
        await db.commit()
        await db.refresh(new_partner)
        return new_partner
    except Exception as e:
        print(f"DEBUG ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{id}", response_model=schemas.Partner)
async def get_partner(
    id: uuid.UUID,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.Partner).where(
        models.Partner.id == id, 
        models.Partner.tenant_id == tenant_id
    )
    result = await db.execute(query)
    partner = result.scalar_one_or_none()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    return partner

@router.get("/portal/{token}")
async def get_portal_data(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    # This is a public endpoint but restricted by the unique token
    query = select(models.Partner).where(models.Partner.portal_token == token)
    result = await db.execute(query)
    partner = result.scalar_one_or_none()
    
    if not partner:
        raise HTTPException(status_code=404, detail="Invalid token")
    
    # Fetch orders for this partner
    order_query = select(models.ProductionOrder).where(models.ProductionOrder.partner_id == partner.id)
    order_result = await db.execute(order_query)
    orders = order_result.scalars().all()
    
    # Fetch pending withdrawals for this partner
    with_query = select(models.Withdrawal).where(
        models.Withdrawal.partner_id == partner.id,
        models.Withdrawal.status == "pendente"
    )
    with_result = await db.execute(with_query)
    withdrawals = with_result.scalars().all()
    
    return {
        "partner": partner,
        "orders": orders,
        "withdrawals": withdrawals
    }
