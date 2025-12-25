import { Layout, Menu } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { UserOutlined, FileTextOutlined, SettingOutlined, HomeOutlined } from '@ant-design/icons';
import './MainLayout.css';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
    {
      key: '/users',
      icon: <UserOutlined />,
      label: '用户管理',
    },
    {
      key: '/rules',
      icon: <SettingOutlined />,
      label: '规则管理',
    },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  return (
    <Layout className="main-layout">
      <Header className="header">
        <div className="logo">费用报销系统</div>
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
