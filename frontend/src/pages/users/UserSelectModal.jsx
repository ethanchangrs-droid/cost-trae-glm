import { useState, useEffect } from 'react';
import { Modal, Table, Input, Button, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { userAPI } from '../../api';

const UserSelectModal = ({ visible, onCancel, onConfirm, selectedUserIds = [] }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState(selectedUserIds);

  useEffect(() => {
    if (visible) {
      fetchUsers();
    }
  }, [visible]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {
        is_active: 'true',
      };
      if (searchText) {
        params.search = searchText;
      }
      const response = await userAPI.getUsers(params);
      setUsers(response.data.data.users);
    } catch (error) {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedRowKeys(selectedUserIds);
  }, [selectedUserIds]);

  const handleSearch = (value) => {
    setSearchText(value);
    fetchUsers();
  };

  const handleConfirm = () => {
    const selectedUsers = users.filter((user) => selectedRowKeys.includes(user.id));
    onConfirm(selectedUsers);
  };

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '姓名',
      dataIndex: 'full_name',
      key: 'full_name',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
    },
  ];

  return (
    <Modal
      title="选择用户"
      open={visible}
      onCancel={onCancel}
      width={700}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="confirm" type="primary" onClick={handleConfirm}>
          确认
        </Button>,
      ]}
    >
      <div style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索用户名、姓名、邮箱"
          allowClear
          enterButton={<SearchOutlined />}
          onSearch={handleSearch}
        />
      </div>
      <Table
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={false}
        scroll={{ y: 300 }}
      />
    </Modal>
  );
};

export default UserSelectModal;
