import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text

DATABASE_URL = 'postgresql+asyncpg://postgres.ompwfmomeyvzqhdzhnzz:Fabric%25402024@aws-1-us-east-2.pooler.supabase.com:5432/postgres'

engine = create_async_engine(
    DATABASE_URL,
    connect_args={
        'prepared_statement_cache_size': 0,
        'statement_cache_size': 0,
    }
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

async def test():
    async with AsyncSessionLocal() as session:
        try:
            await session.execute(text("SET app.current_tenant = 'test'"))
            print('SET OK')
            res = await session.execute(text("SELECT 1"))
            print('SELECT OK:', res.scalar())
        except Exception as e:
            print('ERROR:', type(e), str(e))

asyncio.run(test())
