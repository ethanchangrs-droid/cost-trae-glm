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
    if (!error.response) {
      const networkError = {
        code: 'NETWORK_ERROR',
        message: '网络连接失败，请检查网络设置',
        timestamp: new Date().toISOString(),
      };
      return Promise.reject(networkError);
    }

    const { status, data } = error.response;
    const errorInfo = {
      status,
      code: data?.error?.code || 'UNKNOWN_ERROR',
      message: getErrorMessage(data?.error),
      details: data?.error?.details,
      timestamp: data?.error?.timestamp || new Date().toISOString(),
      path: data?.error?.path,
      method: data?.error?.method,
    };

    return Promise.reject(errorInfo);
  }
);

function getErrorMessage(error) {
  if (!error) return '未知错误';

  const errorMessages = {
    VALIDATION_ERROR: '数据验证失败，请检查输入信息',
    INVALID_ID: '无效的ID格式',
    DUPLICATE_ENTRY: '数据已存在，请勿重复提交',
    INVALID_TOKEN: '无效的访问令牌',
    TOKEN_EXPIRED: '访问令牌已过期，请重新登录',
    FOREIGN_KEY_CONSTRAINT: '外键约束错误，请检查关联数据',
    DATABASE_ERROR: '数据库操作错误',
    NOT_FOUND: '请求的资源不存在',
    UNAUTHORIZED: '未授权访问',
    FORBIDDEN: '无权限访问',
    INTERNAL_SERVER_ERROR: '服务器内部错误，请稍后重试',
    NETWORK_ERROR: '网络连接失败，请检查网络设置',
  };

  return errorMessages[error.code] || error.message || '未知错误';
}

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
  validateSubmit: (expenseData, userId) => api.post('/expenses/validate/submit', { expenseData, user_id: userId }),
  getValidationHistory: (id, limit = 10) => api.get(`/expenses/${id}/validation-history`, { params: { limit } }),
  getValidationStats: (id) => api.get(`/expenses/${id}/validation-stats`),
};

export const ruleAPI = {
  getRules: (params) => api.get('/rules', { params }),
  getRule: (id) => api.get(`/rules/${id}`),
  createRule: (data) => api.post('/rules', data),
  updateRule: (id, data) => api.put(`/rules/${id}`, data),
  deleteRule: (id) => api.delete(`/rules/${id}`),
  getCategories: () => api.get('/rules/categories/list'),
  getStats: () => api.get('/rules/stats/summary'),
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
  getSuggestion: (field, value, context) => api.post('/llm/suggestion', { field, value, context }),
  getAutofill: (itemType, partialData) => api.post('/llm/autofill', { item_type: itemType, partial_data: partialData }),
  getCompliance: (expenseData, rules) => api.post('/llm/compliance', { expense_data: expenseData, rules }),
  parseNaturalLanguage: (description) => api.post('/llm/parse-rule', { description }),
};

export const validationAPI = {
  validateItem: (itemData, userId, cityName) => api.post('/validation/realtime/item', { itemData, user_id: userId, city_name: cityName }),
  validateForm: (expenseData, userId) => api.post('/validation/realtime/form', { expenseData, user_id: userId }),
  validateSummary: (expenseData, userId) => api.post('/validation/realtime/summary', { expenseData, user_id: userId }),
  getActiveRules: (params) => api.get('/validation/rules/active', { params }),
  getApplicableRules: (userId, cityName) => api.get('/validation/rules/applicable', { params: { user_id: userId, city_name: cityName } }),
};

export const adminAPI = {
  getStats: (params) => api.get('/admin/stats', { params }),
  getExpenses: (params) => api.get('/admin/expenses', { params }),
  getExpenseDetail: (id) => api.get(`/admin/expenses/${id}`),
  exportExpenses: (params) => api.get('/admin/export/expenses', {
    params,
    responseType: 'blob',
  }).then((response) => {
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `费用记录导出_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }),
  getValidations: (params) => api.get('/admin/validations', { params }),
};

export default api;
