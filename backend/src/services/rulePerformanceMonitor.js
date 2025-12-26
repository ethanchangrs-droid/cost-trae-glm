const { Rule, RuleValidation } = require('../models');
const { Op } = require('sequelize');

class RulePerformanceMonitor {
  constructor() {
    this.metricsCache = new Map();
    this.cacheExpiry = new Map();
    this.cacheDuration = 5 * 60 * 1000;
  }

  async getRuleMetrics(ruleId, forceRefresh = false) {
    const cacheKey = `rule_${ruleId}`;
    const now = Date.now();

    if (!forceRefresh && this.metricsCache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey);
      if (now < expiry) {
        return this.metricsCache.get(cacheKey);
      }
    }

    const metrics = await this.calculateRuleMetrics(ruleId);
    
    this.metricsCache.set(cacheKey, metrics);
    this.cacheExpiry.set(cacheKey, now + this.cacheDuration);

    return metrics;
  }

  async calculateRuleMetrics(ruleId) {
    const validations = await RuleValidation.findAll({
      where: { rule_id: ruleId },
      order: [['created_at', 'DESC']],
      limit: 1000,
    });

    if (validations.length === 0) {
      return {
        rule_id: ruleId,
        total_validations: 0,
        avg_execution_time: 0,
        max_execution_time: 0,
        min_execution_time: 0,
        avg_llm_calls: 0,
        total_llm_calls: 0,
        validation_types: {},
        last_validation_at: null,
        performance_trend: 'unknown',
      };
    }

    const executionTimes = validations.map(v => v.execution_time_ms || 0);
    const llmCalls = validations.map(v => v.llm_calls_count || 0);
    const typeCounts = {};

    validations.forEach(v => {
      const type = v.validation_type;
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const recentValidations = validations.slice(0, Math.min(50, validations.length));
    const recentAvgTime = recentValidations.reduce((sum, v) => sum + (v.execution_time_ms || 0), 0) / recentValidations.length;
    const olderValidations = validations.slice(50);
    const olderAvgTime = olderValidations.length > 0 
      ? olderValidations.reduce((sum, v) => sum + (v.execution_time_ms || 0), 0) / olderValidations.length
      : recentAvgTime;

    let performanceTrend = 'stable';
    if (recentAvgTime > olderAvgTime * 1.2) {
      performanceTrend = 'degrading';
    } else if (recentAvgTime < olderAvgTime * 0.8) {
      performanceTrend = 'improving';
    }

    return {
      rule_id: ruleId,
      total_validations: validations.length,
      avg_execution_time: Math.round(executionTimes.reduce((a, b) => a + b, 0) / validations.length),
      max_execution_time: Math.max(...executionTimes),
      min_execution_time: Math.min(...executionTimes),
      avg_llm_calls: Math.round(llmCalls.reduce((a, b) => a + b, 0) / validations.length),
      total_llm_calls: llmCalls.reduce((a, b) => a + b, 0),
      validation_types: typeCounts,
      last_validation_at: validations[0].created_at,
      performance_trend: performanceTrend,
    };
  }

  async getAllRulesMetrics() {
    const rules = await Rule.findAll({
      where: { is_active: true },
      attributes: ['id', 'name', 'rule_type', 'complexity_score'],
    });

    const metrics = await Promise.all(
      rules.map(async (rule) => {
        const ruleMetrics = await this.getRuleMetrics(rule.id);
        return {
          ...rule.dataValues,
          ...ruleMetrics,
        };
      })
    );

    return metrics.sort((a, b) => b.avg_execution_time - a.avg_execution_time);
  }

  async getSystemPerformanceStats(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const validations = await RuleValidation.findAll({
      where: {
        created_at: { [Op.gte]: startDate },
      },
    });

    if (validations.length === 0) {
      return {
        period_days: days,
        total_validations: 0,
        avg_execution_time: 0,
        total_llm_calls: 0,
        avg_llm_calls: 0,
        validation_by_type: {},
      };
    }

    const executionTimes = validations.map(v => v.execution_time_ms || 0);
    const llmCalls = validations.map(v => v.llm_calls_count || 0);
    const typeCounts = {};

    validations.forEach(v => {
      const type = v.validation_type;
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    return {
      period_days: days,
      total_validations: validations.length,
      avg_execution_time: Math.round(executionTimes.reduce((a, b) => a + b, 0) / validations.length),
      total_llm_calls: llmCalls.reduce((a, b) => a + b, 0),
      avg_llm_calls: Math.round(llmCalls.reduce((a, b) => a + b, 0) / validations.length),
      validation_by_type: typeCounts,
    };
  }

  async getPerformanceReport(ruleId) {
    const rule = await Rule.findByPk(ruleId);
    if (!rule) {
      throw new Error('规则不存在');
    }

    const metrics = await this.getRuleMetrics(ruleId);
    const ruleData = rule.dataValues;

    const recommendations = this.generateRecommendations(ruleData, metrics);

    return {
      rule: ruleData,
      metrics: metrics,
      recommendations: recommendations,
    };
  }

  generateRecommendations(rule, metrics) {
    const recommendations = [];

    if (metrics.avg_execution_time > 2000) {
      recommendations.push({
        type: 'performance',
        level: 'high',
        message: `规则平均验证时间过长 (${metrics.avg_execution_time}ms)`,
        suggestion: '建议优化规则结构或减少LLM调用次数',
      });
    }

    if (metrics.avg_llm_calls > 1.5) {
      recommendations.push({
        type: 'cost',
        level: 'high',
        message: `规则平均LLM调用次数过多 (${metrics.avg_llm_calls})`,
        suggestion: '建议转换为结构化规则以降低成本',
      });
    }

    if (metrics.performance_trend === 'degrading') {
      recommendations.push({
        type: 'trend',
        level: 'medium',
        message: '规则性能呈下降趋势',
        suggestion: '建议检查规则配置或数据库索引',
      });
    }

    if (rule.complexity_score >= 70 && rule.rule_storage_type !== 'hybrid') {
      recommendations.push({
        type: 'optimization',
        level: 'medium',
        message: '规则复杂度高但未使用混合模式',
        suggestion: '建议转换为混合模式以提高灵活性',
      });
    }

    if (rule.complexity_score < 40 && rule.rule_storage_type !== 'structured') {
      recommendations.push({
        type: 'optimization',
        level: 'low',
        message: '规则复杂度低但未使用结构化模式',
        suggestion: '建议转换为结构化模式以提高性能',
      });
    }

    return recommendations;
  }

  recordValidationStart(ruleId) {
    const startTime = Date.now();
    this.validationStartTimes = this.validationStartTimes || new Map();
    this.validationStartTimes.set(ruleId, startTime);
    return startTime;
  }

  recordValidationEnd(ruleId, validationType, llmCalls = 0) {
    const endTime = Date.now();
    const startTime = this.validationStartTimes?.get(ruleId) || endTime;
    const executionTime = endTime - startTime;

    return {
      rule_id: ruleId,
      execution_time_ms: executionTime,
      validation_type: validationType,
      llm_calls_count: llmCalls,
    };
  }

  clearCache(ruleId = null) {
    if (ruleId) {
      const cacheKey = `rule_${ruleId}`;
      this.metricsCache.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);
    } else {
      this.metricsCache.clear();
      this.cacheExpiry.clear();
    }
  }
}

module.exports = new RulePerformanceMonitor();
