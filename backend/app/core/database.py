import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from backend.app.core.config import settings

# DATABASE_URL vem do .env via pydantic-settings
DATABASE_URL = settings.DATABASE_URL

engine = create_async_engine(
    DATABASE_URL,
    echo=settings.DEBUG,  # Só loga SQL em modo DEBUG, evita poluição nos logs de produção
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
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
    Usa parâmetro vinculado para prevenir SQL Injection.
    """
    if "postgresql" in str(engine.url):
        # Usa execute com literal_column para evitar interpolação direta de string
        await session.execute(
            text("SET app.tenant_id = :tid"),
            {"tid": tenant_id}
        )
