const express = require('express');
const { Expense, ExpenseItem, User, RuleValidation } = require('../models');
const { Op } = require('sequelize');
const { asyncHandler, logger } = require('../middleware/errorHandler');

const router = express.Router();

const validateExpenseData = (expenseData) => {
  const errors = [];
  
  if (!expenseData.user_id) {
    errors.push('报销人ID不能为空');
  }
  
  if (!expenseData.total_amount || expenseData.total_amount <= 0) {
    errors.push('总金额必须大于0');
  }
  
  if (!expenseData.trip_start_date) {
    errors.push('出差开始日期不能为空');
  }
  
  if (!expenseData.trip_end_date) {
    errors.push('出差结束日期不能为空');
  }
  
  if (expenseData.trip_start_date && expenseData.trip_end_date) {
    const startDate = new Date(expenseData.trip_start_date);
    const endDate = new Date(expenseData.trip_end_date);
    if (startDate > endDate) {
      errors.push('出差开始日期不能晚于结束日期');
    }
  }
  
  if (!expenseData.items || !Array.isArray(expenseData.items) || expenseData.items.length === 0) {
    errors.push('必须至少有一个费用项目');
  } else {
    expenseData.items.forEach((item, index) => {
      if (!item.item_type) {
        errors.push(`第${index + 1}个费用项目的类型不能为空`);
      }
      if (!item.description || item.description.trim() === '') {
        errors.push(`第${index + 1}个费用项目的描述不能为空`);
      }
      if (!item.amount || item.amount <= 0) {
        errors.push(`第${index + 1}个费用项目的金额必须大于0`);
      }
      if (!item.date) {
        errors.push(`第${index + 1}个费用项目的日期不能为空`);
      }
    });
  }
  
  return errors;
};

router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, user_id } = req.query;
  const offset = (page - 1) * limit;

  const where = {};
  
  if (status) {
    where.status = status;
  }
  
  if (user_id) {
    where.user_id = user_id;
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
        attributes: ['id', 'name', 'employee_id', 'position_level'],
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

router.get('/:id', asyncHandler(async (req, res) => {
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
        attributes: ['id', 'name', 'employee_id', 'position_level'],
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
    return res.status(404).json({
      success: false,
      error: {
        code: 'EXPENSE_NOT_FOUND',
        message: '费用记录不存在',
      },
    });
  }

  res.json({
    success: true,
    data: expense,
  });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { user_id, total_amount, trip_start_date, trip_end_date, destination_city, trip_reason, items, status } = req.body;

  const validationErrors = validateExpenseData({
    user_id,
    total_amount,
    trip_start_date,
    trip_end_date,
    items,
  });

  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '表单数据验证失败',
        details: validationErrors,
      },
    });
  }

  const user = await User.findByPk(user_id);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: '指定的报销人不存在',
        details: { user_id },
      },
    });
  }

  const expense = await Expense.create({
    total_amount,
    trip_start_date,
    trip_end_date,
    destination_city,
    trip_reason,
    user_id,
    status: status || 'draft',
  });

  const expenseItems = items.map(item => ({
    expense_id: expense.id,
    item_type: item.item_type,
    description: item.description,
    amount: item.amount,
    date: item.date,
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
        attributes: ['id', 'name', 'employee_id', 'position_level'],
      },
    ],
  });

  res.status(201).json({
    success: true,
    data: createdExpense,
    message: '费用记录创建成功',
  });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { total_amount, trip_start_date, trip_end_date, destination_city, trip_reason, status } = req.body;

  const expense = await Expense.findOne({ where: { id } });
  if (!expense) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'EXPENSE_NOT_FOUND',
        message: '费用记录不存在',
      },
    });
  }

  await expense.update({
    total_amount,
    trip_start_date,
    trip_end_date,
    destination_city,
    trip_reason,
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
        attributes: ['id', 'name', 'employee_id', 'position_level'],
      },
    ],
  });

  res.json({
    success: true,
    data: updatedExpense,
  });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const expense = await Expense.findOne({ where: { id } });
  if (!expense) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'EXPENSE_NOT_FOUND',
        message: '费用记录不存在',
      },
    });
  }

  await expense.destroy();

  res.json({
    success: true,
    message: '费用记录删除成功',
  });
}));

// 验证费用记录
router.post('/:id/validate', asyncHandler(async (req, res) => {
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
        attributes: ['id', 'name', 'employee_id', 'position_level'],
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
      validated_by: 1,
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
    if (expense.user.position_level !== rule.position_level) {
      ruleApplicable = false;
      result.passed = true;
      result.message = '规则不适用（职位等级不匹配）';
      result.details.position_level = { expected: rule.position_level, actual: expense.user.position_level };
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

const ruleEngine = require('../services/ruleEngine');

router.post('/validate/submit', asyncHandler(async (req, res) => {
  const { expenseData, user_id } = req.body;

  const validationErrors = validateExpenseData(expenseData);
  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '表单数据验证失败',
        details: validationErrors,
      },
    });
  }

  const user = await User.findByPk(user_id, {
    attributes: ['id', 'name', 'employee_id', 'position_level', 'role'],
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: '用户不存在',
      },
    });
  }

  const cityTier = await ruleEngine.getCityTierByCityName(expenseData.destination_city);

  const validationResults = await ruleEngine.validateExpenseForm(expenseData, user);

  const overallStatus = validationResults.overall_valid ? 'approved' : 
                         (validationResults.summary.passed_items > 0 ? 'partial' : 'rejected');

  const itemsValidation = {};
  validationResults.items_validation.forEach(item => {
    const itemData = expenseData.items[item.item_index];
    const itemValidation = item.validation_results;
    const passed = itemValidation.every(r => r.passed);
    const failed = itemValidation.some(r => !r.passed);

    let status = 'passed';
    if (failed) {
      status = 'failed';
    } else if (itemValidation.some(r => r.warning)) {
      status = 'warning';
    }

    itemsValidation[item.item_index] = {
      item_index: item.item_index,
      item_type: itemData.item_type,
      description: itemData.description,
      amount: itemData.amount,
      status: status,
      validation_results: itemValidation,
      validation_message: itemValidation.length > 0 ? 
        itemValidation.find(r => !r.passed)?.message || itemValidation[0].message : 
        '验证通过',
    };
  });

  const allWarnings = validationResults.warnings.map(w => 
    typeof w === 'string' ? w : w.message || w.toString()
  );

  const allSuggestions = validationResults.suggestions.map(s =>
    typeof s === 'string' ? s : s.toString()
  );

  const report = {
    validation_id: Date.now(),
    validated_at: new Date().toISOString(),
    user_info: {
      user_id: user.id,
      user_name: user.name,
      employee_id: user.employee_id,
      position_level: user.position_level,
    },
    expense_info: {
      total_amount: expenseData.total_amount,
      total_items: expenseData.items.length,
      destination_city: expenseData.destination_city,
      city_tier: cityTier,
      trip_start_date: expenseData.trip_start_date,
      trip_end_date: expenseData.trip_end_date,
    },
    summary: {
      overall_status: overallStatus,
      total_items: validationResults.summary.total_items,
      passed_items: validationResults.summary.passed_items,
      failed_items: validationResults.summary.failed_items,
      warnings_count: allWarnings.length,
    },
    items_validation: itemsValidation,
    all_warnings: allWarnings,
    all_suggestions: allSuggestions,
    recommendations: generateRecommendations(validationResults, user),
  };

  res.json({
    success: true,
    data: report,
  });
}));

router.get('/:id/validation-history', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit = 10 } = req.query;

  const expense = await Expense.findByPk(id);
  if (!expense) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'EXPENSE_NOT_FOUND',
        message: '费用记录不存在',
      },
    });
  }

  const history = await RuleValidation.findAll({
    where: { expense_id: id },
    include: [
      {
        model: require('../models').Rule,
        as: 'rule',
        attributes: ['id', 'name', 'rule_type', 'rule_storage_type'],
      },
    ],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
  });

  res.json({
    success: true,
    data: history,
  });
}));

router.get('/:id/validation-stats', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const expense = await Expense.findByPk(id);
  if (!expense) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'EXPENSE_NOT_FOUND',
        message: '费用记录不存在',
      },
    });
  }

  const validations = await RuleValidation.findAll({
    where: { expense_id: id },
  });

  const stats = {
    total_validations: validations.length,
    passed_count: 0,
    failed_count: 0,
    total_execution_time_ms: 0,
    avg_execution_time_ms: 0,
    total_llm_calls: 0,
    validation_types: {
      structured: 0,
      natural: 0,
      hybrid: 0,
    },
    rule_stats: {},
  };

  validations.forEach(v => {
    const result = JSON.parse(v.validation_result);
    if (result.passed) {
      stats.passed_count++;
    } else {
      stats.failed_count++;
    }
    stats.total_execution_time_ms += v.execution_time_ms;
    stats.total_llm_calls += v.llm_calls_count || 0;
    stats.validation_types[v.validation_type] = (stats.validation_types[v.validation_type] || 0) + 1;

    if (!stats.rule_stats[v.rule_id]) {
      stats.rule_stats[v.rule_id] = {
        rule_id: v.rule_id,
        validation_count: 0,
        passed_count: 0,
        failed_count: 0,
        avg_execution_time_ms: 0,
      };
    }
    stats.rule_stats[v.rule_id].validation_count++;
    if (result.passed) {
      stats.rule_stats[v.rule_id].passed_count++;
    } else {
      stats.rule_stats[v.rule_id].failed_count++;
    }
    stats.rule_stats[v.rule_id].avg_execution_time_ms += v.execution_time_ms;
  });

  if (validations.length > 0) {
    stats.avg_execution_time_ms = stats.total_execution_time_ms / validations.length;
    Object.keys(stats.rule_stats).forEach(ruleId => {
      stats.rule_stats[ruleId].avg_execution_time_ms /= stats.rule_stats[ruleId].validation_count;
    });
  }

  res.json({
    success: true,
    data: stats,
  });
}));

function generateRecommendations(validationResults, user) {
  const recommendations = [];

  if (validationResults.summary.failed_items > 0) {
    recommendations.push(
      `有 ${validationResults.summary.failed_items} 项费用未通过验证，请检查并调整`
    );
  }

  if (validationResults.warnings.length > 0) {
    recommendations.push(
      `发现 ${validationResults.warnings.length} 条警告，建议在提交前处理`
    );
  }

  const highAmountItems = validationResults.items_validation.filter(item => {
    const itemData = item.validation_results.find(r => r.rule_type === 'accommodation');
    return itemData && itemData.details && itemData.details.amount && itemData.details.amount.actual > 500;
  });

  if (highAmountItems.length > 0) {
    recommendations.push(
      `部分费用金额较高，建议提供详细的报销说明或补充材料`
    );
  }

  if (user.position_level === 'executive') {
    recommendations.push(
      '作为高管人员，您的报销额度较高，请确保费用符合公司财务制度'
    );
  }

  return recommendations;
}

module.exports = router;