import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export const userAPI = {
  getUsers: (params) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

export const expenseAPI = {
  getExpenses: (params) => api.get('/expenses', { params }),
  getExpense: (id) => api.get(`/expenses/${id}`),
  createExpense: (data) => api.post('/expenses', data),
  updateExpense: (id, data) => api.put(`/expenses/${id}`, data),
  deleteExpense: (id) => api.delete(`/expenses/${id}`),
  validateExpense: (id) => api.post(`/expenses/${id}/validate`),
};

export const ruleAPI = {
  getRules: (params) => api.get('/rules', { params }),
  getRule: (id) => api.get(`/rules/${id}`),
  createRule: (data) => api.post('/rules', data),
  updateRule: (id, data) => api.put(`/rules/${id}`, data),
  deleteRule: (id) => api.delete(`/rules/${id}`),
};

export const cityTierAPI = {
  getCityTiers: (params) => api.get('/city-tiers', { params }),
  getCityByTier: (tier) => api.get(`/city-tiers/tier/${tier}`),
  getCityByName: (cityName) => api.get(`/city-tiers/name/${cityName}`),
};

export const uploadAPI = {
  uploadReceipt: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/receipt', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const llmAPI = {
  getAssistance: (prompt) => api.post('/llm/assist', { prompt }),
};

export default api;
