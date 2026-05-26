import asyncio
import uuid
from backend.app.core.database import AsyncSessionLocal
from backend.app.models.models import Tenant, User
from backend.app.core.auth import get_password_hash

async def seed_data():
    async with AsyncSessionLocal() as session:
        # Check if tenant exists
        tenant_id = uuid.uuid4()
        tenant = Tenant(id=tenant_id, name="FabricOS Demo")
        session.add(tenant)
        
        user = User(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            email="roberto@fabricos.com",
            full_name="Roberto FabricOS",
            hashed_password=get_password_hash("admin123"),
            role="admin"
        )
        session.add(user)
        await session.commit()
    print(f"Seed data created! Tenant ID: {tenant_id}")

if __name__ == "__main__":
    asyncio.run(seed_data())
