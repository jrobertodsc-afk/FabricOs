from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Annotated
import uuid

from backend.app.core.database import get_db, set_tenant_id
from backend.app.models import models
from backend.app.schemas import schemas
from backend.app.api.deps import get_current_tenant_id

router = APIRouter(prefix="/api/materials", tags=["Materials"])

@router.get("", response_model=List[schemas.Material])
async def list_materials(
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.Material).where(models.Material.tenant_id == tenant_id)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=schemas.Material, status_code=status.HTTP_201_CREATED)
async def create_material(
    material_in: schemas.MaterialCreate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    
    new_material = models.Material(
        tenant_id=tenant_id,
        **material_in.model_dump()
    )
    db.add(new_material)
    await db.commit()
    await db.refresh(new_material)
    return new_material
