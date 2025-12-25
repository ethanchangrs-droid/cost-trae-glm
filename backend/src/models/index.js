const { sequelize } = require('../config/database');

// 导入所有模型
const User = require('./User');
const Expense = require('./Expense');
const ExpenseItem = require('./ExpenseItem');
const Rule = require('./Rule');
const RuleValidation = require('./RuleValidation');
const CityTier = require('./CityTier');

// 定义模型关联
const setupAssociations = () => {
  // 用户与费用的关联
  User.hasMany(Expense, {
    foreignKey: 'user_id',
    as: 'expenses',
  });

  // 费用与用户、费用明细、规则验证的关联
  Expense.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
  });

  Expense.hasMany(ExpenseItem, {
    foreignKey: 'expense_id',
    as: 'items',
  });

  Expense.hasMany(RuleValidation, {
    foreignKey: 'expense_id',
    as: 'validations',
  });

  // 费用明细与费用的关联
  ExpenseItem.belongsTo(Expense, {
    foreignKey: 'expense_id',
    as: 'expense',
  });

  // 规则与规则验证的关联
  Rule.hasMany(RuleValidation, {
    foreignKey: 'rule_id',
    as: 'validations',
  });

  // 规则验证与费用、规则的关联
  RuleValidation.belongsTo(Expense, {
    foreignKey: 'expense_id',
    as: 'expense',
  });

  RuleValidation.belongsTo(Rule, {
    foreignKey: 'rule_id',
    as: 'rule',
  });
};

// 设置关联
setupAssociations();

// 导出所有模型和sequelize实例
module.exports = {
  sequelize,
  User,
  Expense,
  ExpenseItem,
  Rule,
  RuleValidation,
  CityTier,
  setupAssociations,
};