const { Rule, CityTier, User } = require('../models');
const { Op } = require('sequelize');

class RuleEngine {
  constructor() {
    this.ruleCache = null;
    this.cacheExpiry = null;
    this.cacheDuration = 5 * 60 * 1000;
  }

  async getActiveRules() {
    const now = Date.now();
    
    if (this.ruleCache && this.cacheExpiry && now < this.cacheExpiry) {
      return this.ruleCache;
    }

    const rules = await Rule.findAll({
      where: { is_active: true },
      order: [
        ['complexity_score', 'DESC'],
        ['created_at', 'DESC'],
      ],
    });

    this.ruleCache = rules;
    this.cacheExpiry = now + this.cacheDuration;
    
    return rules;
  }

  clearCache() {
    this.ruleCache = null;
    this.cacheExpiry = null;
  }

  async validateExpenseItem(itemData, userLevel, cityTier) {
    const results = [];
    const rules = await this.getActiveRules();
    
    const applicableRules = rules.filter(rule => 
      rule.rule_type === itemData.item_type && 
      this.isRuleApplicable(rule, userLevel, cityTier)
    );

    for (const rule of applicableRules) {
      const startTime = Date.now();
      const result = await this.validateItemWithRule(itemData, rule, userLevel, cityTier);
      
      results.push({
        rule_id: rule.id,
        rule_name: rule.name,
        rule_type: rule.rule_type,
        validation_type: rule.rule_storage_type,
        execution_time_ms: Date.now() - startTime,
        ...result,
      });
    }

    return {
      item_type: itemData.item_type,
      item_index: itemData.item_index || 0,
      validation_results: results,
      overall_valid: results.every(r => r.passed),
      warnings: results.filter(r => r.warning),
      suggestions: results.flatMap(r => r.suggestions || []),
    };
  }

  async validateExpenseForm(expenseData, userData) {
    const results = {
      items_validation: [],
      overall_valid: true,
      warnings: [],
      suggestions: [],
      summary: {
        total_items: expenseData.items.length,
        passed_items: 0,
        failed_items: 0,
      },
    };

    for (let i = 0; i < expenseData.items.length; i++) {
      const itemResult = await this.validateExpenseItem(
        { ...expenseData.items[i], item_index: i },
        userData.position_level,
        expenseData.destination_city
      );
      
      results.items_validation.push(itemResult);
      
      if (itemResult.overall_valid) {
        results.summary.passed_items++;
      } else {
        results.summary.failed_items++;
        results.overall_valid = false;
      }
      
      results.warnings.push(...itemResult.warnings);
      results.suggestions.push(...itemResult.suggestions);
    }

    return results;
  }

  async validateItemWithRule(itemData, rule, userLevel, cityTier) {
    try {
      switch (rule.rule_storage_type) {
        case 'structured':
          return await this.validateWithStructuredRule(itemData, rule);
        case 'natural':
          return await this.validateWithNaturalRule(itemData, rule);
        case 'hybrid':
          return await this.validateWithHybridRule(itemData, rule, userLevel, cityTier);
        default:
          return {
            passed: true,
            message: '未知规则类型',
            warning: false,
            suggestions: [],
          };
      }
    } catch (error) {
      return {
        passed: false,
        message: `验证错误: ${error.message}`,
        warning: true,
        suggestions: ['请联系管理员检查规则配置'],
      };
    }
  }

  async validateWithStructuredRule(itemData, rule) {
    const result = {
      passed: true,
      message: '验证通过',
      warning: false,
      suggestions: [],
      details: {},
    };

    try {
      const structuredContent = JSON.parse(rule.structured_content);
      
      if (structuredContent.max_amount && itemData.amount > structuredContent.max_amount) {
        result.passed = false;
        result.message = `费用金额超限`;
        result.warning = true;
        result.details.amount = {
          actual: itemData.amount,
          limit: structuredContent.max_amount,
          exceed: itemData.amount - structuredContent.max_amount,
        };
        result.suggestions.push(
          `建议将${itemData.item_type}金额调整至${structuredContent.max_amount}元以下`,
          `或提供额外的审批说明`
        );
      }

      if (structuredContent.min_amount && itemData.amount < structuredContent.min_amount) {
        result.passed = false;
        result.message = `费用金额低于最低标准`;
        result.warning = true;
        result.details.amount = {
          actual: itemData.amount,
          min_limit: structuredContent.min_amount,
        };
        result.suggestions.push(`请确认费用金额是否正确`);
      }

      if (structuredContent.max_days && itemData.date) {
        const itemDate = new Date(itemData.date);
        const today = new Date();
        const daysDiff = Math.floor((today - itemDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff > structuredContent.max_days) {
          result.passed = false;
          result.message = `费用日期超出报销期限`;
          result.warning = true;
          result.details.days = {
            actual: daysDiff,
            limit: structuredContent.max_days,
          };
          result.suggestions.push(`请提供报销延迟原因说明`);
        }
      }

      if (structuredContent.required_fields && Array.isArray(structuredContent.required_fields)) {
        const missingFields = structuredContent.required_fields.filter(field => !itemData[field]);
        if (missingFields.length > 0) {
          result.passed = false;
          result.message = `缺少必填字段`;
          result.warning = true;
          result.details.missing_fields = missingFields;
          result.suggestions.push(`请补充以下信息: ${missingFields.join(', ')}`);
        }
      }

      if (structuredContent.allowed_values && structuredContent.field) {
        const fieldValue = itemData[structuredContent.field];
        if (fieldValue && !structuredContent.allowed_values.includes(fieldValue)) {
          result.passed = false;
          result.message = `字段值不在允许范围内`;
          result.warning = true;
          result.details.field = {
            name: structuredContent.field,
            actual: fieldValue,
            allowed: structuredContent.allowed_values,
          };
          result.suggestions.push(`该字段允许的值: ${structuredContent.allowed_values.join(', ')}`);
        }
      }

    } catch (error) {
      result.passed = false;
      result.message = `规则解析错误: ${error.message}`;
      result.warning = true;
      result.suggestions.push('请联系管理员检查规则配置');
    }

    return result;
  }

  async validateWithNaturalRule(itemData, rule) {
    const result = {
      passed: true,
      message: '自然语言规则验证通过',
      warning: false,
      suggestions: [],
      details: {
        note: '自然语言规则验证使用简化版本，建议升级为结构化或混合规则',
      },
    };

    const naturalContent = rule.natural_content.toLowerCase();
    
    if (naturalContent.includes('不超过') || naturalContent.includes('限额')) {
      const amountMatch = naturalContent.match(/(\d+(\.\d+)?)\s*元/);
      if (amountMatch) {
        const limitAmount = parseFloat(amountMatch[1]);
        if (itemData.amount > limitAmount) {
          result.passed = false;
          result.message = `费用金额超限`;
          result.warning = true;
          result.details.amount = {
            actual: itemData.amount,
            limit: limitAmount,
          };
          result.suggestions.push(`建议将${itemData.item_type}金额调整至${limitAmount}元以下`);
        }
      }
    }

    if (naturalContent.includes('必须') || naturalContent.includes('要求')) {
      if (!itemData.description || itemData.description.trim() === '') {
        result.passed = false;
        result.message = `缺少必要的描述信息`;
        result.warning = true;
        result.suggestions.push(`请补充${itemData.item_type}的详细描述`);
      }
    }

    if (naturalContent.includes('发票') && !itemData.details) {
      result.passed = false;
      result.message = `缺少发票信息`;
      result.warning = true;
      result.suggestions.push(`请补充发票编号、开具日期等发票信息`);
    }

    return result;
  }

  async validateWithHybridRule(itemData, rule, userLevel, cityTier) {
    const result = {
      passed: true,
      message: '混合规则验证通过',
      warning: false,
      suggestions: [],
      details: {},
    };

    try {
      let structuredResult = { passed: true, message: '', suggestions: [] };
      let naturalResult = { passed: true, message: '', suggestions: [] };

      if (rule.structured_content) {
        structuredResult = await this.validateWithStructuredRule(itemData, rule);
      }

      if (rule.natural_content) {
        naturalResult = await this.validateWithNaturalRule(itemData, rule);
      }

      result.passed = structuredResult.passed && naturalResult.passed;
      result.message = result.passed ? '混合规则验证通过' : '混合规则验证未通过';
      result.warning = structuredResult.warning || naturalResult.warning;
      result.details = {
        structured: structuredResult.details,
        natural: naturalResult.details,
      };
      result.suggestions = [
        ...structuredResult.suggestions,
        ...naturalResult.suggestions,
      ];

      if (rule.validation_strategy) {
        const strategy = JSON.parse(rule.validation_strategy);
        if (strategy.mode === 'strict') {
          result.passed = structuredResult.passed;
        } else if (strategy.mode === 'lenient') {
          result.passed = structuredResult.passed || naturalResult.passed;
        }
      }

    } catch (error) {
      result.passed = false;
      result.message = `混合规则验证错误: ${error.message}`;
      result.warning = true;
      result.suggestions.push('请联系管理员检查规则配置');
    }

    return result;
  }

  isRuleApplicable(rule, userLevel, cityTier) {
    if (!rule.is_active) return false;
    
    if (rule.position_level && rule.position_level !== userLevel) {
      return false;
    }
    
    if (rule.city_tier) {
      if (!cityTier || cityTier !== rule.city_tier) {
        return false;
      }
    }
    
    return true;
  }

  async getValidationSummary(expenseData, userData) {
    const validationResult = await this.validateExpenseForm(expenseData, userData);
    
    return {
      overall_valid: validationResult.overall_valid,
      total_items: validationResult.summary.total_items,
      passed_items: validationResult.summary.passed_items,
      failed_items: validationResult.summary.failed_items,
      total_amount: expenseData.items.reduce((sum, item) => sum + item.amount, 0),
      warnings_count: validationResult.warnings.length,
      suggestions_count: validationResult.suggestions.length,
      items: validationResult.items_validation.map(item => ({
        item_type: item.item_type,
        item_index: item.item_index,
        valid: item.overall_valid,
        rules_checked: item.validation_results.length,
        rules_passed: item.validation_results.filter(r => r.passed).length,
        warnings: item.warnings.length,
      })),
    };
  }

  async getCityTierByCityName(cityName) {
    const city = await CityTier.findOne({
      where: { city_name: cityName },
    });
    return city ? city.tier : null;
  }
}

module.exports = new RuleEngine();
