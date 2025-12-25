const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RuleValidation = sequelize.define('rule_validations', {
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
  rule_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'rules',
      key: 'id',
    },
    field: 'rule_id',
  },
  validation_type: {
    type: DataTypes.ENUM('structured', 'natural', 'hybrid'),
    allowNull: false,
    field: 'validation_type',
    validate: {
      notEmpty: true,
      isIn: [['structured', 'natural', 'hybrid']],
    },
  },
  validation_result: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'validation_result',
    validate: {
      notEmpty: true,
    },
  },
  execution_time_ms: {
    type: DataTypes.INTEGER,
    field: 'execution_time_ms',
    validate: {
      min: 0,
    },
  },
  llm_calls_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'llm_calls_count',
    validate: {
      min: 0,
    },
  },
}, {
  tableName: 'rule_validations',
  indexes: [
    {
      fields: ['expense_id'],
    },
    {
      fields: ['rule_id'],
    },
    {
      fields: ['validation_type'],
    },
    {
      fields: ['created_at'],
    },
  ],
});

// 虚拟关联 - 将在模型关联后定义
RuleValidation.associate = function(models) {
  RuleValidation.belongsTo(models.Expense, {
    foreignKey: 'expense_id',
    as: 'expense',
  });
  RuleValidation.belongsTo(models.Rule, {
    foreignKey: 'rule_id',
    as: 'rule',
  });
};

// 实例方法
RuleValidation.prototype.getResultSummary = function() {
  try {
    const result = JSON.parse(this.validation_result);
    return {
      passed: result.passed || false,
      message: result.message || '',
      details: result.details || {},
    };
  } catch (error) {
    return {
      passed: false,
      message: this.validation_result,
      details: {},
    };
  }
};

RuleValidation.prototype.getExecutionTime = function() {
  return this.execution_time_ms || 0;
};

// 类方法
RuleValidation.findByExpenseId = function(expenseId) {
  return this.findAll({ 
    where: { expense_id: expenseId },
    include: [{
      association: 'rule',
      attributes: ['id', 'name', 'rule_type', 'rule_storage_type'],
    }],
    order: [['created_at', 'ASC']],
  });
};

RuleValidation.findByRuleId = function(ruleId) {
  return this.findAll({ 
    where: { rule_id: ruleId },
    include: [{
      association: 'expense',
      attributes: ['id', 'user_id', 'status', 'total_amount'],
    }],
    order: [['created_at', 'DESC']],
  });
};

RuleValidation.getValidationStats = function(expenseId) {
  return this.findAll({
    where: { expense_id: expenseId },
    attributes: [
      'validation_type',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('AVG', sequelize.col('execution_time_ms')), 'avg_execution_time'],
      [sequelize.fn('SUM', sequelize.col('llm_calls_count')), 'total_llm_calls'],
    ],
    group: ['validation_type'],
  });
};

RuleValidation.getPassRate = function(expenseId) {
  return this.findAll({
    where: { expense_id: expenseId },
    attributes: [],
    include: [{
      association: 'rule',
      attributes: [],
    }],
  }).then(validations => {
    const passed = validations.filter(v => {
      const summary = v.getResultSummary();
      return summary.passed;
    }).length;
    return {
      total: validations.length,
      passed,
      failed: validations.length - passed,
      passRate: validations.length > 0 ? (passed / validations.length * 100).toFixed(2) : 0,
    };
  });
};

module.exports = RuleValidation;