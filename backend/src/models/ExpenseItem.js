const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ExpenseItem = sequelize.define('expense_items', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  expense_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'expenses',
      key: 'id',
    },
    field: 'expense_id',
  },
  item_type: {
    type: DataTypes.ENUM('transport', 'accommodation', 'meal'),
    allowNull: false,
    field: 'item_type',
    validate: {
      notEmpty: true,
      isIn: [['transport', 'accommodation', 'meal']],
    },
  },
  description: {
    type: DataTypes.STRING(255),
    validate: {
      len: [0, 255],
    },
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isDecimal: true,
      min: 0.01,
      notEmpty: true,
    },
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: true,
      notEmpty: true,
    },
  },
  details: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'expense_items',
  indexes: [
    {
      fields: ['expense_id'],
    },
    {
      fields: ['item_type'],
    },
    {
      fields: ['date'],
    },
  ],
});

// 虚拟关联 - 将在模型关联后定义
ExpenseItem.associate = function(models) {
  ExpenseItem.belongsTo(models.Expense, {
    foreignKey: 'expense_id',
    as: 'expense',
  });
};

// 实例方法
ExpenseItem.prototype.getTypeLabel = function() {
  const labels = {
    transport: '交通费',
    accommodation: '住宿费',
    meal: '餐费',
  };
  return labels[this.item_type] || this.item_type;
};

// 类方法
ExpenseItem.findByExpenseId = function(expenseId) {
  return this.findAll({ 
    where: { expense_id: expenseId },
    order: [['date', 'ASC']],
  });
};

ExpenseItem.findByType = function(type) {
  return this.findAll({ 
    where: { item_type: type },
    order: [['date', 'DESC']],
  });
};

ExpenseItem.getTotalByType = function(expenseId) {
  return this.findAll({
    where: { expense_id: expenseId },
    attributes: [
      'item_type',
      [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount'],
    ],
    group: ['item_type'],
  });
};

module.exports = ExpenseItem;