const express = require('express');
const { Rule, RuleValidation } = require('../models');
const { sequelize } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRule, validateId, validatePagination } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const ruleComplexityAnalyzer = require('../services/ruleComplexityAnalyzer');
const hybridRuleParser = require('../services/hybridRuleParser');
const validationStrategyService = require('../services/validationStrategyService');
const rulePerformanceMonitor = require('../services/rulePerformanceMonitor');

const router = express.Router();

router.get('/', validatePagination, asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    rule_type, 
    is_active,
    rule_storage_type,
    position_level,
    city_tier,
    sort_by = 'created_at',
    sort_order = 'DESC'
  } = req.query;
  const offset = (page - 1) * limit;

  const where = {};
  if (rule_type) {
    where.rule_type = rule_type;
  }
  if (is_active !== undefined) {
    where.is_active = is_active === 'true';
  }
  if (rule_storage_type) {
    where.rule_storage_type = rule_storage_type;
  }
  if (position_level) {
    where.position_level = position_level;
  }
  if (city_tier) {
    where.city_tier = city_tier;
  }

  const validSortFields = ['created_at', 'name', 'complexity_score', 'rule_type'];
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
  const sortOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const { count, rows: rules } = await Rule.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [[sortField, sortOrder]],
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

router.get('/:id', validateId, asyncHandler(async (req, res) => {
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

router.post('/', validateRule.create, asyncHandler(async (req, res) => {
  const { 
    name, 
    description, 
    rule_type, 
    rule_storage_type = 'structured',
    structured_content,
    natural_content,
    position_level,
    city_tier,
    is_active = true 
  } = req.body;

  const rule = await Rule.create({
    name,
    description,
    rule_type,
    rule_storage_type,
    structured_content,
    natural_content,
    position_level,
    city_tier,
    is_active,
  });

  res.status(201).json({
    success: true,
    data: {
      rule,
    },
  });
}));

router.put('/:id', validateId, validateRule.update, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { 
    name, 
    description, 
    rule_type, 
    rule_storage_type,
    structured_content,
    natural_content,
    position_level,
    city_tier,
    complexity_score,
    validation_strategy,
    is_active 
  } = req.body;

  const rule = await Rule.findByPk(id);
  if (!rule) {
    const error = new Error('规则不存在');
    error.status = 404;
    error.code = 'RULE_NOT_FOUND';
    throw error;
  }

  const updateData = {
    name,
    description,
    rule_type,
    is_active,
  };

  if (rule_storage_type !== undefined) {
    updateData.rule_storage_type = rule_storage_type;
  }
  if (structured_content !== undefined) {
    updateData.structured_content = structured_content;
  }
  if (natural_content !== undefined) {
    updateData.natural_content = natural_content;
  }
  if (position_level !== undefined) {
    updateData.position_level = position_level;
  }
  if (city_tier !== undefined) {
    updateData.city_tier = city_tier;
  }
  if (complexity_score !== undefined) {
    updateData.complexity_score = complexity_score;
  }
  if (validation_strategy !== undefined) {
    updateData.validation_strategy = validation_strategy;
  }

  await rule.update(updateData);

  const updatedRule = await Rule.findByPk(id);

  res.json({
    success: true,
    data: {
      rule: updatedRule,
    },
  });
}));

router.delete('/:id', validateId, asyncHandler(async (req, res) => {
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

router.get('/categories/list', asyncHandler(async (req, res) => {
  const categories = [
    { value: 'accommodation', label: '住宿费', description: '住宿费用相关规则' },
    { value: 'transport', label: '交通费', description: '交通费用相关规则' },
    { value: 'meal', label: '餐费', description: '餐费相关规则' },
  ];

  res.json({
    success: true,
    data: { categories },
  });
}));

router.get('/stats/summary', asyncHandler(async (req, res) => {
  const [
    totalRules,
    activeRules,
    inactiveRules,
    typeStats,
    storageStats,
  ] = await Promise.all([
    Rule.count(),
    Rule.count({ where: { is_active: true } }),
    Rule.count({ where: { is_active: false } }),
    Rule.findAll({
      attributes: [
        'rule_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['rule_type'],
    }),
    Rule.findAll({
      attributes: [
        'rule_storage_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['rule_storage_type'],
    }),
  ]);

  res.json({
    success: true,
    data: {
      summary: {
        total: totalRules,
        active: activeRules,
        inactive: inactiveRules,
      },
      by_type: typeStats,
      by_storage: storageStats,
    },
  });
}));

router.post('/analyze-complexity', asyncHandler(async (req, res) => {
  const { natural_language } = req.body;

  if (!natural_language) {
    const error = new Error('缺少自然语言规则描述');
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const analysis = ruleComplexityAnalyzer.compareAnalysis(natural_language);

  res.json({
    success: true,
    data: {
      complexity_analysis: analysis,
    },
  });
}));

router.post('/parse-hybrid', asyncHandler(async (req, res) => {
  const { natural_language, rule_type } = req.body;

  if (!natural_language) {
    const error = new Error('缺少自然语言规则描述');
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  if (!rule_type) {
    const error = new Error('缺少规则类型');
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const parsed = await hybridRuleParser.parse(natural_language, rule_type);

  res.json({
    success: true,
    data: {
      parsed_rule: parsed,
    },
  });
}));

router.post('/validate-hybrid', asyncHandler(async (req, res) => {
  const { expense_id, rule_ids, strategy } = req.body;

  if (!rule_ids || !Array.isArray(rule_ids) || rule_ids.length === 0) {
    const error = new Error('缺少规则ID');
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const rules = await Rule.findAll({
    where: {
      id: rule_ids,
      is_active: true,
    },
  });

  if (rules.length === 0) {
    const error = new Error('未找到可用的规则');
    error.status = 404;
    error.code = 'RULES_NOT_FOUND';
    throw error;
  }

  const validationResults = [];

  for (const rule of rules) {
    const startTime = rulePerformanceMonitor.recordValidationStart(rule.id);
    
    try {
      const result = await validationStrategyService.validateWithStrategy(
        { item_type: rule.rule_type, ...req.body },
        rule,
        req.body.user_level,
        req.body.city_tier,
        strategy
      );

      const validationEnd = rulePerformanceMonitor.recordValidationEnd(
        rule.id,
        result.details?.validation_type || 'hybrid',
        result.llm_calls_count || 0
      );

      validationResults.push({
        rule_id: rule.id,
        rule_name: rule.name,
        rule_type: rule.rule_type,
        rule_storage_type: rule.rule_storage_type,
        validation_result: result,
        performance: validationEnd,
      });

      if (expense_id) {
        await validationStrategyService.saveValidationResult(expense_id, rule.id, result);
      }
    } catch (error) {
      validationResults.push({
        rule_id: rule.id,
        rule_name: rule.name,
        error: error.message,
        validation_result: {
          passed: false,
          message: `验证错误: ${error.message}`,
        },
      });
    }
  }

  const overallValid = validationResults.every(r => r.validation_result.passed);

  res.json({
    success: true,
    data: {
      overall_valid: overallValid,
      validation_results: validationResults,
      summary: {
        total_rules: validationResults.length,
        passed_rules: validationResults.filter(r => r.validation_result.passed).length,
        failed_rules: validationResults.filter(r => !r.validation_result.passed).length,
        avg_execution_time: Math.round(
          validationResults.reduce((sum, r) => sum + (r.performance?.execution_time_ms || 0), 0) / validationResults.length
        ),
        total_llm_calls: validationResults.reduce((sum, r) => sum + (r.performance?.llm_calls_count || 0), 0),
      },
    },
  });
}));

router.get('/:id/performance', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const rule = await Rule.findByPk(id);
  if (!rule) {
    const error = new Error('规则不存在');
    error.status = 404;
    error.code = 'RULE_NOT_FOUND';
    throw error;
  }

  const report = await rulePerformanceMonitor.getPerformanceReport(id);

  res.json({
    success: true,
    data: report,
  });
}));

router.get('/performance/all', asyncHandler(async (req, res) => {
  const { days = 7 } = req.query;

  const systemStats = await rulePerformanceMonitor.getSystemPerformanceStats(parseInt(days));
  const rulesMetrics = await rulePerformanceMonitor.getAllRulesMetrics();

  res.json({
    success: true,
    data: {
      system_stats: systemStats,
      rules_metrics: rulesMetrics,
    },
  });
}));

module.exports = router;