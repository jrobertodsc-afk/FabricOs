from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Annotated, Optional
import uuid
from backend.app.core.logger import logger

from backend.app.core.database import get_db, set_tenant_id
from backend.app.models import models
from backend.app.schemas import schemas
from backend.app.api.deps import get_current_tenant_id

router = APIRouter(prefix="/api/notifications", tags=["Notifications (Sector Alerts)"])

@router.get("/", response_model=List[schemas.Notification])
async def list_notifications(
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db),
    department: Optional[str] = None,
    unread_only: bool = False
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.Notification).where(models.Notification.tenant_id == tenant_id)
    if department:
        query = query.where(models.Notification.department == department)
    if unread_only:
        query = query.where(models.Notification.read == False)
    query = query.order_by(models.Notification.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/", response_model=schemas.Notification, status_code=status.HTTP_201_CREATED)
async def create_notification(
    payload: schemas.NotificationCreate,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    try:
        new_notification = models.Notification(
            tenant_id=tenant_id,
            title=payload.title,
            message=payload.message,
            department=payload.department,
            read=payload.read
        )
        db.add(new_notification)
        await db.commit()
        await db.refresh(new_notification)
        return new_notification
    except Exception as e:
        logger.error(f"Error creating notification: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{id}/read", response_model=schemas.Notification)
async def mark_as_read(
    id: uuid.UUID,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    query = select(models.Notification).where(
        models.Notification.id == id,
        models.Notification.tenant_id == tenant_id
    )
    result = await db.execute(query)
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif.read = True
    try:
        await db.commit()
        await db.refresh(notif)
        return notif
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_as_read(
    department: str,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    await set_tenant_id(db, str(tenant_id))
    try:
        stmt = (
            update(models.Notification)
            .where(
                models.Notification.tenant_id == tenant_id,
                models.Notification.department == department,
                models.Notification.read == False
            )
            .values(read=True)
        )
        await db.execute(stmt)
        await db.commit()
    except Exception as e:
        logger.error(f"Error marking all notifications as read: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
