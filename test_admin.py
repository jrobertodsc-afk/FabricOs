import asyncio
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import uuid

pwd_context = CryptContext(schemes=['pbkdf2_sha256'], deprecated='auto')
hash_pwd = pwd_context.hash('admin123')

async def test():
    engine = create_async_engine('postgresql+asyncpg://postgres.ompwfmomeyvzqhdzhnzz:Fabric%25402024@aws-1-us-east-2.pooler.supabase.com:5432/postgres')
    async with engine.begin() as conn:
        res = await conn.execute(text('SELECT id FROM tenants LIMIT 1'))
        tenant_id = res.scalar()
        
        user_id = str(uuid.uuid4())
        await conn.execute(text(f"INSERT INTO users (id, tenant_id, email, hashed_password, full_name, role) VALUES ('{user_id}', '{tenant_id}', 'admin@fabricos.com', '{hash_pwd}', 'Admin Test', 'admin')"))
        print('Inserted admin user.')

asyncio.run(test())
