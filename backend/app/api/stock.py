from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import joinedload
from typing import List, Annotated, Optional
import uuid
from backend.app.core.logger import logger

from backend.app.core.database import get_db, set_tenant_id
from backend.app.models import models
from backend.app.schemas import schemas
from backend.app.api.deps import get_current_tenant_id

router = APIRouter(prefix="/api/stock", tags=["Finished Stock"])

@router.get("/", response_model=List[schemas.FinishedStockItem])
async def list_stock(
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    stock_type: Optional[str] = None,
    product_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    filters = [models.FinishedStockItem.tenant_id == tenant_id]
    
    if stock_type:
        filters.append(models.FinishedStockItem.stock_type == stock_type)
    if product_id:
        filters.append(models.FinishedStockItem.product_id == product_id)
        
    query = (
        select(models.FinishedStockItem)
        .options(joinedload(models.FinishedStockItem.product))
        .where(*filters)
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/adjust", response_model=schemas.FinishedStockItem)
async def adjust_stock(
    movement_in: schemas.FinishedStockMovementCreate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    
    # 1. Verify product exists
    prod_query = select(models.Product).where(
        models.Product.id == movement_in.product_id,
        models.Product.tenant_id == tenant_id
    )
    prod_result = await db.execute(prod_query)
    product = prod_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    # Calculate total quantity for this movement
    total_qty = sum(int(qty) for qty in movement_in.quantity_grade.values())
    if movement_in.movement_type == "saida":
        total_qty = -total_qty  # Represent outputs as negative total in log, or keep positive and let calculation handle it
        
    # 2. Get or create FinishedStockItem
    stock_query = select(models.FinishedStockItem).where(
        models.FinishedStockItem.product_id == movement_in.product_id,
        models.FinishedStockItem.stock_type == movement_in.stock_type,
        models.FinishedStockItem.tenant_id == tenant_id
    )
    stock_result = await db.execute(stock_query)
    stock_item = stock_result.scalar_one_or_none()
    
    # Default sizes grade supporting PP, P, M, G, GG, U
    default_grade = {"PP": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "U": 0}
    
    if not stock_item:
        stock_item = models.FinishedStockItem(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            product_id=movement_in.product_id,
            stock_type=movement_in.stock_type,
            size_grade=default_grade.copy()
        )
        db.add(stock_item)
        
    # 3. Apply changes to size_grade
    current_grade = dict(stock_item.size_grade or default_grade)
    # Ensure all sizes are represented
    for size in default_grade:
        if size not in current_grade:
            current_grade[size] = 0
            
    for size, qty in movement_in.quantity_grade.items():
        qty_int = int(qty or 0)
        if movement_in.movement_type == "entrada":
            current_grade[size] = current_grade.get(size, 0) + qty_int
        else:
            current_grade[size] = current_grade.get(size, 0) - qty_int
            
    stock_item.size_grade = current_grade
    
    # 4. Save stock movement log
    movement = models.FinishedStockMovement(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        product_id=movement_in.product_id,
        stock_type=movement_in.stock_type,
        movement_type=movement_in.movement_type,
        quantity_grade=movement_in.quantity_grade,
        total_quantity=abs(total_qty),
        reference_op_id=movement_in.reference_op_id,
        description=movement_in.description
    )
    db.add(movement)
    
    try:
        await db.commit()
        # Reload with product relation loaded
        reload_query = (
            select(models.FinishedStockItem)
            .options(joinedload(models.FinishedStockItem.product))
            .where(models.FinishedStockItem.id == stock_item.id)
        )
        reload_res = await db.execute(reload_query)
        return reload_res.scalars().first()
    except Exception as e:
        logger.error(f"Error adjusting finished stock: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/movements", response_model=List[schemas.FinishedStockMovement])
async def list_movements(
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    stock_type: Optional[str] = None,
    product_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    filters = [models.FinishedStockMovement.tenant_id == tenant_id]
    
    if stock_type:
        filters.append(models.FinishedStockMovement.stock_type == stock_type)
    if product_id:
        filters.append(models.FinishedStockMovement.product_id == product_id)
        
    query = (
        select(models.FinishedStockMovement)
        .options(joinedload(models.FinishedStockMovement.product))
        .where(*filters)
        .order_by(desc(models.FinishedStockMovement.created_at))
    )
    result = await db.execute(query)
    return result.scalars().all()
