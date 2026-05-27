import asyncio
import uuid
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import engine, AsyncSessionLocal
from backend.app.models.models import Base, Tenant, User, LicenseConfig
from backend.app.core.auth import get_password_hash

# UUID de Tenant fixo padrão para garantir estabilidade e fácil pareamento com o backoffice
DEFAULT_TENANT_ID = uuid.UUID("d4c552db-8e6c-4869-906d-74d7df6db080")

async def auto_initialize_db():
    """
    Verifica se a base de dados (SQLite ou Postgres) está inicializada e com o usuário administrador padrão.
    Se não estiver, cria as tabelas e adiciona a semente inicial de forma automática no startup do app.
    """
    logger.info("Verificando/Inicializando tabelas do banco de dados de forma assíncrona...")
    
    # 1. Cria todas as tabelas se não existirem
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            
            # Migrations para adicionar colunas em tabelas existentes
            # Como SQLAlchemy create_all não altera tabelas existentes, forçamos os ALTER TABLEs.
            try:
                await conn.execute(text("ALTER TABLE products ADD COLUMN type VARCHAR(50) DEFAULT 'produto_acabado'"))
                logger.info("Coluna 'type' adicionada à tabela products.")
            except Exception:
                pass # Coluna já existe
                
            try:
                await conn.execute(text("ALTER TABLE withdrawals ADD COLUMN product_id VARCHAR(36)"))
                logger.info("Coluna 'product_id' adicionada à tabela withdrawals.")
            except Exception:
                pass # Coluna já existe

        logger.info("Tabelas do banco de dados verificadas/criadas com sucesso!")
    except Exception as e:
        logger.error(f"Falha ao rodar create_all no startup: {e}")
        return

    # 2. Insere dados iniciais se a tabela de Tenants estiver vazia
    try:
        async with AsyncSessionLocal() as session:
            # Verifica se já existe algum tenant cadastrado
            tenant_check = await session.execute(select(Tenant))
            existing_tenant = tenant_check.scalars().first()
            
            if not existing_tenant:
                logger.info("Base de dados vazia detectada. Iniciando auto-seed inicial...")
                
                # Criar Tenant padrão
                new_tenant = Tenant(
                    id=DEFAULT_TENANT_ID,
                    name="FabricOS Enterprise"
                )
                session.add(new_tenant)
                
                # Criar Usuário Administrador Mestre
                new_admin = User(
                    id=uuid.uuid4(),
                    tenant_id=DEFAULT_TENANT_ID,
                    email="roberto@fabricos.com",
                    hashed_password=get_password_hash("admin123"),
                    full_name="Roberto FabricOS",
                    role="admin"
                )
                session.add(new_admin)
                
                # Criar Configuração de Licença Local para o Tenant
                new_license = LicenseConfig(
                    tenant_id=DEFAULT_TENANT_ID,
                    license_key=None,
                    is_locked=False,
                    current_version="1.0.0",
                    update_channel="stable"
                )
                session.add(new_license)
                
                await session.commit()
                logger.info(f"Auto-seed concluído com sucesso! Usuário mestre disponível: roberto@fabricos.com / admin123")
                logger.info(f"Tenant ID Padrão Registrado: {DEFAULT_TENANT_ID}")
            else:
                logger.info("Tenant existente detectado. Nenhuma ação de semente (seed) necessária.")
    except Exception as e:
        logger.error(f"Erro durante execução do auto-seed no startup: {e}")
