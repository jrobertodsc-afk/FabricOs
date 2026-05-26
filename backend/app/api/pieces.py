from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Annotated, Optional
import uuid
from pydantic import BaseModel
from backend.app.core.logger import logger

from backend.app.core.database import get_db, set_tenant_id
from backend.app.models import models
from backend.app.schemas import schemas
from backend.app.api.deps import get_current_tenant_id
from backend.app.core.license_middleware import verify_production_license

router = APIRouter(prefix="/api/pieces", tags=["Pieces (RFID & Traceability)"], dependencies=[Depends(verify_production_license)])

class PieceBatchCreate(BaseModel):
    product_id: uuid.UUID
    production_order_id: Optional[uuid.UUID] = None
    size_grade: dict  # {"PP": 2, "P": 5...}
    raw_material_batch: Optional[str] = None
    rfid_prefix: Optional[str] = "3038"  # Prefix for simulating RFID EPC tags

class RfidCheckoutRequest(BaseModel):
    rfid_epcs: List[str]
    employee_id: Optional[uuid.UUID] = None
    partner_id: Optional[uuid.UUID] = None
    person_name: str
    reason: str
    destination: Optional[str] = "Showroom Check-out"
    replacement_cost_agreed: float = 0.0

@router.get("/", response_model=List[schemas.Piece])
async def list_pieces(
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db),
    status: Optional[str] = None,
    product_id: Optional[uuid.UUID] = None
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.Piece).where(models.Piece.tenant_id == tenant_id)
    if status:
        query = query.where(models.Piece.status == status)
    if product_id:
        query = query.where(models.Piece.product_id == product_id)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/", response_model=schemas.Piece, status_code=status.HTTP_201_CREATED)
async def create_piece(
    piece_in: schemas.PieceCreate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    try:
        new_piece = models.Piece(
            tenant_id=tenant_id,
            **piece_in.model_dump()
        )
        db.add(new_piece)
        await db.commit()
        await db.refresh(new_piece)
        return new_piece
    except Exception as e:
        logger.error(f"Error creating piece: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch", response_model=List[schemas.Piece], status_code=status.HTTP_201_CREATED)
async def create_piece_batch(
    payload: PieceBatchCreate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    try:
        # Validate product
        product_query = select(models.Product).where(
            models.Product.id == payload.product_id,
            models.Product.tenant_id == tenant_id
        )
        product_res = await db.execute(product_query)
        product = product_res.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        created_pieces = []
        # Loop through sizes and create individual pieces
        for size, quantity in payload.size_grade.items():
            for i in range(int(quantity)):
                # Generate a unique simulated RFID EPC tag if not provided
                # Format: prefix (e.g. 3038) + product_reference_hex + size_hex + unique_counter_hex
                unique_hex = uuid.uuid4().hex[:12].upper()
                simulated_epc = f"{payload.rfid_prefix}{product.reference[:6].upper()}{size}{unique_hex}"
                
                new_piece = models.Piece(
                    tenant_id=tenant_id,
                    product_id=payload.product_id,
                    production_order_id=payload.production_order_id,
                    rfid_epc=simulated_epc,
                    size=size,
                    status="estoque",
                    raw_material_batch=payload.raw_material_batch
                )
                db.add(new_piece)
                created_pieces.append(new_piece)
        
        await db.commit()
        for piece in created_pieces:
            await db.refresh(piece)
        return created_pieces
    except Exception as e:
        logger.error(f"Error creating piece batch: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rfid/{rfid_epc}", response_model=schemas.Piece)
async def get_piece_by_rfid(
    rfid_epc: str,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.Piece).where(
        models.Piece.rfid_epc == rfid_epc,
        models.Piece.tenant_id == tenant_id
    )
    result = await db.execute(query)
    piece = result.scalar_one_or_none()
    if not piece:
        raise HTTPException(status_code=404, detail=f"RFID tag {rfid_epc} not found in inventory")
    return piece

@router.patch("/rfid/{rfid_epc}", response_model=schemas.Piece)
async def update_piece_by_rfid(
    rfid_epc: str,
    payload: schemas.PieceUpdate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.Piece).where(
        models.Piece.rfid_epc == rfid_epc,
        models.Piece.tenant_id == tenant_id
    )
    result = await db.execute(query)
    piece = result.scalar_one_or_none()
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
        
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(piece, field, value)
        
    try:
        await db.commit()
        await db.refresh(piece)
        return piece
    except Exception as e:
        logger.error(f"Error updating piece: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rfid/checkout", response_model=schemas.Withdrawal)
async def rfid_showroom_checkout(
    payload: RfidCheckoutRequest,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    try:
        # Find pieces corresponding to the RFID tags
        query = select(models.Piece).where(
            models.Piece.rfid_epc.in_(payload.rfid_epcs),
            models.Piece.tenant_id == tenant_id
        )
        result = await db.execute(query)
        pieces = result.scalars().all()
        
        if not pieces:
            raise HTTPException(status_code=404, detail="No pieces found with the provided RFID tags")
            
        # Group by product & size to build WithdrawalItem list
        grade_by_product = {}
        for piece in pieces:
            if piece.status != "estoque":
                raise HTTPException(
                    status_code=400, 
                    detail=f"Piece {piece.rfid_epc} cannot be withdrawn: status is {piece.status}"
                )
            prod_id = piece.product_id
            if prod_id not in grade_by_product:
                grade_by_product[prod_id] = {}
            grade_by_product[prod_id][piece.size] = grade_by_product[prod_id].get(piece.size, 0) + 1

        # We assume for this checkout that it's a single main product type, or we pick the first one's name
        first_product_id = pieces[0].product_id
        first_product_query = select(models.Product).where(models.Product.id == first_product_id)
        first_product_res = await db.execute(first_product_query)
        first_prod = first_product_res.scalar_one()
        
        item_name = f"Check-out RFID: {first_prod.name} (+ {len(pieces) - 1} itens)" if len(pieces) > 1 else first_prod.name
        
        # Calculate total replacement cost if not provided
        # Sum base_price of all products fetched
        total_replacement_cost = payload.replacement_cost_agreed
        if total_replacement_cost <= 0.0:
            for piece in pieces:
                total_replacement_cost += float(piece.product.base_price or 0.0)

        # Create Withdrawal
        tracking_code = f"AC-{uuid.uuid4().hex[:8].upper()}"
        
        new_withdrawal = models.Withdrawal(
            tenant_id=tenant_id,
            partner_id=payload.partner_id,
            employee_id=payload.employee_id,
            item_name=item_name,
            person_name=payload.person_name,
            reason=payload.reason,
            type="ACERVO",
            destination=payload.destination,
            replacement_cost_agreed=total_replacement_cost,
            custody_confirmed=True, # Auto-confirmed in showroom checkout
            custody_confirmed_by=payload.person_name,
            status="retirado",
            tracking_code=tracking_code,
            notes=f"Retirada automática via Showroom RFID. Tags processadas: {', '.join(payload.rfid_epcs)}"
        )
        db.add(new_withdrawal)
        await db.flush() # Get withdrawal ID
        
        # Add WithdrawalItems
        withdrawal_items = []
        for prod_id, sizes in grade_by_product.items():
            for size, qty in sizes.items():
                item = models.WithdrawalItem(
                    withdrawal_id=new_withdrawal.id,
                    size=size,
                    quantity=qty
                )
                db.add(item)
                withdrawal_items.append(item)
                
        # Link pieces to this withdrawal and update status
        for piece in pieces:
            piece.status = "retirado"
            piece.current_withdrawal_id = new_withdrawal.id
            
        await db.commit()
        await db.refresh(new_withdrawal)
        return new_withdrawal
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        logger.error(f"Error during RFID Showroom Checkout: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
