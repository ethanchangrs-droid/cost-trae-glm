// 前端配置管理
const config = {
  // API配置
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
    timeout: 10000,
  },

  // 应用配置
  app: {
    title: import.meta.env.VITE_APP_TITLE || '费用报销系统',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  },

  // 文件上传配置
  upload: {
    maxFileSize: parseInt(import.meta.env.VITE_MAX_FILE_SIZE) || 10485760, // 10MB
    allowedTypes: (import.meta.env.VITE_ALLOWED_FILE_TYPES || 'jpg,jpeg,png,pdf').split(','),
  },

  // 功能开关
  features: {
    enableMock: import.meta.env.VITE_ENABLE_MOCK === 'true',
    enableDebug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
  },

  // 页面路由配置
  routes: {
    home: '/',
    users: '/users',
    expense: '/expense',
    rules: '/rules',
    admin: '/admin',
  },

  // API端点
  endpoints: {
    // 用户管理
    users: '/api/users',
    
    // 费用管理
    expenses: '/api/expenses',
    expenseItems: '/api/expense-items',
    
    // 规则管理
    rules: '/api/rules',
    ruleValidation: '/api/rule-validation',
    
    // LLM服务
    llm: {
      ocr: '/api/llm/ocr',
      assist: '/api/llm/assist',
      validate: '/api/llm/validate',
    },
    
    // 文件上传
    upload: '/api/upload',
  },
};

export default config;