import axios from 'axios';

// In production, this would come from an environment variable
const API_BASE_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fabricos_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = async (email: string, pass: string) => {
  const formData = new FormData();
  formData.append('username', email);
  formData.append('password', pass);
  const response = await api.post('/api/auth/login', formData);
  localStorage.setItem('fabricos_token', response.data.access_token);
  localStorage.setItem('fabricos_tenant_id', response.data.tenant_id);
  return response.data;
};

export interface WithdrawalItem {
  id: string;
  size: string;
  quantity: number;
}

export interface Withdrawal {
  id: string;
  item_name: string;
  person_name: string;
  phone_number?: string;
  reason: string;
  type: string;
  destination?: string;
  status: string;
  created_at: string;
  items: WithdrawalItem[];
}

export const getWithdrawals = async () => {
  const response = await api.get<Withdrawal[]>('/api/withdrawals');
  return response.data;
};

export const createWithdrawal = async (data: any) => {
  const response = await api.post<Withdrawal>('/api/withdrawals', data);
  return response.data;
};

export const returnWithdrawal = async (id: string, data: any) => {
  const response = await api.put(`/api/withdrawals/${id}/return`, data);
  return response.data;
};

// Partners
export interface Partner {
  id: string;
  name: string;
  contact_name?: string;
  phone_number?: string;
  specialty?: string;
  portal_token: string;
  address?: string;
}

export const getPartners = async () => {
  const response = await api.get<Partner[]>('/api/partners');
  return response.data;
};

export const createPartner = async (data: any) => {
  const response = await api.post<Partner>('/api/partners', data);
  return response.data;
};

// Production Orders
export interface ProductionOrder {
  id: string;
  order_number: string;
  item_name: string;
  total_quantity: number;
  current_stage: string;
  status: string;
  partner_id?: string;
}

export const getProductionOrders = async () => {
  const response = await api.get<ProductionOrder[]>('/api/production/orders');
  return response.data;
};

export const createProductionOrder = async (data: any) => {
  const response = await api.post<ProductionOrder>('/api/production/orders', data);
  return response.data;
};

export const updateProductionOrder = async (id: string, data: any) => {
  const response = await api.patch<ProductionOrder>(`/api/production/orders/${id}`, data);
  return response.data;
};

export const scanProductionOrder = async (orderNumber: string) => {
  const response = await api.post<ProductionOrder>(`/api/production/scan/${orderNumber}`);
  return response.data;
};

// Products & Materials
export interface Material {
  id: string;
  name: string;
  unit: string;
  stock_quantity: number;
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
  description: string;
  base_price: number;
  materials: ProductMaterial[];
}

export const getProducts = async () => {
  const response = await api.get<Product[]>('/api/products');
  return response.data;
};

export const createProduct = async (data: any) => {
  const response = await api.post<Product>('/api/products', data);
  return response.data;
};

export const getMaterials = async () => {
  const response = await api.get<Material[]>('/api/materials');
  return response.data;
};

export const createMaterial = async (data: any) => {
  const response = await api.post<Material>('/api/materials', data);
  return response.data;
};

export interface ProductionStage {
  id: string;
  name: string;
  order: number;
}

export const getProductionStages = async () => {
  const response = await api.get<ProductionStage[]>('/api/production/stages');
  return response.data;
};

// Settlements
export interface Settlement {
  id: string;
  order_id: string;
  partner_id: string;
  total_amount: number;
  deductions: number;
  net_amount: number;
  status: string;
  created_at: string;
}

export const getSettlements = async (partnerId?: string) => {
  const params = partnerId ? { partner_id: partnerId } : {};
  const response = await api.get<Settlement[]>('/api/financials/settlements', { params });
  return response.data;
};

export const createSettlement = async (data: any) => {
  const response = await api.post<Settlement>('/api/financials/settlements', data);
  return response.data;
};

export default api;
