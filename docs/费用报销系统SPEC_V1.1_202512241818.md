# 费用报销系统技术规格文档 (SPEC)
**版本**: V1.1  
**创建日期**: 2025年12月24日  
**最后更新**: 2025年12月24日  
**更新内容**: 增加混合规则模式技术架构支持  

## 1. 技术架构概述

### 1.1 架构原则
- **简单性**：实验性质项目，采用成熟稳定的技术栈
- **本地化**：支持本地电脑部署运行
- **模块化**：前后端分离，便于维护和扩展
- **智能化**：集成LLM能力，提供智能辅助功能

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
- **身份验证**: JWT
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
│   └── Common/          # 公共组件
├── pages/               # 页面组件
│   ├── Login/           # 登录页
│   ├── Expense/         # 费用报销页
│   ├── Rules/           # 规则配置页
│   └── Dashboard/       # 仪表板页
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
│   ├── auth.js         # 身份验证
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
│   ├── auth.js         # 认证中间件
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
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    name VARCHAR(100) NOT NULL,
    employee_id VARCHAR(50) UNIQUE,
    department VARCHAR(100),
    position_level ENUM('employee', 'manager', 'executive') NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
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

### 5.1 认证相关API

#### 5.1.1 用户登录
```
POST /api/auth/login
Content-Type: application/json

Request:
{
    "username": "string",
    "password": "string"
}

Response:
{
    "success": true,
    "data": {
        "token": "jwt_token",
        "user": {
            "id": 1,
            "username": "john",
            "name": "John Doe",
            "position_level": "employee",
            "role": "user"
        }
    }
}
```

#### 5.1.2 用户注册
```
POST /api/auth/register
Content-Type: application/json

Request:
{
    "username": "string",
    "password": "string",
    "name": "string",
    "employee_id": "string",
    "department": "string",
    "position_level": "employee|manager|executive"
}
```

### 5.2 费用管理API

#### 5.2.1 创建费用报销
```
POST /api/expenses
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
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
Authorization: Bearer {token}

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
Authorization: Bearer {token}

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
Authorization: Bearer {token}
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
Authorization: Bearer {token}
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
Authorization: Bearer {token}
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
Authorization: Bearer {token}
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
Authorization: Bearer {token}
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
        return {
            passed: structuredResult.passed && naturalResult.passed,
            structured_validation: structuredResult.details,
            natural_validation: naturalResult.details,
            combined_result: naturalResult.passed ? 
                "结构化验证和自然语言验证均通过" : 
                "自然语言验证未通过",
            llm_calls_count: (structuredResult.llm_calls_count || 0) + (naturalResult.llm_calls_count || 0)
        };
    }
}
```

## 7. 前端组件设计

### 7.1 表单组件
```jsx
// ExpenseForm.jsx
import React, { useState, useEffect } from 'react';
import { Form, Input, DatePicker, Select, Button, Card } from 'antd';
import { useLLMSuggestions } from '../hooks/useLLMSuggestions';

const ExpenseForm = () => {
    const [form] = Form.useForm();
    const [suggestions, setSuggestions] = useState({});
    const { getSuggestions } = useLLMSuggestions();

    const handleInputChange = async (field, value) => {
        const suggestion = await getSuggestions(field, value);
        setSuggestions(prev => ({ ...prev, [field]: suggestion }));
    };

    return (
        <Card title="差旅费用报销">
            <Form form={form} layout="vertical">
                {/* 基础信息 */}
                <Form.Item label="出差城市" name="destination_city">
                    <Select
                        showSearch
                        placeholder="请选择出差城市"
                        onChange={(value) => handleInputChange('destination_city', value)}
                    >
                        {/* 城市选项 */}
                    </Select>
                </Form.Item>

                {/* 费用明细 */}
                <ExpenseItems suggestions={suggestions} />
                
                <Form.Item>
                    <Button type="primary" htmlType="submit">
                        提交报销
                    </Button>
                </Form.Item>
            </Form>
        </Card>
    );
};
```

### 7.2 规则配置组件
```jsx
// RuleConfig.jsx
import React, { useState } from 'react';
import { Card, Input, Button, message } from 'antd';
import { useRuleParser } from '../hooks/useRuleParser';

const RuleConfig = () => {
    const [naturalLanguage, setNaturalLanguage] = useState('');
    const [parsedRule, setParsedRule] = useState(null);
    const { parseRule } = useRuleParser();

    const handleParseRule = async () => {
        try {
            const result = await parseRule(naturalLanguage);
            setParsedRule(result);
            message.success('规则解析成功');
        } catch (error) {
            message.error('规则解析失败：' + error.message);
        }
    };

    return (
        <Card title="自然语言规则配置">
            <Input.TextArea
                placeholder="请输入自然语言规则，例如：普通员工在一线城市住宿，每晚不超过400元"
                value={naturalLanguage}
                onChange={(e) => setNaturalLanguage(e.target.value)}
                rows={4}
            />
            
            <Button 
                type="primary" 
                onClick={handleParseRule}
                style={{ marginTop: 16 }}
            >
                解析规则
            </Button>

            {parsedRule && (
                <Card title="解析结果" style={{ marginTop: 16 }}>
                    <pre>{JSON.stringify(parsedRule, null, 2)}</pre>
                </Card>
            )}
        </Card>
    );
};
```

## 8. 部署配置

### 8.1 环境变量配置
```bash
# .env
NODE_ENV=development
PORT=3000
JWT_SECRET=your_jwt_secret_key
DB_PATH=./data/expenses.db
DASHSCOPE_API_KEY=your_dashscope_api_key
```

### 8.2 启动脚本
```json
{
    "scripts": {
        "dev": "concurrently \"npm run server:dev\" \"npm run client:dev\"",
        "server:dev": "nodemon src/server.js",
        "client:dev": "cd client && npm run dev",
        "build": "cd client && npm run build",
        "start": "node src/server.js",
        "init-db": "node src/scripts/initDatabase.js"
    }
}
```

### 8.3 数据库初始化
```javascript
// scripts/initDatabase.js
const sequelize = require('../config/database');
const User = require('../models/User');
const Rule = require('../models/Rule');

async function initDatabase() {
    try {
        await sequelize.sync({ force: true });
        
        // 创建默认管理员用户
        await User.create({
            username: 'admin',
            password: 'admin123',
            name: '系统管理员',
            employee_id: 'ADMIN001',
            position_level: 'executive',
            role: 'admin'
        });

        // 创建默认规则
        await Rule.bulkCreate([
            {
                name: '普通员工住宿标准',
                rule_type: 'accommodation',
                natural_language: '普通员工在一线城市住宿，每晚不超过400元',
                conditions: {
                    position_level: 'employee',
                    city_tier: 'first',
                    max_amount: 400
                }
            }
        ]);

        console.log('数据库初始化完成');
    } catch (error) {
        console.error('数据库初始化失败:', error);
    }
}

initDatabase();
```

## 9. 性能优化

### 9.1 前端优化
- 使用React.memo优化组件渲染
- 实现虚拟滚动处理大量数据
- 使用懒加载减少初始加载时间
- 合理使用缓存策略

### 9.2 后端优化
- 数据库查询优化和索引设计
- API响应缓存
- LLM调用频率控制
- 连接池管理

### 9.3 LLM调用优化
- 实现请求缓存机制
- 批量处理减少API调用
- 设置合理的超时时间
- 实现降级策略

## 10. 安全考虑

### 10.1 身份验证
- JWT token认证
- 密码加密存储
- 会话超时管理

### 10.2 数据安全
- 输入验证和清理
- SQL注入防护
- XSS攻击防护

### 10.3 API安全
- 请求频率限制
- CORS配置
- 敏感信息脱敏

---

**文档状态**: 初稿完成  
**下次更新**: 根据UI设计和开发进展调整技术细节