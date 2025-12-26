import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Form,
  Input,
  Select,
  Switch,
  Modal,
  message,
  Row,
  Col,
  Statistic,
  Popconfirm,
  Drawer,
  Descriptions,
  InputNumber,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { ruleAPI } from '../../api';

const { Option } = Select;

const RuleManagement = () => {
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState({
    rule_type: undefined,
    rule_storage_type: undefined,
    position_level: undefined,
    city_tier: undefined,
    is_active: undefined,
  });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [viewDrawerVisible, setViewDrawerVisible] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);

  useEffect(() => {
    fetchRules();
    fetchCategories();
    fetchStats();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      const response = await ruleAPI.getRules(params);
      setRules(response.data.data.rules || []);
      setPagination({
        current: response.data.data.pagination?.page || 1,
        pageSize: response.data.data.pagination?.limit || 10,
        total: response.data.data.pagination?.total || 0,
      });
    } catch (error) {
      message.error('获取规则列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await ruleAPI.getCategories();
      setCategories(response.data.data.categories || []);
    } catch (error) {
      message.error('获取规则分类失败');
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const response = await ruleAPI.getStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('获取统计数据失败', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleTableChange = (newPagination, filters, sorter) => {
    setPagination({
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    });

    if (sorter.field) {
      setSortBy(sorter.field);
      setSortOrder(sorter.order === 'ascend' ? 'ASC' : 'DESC');
    }
  };

  const handleFilter = () => {
    form.validateFields().then((values) => {
      setFilters(values);
      setPagination({ ...pagination, current: 1 });
      fetchRules();
    });
  };

  const handleResetFilters = () => {
    form.resetFields();
    setFilters({
      rule_type: undefined,
      rule_storage_type: undefined,
      position_level: undefined,
      city_tier: undefined,
      is_active: undefined,
    });
    setPagination({ ...pagination, current: 1 });
    fetchRules();
  };

  const handleCreate = async (values) => {
    try {
      await ruleAPI.createRule(values);
      message.success('规则创建成功');
      setModalVisible(false);
      form.resetFields();
      fetchRules();
      fetchStats();
    } catch (error) {
      message.error(error.response?.data?.error?.message || '规则创建失败');
    }
  };

  const handleEdit = async (values) => {
    try {
      await ruleAPI.updateRule(selectedRule.id, values);
      message.success('规则更新成功');
      setEditModalVisible(false);
      editForm.resetFields();
      setSelectedRule(null);
      fetchRules();
      fetchStats();
    } catch (error) {
      message.error(error.response?.data?.error?.message || '规则更新失败');
    }
  };

  const handleDelete = async (id) => {
    try {
      await ruleAPI.deleteRule(id);
      message.success('规则删除成功');
      fetchRules();
      fetchStats();
    } catch (error) {
      message.error(error.response?.data?.error?.message || '规则删除失败');
    }
  };

  const handleToggleActive = async (record) => {
    try {
      await ruleAPI.updateRule(record.id, { is_active: !record.is_active });
      message.success(record.is_active ? '规则已禁用' : '规则已启用');
      fetchRules();
      fetchStats();
    } catch (error) {
      message.error('状态更新失败');
    }
  };

  const handleView = (record) => {
    setSelectedRule(record);
    setViewDrawerVisible(true);
  };

  const handleEditClick = (record) => {
    setSelectedRule(record);
    editForm.setFieldsValue({
      name: record.name,
      description: record.description,
      rule_type: record.rule_type,
      rule_storage_type: record.rule_storage_type,
      structured_content: record.structured_content,
      natural_content: record.natural_content,
      position_level: record.position_level,
      city_tier: record.city_tier,
      complexity_score: record.complexity_score,
      validation_strategy: record.validation_strategy,
      is_active: record.is_active,
    });
    setEditModalVisible(true);
  };

  const columns = [
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      width: 200,
      fixed: 'left',
    },
    {
      title: '规则类型',
      dataIndex: 'rule_type',
      key: 'rule_type',
      sorter: true,
      render: (type) => {
        const typeMap = {
          accommodation: '住宿费',
          transport: '交通费',
          meal: '餐费',
        };
        const colorMap = {
          accommodation: 'blue',
          transport: 'green',
          meal: 'orange',
        };
        return <Tag color={colorMap[type] || 'default'}>{typeMap[type] || type}</Tag>;
      },
    },
    {
      title: '存储类型',
      dataIndex: 'rule_storage_type',
      key: 'rule_storage_type',
      render: (type) => {
        const typeMap = {
          structured: '结构化',
          natural: '自然语言',
          hybrid: '混合',
        };
        const colorMap = {
          structured: 'blue',
          natural: 'green',
          hybrid: 'purple',
        };
        return <Tag color={colorMap[type] || 'default'}>{typeMap[type] || type}</Tag>;
      },
    },
    {
      title: '适用角色',
      dataIndex: 'position_level',
      key: 'position_level',
      render: (level) => level ? <Tag color="purple">{level}</Tag> : '-',
    },
    {
      title: '城市等级',
      dataIndex: 'city_tier',
      key: 'city_tier',
      render: (tier) => tier ? <Tag color="orange">{tier}</Tag> : '-',
    },
    {
      title: '复杂度',
      dataIndex: 'complexity_score',
      key: 'complexity_score',
      sorter: true,
      render: (score) => (
        <Tag color={score > 70 ? 'red' : score > 40 ? 'orange' : 'green'}>
          {score}/100
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive, record) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggleActive(record)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: true,
      render: (date) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditClick(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这条规则吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card title="规则管理" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="总规则数"
              value={stats?.summary?.total || 0}
              prefix={<CheckCircleOutlined />}
              loading={statsLoading}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="启用规则"
              value={stats?.summary?.active || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
              loading={statsLoading}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="禁用规则"
              value={stats?.summary?.inactive || 0}
              valueStyle={{ color: '#faad14' }}
              prefix={<StopOutlined />}
              loading={statsLoading}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalVisible(true)}
              block
            >
              创建规则
            </Button>
          </Col>
        </Row>
      </Card>

      <Card
        title="规则筛选"
        extra={
          <Space>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleFilter}
            >
              搜索
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleResetFilters}
            >
              重置
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="inline">
          <Form.Item name="rule_type" label="规则类型">
            <Select
              placeholder="全部"
              style={{ width: 120 }}
              allowClear
            >
              {categories.map((cat) => (
                <Option key={cat.value} value={cat.value}>
                  {cat.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="rule_storage_type" label="存储类型">
            <Select
              placeholder="全部"
              style={{ width: 120 }}
              allowClear
            >
              <Option value="structured">结构化</Option>
              <Option value="natural">自然语言</Option>
              <Option value="hybrid">混合</Option>
            </Select>
          </Form.Item>
          <Form.Item name="position_level" label="适用角色">
            <Select
              placeholder="全部"
              style={{ width: 120 }}
              allowClear
            >
              <Option value="employee">员工</Option>
              <Option value="manager">经理</Option>
              <Option value="executive">高管</Option>
              <Option value="admin">管理员</Option>
            </Select>
          </Form.Item>
          <Form.Item name="city_tier" label="城市等级">
            <Select
              placeholder="全部"
              style={{ width: 120 }}
              allowClear
            >
              <Option value="tier1">一线</Option>
              <Option value="tier2">二线</Option>
              <Option value="tier3">三线</Option>
            </Select>
          </Form.Item>
          <Form.Item name="is_active" label="状态">
            <Select
              placeholder="全部"
              style={{ width: 100 }}
              allowClear
            >
              <Option value={true}>启用</Option>
              <Option value={false}>禁用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Card>

      <Card title="规则列表" style={{ marginTop: 16 }}>
        <Table
          columns={columns}
          dataSource={rules}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination({ current: page, pageSize });
            },
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title="创建规则"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="name"
            label="规则名称"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="请输入规则名称" maxLength={100} />
          </Form.Item>
          <Form.Item
            name="description"
            label="规则描述"
            rules={[{ required: true, message: '请输入规则描述' }]}
          >
            <Input.TextArea
              placeholder="请输入规则描述"
              rows={3}
              maxLength={1000}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="rule_type"
                label="规则类型"
                rules={[{ required: true, message: '请选择规则类型' }]}
              >
                <Select placeholder="请选择规则类型">
                  {categories.map((cat) => (
                    <Option key={cat.value} value={cat.value}>
                      {cat.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="rule_storage_type"
                label="存储类型"
                rules={[{ required: true, message: '请选择存储类型' }]}
              >
                <Select placeholder="请选择存储类型">
                  <Option value="structured">结构化</Option>
                  <Option value="natural">自然语言</Option>
                  <Option value="hybrid">混合</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="position_level" label="适用角色">
                <Select placeholder="请选择适用角色" allowClear>
                  <Option value="employee">员工</Option>
                  <Option value="manager">经理</Option>
                  <Option value="executive">高管</Option>
                  <Option value="admin">管理员</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="city_tier" label="城市等级">
                <Select placeholder="请选择城市等级" allowClear>
                  <Option value="tier1">一线</Option>
                  <Option value="tier2">二线</Option>
                  <Option value="tier3">三线</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="structured_content" label="结构化内容">
            <Input.TextArea
              placeholder="请输入结构化内容（JSON格式）"
              rows={5}
            />
          </Form.Item>
          <Form.Item name="natural_content" label="自然语言内容">
            <Input.TextArea
              placeholder="请输入自然语言内容"
              rows={3}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="complexity_score" label="复杂度分数">
                <InputNumber
                  placeholder="0-100"
                  min={0}
                  max={100}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="is_active"
                label="启用状态"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="validation_strategy" label="验证策略">
            <Input.TextArea
              placeholder="请输入验证策略（JSON格式）"
              rows={3}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  form.resetFields();
                }}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑规则"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setSelectedRule(null);
        }}
        footer={null}
        width={800}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEdit}
        >
          <Form.Item
            name="name"
            label="规则名称"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="请输入规则名称" maxLength={100} />
          </Form.Item>
          <Form.Item
            name="description"
            label="规则描述"
            rules={[{ required: true, message: '请输入规则描述' }]}
          >
            <Input.TextArea
              placeholder="请输入规则描述"
              rows={3}
              maxLength={1000}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="rule_type"
                label="规则类型"
                rules={[{ required: true, message: '请选择规则类型' }]}
              >
                <Select placeholder="请选择规则类型">
                  {categories.map((cat) => (
                    <Option key={cat.value} value={cat.value}>
                      {cat.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="rule_storage_type"
                label="存储类型"
                rules={[{ required: true, message: '请选择存储类型' }]}
              >
                <Select placeholder="请选择存储类型">
                  <Option value="structured">结构化</Option>
                  <Option value="natural">自然语言</Option>
                  <Option value="hybrid">混合</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="position_level" label="适用角色">
                <Select placeholder="请选择适用角色" allowClear>
                  <Option value="employee">员工</Option>
                  <Option value="manager">经理</Option>
                  <Option value="executive">高管</Option>
                  <Option value="admin">管理员</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="city_tier" label="城市等级">
                <Select placeholder="请选择城市等级" allowClear>
                  <Option value="tier1">一线</Option>
                  <Option value="tier2">二线</Option>
                  <Option value="tier3">三线</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="structured_content" label="结构化内容">
            <Input.TextArea
              placeholder="请输入结构化内容（JSON格式）"
              rows={5}
            />
          </Form.Item>
          <Form.Item name="natural_content" label="自然语言内容">
            <Input.TextArea
              placeholder="请输入自然语言内容"
              rows={3}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="complexity_score" label="复杂度分数">
                <InputNumber
                  placeholder="0-100"
                  min={0}
                  max={100}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_active" label="启用状态" valuePropName="checked">
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="validation_strategy" label="验证策略">
            <Input.TextArea
              placeholder="请输入验证策略（JSON格式）"
              rows={3}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                更新
              </Button>
              <Button
                onClick={() => {
                  setEditModalVisible(false);
                  editForm.resetFields();
                  setSelectedRule(null);
                }}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="规则详情"
        placement="right"
        width={600}
        open={viewDrawerVisible}
        onClose={() => {
          setViewDrawerVisible(false);
          setSelectedRule(null);
        }}
      >
        {selectedRule && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="规则名称">
              {selectedRule.name}
            </Descriptions.Item>
            <Descriptions.Item label="规则描述">
              {selectedRule.description}
            </Descriptions.Item>
            <Descriptions.Item label="规则类型">
              <Tag color="blue">{selectedRule.rule_type}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="存储类型">
              <Tag color="green">{selectedRule.rule_storage_type}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="适用角色">
              {selectedRule.position_level ? (
                <Tag color="purple">{selectedRule.position_level}</Tag>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="城市等级">
              {selectedRule.city_tier ? (
                <Tag color="orange">{selectedRule.city_tier}</Tag>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="复杂度分数">
              {selectedRule.complexity_score}/100
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={selectedRule.is_active ? 'success' : 'default'}>
                {selectedRule.is_active ? '启用' : '禁用'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(selectedRule.createdAt).toLocaleString('zh-CN')}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {new Date(selectedRule.updatedAt).toLocaleString('zh-CN')}
            </Descriptions.Item>
            {selectedRule.structured_content && (
              <Descriptions.Item label="结构化内容">
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {selectedRule.structured_content}
                </pre>
              </Descriptions.Item>
            )}
            {selectedRule.natural_content && (
              <Descriptions.Item label="自然语言内容">
                {selectedRule.natural_content}
              </Descriptions.Item>
            )}
            {selectedRule.validation_strategy && (
              <Descriptions.Item label="验证策略">
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {selectedRule.validation_strategy}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
};

export default RuleManagement;
