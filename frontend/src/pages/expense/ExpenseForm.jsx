import { useState, useEffect } from 'react';
import { Card, Form, Button, Upload, Table, Input, DatePicker, Select, message, Row, Col, Alert, Space, Tag, Typography, Modal, Statistic } from 'antd';
import { UploadOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, PlusOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { expenseAPI, uploadAPI, validationAPI } from '../../api';
import UserSelectModal from '../users/UserSelectModal';
import './ExpenseForm.css';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

const ExpenseForm = () => {
  const [form] = Form.useForm();
  const [userSelectVisible, setUserSelectVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [extractedInfo, setExtractedInfo] = useState(null);
  const [intelligentDescription, setIntelligentDescription] = useState('');
  const [expenseItems, setExpenseItems] = useState([]);
  const [validationResults, setValidationResults] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formStatus, setFormStatus] = useState('draft');
  const [itemValidationStates, setItemValidationStates] = useState({});
  const [realtimeValidating, setRealtimeValidating] = useState(false);
  const [formValidationSummary, setFormValidationSummary] = useState(null);
  const [validationReportVisible, setValidationReportVisible] = useState(false);
  const [currentValidationReport, setCurrentValidationReport] = useState(null);

  const itemTypeOptions = [
    { label: '交通', value: 'transport' },
    { label: '住宿', value: 'accommodation' },
    { label: '餐饮', value: 'meal' },
  ];

  const positionLevelOptions = [
    { label: '员工', value: 'employee' },
    { label: '经理', value: 'manager' },
    { label: '高管', value: 'executive' },
  ];

  const handleUserSelect = (users) => {
    if (users && users.length > 0) {
      const user = users[0];
      setSelectedUser(user);
      form.setFieldsValue({
        user_id: user.id,
        user_name: user.name,
        employee_id: user.employee_id,
        position_level: user.position_level,
      });
    }
    setUserSelectVisible(false);
  };

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const response = await uploadAPI.uploadReceipt(file);
      if (response.data.success) {
        const { preview_url, extracted_data, description } = response.data.data;
        setReceiptPreview(preview_url);
        setExtractedInfo(extracted_data);
        setIntelligentDescription(description);
        
        if (extracted_data) {
          const newItem = {
            id: Date.now(),
            item_type: extracted_data.item_type || 'transport',
            description: extracted_data.description || '',
            amount: extracted_data.amount || 0,
            date: extracted_data.date ? new Date(extracted_data.date) : new Date(),
            details: extracted_data.details || {},
          };
          setExpenseItems([...expenseItems, newItem]);
          calculateTotal([...expenseItems, newItem]);
        }
        message.success('票据识别成功');
      }
    } catch (error) {
      message.error('票据上传失败，请重试');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleAddItem = () => {
    const newItem = {
      id: Date.now(),
      item_type: 'transport',
      description: '',
      amount: 0,
      date: new Date(),
      details: {},
    };
    setExpenseItems([...expenseItems, newItem]);
  };

  const handleUpdateItem = async (id, field, value) => {
    const updatedItems = expenseItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    setExpenseItems(updatedItems);
    calculateTotal(updatedItems);
    
    const updatedItem = updatedItems.find(item => item.id === id);
    if (updatedItem && updatedItem.amount > 0 && selectedUser) {
      await performRealtimeItemValidation(updatedItem, id);
    } else {
      setItemValidationStates(prev => ({
        ...prev,
        [id]: null,
      }));
    }
  };

  const performRealtimeItemValidation = async (item, itemId) => {
    try {
      setRealtimeValidating(true);
      
      const itemData = {
        item_type: item.item_type,
        description: item.description,
        amount: item.amount,
        date: item.date ? item.date.format('YYYY-MM-DD') : null,
        item_index: expenseItems.findIndex(i => i.id === itemId),
      };
      
      const formValues = form.getFieldsValue();
      const cityName = formValues.destination_city || null;
      
      const response = await validationAPI.validateItem(itemData, selectedUser?.id, cityName);
      
      if (response.data.success) {
        const validationResult = response.data.data;
        setItemValidationStates(prev => ({
          ...prev,
          [itemId]: validationResult,
        }));
        
        await performRealtimeFormValidation();
      }
    } catch (error) {
      console.error('实时验证失败:', error);
    } finally {
      setRealtimeValidating(false);
    }
  };

  const performRealtimeFormValidation = async () => {
    if (expenseItems.length === 0 || !selectedUser) {
      setFormValidationSummary(null);
      return;
    }
    
    try {
      const formValues = form.getFieldsValue();
      const expenseData = {
        items: expenseItems.map((item, index) => ({
          item_type: item.item_type,
          description: item.description,
          amount: item.amount,
          date: item.date ? item.date.format('YYYY-MM-DD') : null,
          details: item.details || {},
        })),
        destination_city: formValues.destination_city || null,
      };
      
      const response = await validationAPI.validateSummary(expenseData, selectedUser?.id);
      
      if (response.data.success) {
        setFormValidationSummary(response.data.data);
      }
    } catch (error) {
      console.error('表单实时验证失败:', error);
    }
  };

  const handleDeleteItem = (id) => {
    const updatedItems = expenseItems.filter(item => item.id !== id);
    setExpenseItems(updatedItems);
    calculateTotal(updatedItems);
  };

  const calculateTotal = (items) => {
    const total = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    setTotalAmount(total);
  };

  const validateFormData = () => {
    const errors = [];
    
    if (!selectedUser) {
      errors.push('请选择报销人');
    }
    
    if (expenseItems.length === 0) {
      errors.push('请至少添加一个费用项目');
    }
    
    expenseItems.forEach((item, index) => {
      if (!item.description || item.description.trim() === '') {
        errors.push(`第${index + 1}个费用项目的描述不能为空`);
      }
      if (!item.amount || item.amount <= 0) {
        errors.push(`第${index + 1}个费用项目的金额必须大于0`);
      }
      if (!item.date) {
        errors.push(`第${index + 1}个费用项目的日期不能为空`);
      }
    });
    
    return errors;
  };

  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      
      const validationErrors = validateFormData();
      if (validationErrors.length > 0) {
        Modal.error({
          title: '表单验证失败',
          content: (
            <ul>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          ),
        });
        return;
      }
      
      const values = await form.validateFields();
      
      if (!values.trip_start_date || !values.trip_end_date) {
        message.error('请选择出差日期');
        return;
      }
      
      if (values.trip_start_date.isAfter(values.trip_end_date)) {
        message.error('出差开始日期不能晚于结束日期');
        return;
      }
      
      const expenseData = {
        user_id: values.user_id,
        trip_start_date: values.trip_start_date.format('YYYY-MM-DD'),
        trip_end_date: values.trip_end_date.format('YYYY-MM-DD'),
        destination_city: values.destination_city,
        trip_reason: values.trip_reason,
        status: 'draft',
        total_amount: totalAmount,
        items: expenseItems.map(item => ({
          item_type: item.item_type,
          description: item.description,
          amount: item.amount,
          date: item.date?.format('YYYY-MM-DD'),
          details: item.details,
        })),
      };
      await expenseAPI.createExpense(expenseData);
      message.success('草稿保存成功');
      form.resetFields();
      setExpenseItems([]);
      setReceiptPreview(null);
      setExtractedInfo(null);
      setIntelligentDescription('');
      setTotalAmount(0);
      setSelectedUser(null);
      setFormStatus('draft');
    } catch (error) {
      message.error('保存失败：' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitValidation = async () => {
    const validationErrors = validateFormData();
    if (validationErrors.length > 0) {
      Modal.error({
        title: '表单验证失败',
        content: (
          <ul>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        ),
      });
      return;
    }
    
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      if (!values.trip_start_date || !values.trip_end_date) {
        message.error('请选择出差日期');
        return;
      }
      
      if (values.trip_start_date.isAfter(values.trip_end_date)) {
        message.error('出差开始日期不能晚于结束日期');
        return;
      }
      
      const expenseData = {
        user_id: values.user_id,
        trip_start_date: values.trip_start_date.format('YYYY-MM-DD'),
        trip_end_date: values.trip_end_date.format('YYYY-MM-DD'),
        destination_city: values.destination_city,
        trip_reason: values.trip_reason,
        total_amount: totalAmount,
        items: expenseItems.map(item => ({
          item_type: item.item_type,
          description: item.description,
          amount: item.amount,
          date: item.date?.format('YYYY-MM-DD'),
          details: item.details,
        })),
      };
      
      const response = await expenseAPI.validateSubmit(expenseData, selectedUser?.id);
      
      if (response.data.success) {
        setCurrentValidationReport(response.data.data);
        setValidationReportVisible(true);
      }
    } catch (error) {
      message.error('验证失败：' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleReportClose = () => {
    setValidationReportVisible(false);
    setCurrentValidationReport(null);
  };

  const handleSubmitExpense = async () => {
    const validationErrors = validateFormData();
    if (validationErrors.length > 0) {
      Modal.error({
        title: '表单验证失败',
        content: (
          <ul>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        ),
      });
      return;
    }
    
    Modal.confirm({
      title: '确认提交报销',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>您即将提交费用报销申请，提交后将无法修改。</p>
          <Alert
            message="温馨提示"
            description="建议在提交前先进行验证，确保费用符合规定。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <div>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Statistic title="报销人" value={selectedUser?.name || '-'} />
              <Statistic title="总金额" value={totalAmount} precision={2} prefix="¥" />
              <Statistic title="费用项目数" value={expenseItems.length} suffix="项" />
            </Space>
          </div>
        </div>
      ),
      okText: '确认提交',
      cancelText: '取消',
      onOk: async () => {
        try {
          setLoading(true);
          const values = await form.validateFields();
          
          if (!values.trip_start_date || !values.trip_end_date) {
            message.error('请选择出差日期');
            return;
          }
          
          if (values.trip_start_date.isAfter(values.trip_end_date)) {
            message.error('出差开始日期不能晚于结束日期');
            return;
          }
          
          const expenseData = {
            user_id: values.user_id,
            trip_start_date: values.trip_start_date.format('YYYY-MM-DD'),
            trip_end_date: values.trip_end_date.format('YYYY-MM-DD'),
            destination_city: values.destination_city,
            trip_reason: values.trip_reason,
            status: 'submitted',
            total_amount: totalAmount,
            items: expenseItems.map(item => ({
              item_type: item.item_type,
              description: item.description,
              amount: item.amount,
              date: item.date?.format('YYYY-MM-DD'),
              details: item.details,
            })),
          };
          await expenseAPI.createExpense(expenseData);
          Modal.success({
            title: '提交成功',
            content: '您的费用报销申请已提交成功，请等待审核。',
          });
          form.resetFields();
          setExpenseItems([]);
          setReceiptPreview(null);
          setExtractedInfo(null);
          setIntelligentDescription('');
          setTotalAmount(0);
          setValidationResults([]);
          setSelectedUser(null);
          setFormStatus('draft');
        } catch (error) {
          message.error('提交失败：' + (error.response?.data?.message || error.message));
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const itemColumns = [
    {
      title: '类型',
      dataIndex: 'item_type',
      key: 'item_type',
      width: 100,
      render: (value, record) => (
        <Select
          value={value}
          onChange={(v) => handleUpdateItem(record.id, 'item_type', v)}
          style={{ width: '100%' }}
        >
          {itemTypeOptions.map(option => (
            <Option key={option.value} value={option.value}>{option.label}</Option>
          ))}
        </Select>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (value, record) => (
        <Input
          value={value}
          onChange={(e) => handleUpdateItem(record.id, 'description', e.target.value)}
          placeholder="请输入描述"
        />
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (value, record) => {
        const validationState = itemValidationStates[record.id];
        const hasError = validationState && !validationState.overall_valid;
        return (
          <div>
            <Input
              type="number"
              value={value}
              onChange={(e) => handleUpdateItem(record.id, 'amount', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              style={hasError ? { borderColor: '#ff4d4f' } : {}}
            />
            {hasError && validationState.warnings && validationState.warnings.length > 0 && (
              <div style={{ fontSize: 12, color: '#ff4d4f', marginTop: 4 }}>
                {validationState.warnings[0]}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 140,
      render: (value, record) => (
        <DatePicker
          value={value}
          onChange={(date) => handleUpdateItem(record.id, 'date', date)}
          format="YYYY-MM-DD"
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '验证状态',
      key: 'validation_status',
      width: 100,
      render: (_, record) => {
        const validationState = itemValidationStates[record.id];
        if (!validationState) {
          return <Tag color="default">待验证</Tag>;
        }
        if (validationState.overall_valid) {
          return <Tag color="success" icon={<CheckCircleOutlined />}>通过</Tag>;
        }
        return (
          <Tag color="error" icon={<CloseCircleOutlined />}>
            未通过
          </Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteItem(record.id)}
        />
      ),
    },
  ];

  const getFormStatusInfo = () => {
    if (validationResults.length === 0) {
      return { status: 'draft', label: '草稿', color: 'default', icon: null };
    }
    
    const hasFailed = validationResults.some(r => !r.passed);
    if (hasFailed) {
      return { status: 'rejected', label: '验证未通过', color: 'error', icon: <CloseCircleOutlined /> };
    }
    
    return { status: 'approved', label: '验证通过', color: 'success', icon: <CheckCircleOutlined /> };
  };

  const formStatusInfo = getFormStatusInfo();

  return (
    <div className="expense-form-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>费用报销</Title>
        <Tag color={formStatusInfo.color} icon={formStatusInfo.icon} style={{ fontSize: 14 }}>
          {formStatusInfo.label}
        </Tag>
      </div>
      
      <Card title="报销人信息" className="form-section">
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item label="报销人">
              <Input value={selectedUser?.name || ''} readOnly placeholder="请选择报销人" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="工号">
              <Input value={selectedUser?.employee_id || ''} readOnly placeholder="工号" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="级别">
              <Input value={selectedUser?.position_level || ''} readOnly placeholder="级别" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="选择用户">
              <Button type="primary" onClick={() => setUserSelectVisible(true)}>
                选择用户
              </Button>
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="票据识别结果" className="form-section">
        <Upload
          beforeUpload={handleUpload}
          showUploadList={false}
          accept="image/*"
        >
          <Button icon={<UploadOutlined />} loading={uploading}>
            上传票据照片
          </Button>
        </Upload>
        {uploading && <div style={{ marginTop: 8 }}>AI识别中...</div>}
        {receiptPreview && (
          <div style={{ marginTop: 16 }}>
            <img src={receiptPreview} alt="票据预览" style={{ maxWidth: 200 }} />
          </div>
        )}
      </Card>

      <Card title="结构化信息（自动提取）" className="form-section">
        <Table
          columns={itemColumns}
          dataSource={expenseItems}
          rowKey="id"
          pagination={false}
          size="small"
        />
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAddItem}
          style={{ width: '100%', marginTop: 16 }}
        >
          添加费用项目
        </Button>
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Text strong>总金额：¥{totalAmount.toFixed(2)}</Text>
        </div>
      </Card>

      <Card title="智能说明（LLM生成）" className="form-section">
        <TextArea
          value={intelligentDescription}
          onChange={(e) => setIntelligentDescription(e.target.value)}
          rows={4}
          placeholder="AI将自动生成票据说明"
        />
      </Card>

      <Card title="基础信息补充" className="form-section">
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="出差开始日期"
                name="trip_start_date"
                rules={[{ required: true, message: '请选择出差开始日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="出差结束日期"
                name="trip_end_date"
                rules={[{ required: true, message: '请选择出差结束日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="目的地城市"
                name="destination_city"
                rules={[{ required: true, message: '请输入目的地城市' }]}
              >
                <Input placeholder="请输入目的地城市" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="出差事由" name="trip_reason">
                <TextArea rows={2} placeholder="请输入出差事由" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="user_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="user_name" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="employee_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="position_level" hidden>
            <Input />
          </Form.Item>
        </Form>
      </Card>

      {formValidationSummary && (
        <Card 
          title={
            <Space>
              <span>实时验证摘要</span>
              {realtimeValidating && <Tag color="processing">验证中...</Tag>}
            </Space>
          } 
          className="form-section"
          extra={
            <Tag 
              color={formValidationSummary.overall_valid ? 'success' : 'error'}
              icon={formValidationSummary.overall_valid ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            >
              {formValidationSummary.overall_valid ? '验证通过' : '验证未通过'}
            </Tag>
          }
        >
          <Row gutter={16}>
            <Col span={6}>
              <Statistic 
                title="费用项目数" 
                value={formValidationSummary.total_items} 
                suffix="项"
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="验证通过" 
                value={formValidationSummary.passed_items} 
                suffix="项"
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="验证未通过" 
                value={formValidationSummary.failed_items} 
                suffix="项"
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="总金额" 
                value={formValidationSummary.total_amount} 
                precision={2}
                prefix="¥"
              />
            </Col>
          </Row>
          {formValidationSummary.warnings_count > 0 && (
            <Alert
              type="warning"
              message={`发现 ${formValidationSummary.warnings_count} 条警告，请检查费用项目详情`}
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Card>
      )}

      {validationResults.length > 0 && (
        <Card title="提交验证结果" className="form-section">
          {validationResults.map((result, index) => (
            <Alert
              key={index}
              type={result.passed ? 'success' : 'warning'}
              icon={result.passed ? <CheckCircleOutlined /> : <WarningOutlined />}
              message={result.message}
              description={typeof result.details === 'string' ? result.details : JSON.stringify(result.details, null, 2)}
              style={{ marginBottom: 8 }}
            />
          ))}
        </Card>
      )}

      <Card className="form-section">
        <Space>
          <Button onClick={handleSaveDraft} disabled={loading}>
            保存草稿
          </Button>
          <Button type="primary" onClick={handleSubmitValidation} loading={loading}>
            提交验证
          </Button>
          <Button type="primary" onClick={handleSubmitExpense} loading={loading}>
            提交报销
          </Button>
        </Space>
      </Card>

      <UserSelectModal
        visible={userSelectVisible}
        onCancel={() => setUserSelectVisible(false)}
        onConfirm={handleUserSelect}
      />

      <Modal
        title="提交验证报告"
        open={validationReportVisible}
        onCancel={handleReportClose}
        width={800}
        footer={[
          <Button key="close" onClick={handleReportClose}>
            关闭
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            disabled={currentValidationReport?.summary?.overall_status === 'rejected'}
            onClick={() => {
              handleReportClose();
              handleSubmitExpense();
            }}
          >
            提交报销
          </Button>,
        ]}
      >
        {currentValidationReport && (
          <div>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={12}>
                <Statistic 
                  title="验证状态" 
                  value={currentValidationReport.summary.overall_status === 'approved' ? '通过' : 
                         currentValidationReport.summary.overall_status === 'rejected' ? '未通过' : '部分通过'}
                  valueStyle={{ 
                    color: currentValidationReport.summary.overall_status === 'approved' ? '#52c41a' :
                           currentValidationReport.summary.overall_status === 'rejected' ? '#ff4d4f' : '#faad14'
                  }}
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title="总金额" 
                  value={currentValidationReport.expense_info.total_amount} 
                  precision={2}
                  prefix="¥"
                />
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={8}>
                <Statistic title="费用项目数" value={currentValidationReport.summary.total_items} suffix="项" />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="验证通过" 
                  value={currentValidationReport.summary.passed_items} 
                  suffix="项"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="验证未通过" 
                  value={currentValidationReport.summary.failed_items} 
                  suffix="项"
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Col>
            </Row>

            {currentValidationReport.summary.warnings_count > 0 && (
              <Alert
                type="warning"
                message={`发现 ${currentValidationReport.summary.warnings_count} 条警告`}
                description={
                  <ul style={{ marginTop: 8, marginBottom: 0 }}>
                    {currentValidationReport.all_warnings?.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                }
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {currentValidationReport.recommendations && currentValidationReport.recommendations.length > 0 && (
              <Alert
                type="info"
                message="优化建议"
                description={
                  <ul style={{ marginTop: 8, marginBottom: 0 }}>
                    {currentValidationReport.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                }
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            <div style={{ marginBottom: 16 }}>
              <Title level={5}>费用项目验证详情</Title>
              <Table
                columns={[
                  {
                    title: '序号',
                    dataIndex: 'item_index',
                    key: 'item_index',
                    width: 60,
                  },
                  {
                    title: '类型',
                    dataIndex: 'item_type',
                    key: 'item_type',
                    render: (text) => {
                      const typeMap = { transport: '交通', accommodation: '住宿', meal: '餐饮' };
                      return typeMap[text] || text;
                    },
                  },
                  {
                    title: '描述',
                    dataIndex: 'description',
                    key: 'description',
                    ellipsis: true,
                  },
                  {
                    title: '金额',
                    dataIndex: 'amount',
                    key: 'amount',
                    render: (text) => `¥${text.toFixed(2)}`,
                  },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    key: 'status',
                    render: (text) => (
                      <Tag 
                        color={text === 'passed' ? 'success' : text === 'failed' ? 'error' : 'warning'}
                      >
                        {text === 'passed' ? '通过' : text === 'failed' ? '未通过' : '警告'}
                      </Tag>
                    ),
                  },
                  {
                    title: '验证信息',
                    dataIndex: 'validation_message',
                    key: 'validation_message',
                    ellipsis: true,
                  },
                ]}
                dataSource={Object.values(currentValidationReport.items_validation || {})}
                rowKey="item_index"
                pagination={false}
                size="small"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ExpenseForm;
