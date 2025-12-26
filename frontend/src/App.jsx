import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import UserList from './pages/users/UserList';
import ExpenseForm from './pages/expense/ExpenseForm';
import ExpenseList from './pages/expense/ExpenseList';
import RuleConfig from './pages/rules/RuleConfig';
import RuleManagement from './pages/rules/RuleManagement';

const App = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={<MainLayout />}
          >
            <Route index element={<Home />} />
            <Route path="expenses" element={<ExpenseForm />} />
            <Route path="expenses/list" element={<ExpenseList />} />
            <Route path="users" element={<UserList />} />
            <Route path="rules/config" element={<RuleConfig />} />
            <Route path="rules/manage" element={<RuleManagement />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
