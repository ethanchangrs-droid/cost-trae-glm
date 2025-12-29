const express = require('express');
const { User, CityTier } = require('../models');
const { Op } = require('sequelize');
const ruleEngine = require('../services/ruleEngine');
const { asyncHandler, logger } = require('../middleware/errorHandler');
const auditLogger = require('../services/auditLogger');

const router = express.Router();

router.post('/realtime/item', asyncHandler(async (req, res) => {
  const { itemData, user_id, city_name } = req.body;

  if (!itemData) {
    auditLogger.logValidationAction('VALIDATION_ITEM_FAILED', null, null, null, {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      success: false,
      status: 400,
      errorMessage: '缺少费用项目数据',
      metadata: {}
    });

    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: '缺少费用项目数据',
      },
    });
  }

  if (!itemData.item_type || !itemData.amount) {
    auditLogger.logValidationAction('VALIDATION_ITEM_FAILED', null, null, null, {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      success: false,
      status: 400,
      errorMessage: '费用项目缺少必要字段（item_type, amount）',
      metadata: { itemData }
    });

    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ITEM_DATA',
        message: '费用项目缺少必要字段（item_type, amount）',
      },
    });
  }

  let userLevel = 'employee';
  let cityTier = null;
  let user = null;

  if (user_id) {
    user = await User.findByPk(user_id);
    if (user) {
      userLevel = user.position_level;
    }
  }

  if (city_name) {
    cityTier = await ruleEngine.getCityTierByCityName(city_name);
  }

  const validationResults = await ruleEngine.validateExpenseItem(
    itemData,
    userLevel,
    cityTier
  );

  auditLogger.logValidationAction('VALIDATION_ITEM', null, validationResults, user, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    success: true,
    status: 200,
    metadata: { 
      itemData, 
      user_id, 
      city_name, 
      userLevel, 
      cityTier 
    }
  });

  res.json({
    success: true,
    data: validationResults,
  });
}));

router.post('/realtime/form', asyncHandler(async (req, res) => {
  const { expenseData, user_id } = req.body;

  if (!expenseData) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: '缺少费用数据',
      },
    });
  }

  if (!expenseData.items || !Array.isArray(expenseData.items) || expenseData.items.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'NO_ITEMS',
        message: '费用数据不包含任何费用项目',
      },
    });
  }

  let userData = {
    position_level: 'employee',
  };

  if (user_id) {
    const user = await User.findByPk(user_id);
    if (user) {
      userData = {
        position_level: user.position_level,
        name: user.name,
        employee_id: user.employee_id,
      };
    }
  }

  const validationResults = await ruleEngine.validateExpenseForm(expenseData, userData);

  res.json({
    success: true,
    data: validationResults,
  });
}));

router.post('/realtime/summary', asyncHandler(async (req, res) => {
  const { expenseData, user_id } = req.body;

  if (!expenseData) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: '缺少费用数据',
      },
    });
  }

  let userData = {
    position_level: 'employee',
  };

  if (user_id) {
    const user = await User.findByPk(user_id);
    if (user) {
      userData = {
        position_level: user.position_level,
        name: user.name,
        employee_id: user.employee_id,
      };
    }
  }

  const summary = await ruleEngine.getValidationSummary(expenseData, userData);

  res.json({
    success: true,
    data: summary,
  });
}));

router.get('/rules/active', asyncHandler(async (req, res) => {
  const { type, position_level, city_tier } = req.query;
  
  const { Rule } = require('../models');
  const where = { is_active: true };

  if (type) {
    where.rule_type = type;
  }

  if (position_level) {
    where.position_level = position_level;
  }

  if (city_tier) {
    where.city_tier = city_tier;
  }

  const rules = await Rule.findAll({
    where,
    order: [
      ['complexity_score', 'DESC'],
      ['created_at', 'DESC'],
    ],
    attributes: [
      'id',
      'name',
      'rule_type',
      'rule_storage_type',
      'position_level',
      'city_tier',
      'complexity_score',
    ],
  });

  res.json({
    success: true,
    data: {
      rules,
      count: rules.length,
    },
  });
}));

router.get('/rules/applicable', asyncHandler(async (req, res) => {
  const { user_id, city_name } = req.query;

  let userLevel = 'employee';
  let cityTier = null;

  if (user_id) {
    const user = await User.findByPk(user_id);
    if (user) {
      userLevel = user.position_level;
    }
  }

  if (city_name) {
    cityTier = await ruleEngine.getCityTierByCityName(city_name);
  }

  const { Rule } = require('../models');
  const rules = await Rule.findAll({
    where: { 
      is_active: true,
      [Op.or]: [
        { position_level: null },
        { position_level: userLevel },
      ],
      [Op.or]: [
        { city_tier: null },
        { city_tier: cityTier },
      ],
    },
    order: [
      ['complexity_score', 'DESC'],
      ['created_at', 'DESC'],
    ],
  });

  res.json({
    success: true,
    data: {
      rules,
      count: rules.length,
      context: {
        user_level: userLevel,
        city_tier: cityTier,
      },
    },
  });
}));

module.exports = router;
