import { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Select, DatePicker, Space, Tag, Drawer, Descriptions, Statistic, Row, Col, message, Typography } from 'antd';
import { SearchOutlined, EyeOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import { expenseAPI } from '../../api';
import dayjs from 'dayjs';
import './ExpenseList.css';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;

const ITEM_TYPE_MAP = {
  transport: '交通',
  accommodation: '住宿',
  meal: '餐饮',
  other: '其他',
};

const STATUS_CONFIG = {
  draft: { text: '草稿', color: 'default' },
  submitted: { text: '已提交', color: 'processing' },
  approved: { text: '已通过', color: 'success' },
  rejected: { text: '已拒绝', color: 'error' },
  partial: { text: '部分通过', color: 'warning' },
};

const ExpenseList = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [filters, setFilters] = useState({
    status: undefined,
    user_id: undefined,
    item_type: undefined,
    date_range: undefined,
    min_amount: undefined,
    max_amount: undefined,
  });
  const [sorter, setSorter] = useState({ field: 'created_at', order: 'descend' });

  const fetchExpenses = async (params = {}) => {
    setLoading(true);
    try {
      const queryParams = {
        page: params.current || pagination.current,
        limit: params.pageSize || pagination.pageSize,
        ...filters,
      };

      if (filters.date_range && filters.date_range.length === 2) {
        queryParams.start_date = filters.date_range[0].format('YYYY-MM-DD');
        queryParams.end_date = filters.date_range[1].format('YYYY-MM-DD');
      }
      delete queryParams.date_range;

      if (sorter.field) {
        queryParams.sort_by = sorter.field;
        queryParams.sort_order = sorter.order === 'ascend' ? 'ASC' : 'DESC';
      }

      const response = await expenseAPI.getExpenses(queryParams);
      if (response.data.success) {
        setExpenses(response.data.data.expenses);
        setPagination({
          ...pagination,
          current: response.data.data.pagination.page,
          pageSize: response.data.data.pagination.limit,
          total: response.data.data.pagination.total,
        });
      }
    } catch (error) {
      message.error('获取费用列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleTableChange = (newPagination, newFilters, newSorter) => {
    const { field, order } = newSorter;
    setSorter({ field, order });
    fetchExpenses({
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    });
  };

  const handleSearch = () => {
    fetchExpenses({ current: 1 });
  };

  const handleReset = () => {
    setFilters({
      status: undefined,
      user_id: undefined,
      item_type: undefined,
      date_range: undefined,
      min_amount: undefined,
      max_amount: undefined,
    });
    setPagination({ ...pagination, current: 1 });
    fetchExpenses({ current: 1 });
  };

  const handleViewDetail = (expense) => {
    setSelectedExpense(expense);
    setDetailVisible(true);
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '报销人',
      key: 'user',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.user?.name}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.user?.employee_id}
          </Text>
        </Space>
      ),
    },
    {
      title: '总金额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      render: (amount) => `¥${amount.toFixed(2)}`,
      sorter: true,
    },
    {
      title: '目的地',
      dataIndex: 'destination_city',
      key: 'destination_city',
    },
    {
      title: '出差日期',
      key: 'trip_dates',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{dayjs(record.trip_start_date).format('YYYY-MM-DD')}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {dayjs(record.trip_end_date).format('YYYY-MM-DD')}
          </Text>
        </Space>
      ),
    },
    {
      title: '费用项目',
      key: 'items',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          {record.items?.slice(0, 2).map((item, index) => (
            <Tag key={index} color="blue">
              {ITEM_TYPE_MAP[item.item_type] || item.item_type} ¥{item.amount}
            </Tag>
          ))}
          {record.items?.length > 2 && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              +{record.items.length - 2} 项
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const config = STATUS_CONFIG[status] || { text: status, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      sorter: true,
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          查看
        </Button>
      ),
    },
  ];

  return (
    <div className="expense-list-container">
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div className="header-section">
            <Title level={3}>费用记录</Title>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => fetchExpenses()}>
                刷新
              </Button>
            </Space>
          </div>

          <Card className="filter-card" bordered={false}>
            <Space wrap size="middle">
              <Select
                placeholder="状态筛选"
                style={{ width: 120 }}
                value={filters.status}
                onChange={(value) => setFilters({ ...filters, status: value })}
                allowClear
              >
                <Option value="draft">草稿</Option>
                <Option value="submitted">已提交</Option>
                <Option value="approved">已通过</Option>
                <Option value="rejected">已拒绝</Option>
                <Option value="partial">部分通过</Option>
              </Select>

              <Input
                placeholder="用户ID"
                style={{ width: 120 }}
                value={filters.user_id}
                onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
              />

              <Select
                placeholder="费用类型"
                style={{ width: 120 }}
                value={filters.item_type}
                onChange={(value) => setFilters({ ...filters, item_type: value })}
                allowClear
              >
                <Option value="transport">交通</Option>
                <Option value="accommodation">住宿</Option>
                <Option value="meal">餐饮</Option>
                <Option value="other">其他</Option>
              </Select>

              <RangePicker
                placeholder={['开始日期', '结束日期']}
                value={filters.date_range}
                onChange={(dates) => setFilters({ ...filters, date_range: dates })}
              />

              <Input
                placeholder="最小金额"
                style={{ width: 100 }}
                value={filters.min_amount}
                onChange={(e) => setFilters({ ...filters, min_amount: e.target.value })}
              />

              <Input
                placeholder="最大金额"
                style={{ width: 100 }}
                value={filters.max_amount}
                onChange={(e) => setFilters({ ...filters, max_amount: e.target.value })}
              />

              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                搜索
              </Button>

              <Button icon={<FilterOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Card>

          <Table
            columns={columns}
            dataSource={expenses}
            loading={loading}
            rowKey="id"
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
            onChange={handleTableChange}
          />
        </Space>
      </Card>

      <Drawer
        title="费用详情"
        placement="right"
        width={720}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
      >
        {selectedExpense && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="总金额" value={selectedExpense.total_amount} prefix="¥" />
              </Col>
              <Col span={8}>
                <Statistic title="费用项目数" value={selectedExpense.items?.length || 0} />
              </Col>
              <Col span={8}>
                <Statistic
                  title="状态"
                  value={STATUS_CONFIG[selectedExpense.status]?.text || selectedExpense.status}
                  valueStyle={{ color: STATUS_CONFIG[selectedExpense.status]?.color }}
                />
              </Col>
            </Row>

            <Descriptions title="基本信息" bordered column={1}>
              <Descriptions.Item label="费用ID">{selectedExpense.id}</Descriptions.Item>
              <Descriptions.Item label="报销人">
                {selectedExpense.user?.name} ({selectedExpense.user?.employee_id})
              </Descriptions.Item>
              <Descriptions.Item label="职位等级">{selectedExpense.user?.position_level}</Descriptions.Item>
              <Descriptions.Item label="目的地">{selectedExpense.destination_city || '-'}</Descriptions.Item>
              <Descriptions.Item label="出差开始日期">
                {dayjs(selectedExpense.trip_start_date).format('YYYY-MM-DD')}
              </Descriptions.Item>
              <Descriptions.Item label="出差结束日期">
                {dayjs(selectedExpense.trip_end_date).format('YYYY-MM-DD')}
              </Descriptions.Item>
              <Descriptions.Item label="出差原因">{selectedExpense.trip_reason || '-'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(selectedExpense.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {dayjs(selectedExpense.updated_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Title level={5}>费用项目</Title>
              <Table
                columns={[
                  { title: '类型', dataIndex: 'item_type', render: (type) => ITEM_TYPE_MAP[type] || type },
                  { title: '描述', dataIndex: 'description' },
                  { title: '金额', dataIndex: 'amount', render: (amount) => `¥${amount.toFixed(2)}` },
                  { title: '日期', dataIndex: 'date', render: (date) => dayjs(date).format('YYYY-MM-DD') },
                ]}
                dataSource={selectedExpense.items}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </div>

            {selectedExpense.validations && selectedExpense.validations.length > 0 && (
              <div>
                <Title level={5}>验证历史</Title>
                <Table
                  columns={[
                    { title: '规则名称', dataIndex: ['rule', 'name'] },
                    { title: '验证类型', dataIndex: 'validation_type' },
                    {
                      title: '结果',
                      dataIndex: 'validation_result',
                      render: (result) => {
                        try {
                          const parsed = JSON.parse(result);
                          return parsed.passed ? (
                            <Tag color="success">通过</Tag>
                          ) : (
                            <Tag color="error">未通过</Tag>
                          );
                        } catch {
                          return '-';
                        }
                      },
                    },
                    { title: '执行时间(ms)', dataIndex: 'execution_time_ms' },
                  ]}
                  dataSource={selectedExpense.validations}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              </div>
            )}
          </Space>
        )}
      </Drawer>
    </div>
  );
};

export default ExpenseList;
