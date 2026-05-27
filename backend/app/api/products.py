from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
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
    query = (
        select(models.Product)
        .options(joinedload(models.Product.materials).joinedload(models.ProductMaterial.material))
        .where(models.Product.tenant_id == tenant_id)
    )
    result = await db.execute(query)
    return result.scalars().unique().all()

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
        type=product_in.type,
        base_price=product_in.base_price,
        image_url=product_in.image_url,
        materials=[]
    )

    
    for mat in product_in.materials:
        new_product.materials.append(models.ProductMaterial(
            material_id=mat.material_id,
            quantity=mat.quantity
        ))

    db.add(new_product)
    await db.flush()

    if product_in.initial_stock:
        stock_type = "acervo" if product_in.type == "acervo" else "producao"
        new_stock = models.FinishedStockItem(
            tenant_id=tenant_id,
            product_id=new_product.id,
            stock_type=stock_type,
            size_grade=product_in.initial_stock
        )
        db.add(new_stock)
    await db.commit()
    db.expunge_all()
    
    query = (
        select(models.Product)
        .options(joinedload(models.Product.materials).joinedload(models.ProductMaterial.material))
        .where(models.Product.id == new_product.id)
    )
    result = await db.execute(query)
    product_obj = result.unique().scalars().first()
    if not product_obj:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return schemas.Product.model_validate(product_obj)

@router.patch("/{id}", response_model=schemas.Product)
async def update_product(
    id: uuid.UUID,
    product_in: schemas.ProductUpdate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = (
        select(models.Product)
        .options(joinedload(models.Product.materials).joinedload(models.ProductMaterial.material))
        .where(
            models.Product.id == id,
            models.Product.tenant_id == tenant_id
        )
    )
    result = await db.execute(query)
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = product_in.model_dump(exclude_unset=True)
    
    if "materials" in update_data:
        materials_data = update_data.pop("materials")
        # Remove old materials by simply deleting them manually or relying on cascade (assuming cascade is set or we do it explicitly)
        # Using a simple raw deletion query for association:
        from sqlalchemy import delete
        await db.execute(delete(models.ProductMaterial).where(models.ProductMaterial.product_id == id))
        # Add new materials
        for mat in materials_data:
            db.add(models.ProductMaterial(
                product_id=id,
                material_id=mat["material_id"],
                quantity=mat["quantity"]
            ))
            
    for field, value in update_data.items():
        setattr(product, field, value)
        
    await db.commit()
    await db.refresh(product, attribute_names=['materials'])
    for pm in product.materials:
        await db.refresh(pm, attribute_names=['material'])
    
    return product

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    id: uuid.UUID,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.Product).where(
        models.Product.id == id,
        models.Product.tenant_id == tenant_id
    )
    result = await db.execute(query)
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    await db.delete(product)
    await db.commit()
