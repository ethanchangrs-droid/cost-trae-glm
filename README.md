# 费用报销系统

一个基于LLM智能识别和自然语言规则配置的企业费用报销管理系统。

## 项目概述

本项目是一个实验性质的LLM能力加持的费用报销系统，旨在通过人工智能技术简化企业差旅费用报销流程，提高用户体验和报销效率。

### 核心特性

- 🤖 **智能票据识别**：AI自动识别票据关键信息（类型、金额、日期等）
- 📝 **混合填单界面**：三栏式布局，支持票据预览、结构化信息编辑和智能说明
- 🧠 **LLM智能辅助**：提供智能提示、自动填充和合规性建议
- 📋 **自然语言规则配置**：支持通过自然语言描述配置费用规则
- ✅ **实时规则验证**：表单填写过程中实时验证费用规则
- 👥 **用户管理**：简化的用户信息管理，无需登录注册

### 技术栈

**前端**
- React 19.2.0
- Ant Design 6.1.2
- React Router 7.11.0
- Vite 7.2.4

**后端**
- Node.js + Express 5.2.1
- SQLite + Sequelize 6.37.7
- JWT身份验证
- Winston日志记录

**AI服务**
- 阿里云百炼LLM服务
- 图像识别API

## 项目结构

```
cost-trae-glm4.6/
├── backend/                 # 后端服务
│   ├── package.json        # 后端依赖配置
│   └── .env               # 环境变量配置
├── frontend/               # 前端应用
│   ├── src/               # 源代码
│   ├── public/            # 静态资源
│   └── package.json       # 前端依赖配置
├── database/              # 数据库相关
│   └── init.sql          # 数据库初始化脚本
├── docs/                  # 项目文档
│   ├── 费用报销系统PRD_*.md     # 产品需求文档
│   ├── 费用报销系统SPEC_*.md    # 技术规格文档
│   └── 费用报销系统UI设计_*.md  # UI设计文档
├── logs/                  # 任务日志
├── .trae/                 # 开发规范和配置
│   └── rules/            # 项目开发规范
├── feature_list.json      # 功能任务清单
├── claude-progress.txt    # 开发进度记录
└── init.sh               # 环境初始化脚本
```

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 8.0.0

### 安装与运行

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd cost-trae-glm4.6
   ```

2. **环境初始化**
   ```bash
   chmod +x init.sh
   ./init.sh
   ```

3. **安装依赖**
   ```bash
   # 安装后端依赖
   cd backend
   npm install
   
   # 安装前端依赖
   cd ../frontend
   npm install
   ```

4. **配置环境变量**
   ```bash
   # 复制并编辑后端环境配置
   cd backend
   cp .env.example .env
   # 编辑 .env 文件，配置数据库连接、AI服务等
   ```

5. **启动服务**
   ```bash
   # 启动后端服务
   cd backend
   npm run dev
   
   # 新开终端，启动前端服务
   cd frontend
   npm run dev
   ```

6. **访问应用**
   - 前端应用：http://localhost:5173
   - 后端API：http://localhost:3000

## 功能模块

### 1. 用户管理
- 用户信息增删改查
- 用户搜索功能
- 用户级别管理

### 2. 智能识别
- 票据图像上传
- AI信息提取
- 结构化数据生成

### 3. 表单功能
- 混合填单界面
- 表单提交
- 状态管理

### 4. 规则系统
- 自然语言规则配置
- 结构化规则管理
- 实时规则验证
- 混合规则模式

### 5. 数据查询
- 个人费用记录查看
- 管理员数据面板
- 数据统计分析

## 开发规范

本项目遵循严格的开发规范，详细内容请查看 `.trae/rules/` 目录：

- `project_management.md` - 项目管理流程
- `coding_standards.md` - 代码编写规范
- `git_standards.md` - Git使用规范
- `testing_standards.md` - 测试规范
- `bug_fix_standards.md` - Bug修复规范

## 项目进度

当前开发进度可通过以下文件查看：
- `feature_list.json` - 完整功能任务清单
- `claude-progress.txt` - 开发进度记录

## API文档

### 主要接口

- `POST /api/upload` - 票据上传识别
- `POST /api/expense/submit` - 费用表单提交
- `GET /api/rules` - 获取规则列表
- `POST /api/rules/validate` - 规则验证
- `GET /api/users` - 用户管理

详细API文档请参考技术规格文档。

## 部署说明

### 本地部署

1. 确保环境配置正确
2. 执行数据库初始化脚本
3. 启动前后端服务
4. 配置反向代理（可选）

### 生产部署

1. 构建前端资源
2. 配置生产环境变量
3. 设置进程管理（PM2）
4. 配置SSL证书
5. 设置监控和日志

## 贡献指南

1. 遵循项目开发规范
2. 创建功能分支
3. 提交前运行测试
4. 使用约定式提交格式
5. 更新相关文档

## 许可证

ISC License

## 联系方式

如有问题或建议，请通过项目Issue反馈。

---

**版本**: 1.0  
**最后更新**: 2025年12月25日