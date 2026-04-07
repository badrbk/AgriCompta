import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Interceptor : ajouter le token JWT
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor : gestion des erreurs et refresh token
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          useAuthStore.getState().setToken(data.token);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${data.token}`;
          return api(originalRequest);
        } catch {
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
      } else {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Services Auth
export const authService = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
};

// Services Projets
export const projectService = {
  getAll: () => api.get('/projects'),
  getById: (id: string) => api.get(`/projects/${id}`),
  getDashboard: (id: string) => api.get(`/projects/${id}/dashboard`),
  create: (data: object) => api.post('/projects', data),
  update: (id: string, data: object) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
};

// Services Associés
export const associateService = {
  getAll: (projectId: string) => api.get(`/projects/${projectId}/associates`),
  getByProject: (projectId: string) => api.get(`/projects/${projectId}/associates`),
  create: (data: object) => api.post('/associates', data),
  update: (id: string, data: object) => api.put(`/associates/${id}`, data),
  delete: (id: string) => api.delete(`/associates/${id}`),
};

// Services Comptes
export const accountService = {
  getAll: () => api.get('/accounts'),
  getTree: () => api.get('/accounts/tree'),
  getChart: () => api.get('/accounts/chart'),
  create: (data: object) => api.post('/accounts', data),
  update: (id: string, data: object) => api.put(`/accounts/${id}`, data),
  delete: (id: string) => api.delete(`/accounts/${id}`),
};

// Services Transactions
export const transactionService = {
  getByProject: (projectId: string, params?: object) =>
    api.get(`/projects/${projectId}/transactions`, { params }),
  getById: (id: string) => api.get(`/transactions/${id}`),
  create: (data: object) => api.post('/transactions', data),
  update: (id: string, data: object) => api.put(`/transactions/${id}`, data),
  delete: (id: string) => api.delete(`/transactions/${id}`),
  uploadAttachment: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/transactions/${id}/attachment`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Services Immobilisations
export const assetService = {
  getByProject: (projectId: string, params?: object) =>
    api.get(`/projects/${projectId}/assets`, { params }),
  getById: (id: string) => api.get(`/assets/${id}`),
  create: (data: object) => api.post('/assets', data),
  update: (id: string, data: object) => api.put(`/assets/${id}`, data),
  delete: (id: string) => api.delete(`/assets/${id}`),
  getDepreciation: (id: string) => api.get(`/assets/${id}/depreciation`),
  applyDepreciation: (id: string, year: number) =>
    api.post(`/assets/${id}/depreciation`, { year }),
};

// Services Cheptel
export const livestockService = {
  getByProject: (projectId: string, params?: object) =>
    api.get(`/projects/${projectId}/livestock`, { params }),
  getById: (id: string) => api.get(`/livestock/${id}`),
  create: (data: object) => api.post('/livestock', data),
  update: (id: string, data: object) => api.put(`/livestock/${id}`, data),
  delete: (id: string) => api.delete(`/livestock/${id}`),
  addMovement: (id: string, data: object) => api.post(`/livestock/${id}/movements`, data),
  getMovements: (id: string) => api.get(`/livestock/${id}/movements`),
  addExpense: (id: string, data: object) => api.post(`/livestock/${id}/expenses`, data),
  getExpenses: (id: string) => api.get(`/livestock/${id}/expenses`),
};

// Services Cultures
export const cropService = {
  getPlots: (projectId: string) => api.get(`/projects/${projectId}/plots`),
  createPlot: (data: object) => api.post('/plots', data),
  updatePlot: (id: string, data: object) => api.put(`/plots/${id}`, data),
  getCrops: (projectId: string, params?: object) =>
    api.get(`/projects/${projectId}/crops`, { params }),
  getById: (id: string) => api.get(`/crops/${id}`),
  create: (data: object) => api.post('/crops', data),
  update: (id: string, data: object) => api.put(`/crops/${id}`, data),
  addHarvest: (id: string, data: object) => api.post(`/crops/${id}/harvests`, data),
  getHarvests: (id: string) => api.get(`/crops/${id}/harvests`),
  addExpense: (id: string, data: object) => api.post(`/crops/${id}/expenses`, data),
};

// Services Stocks
export const stockService = {
  getByProject: (projectId: string, params?: object) =>
    api.get(`/projects/${projectId}/stocks`, { params }),
  getById: (id: string) => api.get(`/stocks/${id}`),
  create: (data: object) => api.post('/stocks', data),
  update: (id: string, data: object) => api.put(`/stocks/${id}`, data),
  addMovement: (id: string, data: object) => api.post(`/stocks/${id}/movements`, data),
  getMovements: (id: string) => api.get(`/stocks/${id}/movements`),
};

// Services Ventes
export const saleService = {
  getByProject: (projectId: string, params?: object) =>
    api.get(`/projects/${projectId}/sales`, { params }),
  getById: (id: string) => api.get(`/sales/${id}`),
  create: (data: object) => api.post('/sales', data),
  update: (id: string, data: object) => api.put(`/sales/${id}`, data),
  delete: (id: string) => api.delete(`/sales/${id}`),
  getCustomers: (projectId: string) => api.get('/customers', { params: { projectId } }),
  createCustomer: (data: object) => api.post('/customers', data),
};

// Services Rapports
export const reportService = {
  getProfitLoss: (projectId: string, dateFrom?: string, dateTo?: string) =>
    api.get(`/projects/${projectId}/reports/profit-loss`, { params: { dateFrom, dateTo } }),
  getBalanceSheet: (projectId: string, asOf?: string) =>
    api.get(`/projects/${projectId}/reports/balance-sheet`, { params: { asOf } }),
  getCashFlow: (projectId: string, dateFrom?: string, dateTo?: string) =>
    api.get(`/projects/${projectId}/reports/cash-flow`, { params: { dateFrom, dateTo } }),
  getCropAnalysis: (projectId: string) =>
    api.get(`/projects/${projectId}/reports/crop-analysis`),
  getLivestockAnalysis: (projectId: string) =>
    api.get(`/projects/${projectId}/reports/livestock-analysis`),
};

// Services Clôtures
export const closureService = {
  getAll: (projectId: string) => api.get(`/projects/${projectId}/closures`),
  getByProject: (projectId: string) => api.get(`/projects/${projectId}/closures`),
  getById: (id: string) => api.get(`/closures/${id}`),
  create: (data: object) => api.post('/closures', data),
  update: (id: string, data: object) => api.put(`/closures/${id}`, data),
  validate: (id: string) => api.post(`/closures/${id}/validate`),
  distribute: (id: string, data: object) => api.post(`/closures/${id}/distribute`, data),
};

// Services Trésorerie
export const treasuryService = {
  getAccounts: (projectId: string) => api.get(`/projects/${projectId}/treasury`),
  createAccount: (data: object) => api.post('/treasury/accounts', data),
  updateAccount: (id: string, data: object) => api.put(`/treasury/accounts/${id}`, data),
  deleteAccount: (id: string) => api.delete(`/treasury/accounts/${id}`),
  getFlows: (accountId: string, params?: object) =>
    api.get(`/treasury/accounts/${accountId}/flows`, { params }),
  addFlow: (accountId: string, data: object) =>
    api.post(`/treasury/accounts/${accountId}/flows`, data),
};

// Services Utilisateurs
export const userService = {
  getAll: () => api.get('/users'),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: object) => api.post('/users', data),
  updateProfile: (id: string, data: object) => api.put(`/users/${id}`, data),
  changePassword: (id: string, data: object) => api.put(`/users/${id}/password`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};
