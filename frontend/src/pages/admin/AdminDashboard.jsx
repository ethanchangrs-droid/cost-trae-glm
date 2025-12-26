import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  DatePicker,
  Select,
  Button,
  Space,
  Tag,
  Drawer,
  Descriptions,
  message,
  Spin,
  Progress,
  Tooltip,
} from 'antd';
import {
  FileTextOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  ReloadOutlined,
  BarChartOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { adminAPI } from '../../api';

const { RangePicker } = DatePicker;
const { Option } = Select;

const STATUS_CONFIG = {
  draft: { text: '草稿', color: 'default', icon: <ClockCircleOutlined /> },
  pending: { text: '待审核', color: 'processing', icon: <ClockCircleOutlined /> },
  approved: { text: '已通过', color: 'success', icon: <CheckCircleOutlined /> },
  rejected: { text: '已拒绝', color: 'error', icon: <CloseCircleOutlined /> },
};

const POSITION_LEVEL_MAP = {
  employee: '普通员工',
  manager: '经理',
  executive: '高层',
};

const ITEM_TYPE_MAP = {
  transport: '交通',
  accommodation: '住宿',
  meal: '餐饮',
  other: '其他',
};

const AdminDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState({
    status: undefined,
    user_name: '',
    start_date: null,
    end_date: null,
    min_amount: undefined,
    max_amount: undefined,
  });
  const [dateRange, setDateRange] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const params = {};
      if (dateRange) {
        params.start_date = dateRange[0].format('YYYY-MM-DD');
        params.end_date = dateRange[1].format('YYYY-MM-DD');
      }
      const data = await adminAPI.getStats(params);
      setStats(data);
    } catch (error) {
      message.error('获取统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
        ...filters,
      };

      if (dateRange) {
        params.start_date = dateRange[0].format('YYYY-MM-DD');
        params.end_date = dateRange[1].format('YYYY-MM-DD');
      }

      const data = await adminAPI.getExpenses(params);
      setExpenses(data.expenses);
      setPagination({
        ...pagination,
        page,
        total: data.pagination.total,
      });
    } catch (error) {
      message.error('获取费用记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
      };

      if (dateRange) {
        params.start_date = dateRange[0].format('YYYY-MM-DD');
        params.end_date = dateRange[1].format('YYYY-MM-DD');
      }

      await adminAPI.exportExpenses(params);
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (expense) => {
    try {
      setLoading(true);
      const data = await adminAPI.getExpenseDetail(expense.expense_id);
      setSelectedExpense(data);
      setDetailVisible(true);
    } catch (error) {
      message.error('获取详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  const handleFilterChange = (key, value) => {
    setFilters({
      ...filters,
      [key]: value,
    });
  };

  const handleSearch = () => {
    fetchExpenses(1);
    fetchStats();
  };

  const handleReset = () => {
    setFilters({
      status: undefined,
      user_name: '',
      start_date: null,
      end_date: null,
      min_amount: undefined,
      max_amount: undefined,
    });
    setDateRange(null);
    fetchExpenses(1);
    fetchStats();
  };

  useEffect(() => {
    fetchStats();
    fetchExpenses(1);
  }, []);

  const expenseColumns = [
    {
      title: '报销单ID',
      dataIndex: 'expense_id',
      key: 'expense_id',
      width: 100,
    },
    {
      title: '报销人',
      key: 'user',
      width: 120,
      render: (_, record) => (
        <div>
          <div>{record.user?.name}</div>
          <Tag size="small">{POSITION_LEVEL_MAP[record.user?.position_level] || record.user?.position_level}</Tag>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const config = STATUS_CONFIG[status] || { text: status, color: 'default' };
        return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
      },
    },
    {
      title: '出差日期',
      key: 'trip_date',
      width: 150,
      render: (_, record) => (
        <div>
          <div>开始: {record.trip_start_date || '-'}</div>
          <div>结束: {record.trip_end_date || '-'}</div>
        </div>
      ),
    },
    {
      title: '目的地',
      dataIndex: 'destination_city',
      key: 'destination_city',
      width: 100,
    },
    {
      title: '费用项目数',
      dataIndex: 'item_count',
      key: 'item_count',
      width: 100,
      align: 'center',
    },
    {
      title: '总金额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 100,
      align: 'right',
      render: (amount) => `¥${amount.toFixed(2)}`,
      sorter: true,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
      sorter: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => handleViewDetail(record)}
        >
          查看
        </Button>
      ),
    },
  ];

  const itemColumns = [
    {
      title: '类型',
      dataIndex: 'item_type',
      key: 'item_type',
      width: 100,
      render: (type) => ITEM_TYPE_MAP[type] || type,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      align: 'right',
      render: (amount) => `¥${amount.toFixed(2)}`,
    },
  ];

  const validationColumns = [
    {
      title: '规则名称',
      dataIndex: 'rule_name',
      key: 'rule_name',
      width: 200,
    },
    {
      title: '规则类型',
      dataIndex: 'rule_type',
      key: 'rule_type',
      width: 120,
    },
    {
      title: '验证状态',
      dataIndex: 'passed',
      key: 'passed',
      width: 100,
      render: (passed) => (
        <Tag color={passed ? 'success' : 'error'} icon={passed ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
          {passed ? '通过' : '未通过'}
        </Tag>
      ),
    },
    {
      title: '详情',
      dataIndex: 'details',
      key: 'details',
      ellipsis: true,
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Spin spinning={loading}>
        <h1>管理员数据面板</h1>

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="总费用单数"
                value={stats?.summary?.total_expenses || 0}
                prefix={<FileTextOutlined />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="总金额"
                value={stats?.summary?.total_amount || 0}
                prefix={<DollarOutlined />}
                precision={2}
                suffix="元"
                styles={{ content: { color: '#52c41a' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="已通过"
                value={stats?.summary?.approved_expenses || 0}
                prefix={<CheckCircleOutlined />}
                styles={{ content: { color: '#52c41a' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="已拒绝"
                value={stats?.summary?.rejected_expenses || 0}
                prefix={<CloseCircleOutlined />}
                styles={{ content: { color: '#ff4d4f' } }}
              />
            </Card>
          </Col>
        </Row>

        {stats?.status_distribution && stats.status_distribution.length > 0 && (
          <Card title="状态分布" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              {stats.status_distribution.map((item) => {
                const config = STATUS_CONFIG[item.status] || { text: item.status, color: 'default' };
                return (
                  <Col xs={24} sm={12} md={6} key={item.status}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>{config.text}</span>
                        <span>{item.count}</span>
                      </div>
                      <Progress
                        percent={(item.count / stats.summary.total_expenses) * 100}
                        strokeColor={config.color === 'success' ? '#52c41a' : config.color === 'error' ? '#ff4d4f' : '#1890ff'}
                        showInfo={false}
                      />
                    </div>
                  </Col>
                );
              })}
            </Row>
          </Card>
        )}

        {stats?.top_users && stats.top_users.length > 0 && (
          <Card title="费用排行榜" style={{ marginBottom: 24 }}>
            <Table
              dataSource={stats.top_users}
              rowKey="user_id"
              pagination={false}
              size="small"
              columns={[
                {
                  title: '用户',
                  key: 'user',
                  render: (_, record) => (
                    <div>
                      <div>{record.user_name}</div>
                      <Tag size="small">{POSITION_LEVEL_MAP[record.position_level] || record.position_level}</Tag>
                    </div>
                  ),
                },
                {
                  title: '报销单数',
                  dataIndex: 'expense_count',
                  key: 'expense_count',
                  align: 'center',
                },
                {
                  title: '总金额',
                  dataIndex: 'total_amount',
                  key: 'total_amount',
                  align: 'right',
                  render: (amount) => `¥${amount.toFixed(2)}`,
                },
              ]}
            />
          </Card>
        )}

        <Card title="费用记录" style={{ marginBottom: 24 }}>
          <Space style={{ marginBottom: 16 }} wrap>
            <RangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              placeholder={['开始日期', '结束日期']}
            />
            <Select
              placeholder="选择状态"
              style={{ width: 120 }}
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              allowClear
            >
              <Option value="draft">草稿</Option>
              <Option value="pending">待审核</Option>
              <Option value="approved">已通过</Option>
              <Option value="rejected">已拒绝</Option>
            </Select>
            <Button type="primary" onClick={handleSearch}>搜索</Button>
            <Button onClick={handleReset}>重置</Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExport}
            >
              导出CSV
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => fetchExpenses(pagination.page)}>刷新</Button>
          </Space>

          <Table
            columns={expenseColumns}
            dataSource={expenses}
            rowKey="expense_id"
            pagination={{
              current: pagination.page,
              pageSize: pagination.limit,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
              onChange: (page, pageSize) => {
                setPagination({ ...pagination, page, limit: pageSize });
                fetchExpenses(page);
              },
            }}
            scroll={{ x: 1200 }}
          />
        </Card>

        <Drawer
          title="费用单详情"
          placement="right"
          size="large"
          open={detailVisible}
          onClose={() => setDetailVisible(false)}
        >
          {selectedExpense && (
            <Spin spinning={loading}>
              <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
                <Descriptions.Item label="报销单ID">{selectedExpense.expense.expense_id}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={STATUS_CONFIG[selectedExpense.expense.status]?.color}>
                    {STATUS_CONFIG[selectedExpense.expense.status]?.text}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="报销人">
                  <div>
                    <div>{selectedExpense.expense.user?.name}</div>
                    <Tag size="small">{POSITION_LEVEL_MAP[selectedExpense.expense.user?.position_level]}</Tag>
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="总金额">¥{selectedExpense.expense.total_amount.toFixed(2)}</Descriptions.Item>
                <Descriptions.Item label="开始日期">{selectedExpense.expense.trip_start_date || '-'}</Descriptions.Item>
                <Descriptions.Item label="结束日期">{selectedExpense.expense.trip_end_date || '-'}</Descriptions.Item>
                <Descriptions.Item label="目的地">{selectedExpense.expense.destination_city || '-'}</Descriptions.Item>
                <Descriptions.Item label="项目名称">{selectedExpense.expense.project_name || '-'}</Descriptions.Item>
                <Descriptions.Item label="出差事由" span={2}>{selectedExpense.expense.trip_reason || '-'}</Descriptions.Item>
                <Descriptions.Item label="描述" span={2}>{selectedExpense.expense.description || '-'}</Descriptions.Item>
              </Descriptions>

              <h3>费用项目</h3>
              <Table
                columns={itemColumns}
                dataSource={selectedExpense.expense.items}
                rowKey="item_id"
                pagination={false}
                size="small"
                style={{ marginBottom: 16 }}
              />

              <h3>验证结果</h3>
              <div style={{ marginBottom: 16 }}>
                <Tag color="success">通过: {selectedExpense.validations.passed}</Tag>
                <Tag color="error">未通过: {selectedExpense.validations.failed}</Tag>
                <Tag>总计: {selectedExpense.validations.total}</Tag>
              </div>
              <Table
                columns={validationColumns}
                dataSource={selectedExpense.validations.details}
                rowKey="validation_id"
                pagination={false}
                size="small"
              />
            </Spin>
          )}
        </Drawer>
      </Spin>
    </div>
  );
};

export default AdminDashboard;
