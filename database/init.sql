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
('admin', 'b0', 'admin@example.com', '系统管理员', 'ADMIN001', 'IT', 'executive', 'admin');
