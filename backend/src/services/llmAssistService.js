const config = require('../config');

const callLLM = async (messages, options = {}) => {
  const response = await fetch(`${config.llm.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.llm.apiKey}`,
    },
    body: JSON.stringify({
      model: config.llm.model,
      messages,
      temperature: 0.5,
      max_tokens: 500,
      ...options,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API调用失败: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

const getSmartSuggestion = async (field, value, context = {}) => {
  const { item_type, city_name, user_level } = context;

  const prompt = `作为专业的费用报销助手，请根据以下信息提供智能提示：

字段：${field}
当前值：${value || '未填写'}
费用类型：${item_type || '未知'}
城市：${city_name || '未知'}
用户级别：${user_level || '未知'}

请针对该字段提供：
1. 填写建议（如有标准格式或范围限制）
2. 常见错误提醒
3. 相关字段提示

请以JSON格式回复：
{
  "suggestion": "填写建议",
  "warning": "常见错误提醒（如有）",
  "related_fields": ["相关字段列表"],
  "example": "填写示例（如有）"
}`;

  try {
    const response = await callLLM([
      {
        role: 'system',
        content: '你是一个专业的费用报销助手，熟悉各类费用的报销标准和填写规范。'
      },
      {
        role: 'user',
        content: prompt
      }
    ], { temperature: 0.3 });

    let result;
    try {
      result = JSON.parse(response);
    } catch (parseError) {
      result = {
        suggestion: response,
        warning: null,
        related_fields: [],
        example: null,
      };
    }

    return result;
  } catch (error) {
    throw new Error(`获取智能提示失败: ${error.message}`);
  }
};

const getAutofillSuggestion = async (itemType, partialData = {}) => {
  const { merchant, amount, date, city_name, user_level } = partialData;

  const prompt = `作为专业的费用报销助手，请根据以下部分信息生成自动填充建议：

费用类型：${itemType}
已提供信息：
- 商家/服务提供方：${merchant || '无'}
- 金额：${amount || '无'}
- 日期：${date || '无'}
- 城市：${city_name || '无'}
- 用户级别：${user_level || '无'}

请根据费用类型和已有信息，智能推断并填充以下字段：
1. 描述（description）
2. 明细字段（details，根据费用类型填充相关字段）
3. 合规性提示（compliance_tips）

请以JSON格式回复：
{
  "description": "智能生成的描述",
  "details": {
    "departure": "出发地（交通类）",
    "arrival": "目的地（交通类）",
    "hotel_name": "酒店名称（住宿类）",
    "restaurant_name": "餐厅名称（餐饮类）",
    "其他字段": "值"
  },
  "compliance_tips": ["合规性提示列表"]
}`;

  try {
    const response = await callLLM([
      {
        role: 'system',
        content: '你是一个专业的费用报销助手，能够根据部分信息智能推断和填充报销表单。'
      },
      {
        role: 'user',
        content: prompt
      }
    ], { temperature: 0.4 });

    let result;
    try {
      result = JSON.parse(response);
    } catch (parseError) {
      result = {
        description: response,
        details: {},
        compliance_tips: [],
      };
    }

    return result;
  } catch (error) {
    throw new Error(`获取自动填充建议失败: ${error.message}`);
  }
};

const getComplianceAdvice = async (expenseData, rules = []) => {
  const { item_type, amount, date, details, city_name, user_level } = expenseData;

  const rulesText = rules.length > 0 
    ? `适用规则：\n${rules.map(r => `- ${r.name}: ${r.description}`).join('\n')}`
    : '未提供规则信息，请根据行业标准提供建议';

  const prompt = `作为专业的费用报销助手，请分析以下费用项目的合规性并提供建议：

费用信息：
- 费用类型：${item_type}
- 金额：${amount}
- 日期：${date}
- 城市：${city_name || '未知'}
- 用户级别：${user_level || '未知'}
- 明细：${JSON.stringify(details)}

${rulesText}

请提供：
1. 合规性评估（compliance: compliant/partial_compliant/non_compliant）
2. 具体问题列表（issues）
3. 补充材料建议（additional_documents）
4. 修改建议（suggestions）
5. 风险提示（risk_warnings）

请以JSON格式回复：
{
  "compliance": "合规性评估",
  "issues": ["具体问题列表"],
  "additional_documents": ["补充材料建议"],
  "suggestions": ["修改建议"],
  "risk_warnings": ["风险提示"],
  "summary": "总体评估"
}`;

  try {
    const response = await callLLM([
      {
        role: 'system',
        content: '你是一个专业的费用报销助手，熟悉各类费用的报销标准、合规要求和常见风险。'
      },
      {
        role: 'user',
        content: prompt
      }
    ], { temperature: 0.3 });

    let result;
    try {
      result = JSON.parse(response);
    } catch (parseError) {
      result = {
        compliance: 'unknown',
        issues: ['无法解析合规性分析'],
        additional_documents: [],
        suggestions: [],
        risk_warnings: [],
        summary: response,
      };
    }

    return result;
  } catch (error) {
    throw new Error(`获取合规性建议失败: ${error.message}`);
  }
};

const parseNaturalLanguageRule = async (description, existingRules = []) => {
  const rulesText = existingRules.length > 0
    ? `现有规则：\n${existingRules.map(r => `- ${r.rule_name} (${r.rule_type}): ${r.description}`).join('\n')}`
    : '无现有规则';

  const prompt = `作为专业的费用报销规则解析专家，请将以下自然语言描述转换为结构化规则：

规则描述：
${description}

${rulesText}

费用报销规则类型：
- expense_limit: 费用总额限制
- item_limit: 单项费用限制
- city_limit: 城市等级限制
- position_limit: 职位级别限制
- custom: 自定义规则

职位级别：admin, executive, manager, employee
城市等级：tier1, tier2, tier3
费用类型：transport, accommodation, meal, other

请提取以下信息并生成结构化规则：
1. rule_name: 规则名称（简洁明确）
2. rule_type: 规则类型
3. position_level: 适用职位级别（如适用）
4. city_tier: 适用城市等级（如适用）
5. item_type: 适用费用类型（如适用）
6. conditions: 条件数组，每个条件包含 { field, operator, value }
7. actions: 动作数组，每个动作包含 { type, value }
8. description: 规则描述
9. is_active: 是否启用（true/false）

请检测是否存在规则冲突，并返回冲突列表。

请以JSON格式回复：
{
  "rule_name": "规则名称",
  "rule_type": "规则类型",
  "position_level": "职位级别或null",
  "city_tier": "城市等级或null",
  "item_type": "费用类型或null",
  "conditions": [
    {
      "field": "字段名",
      "operator": "操作符（eq/gt/lt/gte/lte/in）",
      "value": "值"
    }
  ],
  "actions": [
    {
      "type": "动作类型（limit/warn/reject）",
      "value": "值或null"
    }
  ],
  "description": "规则描述",
  "is_active": true,
  "conflicts": [
    {
      "id": "冲突规则ID",
      "conflict_type": "冲突类型",
      "conflicting_rule": "冲突规则名称",
      "description": "冲突描述"
    }
  ]
}`;

  try {
    const response = await callLLM([
      {
        role: 'system',
        content: '你是一个专业的费用报销规则解析专家，能够准确理解自然语言规则描述，将其转换为结构化规则数据，并检测潜在冲突。请直接返回JSON，不要使用Markdown代码块。'
      },
      {
        role: 'user',
        content: prompt
      }
    ], { temperature: 0.3, max_tokens: 800 });

    let jsonContent = response;

    if (jsonContent.includes('```json')) {
      jsonContent = jsonContent.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (jsonContent.includes('```')) {
      jsonContent = jsonContent.replace(/```/g, '').trim();
    }

    let result;
    try {
      result = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('JSON解析失败:', jsonContent);
      result = {
        rule_name: '未命名规则',
        rule_type: 'custom',
        position_level: null,
        city_tier: null,
        item_type: null,
        conditions: [],
        actions: [],
        description: description,
        is_active: true,
        conflicts: [],
      };
    }

    return result;
  } catch (error) {
    throw new Error(`解析自然语言规则失败: ${error.message}`);
  }
};

module.exports = {
  getSmartSuggestion,
  getAutofillSuggestion,
  getComplianceAdvice,
  parseNaturalLanguageRule,
};
