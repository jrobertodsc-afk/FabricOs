import json
import asyncio
import uuid
import os
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text

# Add backend to path to import models
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app.models import models

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/fabricos")
JSON_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'withdrawals.json')

engine = create_async_engine(DATABASE_URL)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession)

async def migrate():
    if not os.path.exists(JSON_FILE):
        print(f"File {JSON_FILE} not found.")
        return

    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    async with AsyncSessionLocal() as session:
        # 1. Create a default tenant if not exists
        # In a real migration, we'd ask for the tenant_id
        tenant_id = uuid.uuid4()
        tenant = models.Tenant(id=tenant_id, name="Confeccção Roberto (Migrated)")
        session.add(tenant)
        await session.flush()
        
        print(f"Migrating {len(data)} records to Tenant: {tenant.name} ({tenant_id})")

        for entry in data:
            # Parse created_at
            try:
                created_at = datetime.strptime(entry.get('created_at', ''), '%Y-%m-%d %H:%M:%S')
            except:
                created_at = datetime.utcnow()

            new_withdrawal = models.Withdrawal(
                id=uuid.UUID(entry['id']) if 'id' in entry else uuid.uuid4(),
                tenant_id=tenant_id,
                item_name=entry.get('item_name', 'Sem Nome'),
                person_name=entry.get('person_name', 'Desconhecido'),
                phone_number=entry.get('phone_number'),
                reason=entry.get('reason', 'Outro'),
                type=entry.get('type', 'interno'),
                destination=entry.get('destination'),
                status=entry.get('status', 'pendente'),
                notes=entry.get('notes'),
                created_at=created_at,
                photo_url=entry.get('photo_url')
            )
            session.add(new_withdrawal)
            
            # Migrate sizes/items
            sizes = entry.get('sizes', {})
            for size, qty in sizes.items():
                if int(qty) > 0:
                    item = models.WithdrawalItem(
                        withdrawal_id=new_withdrawal.id,
                        size=size,
                        quantity=int(qty)
                    )
                    session.add(item)
                    
            # Migrate return info if exists
            if entry.get('status') == 'devolvido':
                ret = models.Return(
                    withdrawal_id=new_withdrawal.id,
                    returned_at=datetime.utcnow(), # Approximate
                    return_detail=entry.get('return_detail', 'ok'),
                    notes=entry.get('return_notes')
                )
                session.add(ret)

        await session.commit()
        print("Migration completed successfully.")

if __name__ == "__main__":
    asyncio.run(migrate())
