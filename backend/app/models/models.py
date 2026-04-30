import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, ForeignKey, DateTime, Integer, JSON, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.core.database import Base

class Tenant(Base):
    __tablename__ = "tenants"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    users: Mapped[List["User"]] = relationship(back_populates="tenant")
    withdrawals: Mapped[List["Withdrawal"]] = relationship(back_populates="tenant")
    production_stages: Mapped[List["ProductionStage"]] = relationship(back_populates="tenant")

class ProductionStage(Base):
    __tablename__ = "production_stages"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    
    name: Mapped[str] = mapped_column(String(50))
    order: Mapped[int] = mapped_column(Integer) # For sorting
    
    tenant: Mapped["Tenant"] = relationship(back_populates="production_stages")

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), default="user") # admin, manager, user
    
    tenant: Mapped["Tenant"] = relationship(back_populates="users")

class Partner(Base):
    __tablename__ = "partners"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    
    name: Mapped[str] = mapped_column(String(255))
    contact_name: Mapped[Optional[str]] = mapped_column(String(255))
    phone_number: Mapped[Optional[str]] = mapped_column(String(20))
    address: Mapped[Optional[str]] = mapped_column(Text)
    specialty: Mapped[Optional[str]] = mapped_column(String(100)) # costura, bordado, etc.
    portal_token: Mapped[str] = mapped_column(String(100), unique=True, default=lambda: str(uuid.uuid4()))
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    withdrawals: Mapped[List["Withdrawal"]] = relationship(back_populates="partner")
    production_orders: Mapped[List["ProductionOrder"]] = relationship(back_populates="partner")

class ProductionOrder(Base):
    __tablename__ = "production_orders"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    partner_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("partners.id"))
    product_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("products.id"))
    
    order_number: Mapped[str] = mapped_column(String(50), unique=True)
    item_name: Mapped[str] = mapped_column(String(255))
    total_quantity: Mapped[int] = mapped_column(Integer)
    price_per_piece: Mapped[float] = mapped_column(Integer, default=0) # Valor do serviço
    current_stage: Mapped[str] = mapped_column(String(50), default="Corte") # Corte, Costura, Acabamento, Finalizado
    status: Mapped[str] = mapped_column(String(50), default="em_andamento")
    nf_number: Mapped[Optional[str]] = mapped_column(String(100))
    nf_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    collection: Mapped[Optional[str]] = mapped_column(String(100))
    size_grade: Mapped[Optional[dict]] = mapped_column(JSON) # {"PP": 10, "P": 20...}
    observations: Mapped[Optional[str]] = mapped_column(Text)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    partner: Mapped[Optional["Partner"]] = relationship(back_populates="production_orders")
    product: Mapped[Optional["Product"]] = relationship(back_populates="production_orders")
    settlements: Mapped[List["Settlement"]] = relationship(back_populates="order")

class Settlement(Base):
    __tablename__ = "settlements"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("production_orders.id"))
    partner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("partners.id"))
    
    total_amount: Mapped[float] = mapped_column(Integer) # Qtd * Preço
    deductions: Mapped[float] = mapped_column(Integer, default=0) # Descontos por defeito
    net_amount: Mapped[float] = mapped_column(Integer) # Valor final
    
    status: Mapped[str] = mapped_column(String(50), default="pendente") # pendente, pago
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    order: Mapped["ProductionOrder"] = relationship(back_populates="settlements")

class QualityRecord(Base):
    __tablename__ = "quality_records"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    withdrawal_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("withdrawals.id"))
    partner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("partners.id"))
    
    defect_type: Mapped[str] = mapped_column(String(100))
    quantity: Mapped[int] = mapped_column(Integer)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Withdrawal(Base):
    __tablename__ = "withdrawals"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    partner_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("partners.id"))
    
    item_name: Mapped[str] = mapped_column(String(255))
    person_name: Mapped[str] = mapped_column(String(255))
    phone_number: Mapped[Optional[str]] = mapped_column(String(20))
    reason: Mapped[str] = mapped_column(String(100))
    type: Mapped[str] = mapped_column(String(50)) # interno, faccionista
    destination: Mapped[Optional[str]] = mapped_column(String(255))
    expected_return: Mapped[Optional[datetime]] = mapped_column(DateTime)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    photo_url: Mapped[Optional[str]] = mapped_column(String(512))
    status: Mapped[str] = mapped_column(String(50), default="pendente") # pendente, devolvido
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    items: Mapped[List["WithdrawalItem"]] = relationship(back_populates="withdrawal", cascade="all, delete-orphan")
    tenant: Mapped["Tenant"] = relationship(back_populates="withdrawals")
    partner: Mapped[Optional["Partner"]] = relationship(back_populates="withdrawals")

class WithdrawalItem(Base):
    __tablename__ = "withdrawal_items"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    withdrawal_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("withdrawals.id"))
    
    size: Mapped[str] = mapped_column(String(10)) # PP, P, M, G, GG, U
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    
    withdrawal: Mapped["Withdrawal"] = relationship(back_populates="items")

class Product(Base):
    __tablename__ = "products"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    
    reference: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    base_price: Mapped[float] = mapped_column(Integer, default=0)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    materials: Mapped[List["ProductMaterial"]] = relationship(back_populates="product")
    production_orders: Mapped[List["ProductionOrder"]] = relationship(back_populates="product")

class Material(Base):
    __tablename__ = "materials"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    
    name: Mapped[str] = mapped_column(String(255))
    unit: Mapped[str] = mapped_column(String(20)) # un, metros, rolo, etc.
    stock_quantity: Mapped[float] = mapped_column(Integer, default=0)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class ProductMaterial(Base):
    __tablename__ = "product_materials"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"))
    material_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("materials.id"))
    
    quantity: Mapped[float] = mapped_column(Integer) # Quantidade por peça
    
    product: Mapped["Product"] = relationship(back_populates="materials")
    material: Mapped["Material"] = relationship()

# Add product_id to ProductionOrder
# (I'll do this in the next step to avoid too many changes at once)
