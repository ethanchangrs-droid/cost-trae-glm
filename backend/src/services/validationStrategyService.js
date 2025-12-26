const config = require('../config');
const { RuleValidation } = require('../models');

async function callLLMWithPrompt(prompt, options = {}) {
  const response = await fetch(`${config.llm.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.llm.apiKey}`,
    },
    body: JSON.stringify({
      model: config.llm.model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的费用报销规则验证专家，能够准确判断费用是否符合规则要求。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
      ...options,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API调用失败: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

class ValidationStrategyService {
  constructor() {
    this.strategies = {
      'structured-only': this.validateStructuredOnly.bind(this),
      'natural-only': this.validateNaturalOnly.bind(this),
      'hybrid-strict': this.validateHybridStrict.bind(this),
      'hybrid-lenient': this.validateHybridLenient.bind(this),
      'hybrid-adaptive': this.validateHybridAdaptive.bind(this),
    };
  }

  async validateWithStrategy(itemData, rule, userLevel, cityTier, strategy = 'hybrid-adaptive') {
    const validator = this.strategies[strategy] || this.strategies['hybrid-adaptive'];
    return await validator(itemData, rule, userLevel, cityTier);
  }

  async validateStructuredOnly(itemData, rule, userLevel, cityTier) {
    const result = {
      passed: true,
      message: '结构化验证通过',
      warning: false,
      suggestions: [],
      details: { validation_type: 'structured-only' },
      llm_calls_count: 0,
    };

    try {
      if (!rule.structured_content) {
        result.passed = false;
        result.message = '缺少结构化规则内容';
        return result;
      }

      const structuredContent = JSON.parse(rule.structured_content);
      result.details.structured = structuredContent;

      if (structuredContent.max_amount && itemData.amount > structuredContent.max_amount) {
        result.passed = false;
        result.message = `费用金额超限 (${itemData.amount} > ${structuredContent.max_amount})`;
        result.warning = true;
        result.details.amount = { actual: itemData.amount, limit: structuredContent.max_amount };
        result.suggestions.push(`建议调整金额至${structuredContent.max_amount}元以下`);
      }

      if (structuredContent.min_amount && itemData.amount < structuredContent.min_amount) {
        result.passed = false;
        result.message = `费用金额低于最低标准`;
        result.warning = true;
        result.details.amount = { actual: itemData.amount, min: structuredContent.min_amount };
      }

      if (structuredContent.required_fields) {
        const missing = structuredContent.required_fields.filter(f => !itemData[f]);
        if (missing.length > 0) {
          result.passed = false;
          result.message = '缺少必填字段';
          result.warning = true;
          result.details.missing_fields = missing;
          result.suggestions.push(`请补充: ${missing.join(', ')}`);
        }
      }
    } catch (error) {
      result.passed = false;
      result.message = `验证错误: ${error.message}`;
    }

    return result;
  }

  async validateNaturalOnly(itemData, rule, userLevel, cityTier) {
    const result = {
      passed: true,
      message: '自然语言验证通过',
      warning: false,
      suggestions: [],
      details: { validation_type: 'natural-only' },
      llm_calls_count: 0,
    };

    try {
      if (!rule.natural_content) {
        result.passed = false;
        result.message = '缺少自然语言规则内容';
        return result;
      }

      const prompt = `请验证以下费用是否符合规则：

费用信息：
- 类型: ${itemData.item_type}
- 金额: ${itemData.amount}元
- 日期: ${itemData.date}
- 描述: ${itemData.description || '无'}

规则要求：
${rule.natural_content}

请返回JSON格式：
{
  "passed": true/false,
  "message": "验证结果说明",
  "warning": true/false,
  "suggestions": ["建议1", "建议2"]
}`;

      const startTime = Date.now();
      const llmResult = await callLLMWithPrompt(prompt);
      result.llm_calls_count = 1;

      let jsonContent = llmResult;
      if (jsonContent.includes('```json')) {
        jsonContent = jsonContent.replace(/```json/g, '').replace(/```/g, '').trim();
      } else if (jsonContent.includes('```')) {
        jsonContent = jsonContent.replace(/```/g, '').trim();
      }

      const parsed = JSON.parse(jsonContent);
      Object.assign(result, parsed);
      result.details.llm_response_time = Date.now() - startTime;

    } catch (error) {
      result.passed = false;
      result.message = `自然语言验证失败: ${error.message}`;
      result.suggestions.push('请联系管理员检查规则配置');
    }

    return result;
  }

  async validateHybridStrict(itemData, rule, userLevel, cityTier) {
    const result = {
      passed: true,
      message: '混合规则验证通过（严格模式）',
      warning: false,
      suggestions: [],
      details: { validation_type: 'hybrid-strict' },
      llm_calls_count: 0,
    };

    try {
      let structuredResult = { passed: true, message: '', suggestions: [] };

      if (rule.structured_content) {
        structuredResult = await this.validateStructuredOnly(itemData, rule, userLevel, cityTier);
        result.details.structured = structuredResult.details;
        result.llm_calls_count += structuredResult.llm_calls_count;
      }

      result.passed = structuredResult.passed;
      result.message = structuredResult.passed ? '混合规则验证通过' : structuredResult.message;
      result.warning = structuredResult.warning;
      result.suggestions = structuredResult.suggestions;

      if (rule.natural_content && !result.passed) {
        const prompt = `以下费用未通过结构化验证，请使用自然语言规则进一步判断：

费用信息：
- 类型: ${itemData.item_type}
- 金额: ${itemData.amount}元
- 描述: ${itemData.description || '无'}

结构化验证结果：
${structuredResult.message}

自然语言规则：
${rule.natural_content}

请判断是否存在特殊例外情况，返回JSON：
{
  "passed": true/false,
  "message": "判断说明",
  "warning": true/false,
  "suggestions": ["建议"]
}`;

        const startTime = Date.now();
        const llmResult = await callLLMWithPrompt(prompt);
        result.llm_calls_count += 1;

        let jsonContent = llmResult;
        if (jsonContent.includes('```json')) {
          jsonContent = jsonContent.replace(/```json/g, '').replace(/```/g, '').trim();
        } else if (jsonContent.includes('```')) {
          jsonContent = jsonContent.replace(/```/g, '').trim();
        }

        const parsed = JSON.parse(jsonContent);
        result.details.natural = parsed;
        result.details.llm_response_time = Date.now() - startTime;

        if (parsed.passed) {
          result.passed = true;
          result.message = '特殊例外情况允许';
          result.warning = true;
        }
      }

    } catch (error) {
      result.passed = false;
      result.message = `混合验证错误: ${error.message}`;
    }

    return result;
  }

  async validateHybridLenient(itemData, rule, userLevel, cityTier) {
    const result = {
      passed: true,
      message: '混合规则验证通过（宽松模式）',
      warning: false,
      suggestions: [],
      details: { validation_type: 'hybrid-lenient' },
      llm_calls_count: 0,
    };

    try {
      let structuredResult = { passed: false, message: '', suggestions: [] };
      let naturalResult = { passed: false, message: '', suggestions: [] };

      if (rule.structured_content) {
        structuredResult = await this.validateStructuredOnly(itemData, rule, userLevel, cityTier);
        result.details.structured = structuredResult.details;
        result.llm_calls_count += structuredResult.llm_calls_count;
      }

      if (rule.natural_content && (!structuredResult.passed || !rule.structured_content)) {
        naturalResult = await this.validateNaturalOnly(itemData, rule, userLevel, cityTier);
        result.details.natural = naturalResult.details;
        result.llm_calls_count += naturalResult.llm_calls_count;
      }

      result.passed = structuredResult.passed || naturalResult.passed;
      result.message = result.passed ? '混合规则验证通过' : '混合规则验证未通过';
      result.warning = !result.passed;
      result.suggestions = [...structuredResult.suggestions, ...naturalResult.suggestions];

    } catch (error) {
      result.passed = false;
      result.message = `混合验证错误: ${error.message}`;
    }

    return result;
  }

  async validateHybridAdaptive(itemData, rule, userLevel, cityTier) {
    const result = {
      passed: true,
      message: '混合规则验证通过（自适应模式）',
      warning: false,
      suggestions: [],
      details: { validation_type: 'hybrid-adaptive' },
      llm_calls_count: 0,
    };

    try {
      let strategy = 'hybrid-lenient';

      if (rule.validation_strategy) {
        try {
          const parsed = JSON.parse(rule.validation_strategy);
          if (parsed.mode === 'strict') {
            strategy = 'hybrid-strict';
          } else if (parsed.mode === 'lenient') {
            strategy = 'hybrid-lenient';
          }
        } catch (e) {
        }
      }

      if (rule.complexity_score >= 70) {
        strategy = 'hybrid-strict';
      } else if (rule.complexity_score >= 40) {
        strategy = 'hybrid-lenient';
      }

      const validator = this.strategies[strategy];
      const validationResult = await validator(itemData, rule, userLevel, cityTier);
      
      Object.assign(result, validationResult);
      result.details.selected_strategy = strategy;

    } catch (error) {
      result.passed = false;
      result.message = `自适应验证错误: ${error.message}`;
    }

    return result;
  }

  async saveValidationResult(expenseId, ruleId, validationResult) {
    try {
      await RuleValidation.create({
        expense_id: expenseId,
        rule_id: ruleId,
        validation_type: validationResult.details?.validation_type || 'hybrid',
        validation_result: validationResult,
        execution_time_ms: validationResult.details?.llm_response_time || 0,
        llm_calls_count: validationResult.llm_calls_count || 0,
      });
    } catch (error) {
      console.error('保存验证结果失败:', error);
    }
  }

  async getValidationPerformanceStats(ruleId, days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const validations = await RuleValidation.findAll({
        where: {
          rule_id: ruleId,
          created_at: {
            [require('sequelize').Op.gte]: startDate,
          },
        },
      });

      if (validations.length === 0) {
        return null;
      }

      const stats = {
        total_validations: validations.length,
        avg_execution_time: validations.reduce((sum, v) => sum + (v.execution_time_ms || 0), 0) / validations.length,
        avg_llm_calls: validations.reduce((sum, v) => sum + (v.llm_calls_count || 0), 0) / validations.length,
        total_llm_calls: validations.reduce((sum, v) => sum + (v.llm_calls_count || 0), 0),
      };

      return stats;
    } catch (error) {
      console.error('获取性能统计失败:', error);
      return null;
    }
  }
}

module.exports = new ValidationStrategyService();
