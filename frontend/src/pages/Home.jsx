import { Card, Row, Col, Statistic, Button, Space, Typography, Descriptions } from 'antd';
import { UserOutlined, FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useApp } from '../contexts/AppContext';
import { useUser } from '../contexts/UserContext';

const { Title, Paragraph } = Typography;

const Home = () => {
  const { success, error, info, warning } = useApp();
  const { selectedUser, selectUser, clearUser } = useUser();

  const testNotifications = () => {
    success('状态管理测试：成功消息！');
    error('状态管理测试：错误消息！');
    info('状态管理测试：信息消息！');
    warning('状态管理测试：警告消息！');
  };

  const testUserSelection = () => {
    const testUser = {
      id: 1,
      name: '测试用户',
      position_level: 'P1',
      department: '技术部'
    };
    selectUser(testUser);
    success(`已选择用户：${testUser.name}`);
  };

  const testClearUser = () => {
    clearUser();
    info('已清空用户选择');
  };

  return (
    <div>
      <Title level={2}>欢迎使用费用报销系统</Title>
      <Paragraph type="secondary">
        这是一个企业级的费用报销管理系统，支持费用申请、审批流程、用户管理等功能。
      </Paragraph>

      {selectedUser && (
        <Card style={{ marginBottom: 16 }}>
          <Title level={4}>当前选中用户</Title>
          <Descriptions bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="姓名">{selectedUser.name}</Descriptions.Item>
            <Descriptions.Item label="职位">{selectedUser.position_level}</Descriptions.Item>
            {selectedUser.department && (
              <Descriptions.Item label="部门">{selectedUser.department}</Descriptions.Item>
            )}
          </Descriptions>
          <div style={{ marginTop: 16 }}>
            <Button onClick={testClearUser}>清空选择</Button>
          </div>
        </Card>
      )}

      <Card style={{ marginBottom: 16 }}>
        <Title level={4}>状态管理测试</Title>
        <Space size="large">
          <Button type="primary" onClick={testNotifications}>
            测试通知
          </Button>
          <Button onClick={testUserSelection}>
            测试用户选择
          </Button>
        </Space>
      </Card>

      <Title level={4}>系统概览</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="费用申请"
              value={0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="已审批"
              value={0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待处理"
              value={0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Home;
