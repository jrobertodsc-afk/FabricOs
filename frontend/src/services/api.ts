import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');

const api = axios.create({
  baseURL: API_BASE_URL,
});

// ---- Interceptor de Request: injeta o token JWT ----
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fabricos_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- Interceptor de Response: trata erros 401 (token expirado/inválido) ----
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Evita redirecionar para o login de operadores se for uma requisição do Backoffice Central
      const isBackofficeRequest = error.config?.url?.includes('/api/backoffice');
      if (!isBackofficeRequest) {
        localStorage.removeItem('fabricos_token');
        localStorage.removeItem('fabricos_tenant_id');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// =============================================================
//  Tipos (interfaces TypeScript completas e sem `any`)
// =============================================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
  has_more: boolean;
}

export interface WithdrawalItem {
  id: string;
  size: string;
  quantity: number;
}

export interface Withdrawal {
  id: string;
  item_name: string;
  person_name: string;
  email?: string;
  phone_number?: string;
  reason: string;
  type: string;
  destination?: string;
  status: string;
  partner_id?: string;
  employee_id?: string; // Adicionado V4
  expected_return?: string;
  notes?: string;
  photo_urls?: string[];
  return_photo_urls?: string[];
  created_at: string;
  items: WithdrawalItem[];
  seq_id?: number;
  tracking_code?: string;
  signature_url?: string;
  return_signature_url?: string;
  custody_confirmed?: boolean; // Adicionado V4
  custody_confirmed_by?: string; // Adicionado V4
  replacement_cost_agreed?: number; // Adicionado V4
}

export interface WithdrawalCreatePayload {
  item_name: string;
  person_name: string;
  email?: string;
  phone_number?: string;
  reason: string;
  type: string;
  destination?: string;
  expected_return?: string;
  notes?: string;
  photo_urls?: string[];
  partner_id?: string;
  employee_id?: string; // Adicionado V4
  items: { size: string; quantity: number }[];
  signature_url?: string;
  override?: boolean; // Adicionado V4
}

export interface WithdrawalUpdatePayload {
  status?: string;
  notes?: string;
  reason?: string;
  destination?: string;
  expected_return?: string;
  signature_url?: string;
  return_signature_url?: string;
}

export interface ReturnPayload {
  return_qty: number;
  return_status: string;
  return_notes?: string;
  return_photo_urls?: string[];
  return_signature_url?: string;
}

// ---- Partners ----
export interface Partner {
  id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone_number?: string;
  specialty?: string;
  type: string;  // 'faccionista' | 'interno'
  portal_token: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  status?: string; // Adicionado V4
  pending_losses_count?: number; // Adicionado V4
}

export interface PartnerCreatePayload {
  name: string;
  contact_name?: string;
  email?: string;
  phone_number?: string;
  address?: string;
  specialty?: string;
  type?: string;
  status?: string; // Adicionado V4
}

export interface PartnerUpdatePayload {
  name?: string;
  contact_name?: string;
  email?: string;
  phone_number?: string;
  address?: string;
  specialty?: string;
  type?: string;
  is_active?: boolean;
  status?: string; // Adicionado V4
  pending_losses_count?: number; // Adicionado V4
}

// ---- Production Orders ----
export interface ProductionOrder {
  id: string;
  order_number: string;
  item_name: string;
  total_quantity: number;
  price_per_piece: number;
  current_stage: string;
  status: string;
  partner_id?: string;
  product_id?: string;
  due_date?: string;
  collection?: string;
  size_grade?: Record<string, number>;
  observations?: string;
  nf_number?: string;
  nf_date?: string;
  created_at: string;
  product?: Product;
}

export interface ProductionOrderCreatePayload {
  order_number?: string;
  item_name: string;
  total_quantity: number;
  price_per_piece?: number;
  partner_id?: string;
  product_id?: string;
  due_date?: string;
  collection?: string;
  size_grade?: Record<string, number>;
  observations?: string;
  nf_number?: string;
  nf_date?: string;
}

export interface ProductionOrderUpdatePayload {
  current_stage?: string;
  status?: string;
  partner_id?: string;
  product_id?: string;
  price_per_piece?: number;
  collection?: string;
  size_grade?: Record<string, number>;
  observations?: string;
  nf_number?: string;
  nf_date?: string;
}

// ---- Materials & Products ----
export interface Material {
  id: string;
  name: string;
  unit: string;
  stock_quantity: number;
}

export interface MaterialCreatePayload {
  name: string;
  unit: string;
  stock_quantity?: number;
}

export interface MaterialUpdatePayload {
  name?: string;
  unit?: string;
  stock_quantity?: number;
}

export interface StockAdjustmentPayload {
  quantity: number;
  reason: string;
  type: string;
}

export interface ProductMaterial {
  id: string;
  material_id: string;
  quantity: number;
  material: Material;
}

export interface Product {
  id: string;
  reference: string;
  name: string;
  description?: string;
  base_price: number;
  materials: ProductMaterial[];
  image_url?: string;
  created_at: string;
}

export interface ProductCreatePayload {
  reference: string;
  name: string;
  description?: string;
  base_price?: number;
  materials: { material_id: string; quantity: number }[];
  image_url?: string;
}

export interface ProductUpdatePayload {
  reference?: string;
  name?: string;
  description?: string;
  base_price?: number;
  materials?: { material_id: string; quantity: number }[];
  image_url?: string;
}

// ---- Production Stages ----
export interface ProductionStage {
  id: string;
  name: string;
  order: number;
}

// ---- Settlements ----
export interface Settlement {
  id: string;
  order_id: string;
  partner_id: string;
  total_amount: number;
  deductions: number;
  net_amount: number;
  nf_number?: string;
  status: string;
  created_at: string;
}

export interface SettlementCreatePayload {
  order_id: string;
  deductions?: number;
}

export interface SettlementUpdatePayload {
  status?: string;
  nf_number?: string;
  deductions?: number;
}

export interface FinancialSummary {
  total_payable: number;
  total_paid: number;
  total_deductions: number;
}

// =============================================================
//  Funções de API
// =============================================================

// ---- Auth ----
export const login = async (email: string, pass: string) => {
  const formData = new FormData();
  formData.append('username', email);
  formData.append('password', pass);
  const response = await api.post<{ access_token: string; token_type: string; tenant_id: string }>(
    '/api/auth/login',
    formData
  );
  localStorage.setItem('fabricos_token', response.data.access_token);
  localStorage.setItem('fabricos_tenant_id', response.data.tenant_id);
  return response.data;
};

// ---- Withdrawals ----
export const getWithdrawals = async (skip = 0, limit = 200) => {
  const response = await api.get<PaginatedResponse<Withdrawal>>('/api/withdrawals/', { params: { skip, limit } });
  return response.data;
};

export const createWithdrawal = async (data: WithdrawalCreatePayload) => {
  const response = await api.post<Withdrawal>('/api/withdrawals/', data);
  return response.data;
};

export const returnWithdrawal = async (id: string, data: ReturnPayload) => {
  const response = await api.put<Withdrawal>(`/api/withdrawals/${id}/return`, data);
  return response.data;
};

export const updateWithdrawal = async (id: string, data: WithdrawalUpdatePayload) => {
  const response = await api.patch<Withdrawal>(`/api/withdrawals/${id}`, data);
  return response.data;
};

export const trackWithdrawal = async (code: string) => {
  const response = await api.get<Withdrawal>(`/api/withdrawals/track/${code}`);
  return response.data;
};

// ---- Partners ----
export const getPartners = async () => {
  const response = await api.get<Partner[]>('/api/partners');
  return response.data;
};

export const createPartner = async (data: PartnerCreatePayload) => {
  const response = await api.post<Partner>('/api/partners', data);
  return response.data;
};

export const updatePartner = async (id: string, data: PartnerUpdatePayload) => {
  const response = await api.patch<Partner>(`/api/partners/${id}`, data);
  return response.data;
};

export const deletePartner = async (id: string) => {
  await api.delete(`/api/partners/${id}`);
};

// ---- Production Orders ----
export const getProductionOrders = async (skip = 0, limit = 200) => {
  const response = await api.get<PaginatedResponse<ProductionOrder>>('/api/production/orders', { params: { skip, limit } });
  return response.data;
};

export const createProductionOrder = async (data: ProductionOrderCreatePayload) => {
  const response = await api.post<ProductionOrder>('/api/production/orders', data);
  return response.data;
};

export const updateProductionOrder = async (id: string, data: ProductionOrderUpdatePayload) => {
  const response = await api.patch<ProductionOrder>(`/api/production/orders/${id}`, data);
  return response.data;
};

export const deleteProductionOrder = async (id: string) => {
  await api.delete(`/api/production/orders/${id}`);
};

// CORRIGIDO: URL estava incorreta (/api/production/scan/:id, o correto é /api/production/orders/:id/scan)
export const scanProductionOrder = async (orderNumber: string) => {
  const response = await api.post<ProductionOrder>(`/api/production/orders/${orderNumber}/scan`);
  return response.data;
};

// ---- Products ----
export const getProducts = async () => {
  const response = await api.get<Product[]>('/api/products');
  return response.data;
};

export const createProduct = async (data: ProductCreatePayload) => {
  const response = await api.post<Product>('/api/products', data);
  return response.data;
};

export const updateProduct = async (id: string, data: ProductUpdatePayload) => {
  const response = await api.patch<Product>(`/api/products/${id}`, data);
  return response.data;
};

export const deleteProduct = async (id: string) => {
  await api.delete(`/api/products/${id}`);
};

// ---- Materials ----
export const getMaterials = async () => {
  const response = await api.get<Material[]>('/api/materials');
  return response.data;
};

export const createMaterial = async (data: MaterialCreatePayload) => {
  const response = await api.post<Material>('/api/materials', data);
  return response.data;
};

export const updateMaterial = async (id: string, data: MaterialUpdatePayload) => {
  const response = await api.patch<Material>(`/api/materials/${id}`, data);
  return response.data;
};

export const deleteMaterial = async (id: string) => {
  await api.delete(`/api/materials/${id}`);
};

export const adjustMaterialStock = async (id: string, data: StockAdjustmentPayload) => {
  const response = await api.post<Material>(`/api/materials/${id}/adjust`, data);
  return response.data;
};

// ---- Production Stages ----
export const getProductionStages = async () => {
  const response = await api.get<ProductionStage[]>('/api/production/stages');
  return response.data;
};

// ---- Settlements ----
export const getSettlements = async (partnerId?: string) => {
  const params = partnerId ? { partner_id: partnerId } : {};
  const response = await api.get<Settlement[]>('/api/financials/settlements', { params });
  return response.data;
};

export const createSettlement = async (data: SettlementCreatePayload) => {
  const response = await api.post<Settlement>('/api/financials/settlements', data);
  return response.data;
};

export const updateSettlement = async (id: string, data: SettlementUpdatePayload) => {
  const response = await api.patch<Settlement>(`/api/financials/settlements/${id}`, data);
  return response.data;
};

export const getFinancialSummary = async () => {
  const response = await api.get<FinancialSummary>('/api/financials/summary');
  return response.data;
};

export const syncSystem = async () => {
  const response = await api.post('/api/system/sync');
  return response.data;
};

// =============================================================
//  Upload de Imagens
// =============================================================

export const uploadImage = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post<{ url: string }>('/api/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// =============================================================
//  NOVOS SCHEMAS ESTOQUE ACABADO E PILOTAGEM BOAH
// =============================================================

export interface FinishedStockItem {
  id: string;
  tenant_id: string;
  product_id: string;
  stock_type: 'producao' | 'acervo';
  size_grade: Record<string, number>;
  last_updated: string;
  product?: Product;
}

export interface FinishedStockMovement {
  id: string;
  tenant_id: string;
  product_id: string;
  stock_type: 'producao' | 'acervo';
  movement_type: 'entrada' | 'saida';
  quantity_grade: Record<string, number>;
  total_quantity: number;
  description: string;
  reference_op_id?: string;
  created_at: string;
  product?: Product;
}

export interface FinishedStockMovementCreatePayload {
  product_id: string;
  stock_type: 'producao' | 'acervo';
  movement_type: 'entrada' | 'saida';
  quantity_grade: Record<string, number>;
  description: string;
  reference_op_id?: string;
}

export interface PilotageCard {
  id: string;
  tenant_id: string;
  model_name: string;
  raw_material: string;
  family: string;
  pilot_name: string;
  patternmaker_name: string;
  size: string;
  status: 'em_ajuste' | 'aprovado' | 'reprovado';
  notes?: string;
  photo_url?: string;
  date: string;
  sent_to_acervo: boolean;
  created_at: string;
}

export interface PilotageCardCreatePayload {
  model_name: string;
  raw_material: string;
  family: string;
  pilot_name: string;
  patternmaker_name: string;
  size: string;
  status?: string;
  notes?: string;
  photo_url?: string;
}

export interface PilotageCardUpdatePayload {
  model_name?: string;
  raw_material?: string;
  family?: string;
  pilot_name?: string;
  patternmaker_name?: string;
  size?: string;
  status?: string;
  notes?: string;
  photo_url?: string;
  sent_to_acervo?: boolean;
}

export interface PortalData {
  partner: Partner;
  orders: ProductionOrder[];
  withdrawals: Withdrawal[];
}

// ---- Finished Stock Functions ----
export const getFinishedStock = async (stockType?: string, productId?: string) => {
  const params: Record<string, string> = {};
  if (stockType) params.stock_type = stockType;
  if (productId) params.product_id = productId;
  const response = await api.get<FinishedStockItem[]>('/api/stock/', { params });
  return response.data;
};

export const adjustFinishedStock = async (data: FinishedStockMovementCreatePayload) => {
  const response = await api.post<FinishedStockItem>('/api/stock/adjust', data);
  return response.data;
};

export const getFinishedStockMovements = async (stockType?: string, productId?: string) => {
  const params: Record<string, string> = {};
  if (stockType) params.stock_type = stockType;
  if (productId) params.product_id = productId;
  const response = await api.get<FinishedStockMovement[]>('/api/stock/movements', { params });
  return response.data;
};

// ---- Pilotage (BOAH) Functions ----
export const getPilotageCards = async (status?: string) => {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  const response = await api.get<PilotageCard[]>('/api/pilotage/', { params });
  return response.data;
};

export const createPilotageCard = async (data: PilotageCardCreatePayload) => {
  const response = await api.post<PilotageCard>('/api/pilotage/', data);
  return response.data;
};

export const updatePilotageCard = async (id: string, data: PilotageCardUpdatePayload) => {
  const response = await api.patch<PilotageCard>(`/api/pilotage/${id}`, data);
  return response.data;
};

export const sendPilotageToAcervo = async (id: string) => {
  const response = await api.post<PilotageCard>(`/api/pilotage/${id}/send-to-acervo`);
  return response.data;
};

// ---- Partner Portal Functions ----
export const getPartnerPortalData = async (token: string) => {
  const response = await api.get<PortalData>(`/api/partners/portal/${token}`);
  return response.data;
};

export const updatePartnerPortalOrderStage = async (token: string, orderId: string, stage: string) => {
  const response = await api.post<ProductionOrder>(`/api/partners/portal/${token}/orders/${orderId}/stage`, { stage });
  return response.data;
};

// =============================================================
//  NOVOS SCHEMAS V4: EMPLOYEE, PIECE, DISTRIBUTION E NOTIFICATION
// =============================================================

// ---- Employees ----
export interface Employee {
  id: string;
  name: string;
  email?: string;
  phone_number?: string;
  department: string;
  status: string;
  is_active: boolean;
  created_at: string;
}

export interface EmployeeCreatePayload {
  name: string;
  email?: string;
  phone_number?: string;
  department: string;
  status?: string;
  is_active?: boolean;
}

export interface EmployeeUpdatePayload {
  name?: string;
  email?: string;
  phone_number?: string;
  department?: string;
  status?: string;
  is_active?: boolean;
}

// ---- Pieces (RFID) ----
export interface Piece {
  id: string;
  product_id: string;
  production_order_id?: string;
  rfid_epc?: string;
  size: string;
  status: string;
  current_withdrawal_id?: string;
  raw_material_batch?: string;
  created_at: string;
  product?: Product;
  production_order?: ProductionOrder;
}

export interface PieceCreatePayload {
  product_id: string;
  production_order_id?: string;
  rfid_epc?: string;
  size: string;
  status?: string;
  current_withdrawal_id?: string;
  raw_material_batch?: string;
}

export interface PieceUpdatePayload {
  status?: string;
  rfid_epc?: string;
  current_withdrawal_id?: string;
  raw_material_batch?: string;
}

export interface PieceBatchCreatePayload {
  product_id: string;
  production_order_id?: string;
  size_grade: Record<string, number>;
  raw_material_batch?: string;
  rfid_prefix?: string;
}

export interface RfidCheckoutPayload {
  rfid_epcs: string[];
  employee_id?: string;
  partner_id?: string;
  person_name: string;
  reason: string;
  destination?: string;
  replacement_cost_agreed?: number;
}

// ---- Distributions (Reparto) ----
export interface Distribution {
  id: string;
  product_id: string;
  store_name: string;
  size_grade: Record<string, number>;
  total_quantity: number;
  status: string;
  created_at: string;
  product?: Product;
  
  // Expedição
  courier_name?: string;
  vehicle_plate?: string;
  courier_signature?: string;
  dispatched_at?: string;

  // Recebimento
  received_by?: string;
  receiver_role?: string;
  receiver_matricula?: string;
  received_signature?: string;
  received_grade?: Record<string, number>;
  discrepancy_notes?: string;
  delivered_at?: string;

  // Rota e Programação (Fase 7)
  transfer_type?: string;
  origin_store?: string;
  assigned_driver?: string;
  nf_number?: string;
  is_scheduled?: boolean;
  scheduled_at?: string;
}

export interface DistributionCreatePayload {
  product_id: string;
  store_name: string;
  size_grade: Record<string, number>;
  total_quantity: number;
  status?: string;
  transfer_type?: string;
  origin_store?: string;
  assigned_driver?: string;
  nf_number?: string;
  is_scheduled?: boolean;
  scheduled_at?: string;
}

export interface DistributionUpdatePayload {
  size_grade?: Record<string, number>;
  total_quantity?: number;
  status?: string;
}

export interface DistributionDispatchPayload {
  courier_name: string;
  vehicle_plate?: string;
  courier_signature: string;
}

export interface DistributionReceivePayload {
  received_by: string;
  receiver_role: string;
  receiver_matricula: string;
  received_signature: string;
  received_grade: Record<string, number>;
  discrepancy_notes?: string;
}

// ---- Notifications ----
export interface Notification {
  id: string;
  title: string;
  message: string;
  department: string;
  read: boolean;
  created_at: string;
}

export interface NotificationCreatePayload {
  title: string;
  message: string;
  department: string;
  read?: boolean;
}

// ---- XML Reconciliation ----
export interface XmlReconciliationSuggestion {
  order_id: string;
  order_number: string;
  product_id: string;
  product_name: string;
  partner_id?: string;
  partner_name?: string;
  suggested_size_grade: Record<string, number>;
  total_quantity: number;
  nf_number: string;
}

export interface XmlConfirmPayload {
  reconciled_size_grade: Record<string, number>;
  raw_material_batch?: string;
  nf_number?: string;
}

// =============================================================
//  NOVAS FUNÇÕES DE API V4
// =============================================================

// ---- Employees API ----
export const getEmployees = async () => {
  const response = await api.get<Employee[]>('/api/employees/');
  return response.data;
};

export const createEmployee = async (data: EmployeeCreatePayload) => {
  const response = await api.post<Employee>('/api/employees/', data);
  return response.data;
};

export const updateEmployee = async (id: string, data: EmployeeUpdatePayload) => {
  const response = await api.patch<Employee>(`/api/employees/${id}`, data);
  return response.data;
};

export const deleteEmployee = async (id: string) => {
  await api.delete(`/api/employees/${id}`);
};

// ---- Pieces API ----
export const getPieces = async (status?: string, productId?: string) => {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  if (productId) params.product_id = productId;
  const response = await api.get<Piece[]>('/api/pieces/', { params });
  return response.data;
};

export const createPiece = async (data: PieceCreatePayload) => {
  const response = await api.post<Piece>('/api/pieces/', data);
  return response.data;
};

export const createPieceBatch = async (data: PieceBatchCreatePayload) => {
  const response = await api.post<Piece[]>('/api/pieces/batch', data);
  return response.data;
};

export const getPieceByRfid = async (rfid_epc: string) => {
  const response = await api.get<Piece>(`/api/pieces/rfid/${rfid_epc}`);
  return response.data;
};

export const updatePieceByRfid = async (rfid_epc: string, data: PieceUpdatePayload) => {
  const response = await api.patch<Piece>(`/api/pieces/rfid/${rfid_epc}`, data);
  return response.data;
};

export const rfidCheckout = async (data: RfidCheckoutPayload) => {
  const response = await api.post<Withdrawal>('/api/pieces/rfid/checkout', data);
  return response.data;
};

// ---- Distributions API ----
export const getDistributions = async () => {
  const response = await api.get<Distribution[]>('/api/distributions/');
  return response.data;
};

export const getDistributionById = async (id: string) => {
  const response = await api.get<Distribution>(`/api/distributions/${id}`);
  return response.data;
};

export const createDistribution = async (data: DistributionCreatePayload) => {
  const response = await api.post<Distribution>('/api/distributions/', data);
  return response.data;
};

export const updateDistribution = async (id: string, data: DistributionUpdatePayload) => {
  const response = await api.patch<Distribution>(`/api/distributions/${id}`, data);
  return response.data;
};

export const deleteDistribution = async (id: string) => {
  await api.delete(`/api/distributions/${id}`);
};

export const dispatchDistribution = async (id: string, data: DistributionDispatchPayload) => {
  const response = await api.put<Distribution>(`/api/distributions/${id}/dispatch`, data);
  return response.data;
};

export const receiveDistribution = async (id: string, data: DistributionReceivePayload) => {
  const response = await api.put<Distribution>(`/api/distributions/${id}/receive`, data);
  return response.data;
};

// ---- Notifications API ----
export const getNotifications = async (department?: string, unreadOnly = false) => {
  const params: Record<string, any> = { unread_only: unreadOnly };
  if (department) params.department = department;
  const response = await api.get<Notification[]>('/api/notifications/', { params });
  return response.data;
};

export const createNotification = async (data: NotificationCreatePayload) => {
  const response = await api.post<Notification>('/api/notifications/', data);
  return response.data;
};

export const markNotificationAsRead = async (id: string) => {
  const response = await api.patch<Notification>(`/api/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsAsRead = async (department: string) => {
  await api.patch(`/api/notifications/read-all`, null, { params: { department } });
};

// ---- XML Reconcile API ----
export const getXmlReconciliation = async (nfeKey: string) => {
  const response = await api.get<XmlReconciliationSuggestion>(`/api/production/orders/xml-reconcile/${nfeKey}`);
  return response.data;
};

export const confirmXmlReconciliation = async (orderId: string, data: XmlConfirmPayload) => {
  const response = await api.post<{ message: string; order: ProductionOrder; pieces_created: number }>(
    `/api/production/orders/${orderId}/xml-confirm`,
    data
  );
  return response.data;
};

// ---- Backoffice Central API ----
export interface BackofficeClient {
  tenant_id: string;
  client_name: string;
  enabled_modules: string[];
  update_channel: string;
  current_version: string;
  latest_version: string;
  is_active: boolean;
  is_locked: boolean;
  last_ping_at: string;
}

const getBackofficeHeaders = () => {
  const token = localStorage.getItem('backoffice_admin_token') || '';
  return {
    headers: {
      'X-Backoffice-Admin-Token': token
    }
  };
};

export const backofficeLogin = async (password: string) => {
  const response = await api.post('/api/backoffice/login', { password }, { withCredentials: true });
  return response.data;
};

export const getBackofficeClients = async () => {
  const response = await api.get<BackofficeClient[]>('/api/backoffice/clients', getBackofficeHeaders());
  return response.data;
};

export const toggleClientLock = async (tenantId: string) => {
  const response = await api.post<BackofficeClient>(`/api/backoffice/clients/${tenantId}/toggle-lock`, {}, getBackofficeHeaders());
  return response.data;
};

export const updateClientLicense = async (tenantId: string, data: { client_name?: string; enabled_modules?: string[]; update_channel?: string; is_active?: boolean }) => {
  const response = await api.patch<BackofficeClient>(`/api/backoffice/clients/${tenantId}`, data, getBackofficeHeaders());
  return response.data;
};

export const simulateLocalUpdate = async (tenantId: string) => {
  const response = await api.post<BackofficeClient>(`/api/backoffice/clients/${tenantId}/simulate-local-update`, {}, getBackofficeHeaders());
  return response.data;
};

export interface LicenseStatusResponse {
  tenant_id: string;
  is_locked: boolean;
  enabled_modules: string[];
  current_version: string;
  update_channel: string;
  last_verified_at: string | null;
  offline_grace_started_at: string | null;
}

export const getLicenseStatus = async () => {
  const response = await api.get<LicenseStatusResponse>('/api/auth/license-status');
  return response.data;
};

export default api;


