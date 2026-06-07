from fastapi import APIRouter, Depends, HTTPException, status, Header, Cookie, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
from jose import jwt
import json
import os

from backend.app.core.database import get_db
from backend.app.models import models
from backend.app.core.auth import get_password_hash

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
_default_db_path = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "backoffice_clients.json")
)
DB_FILE = os.getenv("BACKOFFICE_DB_PATH", _default_db_path)

# =====================================================================
#  PLANOS DE LICENCIAMENTO PRÉ-DEFINIDOS
# =====================================================================
PLANS = {
    "trial": {
        "plan_name": "Trial Gratuito",
        "enabled_modules": ["producao", "logistica", "mobile"],
        "monthly_price": 0,
        "trial_days": 15,
    },
    "starter": {
        "plan_name": "Starter",
        "enabled_modules": ["producao"],
        "monthly_price": 197,
        "trial_days": 0,
    },
    "professional": {
        "plan_name": "Professional",
        "enabled_modules": ["producao", "logistica"],
        "monthly_price": 397,
        "trial_days": 0,
    },
    "enterprise": {
        "plan_name": "Enterprise",
        "enabled_modules": ["producao", "logistica", "mobile"],
        "monthly_price": 697,
        "trial_days": 0,
    },
}

# =====================================================================
#  HELPERS: PERSISTÊNCIA JSON
# =====================================================================
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

# =====================================================================
#  AUTENTICAÇÃO DO BACKOFFICE
# =====================================================================
def verify_admin_token(
    x_backoffice_admin_token: Optional[str] = Header(None),
    backoffice_session: Optional[str] = Cookie(None)
):
    """Valida o token administrativo nas rotas de controle central.
    Aceita via header X-Backoffice-Admin-Token OU cookie backoffice_session."""
    token = x_backoffice_admin_token or backoffice_session
    if not token or token != BACKOFFICE_ADMIN_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Acesso negado: Senha administrativa incorreta ou ausente."
        )

class BackofficeLoginRequest(BaseModel):
    password: str

@router.post("/login")
async def backoffice_login(payload: BackofficeLoginRequest, response: Response):
    """Endpoint de autenticação do Backoffice Central."""
    if payload.password != BACKOFFICE_ADMIN_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Senha administrativa incorreta."
        )
    response.set_cookie(
        key="backoffice_session",
        value=BACKOFFICE_ADMIN_TOKEN,
        max_age=86400,
        httponly=False,
        samesite="lax",
        path="/"
    )
    return {"success": True, "message": "Autenticado com sucesso no Backoffice Central."}

@router.get("/health")
async def backoffice_health():
    """Endpoint de diagnóstico do Backoffice Central (sem autenticação)."""
    is_custom_token = os.getenv("BACKOFFICE_ADMIN_TOKEN") is not None
    token_len = len(BACKOFFICE_ADMIN_TOKEN)
    token_hint = BACKOFFICE_ADMIN_TOKEN[:2] + "*" * (token_len - 2) if token_len > 2 else "**"
    return {
        "status": "ok",
        "fabricos_mode": os.getenv("FABRICOS_MODE", "not set"),
        "custom_admin_token_configured": is_custom_token,
        "admin_token_hint": token_hint,
        "admin_token_length": token_len,
        "db_file": DB_FILE
    }

# =====================================================================
#  HELPERS: CRIPTOGRAFIA E LICENCIAMENTO
# =====================================================================
def create_backoffice_license_token(tenant_id: str, client_name: str, enabled_modules: List[str], expires_in_days: int = 30) -> str:
    """Gera chaves de licença assimétricas assinadas com RSA."""
    payload = {
        "tenant_id": tenant_id,
        "client_name": client_name,
        "enabled_modules": enabled_modules,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=expires_in_days)).isoformat(),
        "iat": int(datetime.now(timezone.utc).timestamp())
    }
    return jwt.encode(payload, PRIVATE_KEY_PEM, algorithm="RS256")

def get_client_license_state(tenant_id: str) -> dict:
    """Retorna o estado da licença do cliente, com persistência automática."""
    db_data = load_central_db()
    if tenant_id not in db_data:
        now = datetime.now(timezone.utc)
        db_data[tenant_id] = {
            "tenant_id": tenant_id,
            "client_name": f"Cliente Filial {tenant_id[:8].upper()}",
            "enabled_modules": ["producao"],
            "update_channel": "stable",
            "current_version": "1.0.0",
            "latest_version": "1.0.0",
            "is_active": True,
            "is_locked": False,
            "last_ping_at": now.isoformat(),
            # Plano e Financeiro
            "plan": "starter",
            "plan_name": "Starter",
            "monthly_price": 197,
            "payment_status": "active",  # active, overdue, trial, cancelled
            "next_billing_date": (now + timedelta(days=30)).isoformat(),
            "trial_ends_at": None,
            "created_at": now.isoformat(),
        }
        save_central_db(db_data)
    return db_data[tenant_id]

# =====================================================================
#  PYDANTIC MODELS
# =====================================================================
class LicenseValidationRequest(BaseModel):
    tenant_id: str
    license_key: Optional[str] = None

class LicenseUpdateRequest(BaseModel):
    client_name: Optional[str] = None
    enabled_modules: Optional[List[str]] = None
    update_channel: Optional[str] = None
    is_active: Optional[bool] = None
    plan: Optional[str] = None
    payment_status: Optional[str] = None
    next_billing_date: Optional[str] = None
    monthly_price: Optional[float] = None
    trial_ends_at: Optional[str] = None

class CreateClientRequest(BaseModel):
    client_name: str
    admin_email: str
    admin_password: str
    admin_full_name: str
    plan: str = "trial"  # trial, starter, professional, enterprise

class CreateUserRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "user"  # admin, manager, user

class UpdateUserRequest(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    new_password: Optional[str] = None
    is_active: Optional[bool] = None

# =====================================================================
#  ENDPOINTS: VALIDAÇÃO DE LICENÇA (chamado pelo cliente local)
# =====================================================================
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
    now = datetime.now(timezone.utc)
    state["last_ping_at"] = now.isoformat()
    
    # Verifica inadimplência automática com carência de 5 dias
    payment_status = state.get("payment_status", "active")
    next_billing_date_str = state.get("next_billing_date")
    
    grace_period_active = False
    grace_days_left = 0
    
    if payment_status == "overdue":
        if next_billing_date_str:
            due_date = datetime.fromisoformat(next_billing_date_str)
            if due_date.tzinfo is None:
                due_date = due_date.replace(tzinfo=timezone.utc)
            
            days_overdue = (now - due_date).days
            if 0 <= days_overdue <= 5:
                # Dentro da carência de 5 dias
                state["is_active"] = True
                state["is_locked"] = False
                grace_period_active = True
                grace_days_left = 5 - days_overdue
            else:
                # Estourou a carência ou já estava muito atrasado
                state["is_active"] = False
                state["is_locked"] = True
        else:
            state["is_active"] = False
            state["is_locked"] = True
    
    # Verifica expiração do trial
    trial_ends = state.get("trial_ends_at")
    if trial_ends and state.get("plan") == "trial":
        trial_dt = datetime.fromisoformat(trial_ends)
        if trial_dt.tzinfo is None:
            trial_dt = trial_dt.replace(tzinfo=timezone.utc)
        if now > trial_dt:
            state["is_active"] = False
            state["is_locked"] = True
            state["payment_status"] = "trial_expired"
    
    save_central_db(db_data)
    
    # Se a licença foi desativada, retorna travado
    if not state["is_active"] or state["is_locked"]:
        return {
            "is_active": False,
            "is_locked": True,
            "detail": "Instância suspensa por pendências financeiras ou expiração."
        }
        
    # Gera um novo token assinado
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
        "update_channel": state["update_channel"],
        "grace_period_active": grace_period_active,
        "grace_days_left": grace_days_left
    }

# =====================================================================
#  ENDPOINTS: GESTÃO DE CLIENTES (CRUD)
# =====================================================================
import traceback
LAST_ERROR = {"error": "Nenhum erro registrado desde a inicialização."}

@router.get("/last_error")
async def get_last_error():
    return LAST_ERROR

@router.get("/clients")
async def list_backoffice_clients(admin: None = Depends(verify_admin_token)):
    """Retorna a lista de todas as instâncias de clientes."""
    db_data = load_central_db()
    return list(db_data.values())

@router.post("/clients")
async def create_client(
    payload: CreateClientRequest,
    db: AsyncSession = Depends(get_db),
    admin: None = Depends(verify_admin_token)
):
    """Cria um novo cliente (Tenant + Usuário Admin) no PostgreSQL e no JSON central."""
    # Verifica se o e-mail já existe
    existing = await db.execute(
        select(models.User).where(models.User.email == payload.admin_email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"O e-mail '{payload.admin_email}' já está em uso.")
    
    # Valida plano
    plan_config = PLANS.get(payload.plan)
    if not plan_config:
        raise HTTPException(status_code=400, detail=f"Plano '{payload.plan}' inválido. Use: trial, starter, professional, enterprise")
    
    now = datetime.now(timezone.utc)
    tenant_id = uuid.uuid4()
    
    # 1. Criar Tenant no PostgreSQL
    new_tenant = models.Tenant(
        id=tenant_id,
        name=payload.client_name,
        is_active=True
    )
    db.add(new_tenant)
    await db.flush() # Força a criação do tenant no banco para as constraints funcionarem
    
    # 2. Criar Usuário Admin no PostgreSQL
    new_user = models.User(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        email=payload.admin_email,
        hashed_password=get_password_hash(payload.admin_password),
        full_name=payload.admin_full_name,
        role="admin"
    )
    db.add(new_user)
    
    # 3. Criar LicenseConfig local no PostgreSQL
    license_token = create_backoffice_license_token(
        tenant_id=str(tenant_id),
        client_name=payload.client_name,
        enabled_modules=plan_config["enabled_modules"],
        expires_in_days=15 if payload.plan == "trial" else 30
    )
    new_license = models.LicenseConfig(
        tenant_id=tenant_id,
        license_key=license_token,
        is_locked=False,
        current_version="1.0.0",
        update_channel="stable"
    )
    db.add(new_license)
    
    await db.commit()
    
    # 4. Registrar no JSON central do Backoffice
    trial_ends = None
    if payload.plan == "trial":
        trial_ends = (now + timedelta(days=plan_config["trial_days"])).isoformat()
    
    client_state = {
        "tenant_id": str(tenant_id),
        "client_name": payload.client_name,
        "enabled_modules": plan_config["enabled_modules"],
        "update_channel": "stable",
        "current_version": "1.0.0",
        "latest_version": "1.0.0",
        "is_active": True,
        "is_locked": False,
        "last_ping_at": now.isoformat(),
        # Plano e Financeiro
        "plan": payload.plan,
        "plan_name": plan_config["plan_name"],
        "monthly_price": plan_config["monthly_price"],
        "payment_status": "trial" if payload.plan == "trial" else "active",
        "next_billing_date": (now + timedelta(days=30)).isoformat(),
        "trial_ends_at": trial_ends,
        "created_at": now.isoformat(),
    }
    
    db_data = load_central_db()
    db_data[str(tenant_id)] = client_state
    save_central_db(db_data)
    
    return {
        **client_state,
        "admin_email": payload.admin_email,
        "admin_full_name": payload.admin_full_name,
        "message": f"Cliente '{payload.client_name}' criado com sucesso! Login: {payload.admin_email}"
    }

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
    """Atualiza módulos, canais, planos e status financeiro do cliente."""
    db_data = load_central_db()
    if tenant_id not in db_data:
        state = get_client_license_state(tenant_id)
        db_data = load_central_db()
    else:
        state = db_data[tenant_id]
    
    # Atualiza campos básicos
    if payload.client_name is not None:
        state["client_name"] = payload.client_name
    if payload.enabled_modules is not None:
        state["enabled_modules"] = payload.enabled_modules
    if payload.update_channel is not None:
        state["update_channel"] = payload.update_channel
        if payload.update_channel == "beta":
            state["latest_version"] = "1.1.0-beta"
        elif payload.update_channel == "dev":
            state["latest_version"] = "1.2.0-dev"
        else:
            state["latest_version"] = "1.0.0"
    if payload.is_active is not None:
        state["is_active"] = payload.is_active
        state["is_locked"] = not payload.is_active
    
    # Atualiza plano
    if payload.plan is not None:
        plan_config = PLANS.get(payload.plan)
        if plan_config:
            state["plan"] = payload.plan
            state["plan_name"] = plan_config["plan_name"]
            state["monthly_price"] = plan_config["monthly_price"]
            state["enabled_modules"] = plan_config["enabled_modules"]
            if payload.plan == "trial":
                state["trial_ends_at"] = (datetime.now(timezone.utc) + timedelta(days=plan_config["trial_days"])).isoformat()
                state["payment_status"] = "trial"
    
    # Atualiza campos financeiros
    if payload.payment_status is not None:
        state["payment_status"] = payload.payment_status
        if payload.payment_status == "overdue":
            state["is_active"] = False
            state["is_locked"] = True
        elif payload.payment_status == "active":
            state["is_active"] = True
            state["is_locked"] = False
    if payload.next_billing_date is not None:
        state["next_billing_date"] = payload.next_billing_date
    if payload.monthly_price is not None:
        state["monthly_price"] = payload.monthly_price
    if payload.trial_ends_at is not None:
        state["trial_ends_at"] = payload.trial_ends_at
        
    save_central_db(db_data)
    return state

# =====================================================================
#  ENDPOINTS: GESTÃO DE USUÁRIOS POR TENANT
# =====================================================================
@router.get("/clients/{tenant_id}/users")
async def list_tenant_users(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    admin: None = Depends(verify_admin_token)
):
    """Lista todos os usuários de um tenant específico."""
    result = await db.execute(
        select(models.User).where(models.User.tenant_id == uuid.UUID(tenant_id))
    )
    users = result.scalars().all()
    
    # Busca info do tenant
    tenant_result = await db.execute(
        select(models.Tenant).where(models.Tenant.id == uuid.UUID(tenant_id))
    )
    tenant = tenant_result.scalar_one_or_none()
    
    return [
        {
            "id": str(u.id),
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "tenant_id": str(u.tenant_id),
            "tenant_name": tenant.name if tenant else "Desconhecido",
            "is_active": tenant.is_active if tenant else False,
        }
        for u in users
    ]

@router.post("/clients/{tenant_id}/users")
async def create_tenant_user(
    tenant_id: str,
    payload: CreateUserRequest,
    db: AsyncSession = Depends(get_db),
    admin: None = Depends(verify_admin_token)
):
    """Cria um novo usuário dentro de um tenant existente."""
    # Verifica se o tenant existe
    tenant_result = await db.execute(
        select(models.Tenant).where(models.Tenant.id == uuid.UUID(tenant_id))
    )
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado.")
    
    # Verifica se o e-mail já existe
    existing = await db.execute(
        select(models.User).where(models.User.email == payload.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"O e-mail '{payload.email}' já está em uso.")
    
    new_user = models.User(
        id=uuid.uuid4(),
        tenant_id=uuid.UUID(tenant_id),
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        role=payload.role
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return {
        "id": str(new_user.id),
        "email": new_user.email,
        "full_name": new_user.full_name,
        "role": new_user.role,
        "tenant_id": tenant_id,
        "message": f"Usuário '{new_user.full_name}' criado com sucesso!"
    }

@router.patch("/clients/{tenant_id}/users/{user_id}")
async def update_tenant_user(
    tenant_id: str,
    user_id: str,
    payload: UpdateUserRequest,
    db: AsyncSession = Depends(get_db),
    admin: None = Depends(verify_admin_token)
):
    """Atualiza dados de um usuário (nome, role, senha, ativo/inativo)."""
    result = await db.execute(
        select(models.User).where(
            models.User.id == uuid.UUID(user_id),
            models.User.tenant_id == uuid.UUID(tenant_id)
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado neste tenant.")
    
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.role is not None:
        user.role = payload.role
    if payload.new_password is not None:
        user.hashed_password = get_password_hash(payload.new_password)
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "tenant_id": tenant_id,
        "message": f"Usuário '{user.full_name}' atualizado com sucesso!"
    }

@router.delete("/clients/{tenant_id}/users/{user_id}")
async def delete_tenant_user(
    tenant_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: None = Depends(verify_admin_token)
):
    """Remove um usuário do tenant."""
    result = await db.execute(
        select(models.User).where(
            models.User.id == uuid.UUID(user_id),
            models.User.tenant_id == uuid.UUID(tenant_id)
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado neste tenant.")
    
    user_name = user.full_name
    await db.delete(user)
    await db.commit()
    
    return {"message": f"Usuário '{user_name}' removido com sucesso!", "deleted_id": user_id}

# =====================================================================
#  ENDPOINTS: PLANOS DISPONÍVEIS
# =====================================================================
@router.get("/plans")
async def list_plans(admin: None = Depends(verify_admin_token)):
    """Retorna os planos de licenciamento disponíveis."""
    return PLANS

# =====================================================================
#  ENDPOINTS: SIMULAÇÃO LOCAL
# =====================================================================
@router.post("/clients/{tenant_id}/simulate-local-update")
async def simulate_local_update(
    tenant_id: str, 
    db: AsyncSession = Depends(get_db),
    admin: None = Depends(verify_admin_token)
):
    """Simula a instalação física da atualização local."""
    db_data = load_central_db()
    if tenant_id not in db_data:
        state = get_client_license_state(tenant_id)
        db_data = load_central_db()
    else:
        state = db_data[tenant_id]
    
    query = select(models.LicenseConfig).where(models.LicenseConfig.tenant_id == uuid.UUID(tenant_id))
    result = await db.execute(query)
    config = result.scalar_one_or_none()
    
    if config:
        config.current_version = state["latest_version"]
        config.last_verified_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.add(config)
        await db.commit()
        await db.refresh(config)
        
        state["current_version"] = state["latest_version"]
        save_central_db(db_data)
        
    return state
