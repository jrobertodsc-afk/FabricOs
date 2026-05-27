from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import datetime
from typing import Generic, List, Optional, TypeVar, Dict

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Schema genérico de resposta paginada."""
    items: List[T]
    total: int
    skip: int
    limit: int
    has_more: bool

class ProductionStageBase(BaseModel):
    name: str
    order: int

class ProductionStageCreate(ProductionStageBase):
    pass

class ProductionStage(ProductionStageBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID

class WithdrawalItemBase(BaseModel):
    size: str
    quantity: int

class WithdrawalItemCreate(WithdrawalItemBase):
    pass

class WithdrawalItem(WithdrawalItemBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID

class WithdrawalBase(BaseModel):
    item_name: str
    person_name: str
    email: Optional[str] = None
    phone_number: Optional[str] = None
    reason: str
    type: str  # interno, faccionista, ACERVO
    destination: Optional[str] = None
    expected_return: Optional[datetime] = None
    notes: Optional[str] = None
    photo_urls: Optional[List[str]] = []
    return_photo_urls: Optional[List[str]] = []
    partner_id: Optional[UUID] = None  # Adicionado: necessário para vincular ao faccionista
    product_id: Optional[UUID] = None
    employee_id: Optional[UUID] = None  # Adicionado: funcionário interno
    signature_url: Optional[str] = None

class WithdrawalCreate(WithdrawalBase):
    items: List[WithdrawalItemCreate]
    override: Optional[bool] = False

class WithdrawalUpdate(BaseModel):
    item_name: Optional[str] = None
    person_name: Optional[str] = None
    phone_number: Optional[str] = None
    reason: Optional[str] = None
    product_id: Optional[UUID] = None
    destination: Optional[str] = None
    expected_return: Optional[datetime] = None
    notes: Optional[str] = None
    status: Optional[str] = None  # Adicionado: permite atualizar status via PATCH

class Withdrawal(WithdrawalBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    status: str
    tracking_code: Optional[str] = None
    return_signature_url: Optional[str] = None
    custody_confirmed: bool = False
    custody_confirmed_by: Optional[str] = None
    replacement_cost_agreed: float = 0.0
    created_at: datetime
    items: List[WithdrawalItem]

class ReturnCreate(BaseModel):
    return_qty: int # Used for partial logic in the service layer
    return_status: str
    return_notes: Optional[str] = None
    return_photo_urls: Optional[List[str]] = []
    return_signature_url: Optional[str] = None

class PartnerBase(BaseModel):
    name: str
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    specialty: Optional[str] = None
    type: str = "faccionista"  # Adicionado: faccionista, interno
    status: str = "ATIVO"  # ATIVO, SUSPENSO_ATRASO, SUSPENSO_AVARIA
    pending_losses_count: int = 0

class PartnerCreate(PartnerBase):
    pass

class PartnerUpdate(BaseModel):
    name: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    specialty: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    pending_losses_count: Optional[int] = None
    is_active: Optional[bool] = None

class Partner(PartnerBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    portal_token: str
    is_active: bool
    created_at: datetime

class ProductMaterialBase(BaseModel):
    material_id: UUID
    quantity: float

class ProductMaterial(ProductMaterialBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    material: "Material"

class ProductBase(BaseModel):
    reference: str
    name: str
    description: Optional[str] = None
    type: str = "produto_acabado"
    base_price: Optional[float] = 0
    image_url: Optional[str] = None

class ProductCreate(ProductBase):
    materials: List[ProductMaterialBase]
    initial_stock: Optional[Dict[str, int]] = None

class ProductUpdate(BaseModel):
    reference: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    base_price: Optional[float] = None
    materials: Optional[List[ProductMaterialBase]] = None
    image_url: Optional[str] = None

class Product(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    materials: List[ProductMaterial]
    created_at: datetime

class MaterialBase(BaseModel):
    name: str
    unit: str
    stock_quantity: float = 0

class MaterialCreate(MaterialBase):
    pass

class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    stock_quantity: Optional[float] = None

class StockAdjustment(BaseModel):
    quantity: float
    reason: str
    type: str  # 'in' or 'out'

class Material(MaterialBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: Optional[UUID] = None
    created_at: Optional[datetime] = None

# Update ProductionOrder schemas
class ProductionOrderBase(BaseModel):
    order_number: Optional[str] = None
    item_name: str
    total_quantity: int
    price_per_piece: Optional[float] = 0
    partner_id: Optional[UUID] = None
    product_id: Optional[UUID] = None
    due_date: Optional[datetime] = None
    current_stage: Optional[str] = "Corte"
    collection: Optional[str] = None
    size_grade: Optional[dict] = None
    observations: Optional[str] = None
    nf_number: Optional[str] = None
    nf_date: Optional[datetime] = None

class ProductionOrderCreate(ProductionOrderBase):
    pass

class ProductionOrderUpdate(BaseModel):
    current_stage: Optional[str] = None
    status: Optional[str] = None
    partner_id: Optional[UUID] = None
    product_id: Optional[UUID] = None
    price_per_piece: Optional[float] = None
    collection: Optional[str] = None
    size_grade: Optional[dict] = None
    observations: Optional[str] = None
    nf_number: Optional[str] = None
    nf_date: Optional[datetime] = None

class ProductionOrder(ProductionOrderBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    status: str
    created_at: datetime
    product: Optional[Product] = None

class SettlementCreate(BaseModel):
    order_id: UUID
    deductions: float = 0

class SettlementUpdate(BaseModel):
    status: Optional[str] = None
    nf_number: Optional[str] = None
    deductions: Optional[float] = None

class FinancialSummary(BaseModel):
    total_payable: float
    total_paid: float
    total_deductions: float

class Settlement(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    order_id: UUID
    partner_id: UUID
    total_amount: float
    deductions: float
    net_amount: float
    nf_number: Optional[str] = None
    status: str
    created_at: datetime
    paid_at: Optional[datetime] = None

class QualityRecordBase(BaseModel):
    defect_type: str
    quantity: int
    notes: Optional[str] = None
    
class QualityRecordCreate(QualityRecordBase):
    pass

class QualityRecord(QualityRecordBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    order_id: Optional[UUID] = None
    withdrawal_id: Optional[UUID] = None
    partner_id: Optional[UUID] = None
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    tenant_id: UUID

class TokenData(BaseModel):
    user_id: Optional[UUID] = None
    tenant_id: Optional[UUID] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class TenantRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    is_active: bool


# ---- NOVOS SCHEMAS ESTOQUE ACABADO E PILOTAGEM BOAH ----

class FinishedStockItemBase(BaseModel):
    product_id: UUID
    stock_type: str  # "producao" ou "acervo"
    size_grade: dict  # {"PP": int, "P": int, "M": int, "G": int...}

class FinishedStockItemCreate(FinishedStockItemBase):
    pass

class FinishedStockItemUpdate(BaseModel):
    size_grade: Optional[dict] = None

class FinishedStockItem(FinishedStockItemBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    last_updated: datetime
    product: Optional[Product] = None


class FinishedStockMovementBase(BaseModel):
    product_id: UUID
    stock_type: str
    movement_type: str  # "entrada" ou "saida"
    quantity_grade: dict
    description: str
    reference_op_id: Optional[UUID] = None

class FinishedStockMovementCreate(FinishedStockMovementBase):
    pass

class FinishedStockMovement(FinishedStockMovementBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    total_quantity: int
    created_at: datetime
    product: Optional[Product] = None


class PilotageCardBase(BaseModel):
    model_name: str
    raw_material: str
    family: str
    pilot_name: str
    patternmaker_name: str
    size: str
    status: Optional[str] = "em_ajuste"
    notes: Optional[str] = None
    photo_url: Optional[str] = None

class PilotageCardCreate(PilotageCardBase):
    pass

class PilotageCardUpdate(BaseModel):
    model_name: Optional[str] = None
    raw_material: Optional[str] = None
    family: Optional[str] = None
    pilot_name: Optional[str] = None
    patternmaker_name: Optional[str] = None
    size: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    photo_url: Optional[str] = None
    sent_to_acervo: Optional[bool] = None

class PilotageCard(PilotageCardBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    date: datetime
    sent_to_acervo: bool
    created_at: datetime


# ---- NOVOS SCHEMAS V4: EMPLOYEE, PIECE, DISTRIBUTION E NOTIFICATION ----

class EmployeeBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone_number: Optional[str] = None
    department: str  # Cadista, Corte, Logística, Produção, Planejamento
    status: str = "ATIVO"  # ATIVO, SUSPENSO_ATRASO, SUSPENSO_AVARIA
    is_active: bool = True

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None

class Employee(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    created_at: datetime


class PieceBase(BaseModel):
    product_id: UUID
    production_order_id: Optional[UUID] = None
    rfid_epc: Optional[str] = None
    size: str
    status: str = "estoque"  # estoque, retirado, vendido, perdido, avariado
    current_withdrawal_id: Optional[UUID] = None
    raw_material_batch: Optional[str] = None  # Rolo de Tecido de origem

class PieceCreate(PieceBase):
    pass

class PieceUpdate(BaseModel):
    status: Optional[str] = None
    rfid_epc: Optional[str] = None
    current_withdrawal_id: Optional[UUID] = None
    raw_material_batch: Optional[str] = None

class Piece(PieceBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    created_at: datetime
    product: Optional[Product] = None
    production_order: Optional[ProductionOrder] = None


class DistributionBase(BaseModel):
    product_id: UUID
    store_name: str
    size_grade: dict  # {"PP": 2, "P": 5...}
    total_quantity: int
    status: str = "pendente"  # pendente, em_transito, entregue
    
    # Rota e Programação (Fase 7)
    transfer_type: Optional[str] = "envio"  # 'envio' ou 'transferencia'
    origin_store: Optional[str] = None
    assigned_driver: Optional[str] = None
    nf_number: Optional[str] = None
    is_scheduled: Optional[bool] = False
    scheduled_at: Optional[datetime] = None

class DistributionCreate(DistributionBase):
    pass

class DistributionUpdate(BaseModel):
    size_grade: Optional[dict] = None
    total_quantity: Optional[int] = None
    status: Optional[str] = None
    courier_name: Optional[str] = None
    vehicle_plate: Optional[str] = None
    courier_signature: Optional[str] = None
    received_by: Optional[str] = None
    receiver_role: Optional[str] = None
    receiver_matricula: Optional[str] = None
    received_signature: Optional[str] = None
    received_grade: Optional[dict] = None
    discrepancy_notes: Optional[str] = None
    transfer_type: Optional[str] = None
    origin_store: Optional[str] = None
    assigned_driver: Optional[str] = None
    nf_number: Optional[str] = None
    is_scheduled: Optional[bool] = None
    scheduled_at: Optional[datetime] = None

class DistributionDispatch(BaseModel):
    courier_name: str
    vehicle_plate: Optional[str] = None
    courier_signature: str

class DistributionReceive(BaseModel):
    received_by: str
    receiver_role: str
    receiver_matricula: str
    received_signature: str
    received_grade: dict
    discrepancy_notes: Optional[str] = None

class Distribution(DistributionBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    created_at: datetime
    product: Optional[Product] = None
    
    # Expedição (Motoboy)
    courier_name: Optional[str] = None
    vehicle_plate: Optional[str] = None
    courier_signature: Optional[str] = None
    dispatched_at: Optional[datetime] = None

    # Recebimento (Estoquista)
    received_by: Optional[str] = None
    receiver_role: Optional[str] = None
    receiver_matricula: Optional[str] = None
    received_signature: Optional[str] = None
    received_grade: Optional[dict] = None
    discrepancy_notes: Optional[str] = None
    delivered_at: Optional[datetime] = None



class NotificationBase(BaseModel):
    title: str
    message: str
    department: str  # Setor destino
    read: bool = False

class NotificationCreate(NotificationBase):
    pass

class Notification(NotificationBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    created_at: datetime


