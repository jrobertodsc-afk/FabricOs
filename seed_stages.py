import asyncio
import sys
import os

# Adiciona o diretório raiz ao PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from backend.app.core.database import AsyncSessionLocal
from backend.app.models.models import ProductionStage, Tenant

stages_data = [
    # Estilo
    {"macro": "Estilo", "name": "Mural", "order": 1},
    {"macro": "Estilo", "name": "Compras", "order": 2},
    {"macro": "Estilo", "name": "Ficha", "order": 3},
    
    # Desenvolvimento
    {"macro": "Desenvolvimento", "name": "Modelagem", "order": 4},
    {"macro": "Desenvolvimento", "name": "Pilotagem", "order": 5},
    {"macro": "Desenvolvimento", "name": "Prova", "order": 6},
    {"macro": "Desenvolvimento", "name": "Aprovação", "order": 7},
    {"macro": "Desenvolvimento", "name": "Digitalização", "order": 8},
    {"macro": "Desenvolvimento", "name": "Consumo Individual", "order": 9},
    
    # Produção
    {"macro": "Produção", "name": "Família Fechada", "order": 10},
    {"macro": "Produção", "name": "Consumo Prova", "order": 11},
    {"macro": "Produção", "name": "Consumo Final", "order": 12},
    {"macro": "Produção", "name": "Risco", "order": 13},
    
    # Corte
    {"macro": "Corte", "name": "Conferência Risco", "order": 14},
    {"macro": "Corte", "name": "Enfesto", "order": 15},
    {"macro": "Corte", "name": "Corte", "order": 16},
    {"macro": "Corte", "name": "Entretela", "order": 17},
    {"macro": "Corte", "name": "Corte Entretela", "order": 18},
    {"macro": "Corte", "name": "Corte Viés", "order": 19},
    {"macro": "Corte", "name": "Separação e Embalagem", "order": 20},
    
    # Faccionista
    {"macro": "Faccionista", "name": "Aviamentos", "order": 21},
    {"macro": "Faccionista", "name": "1º Peça Produção", "order": 22},
    {"macro": "Faccionista", "name": "Aprovação Facção", "order": 23},
    {"macro": "Faccionista", "name": "Costura", "order": 24}, # Added back costura as they called it 'Produção' but it's sewing
    
    # Acabamento
    {"macro": "Acabamento", "name": "Contagem", "order": 25},
    {"macro": "Acabamento", "name": "Qualidade", "order": 26},
    {"macro": "Acabamento", "name": "Caseamento e Botão", "order": 27},
    {"macro": "Acabamento", "name": "Tag e Embalagem", "order": 28},
    {"macro": "Acabamento", "name": "Loja", "order": 29},
]

async def seed():
    async with AsyncSessionLocal() as db:
        # Tentar adicionar a coluna macro_stage
        try:
            await db.execute(text("ALTER TABLE production_stages ADD COLUMN macro_stage VARCHAR(50) DEFAULT 'Produção'"))
            await db.commit()
            print("Coluna macro_stage adicionada.")
        except Exception as e:
            print("Coluna macro_stage já existe ou erro ignorado:", e)
            await db.rollback()

        # Obter o tenant atual (assumindo que existe 1)
        import uuid
        
        result = await db.execute(text("SELECT id FROM tenants LIMIT 1"))
        tenant_id_raw = result.scalar()
        
        if not tenant_id_raw:
            print("Nenhum tenant encontrado!")
            return
            
        tenant_id = uuid.UUID(tenant_id_raw) if isinstance(tenant_id_raw, str) else tenant_id_raw

        # Limpar stages antigas (opcional, ou podemos apenas deletar e recriar para esse tenant)
        await db.execute(text("DELETE FROM production_stages WHERE tenant_id = :tenant_id"), {"tenant_id": tenant_id_raw})
        await db.commit()
        
        # Inserir novas stages
        for data in stages_data:
            stage = ProductionStage(
                tenant_id=tenant_id,
                name=data["name"],
                macro_stage=data["macro"],
                order=data["order"]
            )
            db.add(stage)
        
        await db.commit()
        print("Todas as 29 etapas inseridas com sucesso!")

if __name__ == "__main__":
    asyncio.run(seed())
