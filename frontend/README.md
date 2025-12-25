# Frontend 前端应用

费用报销系统的前端用户界面，基于React + Ant Design构建。

## 技术栈

- **框架**: React 19.2.0
- **UI组件库**: Ant Design 6.1.2
- **路由**: React Router 7.11.0
- **构建工具**: Vite 7.2.4
- **HTTP客户端**: Axios 1.13.2
- **状态管理**: React Context + Hooks

## 项目结构

```
frontend/
├── src/
│   ├── components/       # 通用组件
│   │   ├── common/       # 基础组件
│   │   ├── forms/        # 表单组件
│   │   └── layout/       # 布局组件
│   ├── pages/            # 页面组件
│   │   ├── UserManagement/    # 用户管理
│   │   ├── ExpenseForm/       # 费用表单
│   │   ├── ExpenseList/       # 费用列表
│   │   ├── RuleConfig/        # 规则配置
│   │   └── Dashboard/         # 数据面板
│   ├── hooks/            # 自定义Hooks
│   ├── services/         # API服务
│   ├── utils/            # 工具函数
│   ├── styles/           # 样式文件
│   ├── contexts/         # React Context
│   ├── App.jsx           # 应用根组件
│   └── main.jsx          # 应用入口
├── public/               # 静态资源
├── package.json          # 依赖配置
├── vite.config.js        # Vite配置
└── index.html           # HTML模板
```

## 核心功能页面

### 1. 用户管理 (`/users`)
- 用户列表展示
- 用户信息增删改查
- 用户搜索功能
- 用户级别管理

### 2. 费用表单 (`/expense/form`)
- 混合填单界面
- 票据上传与识别
- 智能信息填充
- 实时规则验证
- 表单提交

### 3. 费用列表 (`/expense/list`)
- 个人费用记录查看
- 费用状态展示
- 费用详情查看
- 数据筛选和分页

### 4. 规则配置 (`/rules`)
- 自然语言规则配置
- 结构化规则管理
- 规则列表展示
- 规则测试验证

### 5. 数据面板 (`/dashboard`)
- 费用统计图表
- 验证结果分析
- 数据导出功能

## 核心组件

### 1. 混合填单组件 (`MixedForm`)
```jsx
// 三栏式布局
<div className="mixed-form">
  <div className="receipt-preview">
    {/* 票据预览区域 */}
  </div>
  <div className="structured-info">
    {/* 结构化信息编辑表格 */}
  </div>
  <div className="intelligent-description">
    {/* 智能说明编辑区域 */}
  </div>
</div>
```

### 2. 规则配置组件 (`RuleConfig`)
```jsx
// 自然语言规则输入
<TextArea
  placeholder="请输入费用规则，例如：差旅费单次不超过1000元"
  onChange={handleRuleChange}
/>

// 规则测试
<Button onClick={testRule}>测试规则</Button>
```

### 3. 用户选择组件 (`UserSelector`)
```jsx
// 用户弹窗选择
<Modal
  title="选择用户"
  open={userModalVisible}
  onOk={handleUserSelect}
>
  <Input.Search
    placeholder="搜索用户姓名"
    onSearch={searchUsers}
  />
  <Table
    dataSource={userList}
    columns={userColumns}
    onRow={(record) => ({
      onClick: () => selectUser(record)
    })}
  />
</Modal>
```

## 状态管理

### 1. 用户状态 (`UserContext`)
```jsx
const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userList, setUserList] = useState([]);
  
  return (
    <UserContext.Provider value={{
      currentUser,
      setCurrentUser,
      userList,
      setUserList
    }}>
      {children}
    </UserContext.Provider>
  );
};
```

### 2. 费用状态 (`ExpenseContext`)
```jsx
const ExpenseContext = createContext();

export const ExpenseProvider = ({ children }) => {
  const [expenseData, setExpenseData] = useState({});
  const [validationResults, setValidationResults] = useState([]);
  
  return (
    <ExpenseContext.Provider value={{
      expenseData,
      setExpenseData,
      validationResults,
      setValidationResults
    }}>
      {children}
    </ExpenseContext.Provider>
  );
};
```

## API服务

### 1. 用户服务 (`userService.js`)
```javascript
export const userService = {
  // 获取用户列表
  getUsers: () => axios.get('/api/users'),
  
  // 创建用户
  createUser: (userData) => axios.post('/api/users', userData),
  
  // 更新用户
  updateUser: (id, userData) => axios.put(`/api/users/${id}`, userData),
  
  // 删除用户
  deleteUser: (id) => axios.delete(`/api/users/${id}`),
  
  // 搜索用户
  searchUsers: (name) => axios.get(`/api/users/search?name=${name}`)
};
```

### 2. 费用服务 (`expenseService.js`)
```javascript
export const expenseService = {
  // 提交费用表单
  submitExpense: (expenseData) => axios.post('/api/expense/submit', expenseData),
  
  // 获取费用记录
  getExpenseRecords: (params) => axios.get('/api/expense/records', { params }),
  
  // 获取费用详情
  getExpenseDetail: (id) => axios.get(`/api/expense/${id}`)
};
```

### 3. 规则服务 (`ruleService.js`)
```javascript
export const ruleService = {
  // 获取规则列表
  getRules: () => axios.get('/api/rules'),
  
  // 创建规则
  createRule: (ruleData) => axios.post('/api/rules', ruleData),
  
  // 验证规则
  validateRule: (data) => axios.post('/api/rules/validate', data)
};
```

## 自定义Hooks

### 1. 用户选择Hook (`useUserSelector`)
```javascript
export const useUserSelector = () => {
  const [visible, setVisible] = useState(false);
  const [users, setUsers] = useState([]);
  
  const openSelector = () => setVisible(true);
  const closeSelector = () => setVisible(false);
  
  return {
    visible,
    users,
    openSelector,
    closeSelector
  };
};
```

### 2. 表单验证Hook (`useFormValidation`)
```javascript
export const useFormValidation = (rules) => {
  const [errors, setErrors] = useState({});
  
  const validateField = (field, value) => {
    // 验证逻辑
  };
  
  const validateForm = (formData) => {
    // 表单验证逻辑
  };
  
  return {
    errors,
    validateField,
    validateForm
  };
};
```

## 样式规范

### 1. CSS变量
```css
:root {
  --primary-color: #1890ff;
  --success-color: #52c41a;
  --warning-color: #faad14;
  --error-color: #f5222d;
  --text-color: #262626;
  --border-color: #d9d9d9;
  --background-color: #f5f5f5;
}
```

### 2. 组件样式
```css
.mixed-form {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  height: 600px;
}

.receipt-preview {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 16px;
}

.structured-info {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 16px;
}

.intelligent-description {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 16px;
}
```

## 路由配置

```javascript
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { path: '/', element: <Navigate to="/expense/form" /> },
      { path: '/users', element: <UserManagement /> },
      { path: '/expense/form', element: <ExpenseForm /> },
      { path: '/expense/list', element: <ExpenseList /> },
      { path: '/rules', element: <RuleConfig /> },
      { path: '/dashboard', element: <Dashboard /> }
    ]
  }
]);
```

## 环境配置

### 开发环境 (`.env.development`)
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_TITLE=费用报销系统
VITE_APP_VERSION=1.0.0
```

### 生产环境 (`.env.production`)
```env
VITE_API_BASE_URL=https://api.expense-system.com
VITE_APP_TITLE=费用报销系统
VITE_APP_VERSION=1.0.0
```

## 安装与运行

### 1. 安装依赖
```bash
npm install
```

### 2. 启动开发服务器
```bash
npm run dev
```

### 3. 构建生产版本
```bash
npm run build
```

### 4. 预览生产版本
```bash
npm run preview
```

### 5. 代码检查
```bash
npm run lint
```

## 测试

### 1. 单元测试
```bash
npm test
```

### 2. 测试覆盖率
```bash
npm run test:coverage
```

### 3. E2E测试
```bash
npm run test:e2e
```

## 部署

### 1. 静态部署
```bash
npm run build
# 将 dist 目录部署到静态服务器
```

### 2. Docker部署
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 性能优化

### 1. 代码分割
```javascript
// 路由级别的代码分割
const UserManagement = lazy(() => import('./pages/UserManagement'));
const ExpenseForm = lazy(() => import('./pages/ExpenseForm'));
```

### 2. 组件优化
```javascript
// 使用React.memo优化组件渲染
const ExpenseItem = React.memo(({ item }) => {
  return <div>{item.description}</div>;
});

// 使用useMemo优化计算
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);
```

## 国际化

### 1. 配置i18n
```javascript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: require('./locales/zh.json') },
      en: { translation: require('./locales/en.json') }
    },
    lng: 'zh',
    fallbackLng: 'zh'
  });
```

## 主题定制

### 1. Ant Design主题
```javascript
const theme = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
    fontSize: 14
  },
  components: {
    Button: {
      borderRadius: 4
    },
    Input: {
      borderRadius: 4
    }
  }
};

<ConfigProvider theme={theme}>
  <App />
</ConfigProvider>
```

---

**版本**: 1.0  
**最后更新**: 2025年12月25日