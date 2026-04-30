import asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from backend.app.models import models
from backend.app.core.auth import get_password_hash
from backend.app.core.database import Base

DATABASE_URL = "sqlite+aiosqlite:///./fabricos.db"
engine = create_async_engine(DATABASE_URL)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def seed():
    async with AsyncSessionLocal() as session:
        # Create Tenant
        tenant_id = uuid.uuid4()
        tenant = models.Tenant(id=tenant_id, name="FabricOS Demo")
        session.add(tenant)
        
        # Create User
        user = models.User(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            email="roberto@fabricos.com",
            hashed_password=get_password_hash("admin123"),
            full_name="Roberto FabricOS",
            role="admin"
        )
        session.add(user)
        
        await session.commit()
        print(f"Seed complete. User: roberto@fabricos.com / admin123")
        print(f"Tenant ID: {tenant_id}")

if __name__ == "__main__":
    asyncio.run(seed())
