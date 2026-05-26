import asyncio
import uuid
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select
from backend.app.models import models
from backend.app.core.auth import get_password_hash
from backend.app.core.database import Base

import os

# Caminhos das bases de dados (Tanto no root quanto na pasta compilada do cliente)
DB_PATHS = ["./fabricos.db"]
if os.path.exists("./FabricOS-Enterprise/fabricos.db"):
    DB_PATHS.append("./FabricOS-Enterprise/fabricos.db")

async def create_user_in_db(db_path, full_name, email, password, role):
    db_url = f"sqlite+aiosqlite:///{db_path}"
    engine = create_async_engine(db_url)
    AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        # Busca o Tenant cadastrado na base de dados
        result = await session.execute(select(models.Tenant))
        tenant = result.scalars().first()
        
        if not tenant:
            print(f"[ERRO] Nenhum Tenant cadastrado em {db_path}.")
            await engine.dispose()
            return False
            
        # Verifica se o email já existe
        existing = await session.execute(select(models.User).where(models.User.email == email))
        if existing.scalars().first():
            print(f"[AVISO] Usuário {email} já existia em {db_path} (pulando).")
            await engine.dispose()
            return True
            
        new_user = models.User(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            email=email,
            hashed_password=get_password_hash(password),
            full_name=full_name,
            role=role
        )
        session.add(new_user)
        await session.commit()
        await engine.dispose()
        return True

async def create_user():
    print("\n=======================================================")
    print("      FabricOS Enterprise - Cadastrar Novo Usuário     ")
    print("=======================================================\n")
    
    full_name = input("Nome Completo do Cliente: ").strip()
    email = input("E-mail de Login do Cliente: ").strip()
    password = input("Senha de Acesso: ").strip()
    role = input("Cargo (admin / manager / user) [admin]: ").strip() or "admin"
    
    if not full_name or not email or not password:
        print("\n[ERRO] Nome, E-mail e Senha são obrigatórios!")
        return

    success_count = 0
    for path in DB_PATHS:
        print(f"Salvando no banco: {path}...")
        success = await create_user_in_db(path, full_name, email, password, role)
        if success:
            success_count += 1
            
    if success_count > 0:
        print("\n=======================================================")
        print("🎉 Usuário criado com sucesso!")
        print(f"Nome: {full_name}")
        print(f"E-mail: {email}")
        print(f"Senha: {password}")
        print(f"Cargo: {role}")
        print("=======================================================\n")


if __name__ == "__main__":
    try:
        asyncio.run(create_user())
    except KeyboardInterrupt:
        print("\nOperação cancelada pelo usuário.")
