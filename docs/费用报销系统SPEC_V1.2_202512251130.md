# 费用报销系统技术规格文档 (SPEC)
**版本**: V1.2  
**创建日期**: 2025年12月25日  
**最后更新**: 2025年12月25日  
**更新内容**: 移除用户登录注册功能，增加用户管理功能，调整数据库设计和API设计  

## 1. 技术架构概述

### 1.1 架构原则
- **简单性**：实验性质项目，采用成熟稳定的技术栈
- **本地化**：支持本地电脑部署运行
- **模块化**：前后端分离，便于维护和扩展
- **智能化**：集成LLM能力，提供智能辅助功能
- **无认证**：系统不包含用户认证功能，所有用户权限相同

### 1.2 整体架构
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端界面      │    │   后端API服务   │    │   LLM服务       │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (阿里云百炼)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   本地数据库     │
                       │   (SQLite)      │
                       └─────────────────┘
```

## 2. 技术栈选择

### 2.1 前端技术栈
- **框架**: React 18.x
- **状态管理**: React Context + useReducer
- **UI组件库**: Ant Design 5.x
- **路由**: React Router 6.x
- **HTTP客户端**: Axios
- **构建工具**: Vite
- **样式**: CSS Modules + Ant Design

### 2.2 后端技术栈
- **运行时**: Node.js 18.x
- **框架**: Express.js
- **数据库**: SQLite3
- **ORM**: Sequelize
- **API文档**: Swagger/OpenAPI
- **日志**: Winston

### 2.3 LLM集成
- **服务提供商**: 阿里云百炼平台
- **模型选择**: QWEN系列、DeepSeek系列
- **SDK**: 阿里云百炼官方SDK
- **备用方案**: OpenAI兼容接口

### 2.4 开发工具
- **包管理**: npm
- **代码规范**: ESLint + Prettier
- **版本控制**: Git
- **环境管理**: dotenv

## 3. 系统架构设计

### 3.1 前端架构
```
src/
├── components/          # 通用组件
│   ├── Form/            # 表单组件
│   ├── Layout/          # 布局组件
│   ├── UserSelector/    # 用户选择弹窗组件
│   └── Common/          # 公共组件
├── pages/               # 页面组件
│   ├── Expense/         # 费用报销页
│   ├── Rules/           # 规则配置页
│   ├── Dashboard/       # 仪表板页
│   └── UserManagement/  # 用户管理页
├── services/            # API服务
├── utils/               # 工具函数
├── hooks/               # 自定义Hooks
├── contexts/            # React Context
└── styles/              # 样式文件
```

### 3.2 后端架构
```
src/
├── controllers/         # 控制器
│   ├── expense.js      # 费用管理
│   ├── rules.js        # 规则管理
│   └── user.js         # 用户管理
├── models/              # 数据模型
│   ├── User.js         # 用户模型
│   ├── Expense.js      # 费用模型
│   └── Rule.js         # 规则模型
├── services/            # 业务服务
│   ├── llm.js          # LLM服务
│   ├── ruleEngine.js   # 规则引擎
│   └── validator.js    # 验证服务
├── middleware/          # 中间件
│   └── validation.js   # 验证中间件
├── routes/              # 路由定义
├── config/              # 配置文件
└── utils/               # 工具函数
```

## 4. 数据库设计

### 4.1 数据库选择
选择SQLite作为数据库，原因：
- 本地部署简单，无需额外安装
- 适合中小型应用
- 支持标准SQL语法
- 文件型数据库，便于备份和迁移

### 4.2 数据表设计

#### 4.2.1 用户表 (users)
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    position_level VARCHAR(20) CHECK (position_level IN ('employee', 'manager', 'executive')) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 4.2.2 费用报销表 (expenses)
```sql
CREATE TABLE expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    trip_start_date DATE NOT NULL,
    trip_end_date DATE NOT NULL,
    destination_city VARCHAR(100) NOT NULL,
    trip_reason TEXT,
    status ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft',
    total_amount DECIMAL(10,2) NOT NULL,
    validation_result JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 4.2.3 费用明细表 (expense_items)
```sql
CREATE TABLE expense_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id INTEGER NOT NULL,
    item_type ENUM('transport', 'accommodation', 'meal') NOT NULL,
    description VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    details JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (expense_id) REFERENCES expenses(id)
);
```

#### 4.2.4 报销规则表 (rules)
```sql
CREATE TABLE rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    rule_storage_type ENUM('structured', 'natural', 'hybrid') DEFAULT 'structured',
    rule_type ENUM('accommodation', 'transport', 'meal') NOT NULL,
    position_level VARCHAR(50),
    city_tier VARCHAR(50),
    complexity_score INT DEFAULT 0,
    structured_content JSON,
    natural_content TEXT,
    validation_strategy JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 4.2.5 规则验证结果表 (rule_validations)
```sql
CREATE TABLE rule_validations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id INTEGER NOT NULL,
    rule_id INTEGER NOT NULL,
    validation_type ENUM('structured', 'natural', 'hybrid') NOT NULL,
    validation_result JSON NOT NULL,
    execution_time_ms INT,
    llm_calls_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (expense_id) REFERENCES expenses(id),
    FOREIGN KEY (rule_id) REFERENCES rules(id)
);
```

#### 4.2.6 城市等级表 (city_tiers)
```sql
CREATE TABLE city_tiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_name VARCHAR(100) NOT NULL,
    tier ENUM('first', 'second', 'third') NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 5. API设计

### 5.1 用户管理API

#### 5.1.1 获取用户列表
```
GET /api/users?page=1&limit=10&search=张三

Response:
{
    "success": true,
    "data": {
        "users": [
            {
                "id": 1,
                "name": "张三",
                "employee_id": "EMP001",
                "position_level": "employee",
                "created_at": "2025-01-01T00:00:00Z",
                "updated_at": "2025-01-01T00:00:00Z"
            }
        ],
        "pagination": {
            "page": 1,
            "limit": 10,
            "total": 25
        }
    }
}
```

#### 5.1.2 创建用户
```
POST /api/users
Content-Type: application/json

Request:
{
    "name": "李四",
    "employee_id": "EMP002",
    "position_level": "manager"
}

Response:
{
    "success": true,
    "data": {
        "id": 2,
        "name": "李四",
        "employee_id": "EMP002",
        "position_level": "manager",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
    }
}
```

#### 5.1.3 更新用户
```
PUT /api/users/{id}
Content-Type: application/json

Request:
{
    "name": "李四",
    "employee_id": "EMP002",
    "position_level": "executive"
}

Response:
{
    "success": true,
    "data": {
        "id": 2,
        "name": "李四",
        "employee_id": "EMP002",
        "position_level": "executive",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-02T00:00:00Z"
    }
}
```

#### 5.1.4 删除用户
```
DELETE /api/users/{id}

Response:
{
    "success": true,
    "message": "用户删除成功"
}
```

#### 5.1.5 搜索用户
```
GET /api/users/search?q=张

Response:
{
    "success": true,
    "data": [
        {
            "id": 1,
            "name": "张三",
            "employee_id": "EMP001",
            "position_level": "employee"
        },
        {
            "id": 3,
            "name": "张五",
            "employee_id": "EMP003",
            "position_level": "manager"
        }
    ]
}
```

### 5.2 费用管理API

#### 5.2.1 创建费用报销
```
POST /api/expenses
Content-Type: application/json

Request:
{
    "user_id": 1,
    "trip_start_date": "2025-01-01",
    "trip_end_date": "2025-01-03",
    "destination_city": "北京",
    "trip_reason": "客户拜访",
    "items": [
        {
            "item_type": "accommodation",
            "description": "北京希尔顿酒店",
            "amount": 400.00,
            "date": "2025-01-01",
            "details": {
                "hotel_name": "北京希尔顿酒店",
                "nights": 2
            }
        }
    ]
}
```

#### 5.2.2 获取费用列表
```
GET /api/expenses?page=1&limit=10&status=all

Response:
{
    "success": true,
    "data": {
        "expenses": [...],
        "pagination": {
            "page": 1,
            "limit": 10,
            "total": 25
        }
    }
}
```

#### 5.2.3 验证费用报销
```
POST /api/expenses/{id}/validate

Response:
{
    "success": true,
    "data": {
        "is_valid": true,
        "validation_details": {
            "accommodation": {
                "passed": true,
                "message": "符合住宿标准"
            },
            "transport": {
                "passed": false,
                "message": "超出交通工具标准"
            }
        }
    }
}
```

### 5.3 规则管理API

#### 5.3.1 创建规则
```
POST /api/rules
Content-Type: application/json

Request:
{
    "name": "住宿标准规则",
    "rule_type": "accommodation",
    "natural_language": "普通员工在一线城市住宿，每晚不超过400元",
    "conditions": {
        "position_level": "employee",
        "city_tier": "first",
        "max_amount": 400
    }
}
```

#### 5.3.2 自然语言解析规则
```
POST /api/rules/parse
Content-Type: application/json

Request:
{
    "natural_language": "部门经理及以上只能乘坐经济舱",
    "rule_storage_type": "hybrid" // structured | natural | hybrid
}

Response:
{
    "success": true,
    "data": {
        "complexity_analysis": {
            "score": 7,
            "recommendation": "hybrid",
            "reason": "规则包含基础条件和特殊要求"
        },
        "parsed_rule": {
            "structured": {
                "rule_type": "transport",
                "position_level": ["manager", "executive"],
                "basic_conditions": {
                    "max_class": "economy"
                }
            },
            "natural": {
                "exceptions": "特殊情况可申请商务舱",
                "additional_requirements": "需要提供审批文件"
            },
            "validation_strategy": "先进行结构化验证，特殊情况使用LLM推理"
        }
    }
}
```

#### 5.3.3 混合规则验证
```
POST /api/rules/validate-hybrid
Content-Type: application/json

Request:
{
    "expense_id": 123,
    "rule_ids": [1, 2, 3]
}

Response:
{
    "success": true,
    "data": {
        "overall_valid": true,
        "validation_results": [
            {
                "rule_id": 1,
                "rule_name": "住宿标准规则",
                "validation_type": "structured",
                "passed": true,
                "execution_time_ms": 15,
                "llm_calls_count": 0,
                "details": {
                    "amount_check": "passed",
                    "city_tier_check": "passed"
                }
            },
            {
                "rule_id": 2,
                "rule_name": "特殊项目规范",
                "validation_type": "hybrid",
                "passed": true,
                "execution_time_ms": 850,
                "llm_calls_count": 1,
                "details": {
                    "structured_validation": "passed",
                    "natural_validation": "passed",
                    "combined_result": "符合特殊项目要求"
                }
            }
        ],
        "summary": {
            "total_rules": 2,
            "passed_rules": 2,
            "failed_rules": 0,
            "total_execution_time_ms": 865,
            "total_llm_calls": 1
        }
    }
}
```

### 5.4 LLM服务API

#### 5.4.1 智能提示
```
POST /api/llm/suggest
Content-Type: application/json

Request:
{
    "context": "用户正在填写住宿费用",
    "input": "北京",
    "type": "hotel_suggestion"
}

Response:
{
    "success": true,
    "data": {
        "suggestions": [
            "北京希尔顿酒店",
            "北京万豪酒店"
        ]
    }
}
```

#### 5.4.2 自动填充
```
POST /api/llm/autocomplete
Content-Type: application/json

Request:
{
    "user_id": 1,
    "form_data": {
        "destination_city": "上海",
        "trip_start_date": "2025-01-01"
    }
}

Response:
{
    "success": true,
    "data": {
        "suggestions": {
            "hotel_name": "上海浦东香格里拉大酒店",
            "estimated_cost": 500
        }
    }
}
```

## 6. LLM集成设计

### 6.1 阿里云百炼集成
```javascript
// llm.js
const { dashscope } = require('@alicloud/dashscope');

class LLMService {
    constructor() {
        dashscope.apiKey = process.env.DASHSCOPE_API_KEY;
    }

    async analyzeRuleComplexity(naturalLanguage) {
        const prompt = `
分析以下自然语言规则的复杂度，返回1-10的评分：
"${naturalLanguage}"

评分标准：
1-3分：简单规则，可直接结构化
4-6分：中等复杂度，建议混合模式
7-10分：复杂规则，建议纯自然语言

返回JSON格式：
{
    "score": 数字,
    "recommendation": "structured|natural|hybrid",
    "reason": "分析原因",
    "complexity_factors": ["因素1", "因素2"]
}
        `;

        const response = await dashscope.chat.completions.create({
            model: 'qwen-plus',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1
        });

        return JSON.parse(response.choices[0].message.content);
    }

    async parseHybridRule(naturalLanguage) {
        const prompt = `
将以下自然语言规则分解为结构化部分和自然语言部分：
"${naturalLanguage}"

返回JSON格式：
{
    "structured": {
        "rule_type": "accommodation|transport|meal",
        "position_level": ["employee", "manager", "executive"],
        "basic_conditions": {
            // 可以结构化的基础条件
        }
    },
    "natural": {
        "exceptions": "特殊情况和例外处理",
        "additional_requirements": "额外要求"
    },
    "validation_strategy": "描述如何结合两种验证方式"
}
        `;

        const response = await dashscope.chat.completions.create({
            model: 'qwen-plus',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1
        });

        return JSON.parse(response.choices[0].message.content);
    }

    async validateWithNaturalRule(expenseData, naturalRule) {
        const prompt = `
请根据以下自然语言规则验证费用报销数据：

规则：${naturalRule.content}

费用数据：
${JSON.stringify(expenseData, null, 2)}

请返回验证结果：
{
    "passed": true/false,
    "reason": "详细说明",
    "suggestions": "修改建议（如有）"
}
        `;

        const response = await dashscope.chat.completions.create({
            model: 'qwen-max',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1
        });

        return JSON.parse(response.choices[0].message.content);
    }

    async getSuggestions(context, input, type) {
        const prompt = this.buildPrompt(context, input, type);
        
        const response = await dashscope.chat.completions.create({
            model: 'qwen-plus',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3
        });

        return this.parseSuggestions(response.choices[0].message.content);
    }
}
```

### 6.2 混合规则引擎设计
```javascript
// hybridRuleEngine.js
class HybridRuleEngine {
    constructor(ruleService, llmService) {
        this.ruleService = ruleService;
        this.llmService = llmService;
    }

    async validateExpense(expenseId, expenseData, userLevel) {
        const startTime = Date.now();
        const applicableRules = await this.ruleService.getApplicableRules(userLevel);
        const results = [];
        let totalLLMCalls = 0;

        for (const rule of applicableRules) {
            const ruleResult = await this.validateWithRule(expenseData, rule);
            results.push({
                rule_id: rule.id,
                rule_name: rule.name,
                validation_type: rule.rule_storage_type,
                ...ruleResult
            });
            totalLLMCalls += ruleResult.llm_calls_count || 0;
        }

        const validationResult = {
            expense_id: expenseId,
            overall_valid: results.every(r => r.passed),
            validation_results: results,
            summary: {
                total_rules: results.length,
                passed_rules: results.filter(r => r.passed).length,
                failed_rules: results.filter(r => !r.passed).length,
                total_execution_time_ms: Date.now() - startTime,
                total_llm_calls: totalLLMCalls
            }
        };

        // 保存验证结果
        await this.saveValidationResults(validationResult);
        
        return validationResult;
    }

    async validateWithRule(expenseData, rule) {
        const startTime = Date.now();
        
        switch (rule.rule_storage_type) {
            case 'structured':
                return await this.validateWithStructuredRule(expenseData, rule);
            
            case 'natural':
                return await this.validateWithNaturalRule(expenseData, rule);
            
            case 'hybrid':
                return await this.validateWithHybridRule(expenseData, rule);
            
            default:
                throw new Error(`未知的规则类型: ${rule.rule_storage_type}`);
        }
    }

    async validateWithStructuredRule(expenseData, rule) {
        // 结构化规则验证逻辑
        const result = this.applyStructuredValidation(expenseData, rule.structured_content);
        
        return {
            passed: result.passed,
            execution_time_ms: Date.now() - startTime,
            llm_calls_count: 0,
            details: result
        };
    }

    async validateWithNaturalRule(expenseData, rule) {
        // 自然语言规则验证逻辑
        const result = await this.llmService.validateWithNaturalRule(expenseData, rule);
        
        return {
            passed: result.passed,
            execution_time_ms: Date.now() - startTime,
            llm_calls_count: 1,
            details: result
        };
    }

    async validateWithHybridRule(expenseData, rule) {
        // 混合规则验证逻辑
        const structuredResult = await this.validateWithStructuredRule(expenseData, {
            ...rule,
            structured_content: rule.structured_content
        });

        let finalResult = structuredResult;
        
        // 如果结构化验证通过，检查是否需要自然语言验证
        if (structuredResult.passed && this.needsNaturalValidation(expenseData, rule)) {
            const naturalResult = await this.validateWithNaturalRule(expenseData, {
                content: rule.natural_content,
                rule_storage_type: 'natural'
            });
            
            finalResult = this.combineValidationResults(structuredResult, naturalResult);
        }

        return {
            passed: finalResult.passed,
            execution_time_ms: Date.now() - startTime,
            llm_calls_count: finalResult.llm_calls_count || 0,
            details: finalResult
        };
    }

    needsNaturalValidation(expenseData, rule) {
        // 判断是否需要进行自然语言验证
        // 例如：检查是否有特殊情况、例外条件等
        return rule.natural_content && 
               rule.natural_content.length > 0 &&
               this.detectSpecialConditions(expenseData);
    }

    detectSpecialConditions(expenseData) {
        // 检测费用数据中的特殊情况
        const specialKeywords = ['展会', '特殊项目', '临时', '例外'];
        const dataString = JSON.stringify(expenseData).toLowerCase();
        
        return specialKeywords.some(keyword => 
            dataString.includes(keyword.toLowerCase())
        );
    }

    combineValidationResults(structuredResult, naturalResult) {
        // 结合结构化和自然语言验证结果
        return {
            passed: structuredResult.passed && naturalResult.passed,
            structured_validation: structuredResult.details,
            natural_validation: naturalResult.details,
            combined_result: naturalResult.passed ? 
                "结构化验证和自然语言验证均通过" : 
                "自然语言验证未通过",
            llm_calls_count: naturalResult.llm_calls_count
        };
    }

    applyStructuredValidation(expenseData, structuredContent) {
        // 应用结构化规则验证
        const { rule_type, position_level, city_tier, max_amount, conditions } = structuredContent;
        
        // 根据规则类型进行验证
        switch (rule_type) {
            case 'accommodation':
                return this.validateAccommodation(expenseData, conditions);
            case 'transport':
                return this.validateTransport(expenseData, conditions);
            case 'meal':
                return this.validateMeal(expenseData, conditions);
            default:
                return { passed: false, reason: "未知的规则类型" };
        }
    }

    validateAccommodation(expenseData, conditions) {
        // 住宿费用验证逻辑
        const accommodationItems = expenseData.items.filter(item => item.item_type === 'accommodation');
        
        for (const item of accommodationItems) {
            if (item.amount > conditions.max_amount) {
                return {
                    passed: false,
                    reason: `住宿费用 ${item.amount} 超出标准 ${conditions.max_amount}`
                };
            }
        }
        
        return { passed: true, reason: "住宿费用符合标准" };
    }

    validateTransport(expenseData, conditions) {
        // 交通费用验证逻辑
        const transportItems = expenseData.items.filter(item => item.item_type === 'transport');
        
        for (const item of transportItems) {
            if (conditions.max_class && item.details?.class !== conditions.max_class) {
                return {
                    passed: false,
                    reason: `交通工具舱位 ${item.details?.class} 不符合标准 ${conditions.max_class}`
                };
            }
        }
        
        return { passed: true, reason: "交通费用符合标准" };
    }

    validateMeal(expenseData, conditions) {
        // 餐饮费用验证逻辑
        const mealItems = expenseData.items.filter(item => item.item_type === 'meal');
        
        for (const item of mealItems) {
            if (item.amount > conditions.max_amount_per_meal) {
                return {
                    passed: false,
                    reason: `餐饮费用 ${item.amount} 超出单餐标准 ${conditions.max_amount_per_meal}`
                };
            }
        }
        
        return { passed: true, reason: "餐饮费用符合标准" };
    }

    async saveValidationResults(validationResult) {
        // 保存验证结果到数据库
        // 实现数据库保存逻辑
    }
}
```

## 7. 前端组件设计

### 7.1 用户选择弹窗组件
```javascript
// components/UserSelector/UserSelector.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Select, Input, Button, Table } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Search } = Input;

const UserSelector = ({ visible, onCancel, onConfirm, title = "选择用户" }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        if (visible) {
            fetchUsers();
        }
    }, [visible]);

    const fetchUsers = async (search = '') => {
        setLoading(true);
        try {
            const response = await fetch(`/api/users/search?q=${search}`);
            const data = await response.json();
            if (data.success) {
                setUsers(data.data);
            }
        } catch (error) {
            console.error('获取用户列表失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (value) => {
        setSearchText(value);
        fetchUsers(value);
    };

    const handleUserSelect = (userId) => {
        const user = users.find(u => u.id === userId);
        setSelectedUser(user);
    };

    const handleConfirm = () => {
        if (selectedUser) {
            onConfirm(selectedUser);
        }
    };

    const columns = [
        {
            title: '姓名',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: '工号',
            dataIndex: 'employee_id',
            key: 'employee_id',
        },
        {
            title: '级别',
            dataIndex: 'position_level',
            key: 'position_level',
            render: (level) => {
                const levelMap = {
                    'employee': '员工',
                    'manager': '经理',
                    'executive': '高管'
                };
                return levelMap[level] || level;
            }
        }
    ];

    return (
        <Modal
            title={title}
            visible={visible}
            onCancel={onCancel}
            onOk={handleConfirm}
            okButtonProps={{ disabled: !selectedUser }}
            width={600}
        >
            <div style={{ marginBottom: 16 }}>
                <Search
                    placeholder="按姓名搜索用户"
                    onSearch={handleSearch}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: '100%' }}
                    prefix={<SearchOutlined />}
                />
            </div>
            
            <Table
                columns={columns}
                dataSource={users}
                loading={loading}
                rowKey="id"
                size="small"
                onRow={(record) => ({
                    onClick: () => handleUserSelect(record.id),
                    style: {
                        cursor: 'pointer',
                        backgroundColor: selectedUser?.id === record.id ? '#e6f7ff' : 'transparent'
                    }
                })}
                pagination={{
                    pageSize: 10,
                    showSizeChanger: false,
                    showQuickJumper: true
                }}
            />
            
            {selectedUser && (
                <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
                    <strong>已选择用户：</strong> {selectedUser.name} ({selectedUser.employee_id}) - {selectedUser.position_level}
                </div>
            )}
        </Modal>
    );
};

export default UserSelector;
```

### 7.2 用户管理页面组件
```javascript
// pages/UserManagement/UserManagement.jsx
import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const { Option } = Select;

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/users');
            const data = await response.json();
            if (data.success) {
                setUsers(data.data.users);
            }
        } catch (error) {
            message.error('获取用户列表失败');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingUser(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        form.setFieldsValue(user);
        setModalVisible(true);
    };

    const handleDelete = async (userId) => {
        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (data.success) {
                message.success('用户删除成功');
                fetchUsers();
            } else {
                message.error('用户删除失败');
            }
        } catch (error) {
            message.error('用户删除失败');
        }
    };

    const handleSubmit = async (values) => {
        try {
            const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
            const method = editingUser ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(values)
            });
            
            const data = await response.json();
            if (data.success) {
                message.success(editingUser ? '用户更新成功' : '用户创建成功');
                setModalVisible(false);
                fetchUsers();
            } else {
                message.error(editingUser ? '用户更新失败' : '用户创建失败');
            }
        } catch (error) {
            message.error(editingUser ? '用户更新失败' : '用户创建失败');
        }
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
        },
        {
            title: '姓名',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: '工号',
            dataIndex: 'employee_id',
            key: 'employee_id',
        },
        {
            title: '级别',
            dataIndex: 'position_level',
            key: 'position_level',
            render: (level) => {
                const levelMap = {
                    'employee': '员工',
                    'manager': '经理',
                    'executive': '高管'
                };
                return levelMap[level] || level;
            }
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date) => new Date(date).toLocaleString()
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    >
                        编辑
                    </Button>
                    <Popconfirm
                        title="确定要删除这个用户吗？"
                        onConfirm={() => handleDelete(record.id)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Button
                            type="link"
                            danger
                            icon={<DeleteOutlined />}
                        >
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAdd}
                >
                    添加用户
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={users}
                loading={loading}
                rowKey="id"
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 条记录`
                }}
            />

            <Modal
                title={editingUser ? '编辑用户' : '添加用户'}
                visible={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={() => form.submit()}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        name="name"
                        label="姓名"
                        rules={[{ required: true, message: '请输入姓名' }]}
                    >
                        <Input placeholder="请输入姓名" />
                    </Form.Item>

                    <Form.Item
                        name="employee_id"
                        label="工号"
                        rules={[
                            { required: true, message: '请输入工号' },
                            { pattern: /^[A-Z0-9]+$/, message: '工号只能包含大写字母和数字' }
                        ]}
                    >
                        <Input placeholder="请输入工号" />
                    </Form.Item>

                    <Form.Item
                        name="position_level"
                        label="级别"
                        rules={[{ required: true, message: '请选择级别' }]}
                    >
                        <Select placeholder="请选择级别">
                            <Option value="employee">员工</Option>
                            <Option value="manager">经理</Option>
                            <Option value="executive">高管</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default UserManagement;
```

## 8. 部署配置

### 8.1 环境变量配置
```bash
# .env
NODE_ENV=development
PORT=3001
DB_PATH=./database/expense_system.db
DASHSCOPE_API_KEY=your_dashscope_api_key
```

### 8.2 数据库初始化脚本
```bash
# scripts/init-db.sh
#!/bin/bash

# 创建数据库目录
mkdir -p database

# 初始化数据库
node scripts/init-database.js

echo "数据库初始化完成"
```

### 8.3 启动脚本
```bash
# scripts/start.sh
#!/bin/bash

# 启动后端服务
cd backend
npm run dev &

# 启动前端服务
cd ../frontend
npm run dev &

echo "系统启动完成"
echo "前端地址: http://localhost:3000"
echo "后端地址: http://localhost:3001"
```

## 9. 测试策略

### 9.1 单元测试
- 使用Jest进行单元测试
- 覆盖核心业务逻辑和工具函数
- 目标覆盖率：80%以上

### 9.2 集成测试
- 测试API接口的完整流程
- 测试数据库操作的正确性
- 测试LLM集成的稳定性

### 9.3 端到端测试
- 使用Cypress进行E2E测试
- 覆盖主要用户操作流程
- 确保系统功能的完整性

## 10. 性能优化

### 10.1 前端优化
- 使用React.memo优化组件渲染
- 实现虚拟滚动处理大量数据
- 使用懒加载减少初始加载时间

### 10.2 后端优化
- 实现数据库查询优化
- 使用缓存减少重复计算
- 实现API响应压缩

### 10.3 LLM调用优化
- 实现智能缓存减少LLM调用
- 批量处理提高效率
- 实现降级策略保证可用性

---

**文档版本**: V1.2  
**最后更新**: 2025年12月25日  
**下次更新计划**: 根据开发进展和用户反馈持续更新