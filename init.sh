#!/bin/bash
# 费用报销系统 - 项目初始化脚本

set -e

echo "=== 费用报销系统 - 环境初始化 ==="

# 1. 检查 Node.js
echo "检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18.x 或更高版本"
    exit 1
fi

node --version
npm --version

# 2. 检查 Python（用于LLM SDK）
echo "检查 Python..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装，请先安装 Python 3.8 或更高版本"
    exit 1
fi

python3 --version

# 3. 创建项目目录结构
echo "创建项目目录结构..."
mkdir -p frontend/{src/{components,pages,services,utils,hooks,contexts,styles},public}
mkdir -p backend/{src/{controllers,models,services,middleware,routes,config,utils},tests}
mkdir -p database/{migrations,seeds}
mkdir -p docs/{api,deployment}
mkdir -p logs
mkdir -p uploads/{receipts,temp}
mkdir -p screenshots
mkdir -p videos

# 4. 初始化后端项目
echo "初始化后端项目..."
cd backend
if [ ! -f package.json ]; then
    npm init -y
    echo "初始化 package.json 完成"
fi

# 安装后端依赖
echo "安装后端依赖..."
npm install express cors helmet morgan winston jsonwebtoken bcryptjs
npm install sequelize sqlite3 dotenv multer axios
npm install --save-dev nodemon jest supertest eslint prettier

# 5. 初始化前端项目
echo "初始化前端项目..."
cd ../frontend
if [ ! -f package.json ]; then
    npm create vite@latest . -- --template react
    echo "初始化 React 项目完成"
fi

# 安装前端依赖
echo "安装前端依赖..."
npm install antd react-router-dom axios
npm install --save-dev @testing-library/react @testing-library/jest-dom

# 6. 创建环境配置文件
echo "创建环境配置文件..."
cd ../backend
if [ ! -f .env ]; then
    cat > .env << EOF
# 服务器配置
PORT=3001
NODE_ENV=development

# 数据库配置
DB_PATH=../database/expense_system.db

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# LLM配置（阿里云百炼）
DASHSCOPE_API_KEY=your-dashscope-api-key
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/api/v1

# 文件上传配置
UPLOAD_PATH=../uploads
MAX_FILE_SIZE=10485760
EOF
    echo "创建 .env 配置文件完成"
fi

# 7. 创建数据库初始化脚本
echo "创建数据库初始化脚本..."
cd ../database
if [ ! -f init.sql ]; then
    cat > init.sql << EOF
-- 费用报销系统数据库初始化脚本

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    name VARCHAR(100) NOT NULL,
    employee_id VARCHAR(50) UNIQUE,
    department VARCHAR(100),
    position_level VARCHAR(20) CHECK (position_level IN ('employee', 'manager', 'executive')) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('user', 'admin')) DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 费用报销表
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    trip_start_date DATE NOT NULL,
    trip_end_date DATE NOT NULL,
    destination_city VARCHAR(100) NOT NULL,
    trip_reason TEXT,
    status VARCHAR(20) CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')) DEFAULT 'draft',
    total_amount DECIMAL(10,2) NOT NULL,
    validation_result TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 费用明细表
CREATE TABLE IF NOT EXISTS expense_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id INTEGER NOT NULL,
    item_type VARCHAR(20) CHECK (item_type IN ('transport', 'accommodation', 'meal')) NOT NULL,
    description VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (expense_id) REFERENCES expenses(id)
);

-- 报销规则表
CREATE TABLE IF NOT EXISTS rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    rule_storage_type VARCHAR(20) CHECK (rule_storage_type IN ('structured', 'natural', 'hybrid')) DEFAULT 'structured',
    rule_type VARCHAR(20) CHECK (rule_type IN ('accommodation', 'transport', 'meal')) NOT NULL,
    position_level VARCHAR(50),
    city_tier VARCHAR(50),
    complexity_score INTEGER DEFAULT 0,
    structured_content TEXT,
    natural_content TEXT,
    validation_strategy TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 规则验证结果表
CREATE TABLE IF NOT EXISTS rule_validations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id INTEGER NOT NULL,
    rule_id INTEGER NOT NULL,
    validation_type VARCHAR(20) CHECK (validation_type IN ('structured', 'natural', 'hybrid')) NOT NULL,
    validation_result TEXT NOT NULL,
    execution_time_ms INTEGER,
    llm_calls_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (expense_id) REFERENCES expenses(id),
    FOREIGN KEY (rule_id) REFERENCES rules(id)
);

-- 城市等级表
CREATE TABLE IF NOT EXISTS city_tiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_name VARCHAR(100) NOT NULL,
    tier VARCHAR(10) CHECK (tier IN ('first', 'second', 'third')) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_expense_id ON expense_items(expense_id);
CREATE INDEX IF NOT EXISTS idx_rule_validations_expense_id ON rule_validations(expense_id);
CREATE INDEX IF NOT EXISTS idx_rules_type_level ON rules(rule_type, position_level);

-- 插入初始数据
INSERT OR IGNORE INTO city_tiers (city_name, tier) VALUES
('北京', 'first'),
('上海', 'first'),
('广州', 'first'),
('深圳', 'first'),
('杭州', 'first'),
('南京', 'second'),
('武汉', 'second'),
('成都', 'second'),
('西安', 'second'),
('郑州', 'second'),
('石家庄', 'third'),
('太原', 'third'),
('呼和浩特', 'third'),
('沈阳', 'third'),
('长春', 'third');

-- 创建默认管理员用户（密码: admin123）
INSERT OR IGNORE INTO users (username, password, email, name, employee_id, department, position_level, role) VALUES
('admin', '$2b$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQ', 'admin@example.com', '系统管理员', 'ADMIN001', 'IT', 'executive', 'admin');
EOF
    echo "创建数据库初始化脚本完成"
fi

# 8. 返回根目录并显示状态
cd ..
echo "=== 初始化完成 ==="
echo ""
echo "📁 项目结构已创建："
echo "  ├── frontend/     - React前端应用"
echo "  ├── backend/      - Node.js后端服务"
echo "  ├── database/     - 数据库脚本和文件"
echo "  ├── docs/         - 项目文档"
echo "  ├── logs/         - 日志文件"
echo "  └── uploads/      - 文件上传目录"
echo ""
echo "📝 下一步操作："
echo "  1. 配置 backend/.env 文件中的API密钥"
echo "  2. 运行 'cd backend && npm run dev' 启动后端服务"
echo "  3. 运行 'cd frontend && npm run dev' 启动前端服务"
echo "  4. 访问 http://localhost:5173 查看前端应用"
echo ""
echo "🔧 开发命令："
echo "  后端开发: cd backend && npm run dev"
echo "  前端开发: cd frontend && npm run dev"
echo "  运行测试: npm test"
echo "  代码检查: npm run lint"
echo ""
echo "✅ 项目初始化完成！"