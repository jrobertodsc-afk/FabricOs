from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Annotated, Optional
import uuid
from datetime import datetime

from backend.app.core.database import get_db, set_tenant_id
from backend.app.models import models
from backend.app.schemas import schemas
from backend.app.api.deps import get_current_tenant_id

router = APIRouter(prefix="/api/financials", tags=["Financials"])

@router.post("/settlements", response_model=schemas.Settlement)
async def create_settlement(
    settlement_in: schemas.SettlementCreate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    
    # Fetch the order to get details
    query = select(models.ProductionOrder).where(
        models.ProductionOrder.id == settlement_in.order_id,
        models.ProductionOrder.tenant_id == tenant_id
    )
    result = await db.execute(query)
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Production order not found")
    
    if not order.partner_id:
        raise HTTPException(status_code=400, detail="Order is not assigned to a partner")

    total_amount = order.total_quantity * order.price_per_piece
    net_amount = total_amount - settlement_in.deductions
    
    new_settlement = models.Settlement(
        tenant_id=tenant_id,
        order_id=order.id,
        partner_id=order.partner_id,
        total_amount=total_amount,
        deductions=settlement_in.deductions,
        net_amount=net_amount,
        status="pendente"
    )
    
    db.add(new_settlement)
    await db.commit()
    await db.refresh(new_settlement)
    return new_settlement

@router.get("/settlements", response_model=List[schemas.Settlement])
async def list_settlements(
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    partner_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.Settlement).where(models.Settlement.tenant_id == tenant_id)
    if partner_id:
        query = query.where(models.Settlement.partner_id == partner_id)
    
    result = await db.execute(query)
    return result.scalars().all()
