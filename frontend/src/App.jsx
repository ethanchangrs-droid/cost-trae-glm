import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { UserProvider } from './contexts/UserContext';
import { AppProvider } from './contexts/AppContext';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import UserList from './pages/users/UserList';
import ExpenseForm from './pages/expense/ExpenseForm';
import ExpenseList from './pages/expense/ExpenseList';
import RuleConfig from './pages/rules/RuleConfig';
import RuleManagement from './pages/rules/RuleManagement';
import AdminDashboard from './pages/admin/AdminDashboard';

const App = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <AppProvider>
        <UserProvider>
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
                <Route path="admin" element={<AdminDashboard />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </UserProvider>
      </AppProvider>
    </ConfigProvider>
  );
};

export default App;
