from fastapi import FastAPI, Depends, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Annotated
import uuid

from backend.app.core.database import get_db, set_tenant_id
from backend.app.models import models
from backend.app.schemas import schemas
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api import withdrawals, partners, production, financials, products, materials, auth, system
from backend.app.api.deps import get_current_tenant_id

app = FastAPI(title="FabricOS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(withdrawals.router)
app.include_router(partners.router)
app.include_router(production.router)
app.include_router(financials.router)
app.include_router(products.router)
app.include_router(materials.router)
app.include_router(system.router)

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/health")
async def health():
    return {"status": "ok"}
