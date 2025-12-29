const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const config = require('../config');
const llmAssistService = require('../services/llmAssistService');

const router = express.Router();

const callLLM = async (prompt, options = {}) => {
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
          content: '你是一个专业的费用报销助手，帮助用户处理报销相关的咨询和问题。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      ...options,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API调用失败: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

router.post('/chat', asyncHandler(async (req, res) => {
  const { message, context } = req.body;

  if (!message) {
    const error = new Error('消息内容不能为空');
    error.status = 400;
    error.code = 'MESSAGE_REQUIRED';
    throw error;
  }

  let prompt = message;
  if (context) {
    prompt = `上下文信息：${JSON.stringify(context, null, 2)}\n\n用户问题：${message}`;
  }

  try {
    const response = await callLLM(prompt);
    
    res.json({
      success: true,
      data: {
        response,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const llmError = new Error('LLM服务暂时不可用，请稍后再试');
    llmError.status = 503;
    llmError.code = 'LLM_SERVICE_ERROR';
    throw llmError;
  }
}));

router.post('/analyze-expense', asyncHandler(async (req, res) => {
  const { expense_data, rules } = req.body;

  if (!expense_data) {
    const error = new Error('费用数据不能为空');
    error.status = 400;
    error.code = 'EXPENSE_DATA_REQUIRED';
    throw error;
  }

  const prompt = `
请分析以下费用报销申请的合规性：

费用信息：
${JSON.stringify(expense_data, null, 2)}

${rules ? `适用规则：\n${JSON.stringify(rules, null, 2)}` : ''}

请提供：
1. 合规性评估（合规/不合规/部分合规）
2. 具体问题说明
3. 改进建议
4. 风险等级（低/中/高）

请以JSON格式回复：
{
  "compliance": "合规性评估",
  "issues": ["问题列表"],
  "suggestions": ["建议列表"],
  "risk_level": "风险等级",
  "summary": "总体评估"
}
`;

  try {
    const response = await callLLM(prompt, {
      temperature: 0.3,
    });
    
    let analysis;
    try {
      analysis = JSON.parse(response);
    } catch (parseError) {
      analysis = {
        compliance: 'unknown',
        issues: ['解析分析结果失败'],
        suggestions: ['请手动审核'],
        risk_level: 'medium',
        summary: response,
      };
    }

    res.json({
      success: true,
      data: {
        analysis,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const llmError = new Error('LLM分析服务暂时不可用，请稍后再试');
    llmError.status = 503;
    llmError.code = 'LLM_ANALYSIS_ERROR';
    throw llmError;
  }
}));

router.post('/generate-description', asyncHandler(async (req, res) => {
  const { expense_items, context } = req.body;

  if (!expense_items || !Array.isArray(expense_items)) {
    const error = new Error('费用项目数据不能为空');
    error.status = 400;
    error.code = 'EXPENSE_ITEMS_REQUIRED';
    throw error;
  }

  const prompt = `
请为以下费用项目生成专业的报销描述：

费用项目：
${expense_items.map(item => `- ${item.category}: ${item.description} (金额: ${item.amount})`).join('\n')}

${context ? `补充信息：${context}` : ''}

请生成简洁、专业的报销描述（50-100字）：
`;

  try {
    const description = await callLLM(prompt, {
      temperature: 0.5,
      max_tokens: 200,
    });
    
    res.json({
      success: true,
      data: {
        description: description.trim(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const llmError = new Error('LLM描述生成服务暂时不可用，请稍后再试');
    llmError.status = 503;
    llmError.code = 'LLM_GENERATION_ERROR';
    throw llmError;
  }
}));

router.post('/suggestion', asyncHandler(async (req, res) => {
  const { field, value, context } = req.body;

  if (!field) {
    const error = new Error('字段名不能为空');
    error.status = 400;
    error.code = 'FIELD_REQUIRED';
    throw error;
  }

  try {
    const suggestion = await llmAssistService.getSmartSuggestion(field, value, context);
    
    res.json({
      success: true,
      data: {
        field,
        ...suggestion,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const assistError = new Error('获取智能提示失败');
    assistError.status = 503;
    assistError.code = 'SUGGESTION_ERROR';
    throw assistError;
  }
}));

router.post('/autofill', asyncHandler(async (req, res) => {
  const { item_type, partial_data } = req.body;

  if (!item_type) {
    const error = new Error('费用类型不能为空');
    error.status = 400;
    error.code = 'ITEM_TYPE_REQUIRED';
    throw error;
  }

  try {
    const autofill = await llmAssistService.getAutofillSuggestion(item_type, partial_data);
    
    res.json({
      success: true,
      data: {
        item_type,
        ...autofill,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const assistError = new Error('获取自动填充建议失败');
    assistError.status = 503;
    assistError.code = 'AUTOFILL_ERROR';
    throw assistError;
  }
}));

router.post('/compliance', asyncHandler(async (req, res) => {
  const { expense_data, rules } = req.body;

  if (!expense_data) {
    const error = new Error('费用数据不能为空');
    error.status = 400;
    error.code = 'EXPENSE_DATA_REQUIRED';
    throw error;
  }

  try {
    const advice = await llmAssistService.getComplianceAdvice(expense_data, rules || []);
    
    res.json({
      success: true,
      data: {
        expense_data,
        ...advice,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const assistError = new Error('获取合规性建议失败');
    assistError.status = 503;
    assistError.code = 'COMPLIANCE_ERROR';
    throw assistError;
  }
}));

router.post('/parse-rule', asyncHandler(async (req, res) => {
  const { description } = req.body;

  if (!description) {
    const error = new Error('规则描述不能为空');
    error.status = 400;
    error.code = 'DESCRIPTION_REQUIRED';
    throw error;
  }

  try {
    const Rule = require('../models').Rule;

    const existingRules = await Rule.findAll({
      where: { is_active: true },
      order: [['created_at', 'DESC']],
    });

    const parsedRule = await llmAssistService.parseNaturalLanguageRule(description, existingRules);
    
    res.json({
      success: true,
      data: parsedRule,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const parseError = new Error('解析自然语言规则失败');
    parseError.status = 503;
    parseError.code = 'PARSE_ERROR';
    throw parseError;
  }
}));

module.exports = router;