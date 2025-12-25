const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config();

const config = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development',
  },

  // 数据库配置
  database: {
    path: process.env.DB_PATH || path.join(__dirname, '../../database/expense_system.db'),
  },

  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  // LLM配置
  llm: {
    apiKey: process.env.LLM_API_KEY,
    model: process.env.LLM_MODEL || 'deepseek-v3',
    baseUrl: process.env.LLM_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  },

  // 文件上传配置
  upload: {
    path: process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: path.join(__dirname, '../../logs/app.log'),
  },

  // CORS配置
  cors: {
    origin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },
};

// 验证必需的配置项
const requiredEnvVars = ['LLM_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('缺少必需的环境变量:', missingEnvVars.join(', '));
  process.exit(1);
}

module.exports = config;