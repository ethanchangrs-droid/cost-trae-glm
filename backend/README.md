# Backend 后端服务

费用报销系统的后端API服务，基于Node.js + Express构建。

## 技术栈

- **框架**: Express 5.2.1
- **数据库**: SQLite + Sequelize 6.37.7
- **身份验证**: JWT
- **日志**: Winston
- **文件上传**: Multer
- **安全**: Helmet, CORS, bcryptjs

## 项目结构

```
backend/
├── src/
│   ├── controllers/     # 控制器层
│   ├── models/          # 数据模型
│   ├── routes/          # 路由定义
│   ├── middleware/      # 中间件
│   ├── services/        # 业务逻辑层
│   ├── utils/           # 工具函数
│   └── config/          # 配置文件
├── tests/               # 测试文件
├── .env                 # 环境变量配置
├── package.json         # 依赖配置
└── index.js            # 应用入口
```

## 核心功能模块

### 1. 用户管理 (`/api/users`)
- 用户信息CRUD操作
- 用户搜索功能
- 用户级别管理

### 2. 费用管理 (`/api/expense`)
- 费用表单提交
- 费用记录查询
- 费用状态管理

### 3. 票据识别 (`/api/upload`)
- 票据图像上传
- AI信息提取
- 结构化数据生成

### 4. 规则系统 (`/api/rules`)
- 规则CRUD操作
- 自然语言规则解析
- 实时规则验证
- 混合规则模式

### 5. 身份验证 (`/api/auth`)
- JWT令牌生成
- 身份验证中间件
- 权限控制

## 环境配置

创建 `.env` 文件并配置以下变量：

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# 数据库配置
DB_PATH=./database/expense_system.db

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# AI服务配置
AILL_API_KEY=your_aill_api_key
AILL_BASE_URL=https://dashscope.aliyuncs.com/api/v1

# 文件上传配置
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# 日志配置
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

## 安装与运行

### 1. 安装依赖
```bash
npm install
```

### 2. 初始化数据库
```bash
npm run db:init
```

### 3. 启动开发服务器
```bash
npm run dev
```

### 4. 启动生产服务器
```bash
npm start
```

## API接口文档

### 用户管理

#### 获取用户列表
```http
GET /api/users
```

#### 创建用户
```http
POST /api/users
Content-Type: application/json

{
  "name": "张三",
  "employeeId": "E001",
  "level": "L1"
}
```

#### 更新用户
```http
PUT /api/users/:id
Content-Type: application/json

{
  "name": "张三",
  "level": "L2"
}
```

#### 删除用户
```http
DELETE /api/users/:id
```

#### 搜索用户
```http
GET /api/users/search?name=张三
```

### 费用管理

#### 提交费用表单
```http
POST /api/expense/submit
Content-Type: application/json
Authorization: Bearer <token>

{
  "userId": 1,
  "items": [
    {
      "type": "交通费",
      "amount": 150.00,
      "date": "2025-12-25",
      "description": "北京到上海高铁票",
      "category": "差旅费"
    }
  ],
  "totalAmount": 150.00
}
```

#### 获取费用记录
```http
GET /api/expense/records?userId=1&page=1&limit=10
Authorization: Bearer <token>
```

### 票据识别

#### 上传票据
```http
POST /api/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: <image_file>
```

#### 获取识别结果
```http
GET /api/upload/result/:uploadId
Authorization: Bearer <token>
```

### 规则系统

#### 获取规则列表
```http
GET /api/rules
Authorization: Bearer <token>
```

#### 创建规则
```http
POST /api/rules
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "差旅费规则",
  "type": "natural_language",
  "content": "差旅费单次不超过1000元",
  "category": "费用限制"
}
```

#### 验证规则
```http
POST /api/rules/validate
Content-Type: application/json
Authorization: Bearer <token>

{
  "expenseData": {
    "type": "交通费",
    "amount": 150.00,
    "category": "差旅费"
  },
  "rules": ["差旅费规则"]
}
```

## 数据库模型

### User (用户)
```javascript
{
  id: INTEGER (PK),
  name: STRING,
  employeeId: STRING (UNIQUE),
  level: STRING,
  createdAt: DATE,
  updatedAt: DATE
}
```

### Expense (费用记录)
```javascript
{
  id: INTEGER (PK),
  userId: INTEGER (FK),
  totalAmount: DECIMAL,
  status: ENUM('pending', 'approved', 'rejected'),
  submitDate: DATE,
  createdAt: DATE,
  updatedAt: DATE
}
```

### ExpenseItem (费用项目)
```javascript
{
  id: INTEGER (PK),
  expenseId: INTEGER (FK),
  type: STRING,
  amount: DECIMAL,
  date: DATE,
  description: TEXT,
  category: STRING,
  receiptUrl: STRING,
  createdAt: DATE,
  updatedAt: DATE
}
```

### Rule (规则)
```javascript
{
  id: INTEGER (PK),
  name: STRING,
  type: ENUM('structured', 'natural_language', 'hybrid'),
  content: TEXT,
  category: STRING,
  isActive: BOOLEAN,
  createdAt: DATE,
  updatedAt: DATE
}
```

## 中间件

### 身份验证中间件
```javascript
const authMiddleware = (req, res, next) => {
  // JWT验证逻辑
}
```

### 数据验证中间件
```javascript
const validateMiddleware = (schema) => {
  return (req, res, next) => {
    // 数据验证逻辑
  }
}
```

### 错误处理中间件
```javascript
const errorHandler = (err, req, res, next) => {
  // 统一错误处理
}
```

## 测试

### 运行测试
```bash
npm test
```

### 测试覆盖率
```bash
npm run test:coverage
```

## 部署

### PM2部署
```bash
pm2 start ecosystem.config.js
```

### Docker部署
```bash
docker build -t expense-backend .
docker run -p 3000:3000 expense-backend
```

## 日志管理

日志级别：`error`, `warn`, `info`, `debug`

日志文件位置：`./logs/app.log`

日志轮转：按日期和大小自动轮转

## 安全配置

- 使用Helmet设置安全头
- CORS跨域配置
- JWT令牌过期机制
- 输入数据验证和清理
- SQL注入防护（Sequelize ORM）

## 性能优化

- 数据库查询优化
- API响应缓存
- 文件上传限制
- 连接池配置

---

**版本**: 1.0  
**最后更新**: 2025年12月25日