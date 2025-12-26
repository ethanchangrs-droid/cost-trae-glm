import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Form,
  Input,
  Button,
  Space,
  message,
  Descriptions,
  Tag,
  Alert,
  Spin,
  Divider,
  Tabs,
  Table,
  Popconfirm,
} from 'antd';
import {
  ThunderboltOutlined,
  SaveOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { ruleAPI, llmAPI } from '../../api';

const { TextArea } = Input;
const { TabPane } = Tabs;

const RuleConfig = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [rules, setRules] = useState([]);
  const [parsedRule, setParsedRule] = useState(null);
  const [conflicts, setConflicts] = useState([]);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const response = await ruleAPI.getRules();
      setRules(response.data.data.rules || []);
    } catch (error) {
      message.error('获取规则列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (values) => {
    if (!values.natural_language?.trim()) {
      message.warning('请输入自然语言描述');
      return;
    }

    setPreviewLoading(true);
    try {
      const response = await llmAPI.parseNaturalLanguage(values.natural_language);
      const rule = response.data.data;

      setParsedRule(rule);

      if (rule.conflicts && rule.conflicts.length > 0) {
        setConflicts(rule.conflicts);
        message.warning('检测到规则冲突');
      } else {
        setConflicts([]);
      }

      message.success('规则解析成功');
    } catch (error) {
      message.error(error.response?.data?.error?.message || '规则解析失败');
      setParsedRule(null);
      setConflicts([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSave = async () => {
    if (!parsedRule) {
      message.warning('请先解析规则');
      return;
    }

    if (conflicts.length > 0) {
      message.warning('存在规则冲突，无法保存');
      return;
    }

    try {
      const ruleData = {
        name: parsedRule.rule_name,
        description: parsedRule.description,
        rule_type: parsedRule.item_type || parsedRule.rule_type,
        rule_storage_type: 'structured',
        structured_content: JSON.stringify(parsedRule),
        position_level: parsedRule.position_level,
        city_tier: parsedRule.city_tier,
        is_active: true,
      };
      await ruleAPI.createRule(ruleData);
      message.success('规则保存成功');
      form.resetFields();
      setParsedRule(null);
      setConflicts([]);
      fetchRules();
    } catch (error) {
      message.error(error.response?.data?.error?.message || '规则保存失败');
    }
  };

  const handleReset = () => {
    form.resetFields();
    setParsedRule(null);
    setConflicts([]);
  };

  const renderRuleConditions = (conditions) => {
    if (!conditions || conditions.length === 0) return '-';

    return conditions.map((condition, index) => (
      <Tag key={index} color="blue">
        {condition.field} {condition.operator} {condition.value}
      </Tag>
    ));
  };

  const renderRuleActions = (actions) => {
    if (!actions || actions.length === 0) return '-';

    return actions.map((action, index) => (
      <Tag key={index} color="orange">
        {action.type}: {action.value}
      </Tag>
    ));
  };

  const ruleColumns = [
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'rule_type',
      key: 'rule_type',
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
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleString('zh-CN'),
    },
  ];

  const conflictColumns = [
    {
      title: '冲突类型',
      dataIndex: 'conflict_type',
      key: 'conflict_type',
      render: (type) => <Tag color="red">{type}</Tag>,
    },
    {
      title: '冲突规则',
      dataIndex: 'conflicting_rule',
      key: 'conflicting_rule',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
  ];

  return (
    <div>
      <Card
        title="自然语言规则配置"
        extra={
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            disabled={!parsedRule || conflicts.length > 0}
          >
            保存规则
          </Button>
        }
      >
        <Row gutter={16}>
          <Col xs={24} lg={12}>
            <Form form={form} layout="vertical">
              <Form.Item
                name="natural_language"
                label="自然语言描述"
                rules={[{ required: true, message: '请输入规则描述' }]}
                extra="例如：一线城市住宿费每晚不超过800元，仅适用于经理级别"
              >
                <TextArea
                  rows={8}
                  placeholder="请用自然语言描述费用规则，例如：&#10;1. 一线城市住宿费每晚不超过800元&#10;2. 员工级别餐饮费每顿不超过100元&#10;3. 交通费单次不超过500元&#10;4. 二线城市住宿费每晚不超过600元，仅适用于高管级别"
                  autoSize={{ minRows: 8, maxRows: 12 }}
                />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    onClick={() => form.validateFields().then(handlePreview)}
                    loading={previewLoading}
                  >
                    解析规则
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={handleReset}>
                    重置
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title="解析结果预览"
              size="small"
              loading={previewLoading}
              extra={
                parsedRule ? (
                  <Tag
                    icon={<CheckCircleOutlined />}
                    color="success"
                  >
                    解析成功
                  </Tag>
                ) : (
                  <Tag icon={<CloseCircleOutlined />} color="default">
                    待解析
                  </Tag>
                )
              }
            >
              {parsedRule ? (
                <>
                  <Descriptions bordered size="small" column={1}>
                    <Descriptions.Item label="规则名称">
                      {parsedRule.rule_name}
                    </Descriptions.Item>
                    <Descriptions.Item label="规则类型">
                      <Tag color="blue">{parsedRule.rule_type}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="适用角色">
                      {parsedRule.position_level ? (
                        <Tag color="purple">{parsedRule.position_level}</Tag>
                      ) : (
                        '-'
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="城市等级">
                      {parsedRule.city_tier ? (
                        <Tag color="orange">{parsedRule.city_tier}</Tag>
                      ) : (
                        '-'
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="费用类型">
                      {parsedRule.item_type ? (
                        <Tag color="green">{parsedRule.item_type}</Tag>
                      ) : (
                        '-'
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="条件">
                      {renderRuleConditions(parsedRule.conditions)}
                    </Descriptions.Item>
                    <Descriptions.Item label="动作">
                      {renderRuleActions(parsedRule.actions)}
                    </Descriptions.Item>
                    <Descriptions.Item label="规则描述">
                      {parsedRule.description}
                    </Descriptions.Item>
                  </Descriptions>

                  {conflicts.length > 0 && (
                    <>
                      <Divider />
                      <Alert
                        message="检测到规则冲突"
                        description="以下规则与现有规则存在冲突，请修改规则描述或调整现有规则"
                        type="warning"
                        showIcon
                        icon={<ExclamationCircleOutlined />}
                        style={{ marginBottom: 16 }}
                      />
                      <Table
                        columns={conflictColumns}
                        dataSource={conflicts}
                        rowKey="id"
                        pagination={false}
                        size="small"
                      />
                    </>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                  请输入自然语言描述并点击"解析规则"按钮
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </Card>

      <Card
        title="现有规则列表"
        style={{ marginTop: 16 }}
        extra={
          <Button
            type="link"
            onClick={fetchRules}
            loading={loading}
          >
            刷新
          </Button>
        }
      >
        <Table
          columns={ruleColumns}
          dataSource={rules}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>
    </div>
  );
};

export default RuleConfig;
