from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta

from backend.app.core.database import get_db
from backend.app.models import models
from backend.app.schemas import schemas
from backend.app.core.auth import authenticate_user, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/login", response_model=schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    user = await authenticate_user(form_data.username, form_data.password, db)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "tenant_id": str(user.tenant_id)},
        expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "tenant_id": user.tenant_id
    }

from backend.app.api.deps import get_current_tenant_id
from backend.app.core.license_middleware import get_or_create_license_config, PUBLIC_KEY_PEM, ALGORITHM
from jose import jwt
import uuid
from typing import Annotated

@router.get("/license-status")
async def get_license_status(
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    config = await get_or_create_license_config(db, tenant_id)
    
    # Realiza ping rápido para sincronizar com o Backoffice central
    from backend.app.core.license_middleware import ping_central_backoffice
    ping_data = await ping_central_backoffice(db, config)
    
    enabled_modules = []
    try:
        payload = jwt.decode(config.license_key, PUBLIC_KEY_PEM, algorithms=[ALGORITHM])
        enabled_modules = payload.get("enabled_modules", [])
    except Exception:
        pass
        
    return {
        "tenant_id": str(tenant_id),
        "is_locked": config.is_locked,
        "enabled_modules": enabled_modules,
        "current_version": config.current_version,
        "update_channel": config.update_channel,
        "last_verified_at": config.last_verified_at.isoformat() if config.last_verified_at else None,
        "offline_grace_started_at": config.offline_grace_started_at.isoformat() if config.offline_grace_started_at else None,
        "grace_period_active": ping_data.get("grace_period_active", False) if ping_data else False,
        "grace_days_left": ping_data.get("grace_days_left", 0) if ping_data else 0,
    }

