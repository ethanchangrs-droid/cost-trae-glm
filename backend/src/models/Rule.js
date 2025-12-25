const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Rule = sequelize.define('rules', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100],
    },
  },
  rule_storage_type: {
    type: DataTypes.ENUM('structured', 'natural', 'hybrid'),
    allowNull: false,
    defaultValue: 'structured',
    field: 'rule_storage_type',
  },
  rule_type: {
    type: DataTypes.ENUM('accommodation', 'transport', 'meal'),
    allowNull: false,
    field: 'rule_type',
    validate: {
      notEmpty: true,
      isIn: [['accommodation', 'transport', 'meal']],
    },
  },
  position_level: {
    type: DataTypes.STRING(50),
    field: 'position_level',
  },
  city_tier: {
    type: DataTypes.STRING(50),
    field: 'city_tier',
  },
  complexity_score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'complexity_score',
    validate: {
      min: 0,
      max: 100,
    },
  },
  structured_content: {
    type: DataTypes.TEXT,
    field: 'structured_content',
  },
  natural_content: {
    type: DataTypes.TEXT,
    field: 'natural_content',
  },
  validation_strategy: {
    type: DataTypes.TEXT,
    field: 'validation_strategy',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
  },
}, {
  tableName: 'rules',
  indexes: [
    {
      fields: ['rule_type'],
    },
    {
      fields: ['position_level'],
    },
    {
      fields: ['city_tier'],
    },
    {
      fields: ['is_active'],
    },
    {
      fields: ['rule_type', 'position_level'],
    },
  ],
});

// 虚拟关联 - 将在模型关联后定义
Rule.associate = function(models) {
  Rule.hasMany(models.RuleValidation, {
    foreignKey: 'rule_id',
    as: 'validations',
  });
};

// 实例方法
Rule.prototype.getTypeLabel = function() {
  const labels = {
    accommodation: '住宿费规则',
    transport: '交通费规则',
    meal: '餐费规则',
  };
  return labels[this.rule_type] || this.rule_type;
};

Rule.prototype.getStorageTypeLabel = function() {
  const labels = {
    structured: '结构化',
    natural: '自然语言',
    hybrid: '混合模式',
  };
  return labels[this.rule_storage_type] || this.rule_storage_type;
};

Rule.prototype.isApplicable = function(userLevel, cityTier) {
  if (!this.is_active) return false;
  
  // 检查职位级别
  if (this.position_level && this.position_level !== userLevel) {
    return false;
  }
  
  // 检查城市等级
  if (this.city_tier && this.city_tier !== cityTier) {
    return false;
  }
  
  return true;
};

// 类方法
Rule.findByType = function(type) {
  return this.findAll({ 
    where: { rule_type: type, is_active: true },
    order: [['complexity_score', 'DESC']],
  });
};

Rule.findApplicableRules = function(type, userLevel, cityTier) {
  return this.findAll({
    where: {
      rule_type: type,
      is_active: true,
      [sequelize.Sequelize.Op.or]: [
        { position_level: null },
        { position_level: userLevel },
      ],
      [sequelize.Sequelize.Op.or]: [
        { city_tier: null },
        { city_tier: cityTier },
      ],
    },
    order: [
      ['complexity_score', 'DESC'],
      ['created_at', 'DESC'],
    ],
  });
};

Rule.getActiveRules = function() {
  return this.findAll({ 
    where: { is_active: true },
    order: [['created_at', 'DESC']],
  });
};

module.exports = Rule;