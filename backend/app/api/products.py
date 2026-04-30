from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Annotated
import uuid

from backend.app.core.database import get_db, set_tenant_id
from backend.app.models import models
from backend.app.schemas import schemas
from backend.app.api.deps import get_current_tenant_id

router = APIRouter(prefix="/api/products", tags=["Products"])

@router.get("", response_model=List[schemas.Product])
async def list_products(
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.Product).where(models.Product.tenant_id == tenant_id)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=schemas.Product, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_in: schemas.ProductCreate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    
    new_product = models.Product(
        tenant_id=tenant_id,
        reference=product_in.reference,
        name=product_in.name,
        description=product_in.description,
        base_price=product_in.base_price
    )
    db.add(new_product)
    await db.flush()
    
    for mat in product_in.materials:
        db.add(models.ProductMaterial(
            product_id=new_product.id,
            material_id=mat.material_id,
            quantity=mat.quantity
        ))
    
    await db.commit()
    await db.refresh(new_product)
    return new_product
