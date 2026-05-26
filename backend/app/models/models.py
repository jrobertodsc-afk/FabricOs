import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import String, ForeignKey, DateTime, Integer, Numeric, JSON, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.core.database import Base


def _now_utc() -> datetime:
    """Helper timezone-aware para evitar o uso do deprecated datetime.utcnow()."""
    return datetime.now(timezone.utc)


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now_utc)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    users: Mapped[List["User"]] = relationship(back_populates="tenant")
    withdrawals: Mapped[List["Withdrawal"]] = relationship(back_populates="tenant")
    production_stages: Mapped[List["ProductionStage"]] = relationship(back_populates="tenant")


class ProductionStage(Base):
    __tablename__ = "production_stages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)

    name: Mapped[str] = mapped_column(String(50))
    order: Mapped[int] = mapped_column(Integer)  # Para ordenação

    tenant: Mapped["Tenant"] = relationship(back_populates="production_stages")


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), default="user")  # admin, manager, user

    tenant: Mapped["Tenant"] = relationship(back_populates="users")


class Partner(Base):
    __tablename__ = "partners"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)

    name: Mapped[str] = mapped_column(String(255))
    contact_name: Mapped[Optional[str]] = mapped_column(String(255))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    phone_number: Mapped[Optional[str]] = mapped_column(String(20))
    address: Mapped[Optional[str]] = mapped_column(Text)
    specialty: Mapped[Optional[str]] = mapped_column(String(100))  # costura, bordado, etc.
    type: Mapped[str] = mapped_column(String(50), default="faccionista")  # faccionista, interno
    portal_token: Mapped[str] = mapped_column(String(100), unique=True, default=lambda: str(uuid.uuid4()))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now_utc)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(50), default="ATIVO")
    pending_losses_count: Mapped[int] = mapped_column(Integer, default=0)

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
    # CORRIGIDO: era Integer, o que truncava valores decimais como R$ 12,50 → 12
    price_per_piece: Mapped[float] = mapped_column(Numeric(precision=10, scale=2), default=0)
    current_stage: Mapped[str] = mapped_column(String(50), default="Corte")
    status: Mapped[str] = mapped_column(String(50), default="em_andamento")
    nf_number: Mapped[Optional[str]] = mapped_column(String(100))
    nf_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    collection: Mapped[Optional[str]] = mapped_column(String(100))
    size_grade: Mapped[Optional[dict]] = mapped_column(JSON)  # {"PP": 10, "P": 20...}
    observations: Mapped[Optional[str]] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now_utc)

    partner: Mapped[Optional["Partner"]] = relationship(back_populates="production_orders")
    product: Mapped[Optional["Product"]] = relationship(back_populates="production_orders")
    settlements: Mapped[List["Settlement"]] = relationship(back_populates="order")


class Settlement(Base):
    __tablename__ = "settlements"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("production_orders.id"))
    partner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("partners.id"))

    # CORRIGIDO: era Integer, o que truncava centavos
    total_amount: Mapped[float] = mapped_column(Numeric(precision=10, scale=2))
    deductions: Mapped[float] = mapped_column(Numeric(precision=10, scale=2), default=0)
    net_amount: Mapped[float] = mapped_column(Numeric(precision=10, scale=2))

    nf_number: Mapped[Optional[str]] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(50), default="pendente")  # pendente, pago
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now_utc)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

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

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now_utc)


class Withdrawal(Base):
    __tablename__ = "withdrawals"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    partner_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("partners.id"))
    production_order_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("production_orders.id"))
    employee_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("employees.id"), nullable=True)

    item_name: Mapped[str] = mapped_column(String(255))
    person_name: Mapped[str] = mapped_column(String(255))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    phone_number: Mapped[Optional[str]] = mapped_column(String(20))
    reason: Mapped[str] = mapped_column(String(100))
    type: Mapped[str] = mapped_column(String(50))  # interno, faccionista, ACERVO
    destination: Mapped[Optional[str]] = mapped_column(String(255))
    expected_return: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    photo_urls: Mapped[Optional[list]] = mapped_column(JSON)
    return_photo_urls: Mapped[Optional[list]] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(50), default="pendente")

    seq_id: Mapped[Optional[int]] = mapped_column(Integer)
    tracking_code: Mapped[Optional[str]] = mapped_column(String(20), unique=True, index=True)
    signature_url: Mapped[Optional[str]] = mapped_column(String(255))
    return_signature_url: Mapped[Optional[str]] = mapped_column(String(255))
    
    custody_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    custody_confirmed_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    replacement_cost_agreed: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now_utc)

    items: Mapped[List["WithdrawalItem"]] = relationship(back_populates="withdrawal", cascade="all, delete-orphan", lazy="selectin")
    tenant: Mapped["Tenant"] = relationship(back_populates="withdrawals")
    partner: Mapped[Optional["Partner"]] = relationship(back_populates="withdrawals")
    employee: Mapped[Optional["Employee"]] = relationship(back_populates="withdrawals")


class WithdrawalItem(Base):
    __tablename__ = "withdrawal_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    withdrawal_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("withdrawals.id"))

    size: Mapped[str] = mapped_column(String(10))  # PP, P, M, G, GG, U
    quantity: Mapped[int] = mapped_column(Integer, default=0)

    withdrawal: Mapped["Withdrawal"] = relationship(back_populates="items")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)

    reference: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    # CORRIGIDO: era Integer
    base_price: Mapped[float] = mapped_column(Numeric(precision=10, scale=2), default=0)
    image_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now_utc)

    materials: Mapped[List["ProductMaterial"]] = relationship(back_populates="product", lazy="selectin")
    production_orders: Mapped[List["ProductionOrder"]] = relationship(back_populates="product")


class Material(Base):
    __tablename__ = "materials"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)

    name: Mapped[str] = mapped_column(String(255))
    unit: Mapped[str] = mapped_column(String(20))  # un, metros, rolo, etc.
    # CORRIGIDO: era Integer
    stock_quantity: Mapped[float] = mapped_column(Numeric(precision=10, scale=3), default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now_utc)


class ProductMaterial(Base):
    __tablename__ = "product_materials"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"))
    material_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("materials.id"))

    # CORRIGIDO: era Integer (ex: 1,5 metro por peça era truncado para 1)
    quantity: Mapped[float] = mapped_column(Numeric(precision=10, scale=3))

    product: Mapped["Product"] = relationship(back_populates="materials")
    material: Mapped["Material"] = relationship(lazy="selectin")


class FinishedStockItem(Base):
    __tablename__ = "finished_stock_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"))
    stock_type: Mapped[str] = mapped_column(String(50))  # "producao" ou "acervo"
    size_grade: Mapped[dict] = mapped_column(JSON)  # {"PP": 0, "P": 0...}
    last_updated: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now_utc, onupdate=_now_utc)

    product: Mapped["Product"] = relationship(lazy="selectin")


class FinishedStockMovement(Base):
    __tablename__ = "finished_stock_movements"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"))
    stock_type: Mapped[str] = mapped_column(String(50))  # "producao" ou "acervo"
    movement_type: Mapped[str] = mapped_column(String(20))  # "entrada" ou "saida"
    quantity_grade: Mapped[dict] = mapped_column(JSON)  # {"PP": 5, "P": 10...}
    total_quantity: Mapped[int] = mapped_column(Integer)
    reference_op_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("production_orders.id"), nullable=True)
    description: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now_utc)

    product: Mapped["Product"] = relationship(lazy="selectin")


class PilotageCard(Base):
    __tablename__ = "pilotage_cards"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    model_name: Mapped[str] = mapped_column(String(255))  # Modelo (ex: Macaquinho Dani)
    raw_material: Mapped[str] = mapped_column(String(255))  # M/P (ex: OFF - Ramie Lyocell)
    family: Mapped[str] = mapped_column(String(100))  # Família (ex: Agosto/26)
    pilot_name: Mapped[str] = mapped_column(String(255))  # Pilotista (ex: Jani)
    patternmaker_name: Mapped[str] = mapped_column(String(255))  # Modelista (ex: Claudiana)
    size: Mapped[str] = mapped_column(String(20))  # Tamanho (ex: P)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now_utc)  # Data
    status: Mapped[str] = mapped_column(String(50), default="em_ajuste")  # em_ajuste, aprovado, caiu
    notes: Mapped[Optional[str]] = mapped_column(Text)  # Observações
    photo_url: Mapped[Optional[str]] = mapped_column(String(255))  # Foto da peça ou etiqueta
    sent_to_acervo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now_utc)


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    phone_number: Mapped[Optional[str]] = mapped_column(String(20))
    department: Mapped[str] = mapped_column(String(100))  # Cadista, Corte, Logística, Produção, Planejamento
    status: Mapped[str] = mapped_column(String(50), default="ATIVO")  # ATIVO, SUSPENSO_ATRASO, SUSPENSO_AVARIA
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now_utc)

    withdrawals: Mapped[List["Withdrawal"]] = relationship(back_populates="employee")


class Piece(Base):
    __tablename__ = "pieces"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"))
    production_order_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("production_orders.id"), nullable=True)
    
    rfid_epc: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)
    size: Mapped[str] = mapped_column(String(10))  # PP, P, M, G, GG, U
    status: Mapped[str] = mapped_column(String(50), default="estoque")  # estoque, retirado, vendido, perdido, avariado
    current_withdrawal_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("withdrawals.id"), nullable=True)
    raw_material_batch: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Controle de Rolo de Tecido
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now_utc)

    product: Mapped["Product"] = relationship(lazy="selectin")
    production_order: Mapped[Optional["ProductionOrder"]] = relationship(lazy="selectin")


class Distribution(Base):
    __tablename__ = "distributions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"))
    
    store_name: Mapped[str] = mapped_column(String(255))
    size_grade: Mapped[dict] = mapped_column(JSON)  # {"PP": 2, "P": 5...}
    total_quantity: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(50), default="pendente")  # pendente, em_transito, entregue
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now_utc)

    # Expedição (Motoboy)
    courier_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    vehicle_plate: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    courier_signature: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dispatched_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Recebimento (Estoquista)
    received_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    receiver_role: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    receiver_matricula: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    received_signature: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    received_grade: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    discrepancy_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Rota e Programação (Fase 7)
    transfer_type: Mapped[str] = mapped_column(String(50), default="envio")  # 'envio' ou 'transferencia'
    origin_store: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # nulo se for 'envio' (fábrica)
    assigned_driver: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # motorista programado pela logística
    nf_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # nota fiscal eletrônica
    is_scheduled: Mapped[bool] = mapped_column(Boolean, default=False)  # programado pela logística
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    product: Mapped["Product"] = relationship(lazy="selectin")



class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    
    title: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    department: Mapped[str] = mapped_column(String(100))  # Setor destino (Logística, Corte, etc.)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now_utc)


class LicenseConfig(Base):
    __tablename__ = "license_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    license_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # Token JWS assinado
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False) # Trava local
    last_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    offline_grace_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    current_version: Mapped[str] = mapped_column(String(50), default="1.0.0")
    update_channel: Mapped[str] = mapped_column(String(50), default="stable") # stable, beta, dev


