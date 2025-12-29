const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('audit_logs', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '操作动作'
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '日志类别'
  },
  user: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '操作用户名'
  },
  userId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '操作用户ID'
  },
  resource: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '资源类型'
  },
  resourceId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '资源ID'
  },
  method: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'HTTP方法'
  },
  path: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '请求路径'
  },
  ip: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'IP地址'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '用户代理'
  },
  success: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: '操作是否成功'
  },
  status: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'HTTP状态码'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '错误信息'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '额外元数据'
  }
}, {
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    {
      name: 'idx_audit_timestamp',
      fields: ['timestamp']
    },
    {
      name: 'idx_audit_action',
      fields: ['action']
    },
    {
      name: 'idx_audit_category',
      fields: ['category']
    },
    {
      name: 'idx_audit_user',
      fields: ['user_id']
    },
    {
      name: 'idx_audit_resource',
      fields: ['resource', 'resource_id']
    }
  ]
});

module.exports = AuditLog;
