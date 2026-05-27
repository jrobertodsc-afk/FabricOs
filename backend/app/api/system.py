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

from pydantic import BaseModel

class FeedbackRequest(BaseModel):
    type: str  # erro, sugestao, duvida
    message: str
    user_email: str
    user_name: str

@router.post("/feedback")
async def send_feedback(
    payload: FeedbackRequest,
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)]
):
    """
    Recebe o feedback do usuário e envia para o Telegram do administrador.
    """
    try:
        from backend.app.core.telegram import send_telegram_message
        icon = "🐛" if payload.type == "erro" else "💡" if payload.type == "sugestao" else "❓"
        
        msg = (
            f"{icon} <b>NOVO FEEDBACK DO CLIENTE</b> {icon}\n\n"
            f"<b>Tenant ID:</b> {str(tenant_id)[:8]}...\n"
            f"<b>Usuário:</b> {payload.user_name} ({payload.user_email})\n"
            f"<b>Tipo:</b> {payload.type.upper()}\n"
            f"<b>Mensagem:</b>\n<i>{payload.message}</i>"
        )
        
        success = send_telegram_message(msg)
        if not success:
            raise HTTPException(status_code=500, detail="Erro ao encaminhar mensagem.")
            
        return {"status": "ok", "message": "Feedback enviado com sucesso."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

