const express = require('express');
const { Expense, ExpenseItem, User, RuleValidation } = require('../models');
const { Op } = require('sequelize');
const { authenticate, authorize } = require('../middleware/auth');
const { validateExpense, validateId, validatePagination } = require('../middleware/validation');
const { asyncHandler, logger } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/', authenticate, validatePagination, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, start_date, end_date } = req.query;
  const offset = (page - 1) * limit;

  const where = {};
  
  if (req.user.role !== 'admin' && req.user.role !== 'executive') {
    where.user_id = req.user.id;
  }
  
  if (status) {
    where.status = status;
  }
  
  if (start_date || end_date) {
    where.expense_date = {};
    if (start_date) where.expense_date[Op.gte] = start_date;
    if (end_date) where.expense_date[Op.lte] = end_date;
  }

  const { count, rows: expenses } = await Expense.findAndCountAll({
    where,
    include: [
      {
        model: ExpenseItem,
        as: 'items',
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'name', 'role'],
      },
      {
        model: RuleValidation,
        as: 'validations',
      },
    ],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['created_at', 'DESC']],
  });

  res.json({
    success: true,
    data: {
      expenses,
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

  const where = { id };
  if (req.user.role !== 'admin' && req.user.role !== 'executive') {
    where.user_id = req.user.id;
  }

  const expense = await Expense.findOne({
    where,
    include: [
      {
        model: ExpenseItem,
        as: 'items',
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'name', 'role'],
      },
      {
        model: RuleValidation,
        as: 'validations',
        include: [
          {
            model: require('../models').Rule,
            as: 'rule',
          },
        ],
      },
    ],
  });

  if (!expense) {
    const error = new Error('费用记录不存在');
    error.status = 404;
    error.code = 'EXPENSE_NOT_FOUND';
    throw error;
  }

  res.json({
    success: true,
    data: {
      expense,
    },
  });
}));

router.post('/', authenticate, validateExpense.create, asyncHandler(async (req, res) => {
  const { title, description, total_amount, trip_start_date, trip_end_date, destination_city, trip_reason, items } = req.body;

  const expense = await Expense.create({
    title,
    description,
    total_amount,
    trip_start_date,
    trip_end_date,
    destination_city,
    trip_reason,
    user_id: req.user.id,
    status: 'draft',
  });

  const expenseItems = items.map(item => ({
    expense_id: expense.id,
    item_type: item.category,
    description: item.description,
    amount: item.amount,
    date: new Date().toISOString().split('T')[0], // 使用当前日期
    details: item.details || null,
  }));

  await ExpenseItem.bulkCreate(expenseItems);

  const createdExpense = await Expense.findByPk(expense.id, {
    include: [
      {
        model: ExpenseItem,
        as: 'items',
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'name', 'role'],
      },
    ],
  });

  res.status(201).json({
    success: true,
    data: {
      expense: createdExpense,
    },
  });
}));

router.put('/:id', authenticate, validateId, validateExpense.update, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, total_amount, expense_date, city, status } = req.body;

  const where = { id };
  if (req.user.role !== 'admin' && req.user.role !== 'executive') {
    where.user_id = req.user.id;
  }

  const expense = await Expense.findOne({ where });
  if (!expense) {
    const error = new Error('费用记录不存在');
    error.status = 404;
    error.code = 'EXPENSE_NOT_FOUND';
    throw error;
  }

  if (expense.status === 'submitted' && req.user.role !== 'admin' && req.user.role !== 'executive') {
    const error = new Error('已提交的费用记录无法修改');
    error.status = 400;
    error.code = 'EXPENSE_SUBMITTED';
    throw error;
  }

  await expense.update({
    title,
    description,
    total_amount,
    expense_date,
    city,
    status,
  });

  const updatedExpense = await Expense.findByPk(id, {
    include: [
      {
        model: ExpenseItem,
        as: 'items',
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'name', 'role'],
      },
    ],
  });

  res.json({
    success: true,
    data: {
      expense: updatedExpense,
    },
  });
}));

router.delete('/:id', authenticate, validateId, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const where = { id };
  if (req.user.role !== 'admin' && req.user.role !== 'executive') {
    where.user_id = req.user.id;
  }

  const expense = await Expense.findOne({ where });
  if (!expense) {
    const error = new Error('费用记录不存在');
    error.status = 404;
    error.code = 'EXPENSE_NOT_FOUND';
    throw error;
  }

  if (expense.status === 'submitted' && req.user.role !== 'admin' && req.user.role !== 'executive') {
    const error = new Error('已提交的费用记录无法删除');
    error.status = 400;
    error.code = 'EXPENSE_SUBMITTED';
    throw error;
  }

  await expense.destroy();

  res.json({
    success: true,
    message: '费用记录删除成功',
  });
}));

// 验证费用记录
router.post('/:id/validate', authenticate, validateId, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const expense = await Expense.findOne({
    where: { id },
    include: [
      {
        model: ExpenseItem,
        as: 'items',
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'role'],
      },
    ],
  });

  if (!expense) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'EXPENSE_NOT_FOUND',
        message: '费用记录不存在',
      },
    });
  }

  // 权限检查：只有费用所有者、管理员或高管可以验证
  if (expense.user_id !== req.user.id && 
      req.user.role !== 'admin' && 
      req.user.role !== 'executive') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: '没有权限验证此费用记录',
      },
    });
  }

  // 获取适用的规则
  const { Rule } = require('../models');
  const rules = await Rule.findAll({
    where: { 
      is_active: true,
      rule_type: { [Op.in]: ['accommodation', 'transport', 'meal'] }, // 只获取费用相关规则
    },
  });

  const validationResults = [];
  let allPassed = true;

  for (const rule of rules) {
    const startTime = Date.now();
    let validationResult = {
      rule_id: rule.id,
      rule_name: rule.name,
      rule_type: rule.rule_type,
      passed: false,
      message: '',
      details: {},
    };

    try {
      // 根据规则类型进行验证
      if (rule.rule_storage_type === 'structured') {
        const structuredContent = JSON.parse(rule.structured_content);
        validationResult = await validateWithStructuredRule(expense, rule, structuredContent);
      } else if (rule.rule_storage_type === 'natural') {
        validationResult = await validateWithNaturalRule(expense, rule);
      }

      // 记录验证结果
      await RuleValidation.create({
        expense_id: expense.id,
        rule_id: rule.id,
        validation_type: rule.rule_storage_type,
        validation_result: JSON.stringify(validationResult),
        execution_time_ms: Date.now() - startTime,
        llm_calls_count: rule.rule_storage_type === 'natural' ? 1 : 0,
      });

      validationResults.push(validationResult);
      
      if (!validationResult.passed) {
        allPassed = false;
      }

    } catch (error) {
      logger.error(`规则验证失败 [规则ID: ${rule.id}]:`, error);
      validationResult.passed = false;
      validationResult.message = '验证过程中发生错误';
      validationResult.details = { error: error.message };
      
      validationResults.push(validationResult);
      allPassed = false;
    }
  }

  // 更新费用状态
  const newStatus = allPassed ? 'approved' : 'rejected';
  await expense.update({ 
    status: newStatus,
    validation_result: JSON.stringify({
      validated_at: new Date().toISOString(),
      validated_by: req.user.id,
      results: validationResults,
      overall_status: newStatus,
    }),
  });

  res.json({
    success: true,
    data: {
      expense_id: expense.id,
      status: newStatus,
      validation_results: validationResults,
      validated_at: new Date().toISOString(),
    },
  });
}));

// 结构化规则验证函数
async function validateWithStructuredRule(expense, rule, structuredContent) {
  const result = {
    rule_id: rule.id,
    rule_name: rule.name,
    rule_type: rule.rule_type,
    passed: true,
    message: '验证通过',
    details: {},
  };

  let ruleApplicable = true;

  // 检查城市等级是否匹配
  if (rule.city_tier && expense.destination_city) {
    const { CityTier } = require('../models');
    const cityTier = await CityTier.findOne({
      where: { city_name: expense.destination_city },
    });
    
    if (!cityTier || cityTier.tier !== rule.city_tier) {
      ruleApplicable = false;
      result.passed = true;
      result.message = '规则不适用（城市等级不匹配）';
      result.details.city_tier = { expected: rule.city_tier, actual: cityTier ? cityTier.tier : '未知' };
      return result;
    }
  }

  // 检查职位等级是否匹配
  if (rule.position_level && expense.user) {
    if (expense.user.role !== rule.position_level) {
      ruleApplicable = false;
      result.passed = true;
      result.message = '规则不适用（职位等级不匹配）';
      result.details.position_level = { expected: rule.position_level, actual: expense.user.role };
      return result;
    }
  }

  // 规则适用，验证费用金额
  const relevantItems = expense.items.filter(item => item.item_type === rule.rule_type);
  for (const item of relevantItems) {
    if (structuredContent.max_amount && item.amount > structuredContent.max_amount) {
      result.passed = false;
      result.message = `费用金额超限：${item.item_type} ${item.amount}元 超过限制 ${structuredContent.max_amount}元`;
      result.details.amount_limit = { 
        item_type: item.item_type, 
        actual: item.amount, 
        limit: structuredContent.max_amount 
      };
      break;
    }
  }

  return result;
}

// 自然语言规则验证函数（简化版，实际应该调用LLM）
async function validateWithNaturalRule(expense, rule) {
  // 这里是简化版本，实际应该调用LLM进行自然语言理解
  const result = {
    rule_id: rule.id,
    rule_name: rule.name,
    rule_type: rule.rule_type,
    passed: true,
    message: '自然语言规则验证通过（简化版）',
    details: {
      note: '这是简化版本，实际应该调用LLM进行自然语言理解',
    },
  };

  // 简单的关键词匹配验证
  const naturalContent = rule.natural_content.toLowerCase();
  const relevantItems = expense.items.filter(item => item.item_type === rule.rule_type);
  
  for (const item of relevantItems) {
    if (item.amount > 1000 && naturalContent.includes('不超过')) {
      result.passed = false;
      result.message = `费用金额可能超限：${item.item_type} ${item.amount}元`;
      result.details.warning = '需要通过LLM进行详细验证';
      break;
    }
  }

  return result;
}

module.exports = router;