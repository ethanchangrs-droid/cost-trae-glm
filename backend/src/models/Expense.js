const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Expense = sequelize.define('expenses', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    field: 'user_id',
  },
  trip_start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'trip_start_date',
    validate: {
      isDate: true,
      notEmpty: true,
    },
  },
  trip_end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'trip_end_date',
    validate: {
      isDate: true,
      notEmpty: true,
      isAfterStartDate(value) {
        if (value <= this.trip_start_date) {
          throw new Error('结束日期必须晚于开始日期');
        }
      },
    },
  },
  destination_city: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'destination_city',
    validate: {
      notEmpty: true,
      len: [1, 100],
    },
  },
  trip_reason: {
    type: DataTypes.TEXT,
    field: 'trip_reason',
  },
  status: {
    type: DataTypes.ENUM('draft', 'submitted', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'draft',
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      isDecimal: true,
      min: 0,
    },
  },
  validation_result: {
    type: DataTypes.TEXT,
    field: 'validation_result',
  },
}, {
  tableName: 'expenses',
  indexes: [
    {
      fields: ['user_id'],
    },
    {
      fields: ['status'],
    },
    {
      fields: ['trip_start_date'],
    },
  ],
});

// 虚拟关联 - 将在模型关联后定义
Expense.associate = function(models) {
  Expense.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user',
  });
  Expense.hasMany(models.ExpenseItem, {
    foreignKey: 'expense_id',
    as: 'items',
  });
  Expense.hasMany(models.RuleValidation, {
    foreignKey: 'expense_id',
    as: 'validations',
  });
};

// 实例方法
Expense.prototype.calculateTotal = function() {
  return this.get('items').reduce((total, item) => {
    return total + parseFloat(item.amount);
  }, 0);
};

Expense.prototype.canSubmit = function() {
  return this.status === 'draft' && this.get('items').length > 0;
};

Expense.prototype.canApprove = function() {
  return this.status === 'submitted';
};

Expense.prototype.canReject = function() {
  return this.status === 'submitted';
};

// 类方法
Expense.findByUserId = function(userId) {
  return this.findAll({ 
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
  });
};

Expense.findByStatus = function(status) {
  return this.findAll({ 
    where: { status },
    order: [['created_at', 'DESC']],
  });
};

module.exports = Expense;