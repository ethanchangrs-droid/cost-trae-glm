import { Layout, Menu, Dropdown, Avatar, Button } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { UserOutlined, FileTextOutlined, SettingOutlined, LogoutOutlined, HomeOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import './MainLayout.css';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/expenses',
      icon: <FileTextOutlined />,
      label: '费用管理',
    },
  ];

  if (user?.role === 'admin' || user?.role === 'manager') {
    menuItems.push({
      key: '/users',
      icon: <UserOutlined />,
      label: '用户管理',
    });
  }

  if (user?.role === 'admin') {
    menuItems.push({
      key: '/rules',
      icon: <SettingOutlined />,
      label: '规则管理',
    });
  }

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenu = (
    <Menu>
      <Menu.Item key="profile" onClick={() => navigate('/profile')}>
        个人信息
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        退出登录
      </Menu.Item>
    </Menu>
  );

  return (
    <Layout className="main-layout">
      <Header className="header">
        <div className="logo">费用报销系统</div>
        <div className="header-right">
          <Dropdown overlay={userMenu} placement="bottomRight">
            <Button type="text" className="user-button">
              <Avatar icon={<UserOutlined />} size="small" />
              <span className="username">{user?.full_name || user?.username}</span>
            </Button>
          </Dropdown>
        </div>
      </Header>
      <Layout>
        <Sider width={200} theme="light" className="sider">
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
          />
        </Sider>
        <Content className="content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
