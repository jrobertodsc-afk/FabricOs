from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
from jose import jwt
import json
import os

from backend.app.core.database import get_db
from backend.app.models import models

router = APIRouter(prefix="/api/backoffice", tags=["FabricOS Central Backoffice"])

# Chave Privada RSA 2048-bit (mantida exclusivamente no servidor central)
PRIVATE_KEY_PEM = """-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDk4sOy952XYZcA
Wf6UMSP/VPOpNjIgeCQWdQ7q3Gn7rRh+8mV67VdDsjSEIESxcoxWStqMOHdIg4CV
fDbSkiw1gwru+fXxNy/6kNO6Xyu2g9VeIzCMUHsf8y9URZgW5yOWWMBAHtQK/+5J
EdvSamBT4S2LOuA6pxqKvoRG3aVKWI4QEq9Iw5hy1L91jz1aTSehYe67Hy9ZZSp+
SSz+pLCLiLTx6HxoVQMfAgUSAQrbJJtXleW023U2N4vW7CsGOF65pKCi3RG0YUKv
PTQGVmQDIoSf3GHYjmzW77QBuYMfgLk+6xjj147DiX4MCTfuemW0K/tATh/7Ii+Y
KBU3phwDAgMBAAECggEAarUDipihOlWPeeT66Gi+gQfAbxdqqDOKk4OwWDM5H9HT
lT95qyUiZVeb3ytSCy49me9c0zlx9vcDx+04e9QU0z/MJZyYGgRiFF1XsFA1R2pP
24rpU8kjlcIgwxeM78SDlVC8FEirD5PAqgUu5/qa/RACVSI2LnIAUEXA0m7749vi
Fx1zw3fSHd96oUf6xjICwVJZQfuE8O5HwKaoofiDpvKaROqY+bQnDg3j2p+cWATl
xFjWFmVstF47TuqiCn6wxhmTPWSNOzKB4Pco/W32y3GYaaPAkZqlH8s8NIiQxVIM
nfwD2HvGGoaNeN5XoNjDUjRmxeyDaE/C9aOyBbBjbQKBgQD/xw9qmej8wLe/tl5b
S/D36Sfzw3VvGQyDA7jRsSoxRywBPPz54J1n5PvYtuaI0yCxlQGXqRJfMHvju5/P
daBMY3D25n3u45vYa8W9dryGjMcEmUesDlZfcjGvQjjdWtofla5gV8wfnvMoeRXk
NZ5YfVKZpR4rVUDTnqH4jwoC3wKBgQDlFbe9NkII4s0mSF78kseTw2T83u5PineO
xCe4crVOeDQWoENmTtl/B8tDWNdx2dI8wgRfAtQZWsx8816urk++ecIeq3xrLj8i
/W69wR++NMlJur5Vf5ZyApyP7ej+btmI/+oJYpxbPJhg8ua4o2kwr5oM+3pH3fy2
rw+HyCgPXQKBgQDFrDjs4N/gHqyjnDSWCD3FysqWqHNklg5GXqUCYhJCnUeT+Wdl
UkM0HRLKLKhEDC8TLx5Y8FCDgnvsx389nSFyh9Ow7PdcnUk/XCMpRs9yiO/yTOfI
QBhekWl2kg5SfDlg+ZQXXyMhOP2hRNs3UHz81HX2ylZjlPKR2eJBr4JELwKBgQCN
DddJwPvd/tB0rwEVoccTW6916EpyXX8KQAt5DeBHRcpE2D9H4msXRZRJjo1xw74o
vQn1+obgacEZeryk8B2X2d7GBa8hS6OChuvGGQDTnCsIo9yIRnw7DRKbqNDawSRe
r7zKNJazstbccxPPQocFfEptjfaYA76UOaxlXcAU3QKBgCEIv8MXJXBQ6ExPmyh2
Q891HHMaGXxnfFg2My8I8PUF/1LmmIxIOQtFaigEW+V1Hz4hEz7iDiHb2OO0iHlJ
5+dliSAUv82IeYec//ud9/R9+ORUMgyFDZYyp/7WtfUqNTNsnGrNkHySGEUsB2vu
6Ltqbn7v3iw/gWaFVhdCUllX
-----END PRIVATE KEY-----"""

# Token de administracao configuravel via variavel de ambiente
BACKOFFICE_ADMIN_TOKEN = os.getenv("BACKOFFICE_ADMIN_TOKEN", "admin123")

# Caminho do banco de licenças central:
# - Na nuvem (Railway): usa /data/backoffice_clients.json (volume persistente montado)
# - Em dev local: usa a pasta uploads/ relativa ao projeto
_default_db_path = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "backoffice_clients.json")
)
DB_FILE = os.getenv("BACKOFFICE_DB_PATH", _default_db_path)

def load_central_db() -> dict:
    """Carrega os dados das licenças do arquivo JSON persistente."""
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_central_db(data: dict):
    """Salva os dados das licenças no arquivo JSON persistente."""
    try:
        os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"Erro ao salvar banco de licenças central: {e}")

def verify_admin_token(x_backoffice_admin_token: Optional[str] = Header(None)):
    """Valida o token administrativo nas rotas de controle central."""
    if not x_backoffice_admin_token or x_backoffice_admin_token != BACKOFFICE_ADMIN_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Acesso negado: Senha administrativa incorreta ou ausente."
        )

def create_backoffice_license_token(tenant_id: str, client_name: str, enabled_modules: List[str], expires_in_days: int = 30) -> str:
    """Helper no Backoffice para gerar chaves de licença assimétricas assinadas com a chave privada RSA."""
    payload = {
        "tenant_id": tenant_id,
        "client_name": client_name,
        "enabled_modules": enabled_modules,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=expires_in_days)).isoformat(),
        "iat": int(datetime.now(timezone.utc).timestamp())
    }
    return jwt.encode(payload, PRIVATE_KEY_PEM, algorithm="RS256")

class LicenseValidationRequest(BaseModel):
    tenant_id: str
    license_key: Optional[str] = None

class LicenseUpdateRequest(BaseModel):
    enabled_modules: Optional[List[str]] = None
    update_channel: Optional[str] = None
    is_active: Optional[bool] = None

def get_client_license_state(tenant_id: str) -> dict:
    """Retorna o estado da licença do cliente na nossa nuvem, com persistência automática."""
    db_data = load_central_db()
    if tenant_id not in db_data:
        db_data[tenant_id] = {
            "tenant_id": tenant_id,
            "client_name": f"Cliente Filial {tenant_id[:8].upper()}",
            "enabled_modules": ["producao", "logistica", "mobile"],
            "update_channel": "stable",
            "current_version": "1.0.0",
            "latest_version": "1.0.0",
            "is_active": True,
            "is_locked": False,
            "last_ping_at": datetime.now(timezone.utc).isoformat()
        }
        save_central_db(db_data)
    return db_data[tenant_id]

@router.post("/license/validate")
async def validate_license(payload: LicenseValidationRequest):
    """Endpoint que o cliente local consulta periodicamente em segundo plano."""
    db_data = load_central_db()
    if payload.tenant_id not in db_data:
        state = get_client_license_state(payload.tenant_id)
        db_data = load_central_db()
    else:
        state = db_data[payload.tenant_id]
    
    # Atualiza timestamp do último ping recebido
    state["last_ping_at"] = datetime.now(timezone.utc).isoformat()
    save_central_db(db_data)
    
    # Se a licença foi desativada por nós no Backoffice, retorna travado
    if not state["is_active"] or state["is_locked"]:
        return {
            "is_active": False,
            "is_locked": True,
            "detail": "Instância suspensa por pendências financeiras ou expiração."
        }
        
    # Gera um novo token assinado contendo os módulos e expiração vigentes usando RS256
    new_token = create_backoffice_license_token(
        tenant_id=payload.tenant_id,
        client_name=state["client_name"],
        enabled_modules=state["enabled_modules"],
        expires_in_days=30
    )
    
    return {
        "is_active": True,
        "is_locked": False,
        "license_key": new_token,
        "latest_version": state["latest_version"],
        "update_channel": state["update_channel"]
    }

@router.get("/clients")
async def list_backoffice_clients(admin: None = Depends(verify_admin_token)):
    """Retorna a lista de todas as instâncias de clientes ativas."""
    db_data = load_central_db()
    return list(db_data.values())

@router.post("/clients/{tenant_id}/toggle-lock")
async def toggle_client_lock(tenant_id: str, admin: None = Depends(verify_admin_token)):
    """Aciona a Trava Remota (Kill-Switch) para suspender a licença à distância."""
    db_data = load_central_db()
    if tenant_id not in db_data:
        state = get_client_license_state(tenant_id)
        db_data = load_central_db()
    else:
        state = db_data[tenant_id]
        
    state["is_active"] = not state["is_active"]
    state["is_locked"] = not state["is_active"]
    save_central_db(db_data)
    return state

@router.patch("/clients/{tenant_id}", response_model=dict)
async def update_client_license(tenant_id: str, payload: LicenseUpdateRequest, admin: None = Depends(verify_admin_token)):
    """Atualiza módulos licenciados ou canais de updates do cliente na nuvem."""
    db_data = load_central_db()
    if tenant_id not in db_data:
        state = get_client_license_state(tenant_id)
        db_data = load_central_db()
    else:
        state = db_data[tenant_id]
        
    if payload.enabled_modules is not None:
        state["enabled_modules"] = payload.enabled_modules
    if payload.update_channel is not None:
        state["update_channel"] = payload.update_channel
        # Ajusta versão de update recomendada com base no canal
        if payload.update_channel == "beta":
            state["latest_version"] = "1.1.0-beta"
        elif payload.update_channel == "dev":
            state["latest_version"] = "1.2.0-dev"
        else:
            state["latest_version"] = "1.0.0"
    if payload.is_active is not None:
        state["is_active"] = payload.is_active
        state["is_locked"] = not payload.is_active
        
    save_central_db(db_data)
    return state

@router.post("/clients/{tenant_id}/simulate-local-update")
async def simulate_local_update(
    tenant_id: str, 
    db: AsyncSession = Depends(get_db),
    admin: None = Depends(verify_admin_token)
):
    """Simula a instalação física da atualização local rodando o script de auto-update."""
    db_data = load_central_db()
    if tenant_id not in db_data:
        state = get_client_license_state(tenant_id)
        db_data = load_central_db()
    else:
        state = db_data[tenant_id]
    
    # Atualiza na base de dados SQLite local
    query = select(models.LicenseConfig).where(models.LicenseConfig.tenant_id == uuid.UUID(tenant_id))
    result = await db.execute(query)
    config = result.scalar_one_or_none()
    
    if config:
        config.current_version = state["latest_version"]
        config.last_verified_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.add(config)
        await db.commit()
        await db.refresh(config)
        
        # Sincroniza estado da nuvem
        state["current_version"] = state["latest_version"]
        save_central_db(db_data)
        
    return state
