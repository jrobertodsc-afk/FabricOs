from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import datetime
from typing import List, Optional

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
    phone_number: Optional[str] = None
    reason: str
    type: str
    destination: Optional[str] = None
    expected_return: Optional[datetime] = None
    notes: Optional[str] = None

class WithdrawalCreate(WithdrawalBase):
    items: List[WithdrawalItemCreate]

class WithdrawalUpdate(BaseModel):
    item_name: Optional[str] = None
    person_name: Optional[str] = None
    phone_number: Optional[str] = None
    reason: Optional[str] = None
    destination: Optional[str] = None
    expected_return: Optional[datetime] = None
    notes: Optional[str] = None

class Withdrawal(WithdrawalBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    status: str
    photo_url: Optional[str] = None
    created_at: datetime
    items: List[WithdrawalItem]

class ReturnCreate(BaseModel):
    return_qty: int # Used for partial logic in the service layer
    return_status: str
    return_notes: Optional[str] = None

class PartnerBase(BaseModel):
    name: str
    contact_name: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    specialty: Optional[str] = None

class PartnerCreate(PartnerBase):
    pass

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
    base_price: Optional[float] = 0

class ProductCreate(ProductBase):
    materials: List[ProductMaterialBase]

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

class Material(MaterialBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    created_at: datetime

# Update ProductionOrder schemas
class ProductionOrderBase(BaseModel):
    order_number: str
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

class Settlement(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    order_id: UUID
    partner_id: UUID
    total_amount: float
    deductions: float
    net_amount: float
    nf_number: Optional[str] = None
    status: str
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
