import asyncio
import uuid
from backend.app.core.database import async_session
from backend.app.models.models import Tenant, User

async def seed_data():
    async with async_session() as session:
        # Check if tenant exists
        tenant_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
        tenant = Tenant(id=tenant_id, name="Empresa Teste", subdomain="teste")
        session.add(tenant)
        
        user = User(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            email="admin@teste.com",
            full_name="Administrador",
            is_active=True
        )
        session.add(user)
        await session.commit()
    print(f"Seed data created! Tenant ID: {tenant_id}")

if __name__ == "__main__":
    asyncio.run(seed_data())
