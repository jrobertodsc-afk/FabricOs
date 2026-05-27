import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def test():
    engine = create_async_engine('postgresql+asyncpg://postgres.ompwfmomeyvzqhdzhnzz:Fabric%25402024@aws-1-us-east-2.pooler.supabase.com:5432/postgres')
    async with engine.begin() as conn:
        await conn.execute(text("SET app.current_tenant = 'test'"))
        res = await conn.execute(text("SHOW app.current_tenant"))
        print('Tenant:', res.scalar())

asyncio.run(test())
