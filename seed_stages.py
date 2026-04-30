import asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select
from backend.app.models import models
from backend.app.core.database import Base

DATABASE_URL = "sqlite+aiosqlite:///./fabricos.db"
engine = create_async_engine(DATABASE_URL)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def seed_stages():
    async with AsyncSessionLocal() as session:
        # Get the tenant (we created it in seed.py)
        result = await session.execute(select(models.Tenant))
        tenant = result.scalars().first()
        
        if not tenant:
            print("No tenant found. Run seed.py first.")
            return
            
        # Add default stages
        stages = [
            {"name": "Corte", "order": 1},
            {"name": "Costura", "order": 2},
            {"name": "Acabamento", "order": 3},
            {"name": "Finalizado", "order": 4}
        ]
        
        for s in stages:
            new_stage = models.ProductionStage(
                id=uuid.uuid4(),
                tenant_id=tenant.id,
                name=s["name"],
                order=s["order"]
            )
            session.add(new_stage)
            
        await session.commit()
        print(f"Default stages added for tenant: {tenant.name}")

if __name__ == "__main__":
    asyncio.run(seed_stages())
