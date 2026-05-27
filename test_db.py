import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def test():
    engine = create_async_engine('postgresql+asyncpg://postgres.ompwfmomeyvzqhdzhnzz:Fabric%25402024@aws-1-us-east-2.pooler.supabase.com:5432/postgres')
    async with engine.begin() as conn:
        res = await conn.execute(text('SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname != \'pg_catalog\' AND schemaname != \'information_schema\''))
        tables = [r[0] for r in res.fetchall()]
        print('Tables:', tables)

asyncio.run(test())
