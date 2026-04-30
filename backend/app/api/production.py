from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Annotated
import uuid
from datetime import datetime

from backend.app.core.database import get_db, set_tenant_id
from backend.app.models import models
from backend.app.schemas import schemas
from backend.app.api.deps import get_current_tenant_id
from backend.app.core.logger import logger

router = APIRouter(prefix="/api/production", tags=["Production"])

@router.get("/stages", response_model=List[schemas.ProductionStage])
async def list_stages(
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.ProductionStage).where(
        models.ProductionStage.tenant_id == tenant_id
    ).order_by(models.ProductionStage.order)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/stages", response_model=schemas.ProductionStage)
async def create_stage(
    stage_in: schemas.ProductionStageCreate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    new_stage = models.ProductionStage(
        tenant_id=tenant_id,
        name=stage_in.name,
        order=stage_in.order
    )
    db.add(new_stage)
    await db.commit()
    await db.refresh(new_stage)
    return new_stage

@router.delete("/stages/{stage_id}")
async def delete_stage(
    stage_id: uuid.UUID,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.ProductionStage).where(
        models.ProductionStage.id == stage_id,
        models.ProductionStage.tenant_id == tenant_id
    )
    result = await db.execute(query)
    stage = result.scalar_one_or_none()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    await db.delete(stage)
    await db.commit()
    return {"message": "Stage deleted"}

@router.get("/orders", response_model=List[schemas.ProductionOrder])
async def list_orders(
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.ProductionOrder).where(
        models.ProductionOrder.tenant_id == tenant_id
    ).order_by(models.ProductionOrder.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/orders", response_model=schemas.ProductionOrder)
async def create_order(
    order_in: schemas.ProductionOrderCreate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    
    # Generate unique order number if not provided
    if not order_in.order_number:
        count_query = select(models.ProductionOrder).where(models.ProductionOrder.tenant_id == tenant_id)
        count_result = await db.execute(count_query)
        count = len(count_result.scalars().all())
        order_number = f"OP-{count + 1:04d}"
    else:
        order_number = order_in.order_number
        
    new_order = models.ProductionOrder(
        tenant_id=tenant_id,
        order_number=order_number,
        item_name=order_in.item_name,
        total_quantity=order_in.total_quantity,
        price_per_piece=order_in.price_per_piece,
        partner_id=order_in.partner_id,
        product_id=order_in.product_id,
        due_date=order_in.due_date,
        collection=order_in.collection,
        size_grade=order_in.size_grade,
        observations=order_in.observations,
        nf_number=order_in.nf_number,
        nf_date=order_in.nf_date
    )
    db.add(new_order)
    await db.flush() # Flush to get ID if needed, though not strictly needed here
    
    # Automatic Stock Reduction
    if order_in.product_id:
        product_query = select(models.Product).where(models.Product.id == order_in.product_id)
        prod_res = await db.execute(product_query)
        product = prod_res.scalar_one_or_none()
        
        if product:
            # Fetch materials for this product
            mat_query = select(models.ProductMaterial).where(models.ProductMaterial.product_id == product.id)
            mat_res = await db.execute(mat_query)
            product_materials = mat_res.scalars().all()
            
            for pm in product_materials:
                # Update material stock
                update_mat = update(models.Material).where(
                    models.Material.id == pm.material_id
                ).values(
                    stock_quantity = models.Material.stock_quantity - (pm.quantity * order_in.total_quantity)
                )
                await db.execute(update_mat)
                
    await db.commit()
    await db.refresh(new_order)
    return new_order

@router.post("/orders/{order_number}/scan", response_model=schemas.ProductionOrder)
async def scan_order(
    order_number: str,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.ProductionOrder).where(
        models.ProductionOrder.order_number == order_number,
        models.ProductionOrder.tenant_id == tenant_id
    )
    result = await db.execute(query)
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Fetch dynamic stages for this tenant
    stage_query = select(models.ProductionStage).where(
        models.ProductionStage.tenant_id == tenant_id
    ).order_by(models.ProductionStage.order)
    stage_result = await db.execute(stage_query)
    all_stages = stage_result.scalars().all()
    stage_names = [s.name for s in all_stages]
    
    if not stage_names:
        stage_names = ["Corte", "Costura", "Acabamento", "Finalizado"]
        
    try:
        current_index = stage_names.index(order.current_stage)
    except ValueError:
        current_index = -1
    
    if current_index < len(stage_names) - 1:
        next_stage = stage_names[current_index + 1]
        order.current_stage = next_stage
        await db.commit()
        await db.refresh(order)
        
        logger.info(f"QR Scan: OP {order_number} moved to {order.current_stage}", extra={
            "order_number": order_number,
            "new_stage": order.current_stage,
            "tenant_id": str(tenant_id)
        })
        
        return order
    else:
        raise HTTPException(status_code=400, detail="Order is already in the final stage")

@router.post("/orders/{order_id}/settle", response_model=schemas.Settlement)
async def create_settlement(
    order_id: uuid.UUID,
    settlement_in: schemas.SettlementCreate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.ProductionOrder).where(
        models.ProductionOrder.id == order_id,
        models.ProductionOrder.tenant_id == tenant_id
    )
    result = await db.execute(query)
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    total = order.total_quantity * order.price_per_piece
    
    new_settlement = models.Settlement(
        tenant_id=tenant_id,
        order_id=order.id,
        partner_id=order.partner_id,
        total_amount=total,
        deductions=settlement_in.deductions,
        net_amount=total - settlement_in.deductions,
        nf_number=order.nf_number,
        status="pendente"
    )
    db.add(new_settlement)
    
    order.status = "finalizado"
    await db.commit()
    await db.refresh(new_settlement)
    return new_settlement
