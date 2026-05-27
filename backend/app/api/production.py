from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from sqlalchemy.orm import joinedload
from typing import List, Annotated
import uuid
from datetime import datetime

from backend.app.core.database import get_db, set_tenant_id
from backend.app.models import models
from backend.app.schemas import schemas
from backend.app.api.deps import get_current_tenant_id
from backend.app.core.logger import logger
from backend.app.core.license_middleware import verify_production_license

router = APIRouter(prefix="/api/production", tags=["Production"], dependencies=[Depends(verify_production_license)])

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

@router.patch("/stages/{stage_id}", response_model=schemas.ProductionStage)
async def update_stage(
    stage_id: uuid.UUID,
    stage_in: schemas.ProductionStageBase,
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
        
    update_data = stage_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(stage, field, value)
        
    await db.commit()
    await db.refresh(stage)
    return stage

@router.get("/orders", response_model=schemas.PaginatedResponse[schemas.ProductionOrder])
async def list_orders(
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0, description="Número de registros a pular"),
    limit: int = Query(50, ge=1, le=200, description="Máximo de registros retornados"),
    status: str | None = Query(None, description="Filtrar por status"),
    stage: str | None = Query(None, description="Filtrar por estágio atual"),
):
    await set_tenant_id(db, str(tenant_id))

    filters = [models.ProductionOrder.tenant_id == tenant_id]
    if status:
        filters.append(models.ProductionOrder.status == status)
    if stage:
        filters.append(models.ProductionOrder.current_stage == stage)

    count_query = select(func.count()).select_from(models.ProductionOrder).where(*filters)
    total: int = (await db.execute(count_query)).scalar_one()

    query = (
        select(models.ProductionOrder)
        .options(joinedload(models.ProductionOrder.product))
        .where(*filters)
        .order_by(models.ProductionOrder.created_at.desc())
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

@router.post("/orders", response_model=schemas.ProductionOrder)
async def create_order(
    order_in: schemas.ProductionOrderCreate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    
    # Gera número de OP único de forma atômica, sem race condition
    if not order_in.order_number:
        max_query = select(func.max(models.ProductionOrder.order_number)).where(
            models.ProductionOrder.tenant_id == tenant_id,
            models.ProductionOrder.order_number.like("OP-%"),
        )
        max_result = await db.execute(max_query)
        last_op = max_result.scalar_one_or_none()  # Ex: "OP-0042" ou None
        if last_op:
            try:
                last_num = int(last_op.split("-")[1])
            except (IndexError, ValueError):
                last_num = 0
        else:
            last_num = 0
        order_number = f"OP-{last_num + 1:04d}"
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
                # First check stock
                mat_check_query = select(models.Material).where(models.Material.id == pm.material_id)
                mat_res = await db.execute(mat_check_query)
                material = mat_res.scalar_one()
                needed = pm.quantity * order_in.total_quantity
                
                if material.stock_quantity < needed:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Insufficient stock for material {material.name}. Needed: {needed}, Available: {material.stock_quantity}"
                    )

                update_mat = update(models.Material).where(
                    models.Material.id == pm.material_id
                ).values(
                    stock_quantity = models.Material.stock_quantity - needed
                )
                await db.execute(update_mat)
                
    await db.commit()
    
    # Reload with relationships
    query = (
        select(models.ProductionOrder)
        .options(joinedload(models.ProductionOrder.product))
        .where(models.ProductionOrder.id == new_order.id)
    )
    result = await db.execute(query)
    return result.unique().scalars().first()

@router.patch("/orders/{order_id}", response_model=schemas.ProductionOrder)
async def update_order(
    order_id: uuid.UUID,
    order_in: schemas.ProductionOrderUpdate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = (
        select(models.ProductionOrder)
        .options(joinedload(models.ProductionOrder.product))
        .where(
            models.ProductionOrder.id == order_id,
            models.ProductionOrder.tenant_id == tenant_id
        )
    )
    result = await db.execute(query)
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    update_data = order_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(order, field, value)
        
    await db.commit()
    await db.refresh(order, attribute_names=['product'])
    return order

@router.delete("/orders/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(
    order_id: uuid.UUID,
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
        
    await db.delete(order)
    await db.commit()

@router.post("/orders/{order_number}/scan", response_model=schemas.ProductionOrder)
async def scan_order(
    order_number: str,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = (
        select(models.ProductionOrder)
        .options(joinedload(models.ProductionOrder.product))
        .where(
            models.ProductionOrder.order_number == order_number,
            models.ProductionOrder.tenant_id == tenant_id
        )
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
        
        logger.info(
            f"QR Scan: OP {order_number} movida para o estágio '{order.current_stage}' "
            f"(tenant: {tenant_id})"
        )
        
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


from pydantic import BaseModel
from typing import Optional

class XmlReconciliationSuggestion(BaseModel):
    order_id: uuid.UUID
    order_number: str
    product_id: uuid.UUID
    product_name: str
    partner_id: Optional[uuid.UUID]
    partner_name: Optional[str]
    suggested_size_grade: dict
    total_quantity: int
    nf_number: str

class XmlConfirmPayload(BaseModel):
    reconciled_size_grade: dict  # final audited grade
    raw_material_batch: Optional[str] = None
    nf_number: Optional[str] = None

@router.get("/orders/xml-reconcile/{nfe_key}", response_model=XmlReconciliationSuggestion)
async def get_xml_reconciliation(
    nfe_key: str,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    if len(nfe_key) < 6:
        raise HTTPException(status_code=400, detail="Chave de NF-e inválida ou muito curta")
        
    # Extrai número da NF da chave (geralmente posições 25 a 33 da chave de 44 dígitos)
    # Mas para simulação, se for menor que 44 dígitos, apenas usamos o valor como o número da NF direto
    nf_num = nfe_key[25:34].lstrip("0") if len(nfe_key) == 44 else nfe_key
    
    # Procura OP que possua esse número de NF cadastrado
    query = (
        select(models.ProductionOrder)
        .options(joinedload(models.ProductionOrder.product), joinedload(models.ProductionOrder.partner))
        .where(
            models.ProductionOrder.tenant_id == tenant_id,
            (models.ProductionOrder.nf_number == nf_num) | (models.ProductionOrder.order_number == nf_num)
        )
    )
    result = await db.execute(query)
    order = result.scalar_one_or_none()
    
    # Se não achar por NF, busca a OP mais recente pendente para sugerir conciliação
    if not order:
        query_fallback = (
            select(models.ProductionOrder)
            .options(joinedload(models.ProductionOrder.product), joinedload(models.ProductionOrder.partner))
            .where(
                models.ProductionOrder.tenant_id == tenant_id,
                models.ProductionOrder.status == "em_andamento"
            )
            .order_by(models.ProductionOrder.created_at.desc())
            .limit(1)
        )
        res_fallback = await db.execute(query_fallback)
        order = res_fallback.scalar_one_or_none()
        
    if not order:
        raise HTTPException(
            status_code=404, 
            detail="Nenhuma Ordem de Produção correspondente encontrada para conciliação"
        )
        
    return {
        "order_id": order.id,
        "order_number": order.order_number,
        "product_id": order.product_id,
        "product_name": order.product.name if order.product else "Desconhecido",
        "partner_id": order.partner_id,
        "partner_name": order.partner.name if order.partner else "Sem parceiro",
        "suggested_size_grade": order.size_grade or {"P": 0, "M": 0, "G": 0},
        "total_quantity": order.total_quantity,
        "nf_number": nf_num
    }

@router.post("/orders/{order_id}/xml-confirm")
async def confirm_xml_reconciliation(
    order_id: uuid.UUID,
    payload: XmlConfirmPayload,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    try:
        # 1. Fetch OP
        query = (
            select(models.ProductionOrder)
            .options(joinedload(models.ProductionOrder.product), joinedload(models.ProductionOrder.partner))
            .where(
                models.ProductionOrder.id == order_id,
                models.ProductionOrder.tenant_id == tenant_id
            )
        )
        result = await db.execute(query)
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Ordem de Produção não encontrada")
            
        # Update NF details if supplied
        if payload.nf_number:
            order.nf_number = payload.nf_number
            
        product_id = order.product_id
        if not product_id:
            raise HTTPException(status_code=400, detail="OP não possui produto associado")

        # 2. Update Finished Stock (FinishedStockItem)
        stock_query = select(models.FinishedStockItem).where(
            models.FinishedStockItem.product_id == product_id,
            models.FinishedStockItem.stock_type == "producao",
            models.FinishedStockItem.tenant_id == tenant_id
        )
        stock_res = await db.execute(stock_query)
        stock_item = stock_res.scalar_one_or_none()
        
        # If stock item does not exist, create it
        if not stock_item:
            stock_item = models.FinishedStockItem(
                tenant_id=tenant_id,
                product_id=product_id,
                stock_type="producao",
                size_grade={}
            )
            db.add(stock_item)
            
        # Add values from reconciled grade
        curr_grade = stock_item.size_grade or {}
        new_grade = dict(curr_grade)
        for size, qty in payload.reconciled_size_grade.items():
            new_grade[size] = int(new_grade.get(size, 0)) + int(qty)
        stock_item.size_grade = new_grade

        # 3. Create FinishedStockMovement record
        total_rec = sum(int(qty) for qty in payload.reconciled_size_grade.values())
        movement = models.FinishedStockMovement(
            tenant_id=tenant_id,
            product_id=product_id,
            stock_type="producao",
            movement_type="entrada",
            quantity_grade=payload.reconciled_size_grade,
            total_quantity=total_rec,
            reference_op_id=order_id,
            description=f"Entrada via conciliação XML de NF-e ({payload.nf_number or order.nf_number or 's/n'})"
        )
        db.add(movement)

        # 4. Generate Piece-level Unit Traceability items (RFID auto-creation)
        created_pieces = []
        for size, quantity in payload.reconciled_size_grade.items():
            for i in range(int(quantity)):
                unique_hex = uuid.uuid4().hex[:12].upper()
                simulated_epc = f"3038{order.order_number[-4:]}{size}{unique_hex}"
                
                new_piece = models.Piece(
                    tenant_id=tenant_id,
                    product_id=product_id,
                    production_order_id=order_id,
                    rfid_epc=simulated_epc,
                    size=size,
                    status="estoque",
                    raw_material_batch=payload.raw_material_batch
                )
                db.add(new_piece)
                created_pieces.append(new_piece)

        # 5. Check if there are any losses/sinistros
        original_grade = order.size_grade or {}
        losses_count = 0
        for size, orig_qty in original_grade.items():
            rec_qty = payload.reconciled_size_grade.get(size, 0)
            if orig_qty > rec_qty:
                losses_count += (orig_qty - rec_qty)
                
        if losses_count > 0 and order.partner_id:
            # Update partner's pending_losses_count
            partner_query = select(models.Partner).where(models.Partner.id == order.partner_id)
            partner_res = await db.execute(partner_query)
            partner = partner_res.scalar_one_or_none()
            if partner:
                partner.pending_losses_count = int(partner.pending_losses_count or 0) + losses_count
                # If losses are high, auto suspend
                if partner.pending_losses_count >= 10:
                    partner.status = "SUSPENSO_AVARIA"

        # 6. Push a Sector Notification to 'Logística' and 'Planejamento'
        notif_msg = f"Conferência física finalizada para a OP {order.order_number} via NF-e {payload.nf_number or order.nf_number or ''}. Total de peças integradas ao estoque: {total_rec}."
        if losses_count > 0:
            notif_msg += f" ATENÇÃO: Detectadas {losses_count} avarias/perdas no retorno da faccionista."
            
        notif1 = models.Notification(
            tenant_id=tenant_id,
            title=f"Estoque Alimentado - OP {order.order_number}",
            message=notif_msg,
            department="Logística"
        )
        notif2 = models.Notification(
            tenant_id=tenant_id,
            title=f"Divergência de Grade - OP {order.order_number}" if losses_count > 0 else f"OP {order.order_number} Concluída",
            message=notif_msg,
            department="Planejamento"
        )
        db.add(notif1)
        db.add(notif2)

        # Update OP status to finalizado or finished stage
        order.current_stage = "Finalizado"
        order.status = "finalizado"

        await db.commit()
        return {
            "status": "success",
            "message": "Grade XML reconciliada, estoque alimentado e peças unitárias RFID geradas!",
            "total_pieces_added": total_rec,
            "losses_detected": losses_count
        }
    except Exception as e:
        logger.error(f"Error in xml-confirm: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/orders/{order_id}/quality", response_model=schemas.QualityRecord)
async def create_quality_record(
    order_id: uuid.UUID,
    quality_in: schemas.QualityRecordCreate,
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
        
    new_record = models.QualityRecord(
        tenant_id=tenant_id,
        order_id=order.id,
        partner_id=order.partner_id,
        defect_type=quality_in.defect_type,
        quantity=quality_in.quantity,
        notes=quality_in.notes
    )
    db.add(new_record)
    await db.commit()
    await db.refresh(new_record)
    return new_record

@router.get("/quality-stats")
async def get_quality_stats(
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    
    # Total produzido (Soma das total_quantity das OPs finalizadas)
    total_produced_query = select(func.sum(models.ProductionOrder.total_quantity)).where(
        models.ProductionOrder.tenant_id == tenant_id,
        models.ProductionOrder.current_stage == 'Finalizado'
    )
    total_produced = (await db.execute(total_produced_query)).scalar() or 0
    
    # Total de defeitos registrados
    total_defects_query = select(func.sum(models.QualityRecord.quantity)).where(
        models.QualityRecord.tenant_id == tenant_id
    )
    total_defects = (await db.execute(total_defects_query)).scalar() or 0
    
    defect_rate = 0
    if total_produced > 0:
        defect_rate = (total_defects / total_produced) * 100
        
    return {
        "total_produced": total_produced,
        "total_defects": total_defects,
        "defect_rate": round(defect_rate, 2)
    }

