import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from backend.app.core.config import settings

# DATABASE_URL vem do .env via pydantic-settings
DATABASE_URL = settings.DATABASE_URL
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Remove unsupported ?pgbouncer=true parameter for asyncpg
if "?pgbouncer=true" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("?pgbouncer=true", "")
if "&pgbouncer=true" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("&pgbouncer=true", "")

connect_args = {}
if "sqlite" in DATABASE_URL:
    connect_args["check_same_thread"] = False
elif "postgresql" in DATABASE_URL:
    # Fix para o pooler (PGBouncer) do Supabase com asyncpg
    connect_args["prepared_statement_cache_size"] = 0
    connect_args["statement_cache_size"] = 0

engine = create_async_engine(
    DATABASE_URL,
    echo=settings.DEBUG,  # Só loga SQL em modo DEBUG, evita poluição nos logs de produção
    connect_args=connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def set_tenant_id(session: AsyncSession, tenant_id: str) -> None:
    """
    Define o tenant_id na sessão PostgreSQL para Row-Level Security (RLS).
    O tenant_id é garantido ser um UUID válido pelas dependências do FastAPI,
    o que previne SQL Injection.
    """
    if "postgresql" in str(engine.url):
        # Asyncpg/Postgres não suportam parâmetros ($1) em comandos SET.
        # Formatamos a string diretamente.
        await session.execute(text(f"SET app.tenant_id = '{tenant_id}'"))
