from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Annotated
import uuid
from datetime import datetime, timezone
from backend.app.core.logger import logger

from backend.app.core.database import get_db, set_tenant_id
from backend.app.models import models
from backend.app.schemas import schemas
from backend.app.api.deps import get_current_tenant_id
from backend.app.core.license_middleware import verify_logistics_license

router = APIRouter(prefix="/api/distributions", tags=["Distributions (Reparto)"], dependencies=[Depends(verify_logistics_license)])

@router.get("/", response_model=List[schemas.Distribution])
async def list_distributions(
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.Distribution).where(models.Distribution.tenant_id == tenant_id)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{id}", response_model=schemas.Distribution)
async def get_distribution(
    id: uuid.UUID,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.Distribution).where(
        models.Distribution.id == id,
        models.Distribution.tenant_id == tenant_id
    )
    result = await db.execute(query)
    dist = result.scalar_one_or_none()
    if not dist:
        raise HTTPException(status_code=404, detail="Distribution not found")
    return dist

@router.post("/", response_model=schemas.Distribution, status_code=status.HTTP_201_CREATED)
async def create_distribution(
    payload: schemas.DistributionCreate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    try:
        new_dist = models.Distribution(
            tenant_id=tenant_id,
            product_id=payload.product_id,
            store_name=payload.store_name,
            size_grade=payload.size_grade,
            total_quantity=payload.total_quantity,
            status=payload.status,
            transfer_type=payload.transfer_type,
            origin_store=payload.origin_store,
            assigned_driver=payload.assigned_driver,
            nf_number=payload.nf_number,
            is_scheduled=payload.is_scheduled,
            scheduled_at=payload.scheduled_at
        )
        db.add(new_dist)
        await db.commit()
        await db.refresh(new_dist)
        return new_dist
    except Exception as e:
        logger.error(f"Error creating distribution: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{id}", response_model=schemas.Distribution)
async def update_distribution(
    id: uuid.UUID,
    payload: schemas.DistributionUpdate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.Distribution).where(
        models.Distribution.id == id,
        models.Distribution.tenant_id == tenant_id
    )
    result = await db.execute(query)
    dist = result.scalar_one_or_none()
    if not dist:
        raise HTTPException(status_code=404, detail="Distribution not found")
        
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(dist, field, value)
        
    try:
        await db.commit()
        await db.refresh(dist)
        return dist
    except Exception as e:
        logger.error(f"Error updating distribution: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_distribution(
    id: uuid.UUID,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.Distribution).where(
        models.Distribution.id == id,
        models.Distribution.tenant_id == tenant_id
    )
    result = await db.execute(query)
    dist = result.scalar_one_or_none()
    if not dist:
        raise HTTPException(status_code=404, detail="Distribution not found")
        
    try:
        await db.delete(dist)
        await db.commit()
    except Exception as e:
        logger.error(f"Error deleting distribution: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id}/dispatch", response_model=schemas.Distribution)
async def dispatch_distribution(
    id: uuid.UUID,
    payload: schemas.DistributionDispatch,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.Distribution).where(
        models.Distribution.id == id,
        models.Distribution.tenant_id == tenant_id
    )
    result = await db.execute(query)
    dist = result.scalar_one_or_none()
    if not dist:
        raise HTTPException(status_code=404, detail="Distribution not found")
    
    if dist.status != "pendente":
        raise HTTPException(status_code=400, detail=f"Distribution cannot be dispatched from status: {dist.status}")

    # Trava Operacional (Fase 7)
    if not dist.is_scheduled:
        raise HTTPException(
            status_code=403,
            detail="Carga bloqueada: Este envio não foi programado pelo setor de Logística."
        )

    if dist.assigned_driver and dist.assigned_driver.strip().lower() != payload.courier_name.strip().lower():
        raise HTTPException(
            status_code=403,
            detail=f"Bloqueio operacional: Esta carga está programada exclusivamente para o motorista '{dist.assigned_driver}'."
        )

    # Update status and courier info
    dist.status = "em_transito"
    dist.courier_name = payload.courier_name
    dist.vehicle_plate = payload.vehicle_plate
    dist.courier_signature = payload.courier_signature
    dist.dispatched_at = datetime.now(timezone.utc)

    try:
        # Determine origin stock type
        origin_stock_type = f"loja:{dist.origin_store}" if dist.transfer_type == "transferencia" else "producao"

        # Deduct from Origin Stock
        stock_query = select(models.FinishedStockItem).where(
            models.FinishedStockItem.product_id == dist.product_id,
            models.FinishedStockItem.stock_type == origin_stock_type,
            models.FinishedStockItem.tenant_id == tenant_id
        )
        stock_res = await db.execute(stock_query)
        stock_item = stock_res.scalar_one_or_none()
        
        if stock_item:
            new_grade = dict(stock_item.size_grade or {})
            for size, qty in dist.size_grade.items():
                new_grade[size] = max(0, int(new_grade.get(size, 0)) - int(qty))
            stock_item.size_grade = new_grade
            db.add(stock_item)

        # Log stock exit movement from origin
        description_text = (
            f"Transferência enviada para {dist.store_name} via condutor: {payload.courier_name} (Placa: {payload.vehicle_plate or 'N/A'})"
            if dist.transfer_type == "transferencia"
            else f"Enviado p/ loja ({dist.store_name}) via motoboy: {payload.courier_name} (Placa: {payload.vehicle_plate or 'N/A'})"
        )
        movement = models.FinishedStockMovement(
            tenant_id=tenant_id,
            product_id=dist.product_id,
            stock_type=origin_stock_type,
            movement_type="saida",
            quantity_grade=dist.size_grade,
            total_quantity=dist.total_quantity,
            description=description_text,
            created_at=datetime.now(timezone.utc)
        )
        db.add(movement)

        await db.commit()
        await db.refresh(dist)
        return dist
    except Exception as e:
        logger.error(f"Error dispatching distribution: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id}/receive", response_model=schemas.Distribution)
async def receive_distribution(
    id: uuid.UUID,
    payload: schemas.DistributionReceive,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.Distribution).where(
        models.Distribution.id == id,
        models.Distribution.tenant_id == tenant_id
    )
    result = await db.execute(query)
    dist = result.scalar_one_or_none()
    if not dist:
        raise HTTPException(status_code=404, detail="Distribution not found")
    
    if dist.status != "em_transito":
        raise HTTPException(status_code=400, detail=f"Distribution cannot be received from status: {dist.status}")

    # Update status and receipt info
    dist.status = "entregue"
    dist.received_by = payload.received_by
    dist.receiver_role = payload.receiver_role
    dist.receiver_matricula = payload.receiver_matricula
    dist.received_signature = payload.received_signature
    dist.received_grade = payload.received_grade
    dist.discrepancy_notes = payload.discrepancy_notes
    dist.delivered_at = datetime.now(timezone.utc)

    try:
        store_stock_type = f"loja:{dist.store_name}"
        
        # Add to Store Finished Stock
        store_stock_query = select(models.FinishedStockItem).where(
            models.FinishedStockItem.product_id == dist.product_id,
            models.FinishedStockItem.stock_type == store_stock_type,
            models.FinishedStockItem.tenant_id == tenant_id
        )
        store_stock_res = await db.execute(store_stock_query)
        store_stock_item = store_stock_res.scalar_one_or_none()
        
        if not store_stock_item:
            store_stock_item = models.FinishedStockItem(
                tenant_id=tenant_id,
                product_id=dist.product_id,
                stock_type=store_stock_type,
                size_grade={}
            )
            db.add(store_stock_item)

        new_store_grade = dict(store_stock_item.size_grade or {})
        for size, qty in payload.received_grade.items():
            new_store_grade[size] = int(new_store_grade.get(size, 0)) + int(qty)
        store_stock_item.size_grade = new_store_grade
        db.add(store_stock_item)

        # Log store stock entry movement
        total_received = sum(int(q) for q in payload.received_grade.values())
        movement_store = models.FinishedStockMovement(
            tenant_id=tenant_id,
            product_id=dist.product_id,
            stock_type=store_stock_type,
            movement_type="entrada",
            quantity_grade=payload.received_grade,
            total_quantity=total_received,
            description=f"Recebido de reparto. Conferido por: {payload.received_by} ({payload.receiver_role}, Matrícula: {payload.receiver_matricula})",
            created_at=datetime.now(timezone.utc)
        )
        db.add(movement_store)

        # Compute discrepancies / losses in transit
        loss_grade = {}
        for size, expected_qty in dist.size_grade.items():
            actual_qty = payload.received_grade.get(size, 0)
            if expected_qty > actual_qty:
                loss_grade[size] = expected_qty - actual_qty

        if loss_grade:
            total_loss = sum(loss_grade.values())
            loss_movement = models.FinishedStockMovement(
                tenant_id=tenant_id,
                product_id=dist.product_id,
                stock_type="producao",
                movement_type="saida",
                quantity_grade=loss_grade,
                total_quantity=total_loss,
                description=f"Perda em trânsito (Motoboy: {dist.courier_name or 'N/A'}, Placa: {dist.vehicle_plate or 'N/A'})",
                created_at=datetime.now(timezone.utc)
            )
            db.add(loss_movement)

        await db.commit()
        await db.refresh(dist)
        return dist
    except Exception as e:
        logger.error(f"Error receiving distribution: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

