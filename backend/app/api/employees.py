from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Annotated
import uuid
from backend.app.core.logger import logger

from backend.app.core.database import get_db, set_tenant_id
from backend.app.models import models
from backend.app.schemas import schemas
from backend.app.api.deps import get_current_tenant_id

router = APIRouter(prefix="/api/employees", tags=["Employees"])

@router.get("/", response_model=List[schemas.Employee])
async def list_employees(
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.Employee).where(models.Employee.tenant_id == tenant_id)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/", response_model=schemas.Employee, status_code=status.HTTP_201_CREATED)
async def create_employee(
    employee_in: schemas.EmployeeCreate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    try:
        new_employee = models.Employee(
            tenant_id=tenant_id,
            **employee_in.model_dump()
        )
        db.add(new_employee)
        await db.commit()
        await db.refresh(new_employee)
        return new_employee
    except Exception as e:
        logger.error(f"Error creating employee: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{id}", response_model=schemas.Employee)
async def get_employee(
    id: uuid.UUID,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.Employee).where(
        models.Employee.id == id, 
        models.Employee.tenant_id == tenant_id
    )
    result = await db.execute(query)
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@router.patch("/{id}", response_model=schemas.Employee)
async def update_employee(
    id: uuid.UUID,
    employee_in: schemas.EmployeeUpdate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.Employee).where(
        models.Employee.id == id,
        models.Employee.tenant_id == tenant_id
    )
    result = await db.execute(query)
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    update_data = employee_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(employee, field, value)
        
    try:
        await db.commit()
        await db.refresh(employee)
        return employee
    except Exception as e:
        logger.error(f"Error updating employee: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(
    id: uuid.UUID,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.Employee).where(
        models.Employee.id == id,
        models.Employee.tenant_id == tenant_id
    )
    result = await db.execute(query)
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    employee.is_active = False  # Soft delete
    
    try:
        await db.commit()
    except Exception as e:
        logger.error(f"Error deleting employee: {e}")
        raise HTTPException(status_code=500, detail=str(e))
