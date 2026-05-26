from fastapi import APIRouter, Depends, HTTPException
import json
import os
from typing import List
from backend.app.api.deps import get_current_tenant_id
import uuid
from typing import Annotated

router = APIRouter(prefix="/api/system", tags=["System"])

LOG_FILE = "fabricos_audit.log"

@router.get("/logs")
async def get_logs(tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)]):
    if not os.path.exists(LOG_FILE):
        return []
        
    logs = []
    with open(LOG_FILE, "r") as f:
        for line in f:
            try:
                entry = json.loads(line)
                # Filter by tenant_id if present in the log entry
                if entry.get("tenant_id") == str(tenant_id):
                    logs.append(entry)
            except:
                continue
                
    # Return last 100 logs, newest first
    return sorted(logs, key=lambda x: x.get("timestamp", ""), reverse=True)[:100]

from backend.app.schemas import schemas
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import get_db
from sqlalchemy import select
from backend.app.models import models

@router.get("/tenants", response_model=List[schemas.TenantRead])
async def list_tenants(
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    db: AsyncSession = Depends(get_db)
):
    query = select(models.Tenant)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/seed")
async def trigger_seed(
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)]
):
    # Depending on requirements, this could execute the seed logic
    return {"message": "Seed route accessed securely."}
