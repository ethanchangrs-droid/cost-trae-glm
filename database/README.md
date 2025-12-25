# Database 数据库设计

费用报销系统的数据库设计文档，基于SQLite构建。

## 数据库概述

- **数据库类型**: SQLite
- **ORM框架**: Sequelize 6.37.7
- **字符集**: UTF-8
- **存储位置**: `./database/expense_system.db`

## 数据库表结构

### 1. 用户表 (users)

存储系统用户的基本信息。

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  employee_id VARCHAR(50) NOT NULL UNIQUE,
  level VARCHAR(20) NOT NULL DEFAULT 'L1',
  department VARCHAR(100),
  position VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_users_employee_id ON users(employee_id);
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_level ON users(level);
```

**字段说明**:
- `id`: 主键，自增
- `name`: 用户姓名，必填
- `employee_id`: 员工工号，必填且唯一
- `level`: 用户级别（L1, L2, L3等）
- `department`: 所属部门
- `position`: 职位
- `email`: 邮箱地址
- `phone`: 联系电话
- `is_active`: 是否激活
- `created_at`: 创建时间
- `updated_at`: 更新时间

### 2. 费用记录表 (expenses)

存储费用报销的主记录。

```sql
CREATE TABLE expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title VARCHAR(200) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  submit_date DATETIME NOT NULL,
  approved_date DATETIME,
  approved_by INTEGER,
  description TEXT,
  attachment_urls TEXT,
  validation_results TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_submit_date ON expenses(submit_date);
CREATE INDEX idx_expenses_total_amount ON expenses(total_amount);
```

**字段说明**:
- `id`: 主键，自增
- `user_id`: 用户ID，外键关联users表
- `title`: 报销标题
- `total_amount`: 总金额
- `status`: 状态（pending, approved, rejected）
- `submit_date`: 提交日期
- `approved_date`: 审批日期
- `approved_by`: 审批人ID
- `description`: 报销说明
- `attachment_urls`: 附件URL列表（JSON格式）
- `validation_results`: 验证结果（JSON格式）
- `created_at`: 创建时间
- `updated_at`: 更新时间

### 3. 费用项目表 (expense_items)

存储具体的费用项目明细。

```sql
CREATE TABLE expense_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_id INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE NOT NULL,
  description TEXT,
  receipt_url VARCHAR(500),
  location VARCHAR(200),
  vendor VARCHAR(100),
  invoice_number VARCHAR(100),
  is_receipt_uploaded BOOLEAN DEFAULT FALSE,
  ai_extracted_data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_expense_items_expense_id ON expense_items(expense_id);
CREATE INDEX idx_expense_items_type ON expense_items(type);
CREATE INDEX idx_expense_items_category ON expense_items(category);
CREATE INDEX idx_expense_items_expense_date ON expense_items(expense_date);
```

**字段说明**:
- `id`: 主键，自增
- `expense_id`: 费用记录ID，外键关联expenses表
- `type`: 费用类型（交通费、住宿费、餐饮费等）
- `category`: 费用分类（差旅费、办公费、招待费等）
- `amount`: 金额
- `expense_date`: 费用发生日期
- `description`: 费用说明
- `receipt_url`: 票据图片URL
- `location`: 费用发生地点
- `vendor`: 商家/供应商
- `invoice_number`: 发票号码
- `is_receipt_uploaded`: 是否已上传票据
- `ai_extracted_data`: AI提取的数据（JSON格式）
- `created_at`: 创建时间
- `updated_at`: 更新时间

### 4. 规则表 (rules)

存储费用规则配置。

```sql
CREATE TABLE rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50),
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  conditions TEXT,
  actions TEXT,
  description TEXT,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_rules_type ON rules(type);
CREATE INDEX idx_rules_category ON rules(category);
CREATE INDEX idx_rules_is_active ON rules(is_active);
CREATE INDEX idx_rules_priority ON rules(priority);
```

**字段说明**:
- `id`: 主键，自增
- `name`: 规则名称
- `type`: 规则类型（structured, natural_language, hybrid）
- `content`: 规则内容
- `category`: 规则分类
- `priority`: 优先级（数字越大优先级越高）
- `is_active`: 是否激活
- `conditions`: 规则条件（JSON格式）
- `actions`: 规则动作（JSON格式）
- `description`: 规则描述
- `created_by`: 创建人ID
- `created_at`: 创建时间
- `updated_at`: 更新时间

### 5. 验证记录表 (validations)

存储规则验证的历史记录。

```sql
CREATE TABLE validations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_id INTEGER NOT NULL,
  rule_id INTEGER,
  validation_type VARCHAR(20) NOT NULL,
  result VARCHAR(20) NOT NULL,
  message TEXT,
  details TEXT,
  validated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_validations_expense_id ON validations(expense_id);
CREATE INDEX idx_validations_rule_id ON validations(rule_id);
CREATE INDEX idx_validations_result ON validations(result);
CREATE INDEX idx_validations_validated_at ON validations(validated_at);
```

**字段说明**:
- `id`: 主键，自增
- `expense_id`: 费用记录ID，外键关联expenses表
- `rule_id`: 规则ID，外键关联rules表
- `validation_type`: 验证类型（realtime, submit）
- `result`: 验证结果（pass, fail, warning）
- `message`: 验证消息
- `details`: 详细信息（JSON格式）
- `validated_at`: 验证时间

### 6. 系统日志表 (system_logs)

存储系统操作日志。

```sql
CREATE TABLE system_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id INTEGER,
  details TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX idx_system_logs_action ON system_logs(action);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);
```

**字段说明**:
- `id`: 主键，自增
- `user_id`: 用户ID，外键关联users表
- `action`: 操作类型
- `resource_type`: 资源类型
- `resource_id`: 资源ID
- `details`: 操作详情（JSON格式）
- `ip_address`: IP地址
- `user_agent`: 用户代理
- `created_at`: 创建时间

## 数据库初始化

### 1. 创建数据库文件
```bash
# 创建数据库目录
mkdir -p database

# 创建数据库文件
sqlite3 database/expense_system.db < database/init.sql
```

### 2. 初始化脚本 (init.sql)

```sql
-- 启用外键约束
PRAGMA foreign_keys = ON;

-- 创建用户表
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  employee_id VARCHAR(50) NOT NULL UNIQUE,
  level VARCHAR(20) NOT NULL DEFAULT 'L1',
  department VARCHAR(100),
  position VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建费用记录表
CREATE TABLE expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title VARCHAR(200) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  submit_date DATETIME NOT NULL,
  approved_date DATETIME,
  approved_by INTEGER,
  description TEXT,
  attachment_urls TEXT,
  validation_results TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 创建费用项目表
CREATE TABLE expense_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_id INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE NOT NULL,
  description TEXT,
  receipt_url VARCHAR(500),
  location VARCHAR(200),
  vendor VARCHAR(100),
  invoice_number VARCHAR(100),
  is_receipt_uploaded BOOLEAN DEFAULT FALSE,
  ai_extracted_data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
);

-- 创建规则表
CREATE TABLE rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50),
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  conditions TEXT,
  actions TEXT,
  description TEXT,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 创建验证记录表
CREATE TABLE validations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_id INTEGER NOT NULL,
  rule_id INTEGER,
  validation_type VARCHAR(20) NOT NULL,
  result VARCHAR(20) NOT NULL,
  message TEXT,
  details TEXT,
  validated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE SET NULL
);

-- 创建系统日志表
CREATE TABLE system_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id INTEGER,
  details TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 创建索引
CREATE INDEX idx_users_employee_id ON users(employee_id);
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_level ON users(level);

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_submit_date ON expenses(submit_date);
CREATE INDEX idx_expenses_total_amount ON expenses(total_amount);

CREATE INDEX idx_expense_items_expense_id ON expense_items(expense_id);
CREATE INDEX idx_expense_items_type ON expense_items(type);
CREATE INDEX idx_expense_items_category ON expense_items(category);
CREATE INDEX idx_expense_items_expense_date ON expense_items(expense_date);

CREATE INDEX idx_rules_type ON rules(type);
CREATE INDEX idx_rules_category ON rules(category);
CREATE INDEX idx_rules_is_active ON rules(is_active);
CREATE INDEX idx_rules_priority ON rules(priority);

CREATE INDEX idx_validations_expense_id ON validations(expense_id);
CREATE INDEX idx_validations_rule_id ON validations(rule_id);
CREATE INDEX idx_validations_result ON validations(result);
CREATE INDEX idx_validations_validated_at ON validations(validated_at);

CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX idx_system_logs_action ON system_logs(action);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);

-- 插入初始数据
INSERT INTO users (name, employee_id, level, department, position) VALUES
('系统管理员', 'ADMIN', 'L3', 'IT部', '系统管理员'),
('张三', 'E001', 'L2', '销售部', '销售经理'),
('李四', 'E002', 'L1', '技术部', '开发工程师'),
('王五', 'E003', 'L1', '财务部', '会计');

INSERT INTO rules (name, type, content, category, priority, description) VALUES
('差旅费金额限制', 'natural_language', '差旅费单次不超过1000元', '费用限制', 1, '限制单次差旅费报销金额'),
('餐饮费每日限制', 'natural_language', '餐饮费每日不超过200元', '费用限制', 2, '限制每日餐饮费报销金额'),
('交通费类型限制', 'structured', '{"type": "交通费", "allowed_types": ["飞机", "高铁", "出租车", "公交车"]}', '费用类型', 1, '限制交通费类型');
```

## 数据库维护

### 1. 备份数据库
```bash
# 备份数据库
sqlite3 database/expense_system.db ".backup database/backup_$(date +%Y%m%d_%H%M%S).db"

# 导出SQL
sqlite3 database/expense_system.db ".dump" > database/backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. 恢复数据库
```bash
# 从备份文件恢复
sqlite3 database/expense_system_new.db < database/backup_20251225_120000.sql

# 替换原数据库
mv database/expense_system_new.db database/expense_system.db
```

### 3. 数据库优化
```sql
-- 分析表统计信息
ANALYZE;

-- 重建索引
REINDEX;

-- 清理数据库
VACUUM;
```

## 性能优化

### 1. 查询优化
- 使用适当的索引
- 避免全表扫描
- 使用EXPLAIN QUERY PLAN分析查询

### 2. 数据库配置
```sql
-- 设置缓存大小（10MB）
PRAGMA cache_size = -10000;

-- 设置同步模式
PRAGMA synchronous = NORMAL;

-- 设置临时存储
PRAGMA temp_store = MEMORY;
```

### 3. 连接池配置
```javascript
// Sequelize连接池配置
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database/expense_system.db',
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});
```

## 数据安全

### 1. 数据加密
- 敏感字段加密存储
- 传输过程SSL加密
- 数据库文件权限控制

### 2. 访问控制
- 数据库用户权限管理
- 应用层权限验证
- SQL注入防护

### 3. 审计日志
- 记录所有数据修改操作
- 定期审查异常操作
- 保留完整的操作历史

---

**版本**: 1.0  
**最后更新**: 2025年12月25日