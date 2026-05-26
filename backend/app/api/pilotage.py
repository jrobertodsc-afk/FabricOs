from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Annotated, Optional
import uuid
from datetime import datetime
from backend.app.core.logger import logger

from backend.app.core.database import get_db, set_tenant_id
from backend.app.models import models
from backend.app.schemas import schemas
from backend.app.api.deps import get_current_tenant_id

router = APIRouter(prefix="/api/pilotage", tags=["Pilotage (BOAH)"])

@router.get("/", response_model=List[schemas.PilotageCard])
async def list_pilotage_cards(
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    filters = [models.PilotageCard.tenant_id == tenant_id]
    if status:
        filters.append(models.PilotageCard.status == status)
        
    query = select(models.PilotageCard).where(*filters).order_by(desc(models.PilotageCard.created_at))
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/", response_model=schemas.PilotageCard, status_code=status.HTTP_201_CREATED)
async def create_pilotage_card(
    card_in: schemas.PilotageCardCreate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    
    new_card = models.PilotageCard(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        **card_in.model_dump()
    )
    db.add(new_card)
    
    try:
        await db.commit()
        await db.refresh(new_card)
        return new_card
    except Exception as e:
        logger.error(f"Error creating pilotage card: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{id}", response_model=schemas.PilotageCard)
async def update_pilotage_card(
    id: uuid.UUID,
    card_in: schemas.PilotageCardUpdate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.PilotageCard).where(
        models.PilotageCard.id == id,
        models.PilotageCard.tenant_id == tenant_id
    )
    result = await db.execute(query)
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Pilotage card not found")
        
    update_data = card_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(card, field, value)
        
    try:
        await db.commit()
        await db.refresh(card)
        return card
    except Exception as e:
        logger.error(f"Error updating pilotage card: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{id}/send-to-acervo", response_model=schemas.PilotageCard)
async def send_to_acervo(
    id: uuid.UUID,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    
    # 1. Fetch pilotage card
    card_query = select(models.PilotageCard).where(
        models.PilotageCard.id == id,
        models.PilotageCard.tenant_id == tenant_id
    )
    card_res = await db.execute(card_query)
    card = card_res.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Pilotage card not found")
        
    if card.status != "aprovado":
        raise HTTPException(status_code=400, detail="Somente peças com status 'Aprovado' podem ser enviadas ao acervo.")
        
    if card.sent_to_acervo:
        raise HTTPException(status_code=400, detail="Esta peça piloto já foi cadastrada no estoque de acervo.")
        
    # 2. Get or Create Product corresponding to card.model_name
    prod_query = select(models.Product).where(
        models.Product.name == card.model_name,
        models.Product.tenant_id == tenant_id
    )
    prod_res = await db.execute(prod_query)
    product = prod_res.scalar_one_or_none()
    
    if not product:
        # Create product in catalog automatically!
        short_id = uuid.uuid4().hex[:6].upper()
        product = models.Product(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            reference=f"PILOT-{short_id}",
            name=card.model_name,
            description=f"Produto criado automaticamente a partir da Pilotagem BOAH ({card.raw_material})"
        )
        db.add(product)
        await db.flush()  # Make product.id available
        
    # 3. Get or create FinishedStockItem for Acervo
    stock_query = select(models.FinishedStockItem).where(
        models.FinishedStockItem.product_id == product.id,
        models.FinishedStockItem.stock_type == "acervo",
        models.FinishedStockItem.tenant_id == tenant_id
    )
    stock_res = await db.execute(stock_query)
    stock_item = stock_res.scalar_one_or_none()
    
    default_grade = {"PP": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "U": 0}
    
    if not stock_item:
        stock_item = models.FinishedStockItem(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            product_id=product.id,
            stock_type="acervo",
            size_grade=default_grade.copy()
        )
        db.add(stock_item)
        
    # 4. Add exactly 1 unit of this card's size
    current_grade = dict(stock_item.size_grade or default_grade)
    size_key = card.size.upper()
    if size_key not in current_grade:
        current_grade[size_key] = 0
    current_grade[size_key] += 1
    stock_item.size_grade = current_grade
    
    # 5. Create a stock movement log
    qty_grade = {s: (1 if s == size_key else 0) for s in default_grade}
    movement = models.FinishedStockMovement(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        product_id=product.id,
        stock_type="acervo",
        movement_type="entrada",
        quantity_grade=qty_grade,
        total_quantity=1,
        description=f"Entrada de acervo via Ficha de Pilotagem BOAH aprovada (Pilotista: {card.pilot_name})"
    )
    db.add(movement)
    
    # Mark card as sent
    card.sent_to_acervo = True
    
    try:
        await db.commit()
        await db.refresh(card)
        return card
    except Exception as e:
        logger.error(f"Error sending pilotage card to acervo: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
