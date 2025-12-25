const express = require('express');
const { Rule, RuleValidation } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRule, validateId, validatePagination } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/', authenticate, validatePagination, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, rule_type, is_active } = req.query;
  const offset = (page - 1) * limit;

  const where = {};
  if (rule_type) {
    where.rule_type = rule_type;
  }
  if (is_active !== undefined) {
    where.is_active = is_active === 'true';
  }

  const { count, rows: rules } = await Rule.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['created_at', 'DESC']],
  });

  res.json({
    success: true,
    data: {
      rules,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    },
  });
}));

router.get('/:id', authenticate, validateId, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const rule = await Rule.findByPk(id);

  if (!rule) {
    const error = new Error('规则不存在');
    error.status = 404;
    error.code = 'RULE_NOT_FOUND';
    throw error;
  }

  res.json({
    success: true,
    data: {
      rule,
    },
  });
}));

router.post('/', authenticate, authorize('admin', 'executive'), validateRule.create, asyncHandler(async (req, res) => {
  const { name, description, rule_type, rule_content, is_active = true } = req.body;

  const rule = await Rule.create({
    name,
    description,
    rule_type,
    rule_content,
    is_active,
  });

  res.status(201).json({
    success: true,
    data: {
      rule,
    },
  });
}));

router.put('/:id', authenticate, authorize('admin', 'executive'), validateId, validateRule.update, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, rule_type, rule_content, is_active } = req.body;

  const rule = await Rule.findByPk(id);
  if (!rule) {
    const error = new Error('规则不存在');
    error.status = 404;
    error.code = 'RULE_NOT_FOUND';
    throw error;
  }

  await rule.update({
    name,
    description,
    rule_type,
    rule_content,
    is_active,
  });

  const updatedRule = await Rule.findByPk(id);

  res.json({
    success: true,
    data: {
      rule: updatedRule,
    },
  });
}));

router.delete('/:id', authenticate, authorize('admin'), validateId, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const rule = await Rule.findByPk(id);
  if (!rule) {
    const error = new Error('规则不存在');
    error.status = 404;
    error.code = 'RULE_NOT_FOUND';
    throw error;
  }

  const validationCount = await RuleValidation.count({
    where: { rule_id: id },
  });

  if (validationCount > 0) {
    const error = new Error('该规则已被使用，无法删除');
    error.status = 400;
    error.code = 'RULE_IN_USE';
    throw error;
  }

  await rule.destroy();

  res.json({
    success: true,
    message: '规则删除成功',
  });
}));

module.exports = router;