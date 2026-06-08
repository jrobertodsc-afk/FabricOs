from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError, jwt
import uuid
from datetime import datetime, timezone, timedelta
from typing import Annotated, List, Optional
import httpx

from backend.app.core.database import get_db, set_tenant_id
from backend.app.models import models
from backend.app.api.deps import get_current_tenant_id
from backend.app.core.logger import logger

# Modo de execução do FabricOS (padrão 'development' para facilidade de testes)
import os
FABRICOS_MODE = os.getenv("FABRICOS_MODE", "development")

# Chave pública RSA 2048-bit (embutida no cliente para verificar assinaturas)
PUBLIC_KEY_PEM = """-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5OLDsvedl2GXAFn+lDEj
/1TzqTYyIHgkFnUO6txp+60YfvJleu1XQ7I0hCBEsXKMVkrajDh3SIOAlXw20pIs
NYMK7vn18Tcv+pDTul8rtoPVXiMwjFB7H/MvVEWYFucjlljAQB7UCv/uSRHb0mpg
U+EtizrgOqcair6ERt2lSliOEBKvSMOYctS/dY89Wk0noWHuux8vWWUqfkks/qSw
i4i08eh8aFUDHwIFEgEK2ySbV5XltNt1NjeL1uwrBjheuaSgot0RtGFCrz00BlZk
AyKEn9xh2I5s1u+0AbmDH4C5PusY49eOw4l+DAk37npltCv7QE4f+yIvmCgVN6Yc
AwIDAQAB
-----END PUBLIC KEY-----"""

ALGORITHM = "RS256"

# URL do Servidor Central Backoffice
_port = os.getenv("PORT", "8000")
CENTRAL_BACKOFFICE_URL = os.getenv("CENTRAL_BACKOFFICE_URL", f"http://127.0.0.1:{_port}/api/backoffice")

def get_private_key() -> Optional[str]:
    """Recupera a chave privada de forma dinâmica para auto-licenciamento em desenvolvimento."""
    if FABRICOS_MODE != "production":
        try:
            import importlib
            backoffice = importlib.import_module("backend.app.api.backoffice_server")
            return getattr(backoffice, "PRIVATE_KEY_PEM", None)
        except Exception:
            return None
    return None


async def get_or_create_license_config(db: AsyncSession, tenant_id: uuid.UUID) -> models.LicenseConfig:
    """Busca ou inicializa a licença local padrão para o tenant."""
    query = select(models.LicenseConfig).where(models.LicenseConfig.tenant_id == tenant_id)
    result = await db.execute(query)
    config = result.scalar_one_or_none()
    
    if not config:
        # Cria uma licença padrão em desenvolvimento ou mantém bloqueado em produção
        priv_key = get_private_key()
        if priv_key:
            default_token = jwt.encode({
                "tenant_id": str(tenant_id),
                "client_name": "Cliente Homologação FabricOS",
                "enabled_modules": ["producao", "logistica", "mobile"],
                "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
                "iat": int(datetime.now(timezone.utc).timestamp())
            }, priv_key, algorithm=ALGORITHM)
        else:
            default_token = "LICENÇA_PENDENTE_PRODUÇÃO"
            
        config = models.LicenseConfig(
            tenant_id=tenant_id,
            license_key=default_token,
            is_locked=False if priv_key else True, # Já nasce trancado em produção
            last_verified_at=datetime.now(timezone.utc).replace(tzinfo=None),
            offline_grace_started_at=None,
            current_version="1.0.0",
            update_channel="stable"
        )
        db.add(config)
        await db.commit()
        await db.refresh(config)
        
    return config

async def ping_central_backoffice(db: AsyncSession, config: models.LicenseConfig):
    """Realiza o ping de verificação online ao Backoffice Central com resiliência offline."""
    try:
        # Simula chamada HTTP de verificação para o nosso Backoffice
        # Passa o UUID e a chave criptográfica atual para conferência
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{CENTRAL_BACKOFFICE_URL}/license/validate",
                json={
                    "tenant_id": str(config.tenant_id),
                    "license_key": config.license_key
                },
                timeout=5.0 # Timeout ampliado para Railway
            )
        
        if response.status_code == 200:
            data = response.json()
            # Se o Backoffice Central desativou a instância à distância
            if not data.get("is_active", True) or data.get("is_locked", False):
                config.is_locked = True
                logger.warning(f"INSTÂNCIA BLOQUEADA REMOTAMENTE PELO BACKOFFICE: tenant {config.tenant_id}")
            else:
                # Atualiza com o novo token de licença retornado se houver
                if "license_key" in data:
                    config.license_key = data["license_key"]
                config.is_locked = False
                config.offline_grace_started_at = None # Reseta contador offline
                config.last_verified_at = datetime.now(timezone.utc).replace(tzinfo=None)
            
            db.add(config)
            await db.commit()
            return data
            
        elif response.status_code == 403:
            # Trava instantânea
            config.is_locked = True
            db.add(config)
            await db.commit()
            return {}
            
    except Exception as e:
        # Falha de Conexão (Ambiente Offline)
        logger.info(f"Conexão com o Backoffice central indisponível ({e}). Iniciando protocolo offline...")
        
        # Verifica se o grace period offline de 3 dias estourou
        if config.offline_grace_started_at is None:
            config.offline_grace_started_at = datetime.now(timezone.utc).replace(tzinfo=None)
            db.add(config)
            await db.commit()
        else:
            grace_started = config.offline_grace_started_at
            if grace_started.tzinfo is not None:
                grace_started = grace_started.replace(tzinfo=None)
            elapsed = datetime.now(timezone.utc).replace(tzinfo=None) - grace_started
            if elapsed > timedelta(hours=72): # Estourou as 72 horas offline!
                config.is_locked = True
                db.add(config)
                await db.commit()
                logger.error(f"LOCKDOWN ATIVO: Instância offline por mais de 72 horas. Bloqueando operações.")
        
        return {}

class LicenseChecker:
    def __init__(self, required_module: str):
        self.required_module = required_module

    async def __call__(
        self,
        tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
        db: AsyncSession = Depends(get_db)
    ):
        await set_tenant_id(db, str(tenant_id))
        config = await get_or_create_license_config(db, tenant_id)
        
        # 1. Executa verificação de trava remota em background (ping rápido)
        # Em produção, isso pode rodar assíncrono. Aqui executamos de forma integrada.
        await ping_central_backoffice(db, config)
        
        # 2. Verifica se a instância está travada (kill-switch ativo)
        if config.is_locked:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Instância suspensa por pendências financeiras ou expiração. Entre em contato com a FabricOS."
            )
            
        # 3. Decodifica o token criptográfico local e valida módulos
        try:
            payload = jwt.decode(config.license_key, PUBLIC_KEY_PEM, algorithms=[ALGORITHM])
            
            # Valida expiração do token
            expires_at = datetime.fromisoformat(payload.get("expires_at"))
            now_dt = datetime.now(timezone.utc)
            if expires_at.tzinfo is None:
                now_dt = now_dt.replace(tzinfo=None)
            else:
                expires_at = expires_at.astimezone(timezone.utc)
            if now_dt > expires_at:
                # Seta trava por expiração física
                config.is_locked = True
                db.add(config)
                await db.commit()
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Licença expirada. Por favor, renove sua assinatura no Backoffice."
                )
                
            enabled_modules = payload.get("enabled_modules", [])
            
            # Verifica se o módulo requerido está licenciado
            if self.required_module not in enabled_modules:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Módulo '{self.required_module}' não licenciado nesta instância. Adquira a licença correspondente no Backoffice."
                )
                
            return payload
            
        except (JWTError, ValueError) as e:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chave de licença local corrompida ou inválida! Assinatura criptográfica incorreta."
            )

# Dependências injetáveis exportadas
verify_production_license = LicenseChecker("producao")
verify_logistics_license = LicenseChecker("logistica")
verify_mobile_license = LicenseChecker("mobile")
