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

@router.patch("/settlements/{id}", response_model=schemas.Settlement)
async def update_settlement(
    id: uuid.UUID,
    settlement_in: schemas.SettlementUpdate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.Settlement).where(
        models.Settlement.id == id,
        models.Settlement.tenant_id == tenant_id
    )
    result = await db.execute(query)
    settlement = result.scalar_one_or_none()
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")
        
    update_data = settlement_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settlement, field, value)
        
    if "deductions" in update_data:
        settlement.net_amount = settlement.total_amount - settlement.deductions
        
    await db.commit()
    await db.refresh(settlement)
    return settlement

@router.get("/summary", response_model=schemas.FinancialSummary)
async def get_financial_summary(
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    
    query = select(models.Settlement).where(models.Settlement.tenant_id == tenant_id)
    result = await db.execute(query)
    settlements = result.scalars().all()
    
    total_payable = sum(s.net_amount for s in settlements if s.status.lower() == "pendente")
    total_paid = sum(s.net_amount for s in settlements if s.status.lower() == "pago")
    total_deductions = sum(s.deductions for s in settlements)
    
    return schemas.FinancialSummary(
        total_payable=total_payable,
        total_paid=total_paid,
        total_deductions=total_deductions
    )
