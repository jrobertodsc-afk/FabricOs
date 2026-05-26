from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Annotated
import uuid
from backend.app.core.logger import logger

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
        logger.error(f"Error creating partner: {e}")
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

@router.patch("/{id}", response_model=schemas.Partner)
async def update_partner(
    id: uuid.UUID,
    partner_in: schemas.PartnerUpdate,
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
    
    update_data = partner_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(partner, field, value)
        
    try:
        await db.commit()
        await db.refresh(partner)
        return partner
    except Exception as e:
        logger.error(f"Error updating partner: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_partner(
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
        
    partner.is_active = False # Soft delete
    
    try:
        await db.commit()
    except Exception as e:
        logger.error(f"Error deleting partner: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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


from pydantic import BaseModel

class PortalStageUpdate(BaseModel):
    stage: str

@router.post("/portal/{token}/orders/{order_id}/stage")
async def update_portal_order_stage(
    token: str,
    order_id: uuid.UUID,
    payload: PortalStageUpdate,
    db: AsyncSession = Depends(get_db)
):
    # Verify token
    partner_query = select(models.Partner).where(models.Partner.portal_token == token)
    partner_res = await db.execute(partner_query)
    partner = partner_res.scalar_one_or_none()
    if not partner:
        raise HTTPException(status_code=404, detail="Invalid token")
        
    # Fetch and verify order belongs to this partner
    order_query = select(models.ProductionOrder).where(
        models.ProductionOrder.id == order_id,
        models.ProductionOrder.partner_id == partner.id
    )
    order_res = await db.execute(order_query)
    order = order_res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found for this partner")
        
    # Update stage
    order.current_stage = payload.stage
    
    try:
        await db.commit()
        await db.refresh(order)
        return order
    except Exception as e:
        logger.error(f"Error updating portal order stage: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

