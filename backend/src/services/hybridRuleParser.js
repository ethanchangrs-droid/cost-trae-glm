const config = require('../config');

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
          content: '你是一个专业的费用报销规则解析专家，能够准确将自然语言规则转换为混合规则格式。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 800,
      ...options,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API调用失败: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

class HybridRuleParser {
  constructor() {
    this.parseStrategies = {
      accommodation: this.parseAccommodationRule.bind(this),
      transport: this.parseTransportRule.bind(this),
      meal: this.parseMealRule.bind(this),
    };
  }

  async parse(naturalLanguage, ruleType) {
    const parser = this.parseStrategies[ruleType];
    
    if (parser) {
      return await parser(naturalLanguage);
    }

    return await this.parseWithLLM(naturalLanguage, ruleType);
  }

  async parseAccommodationRule(naturalLanguage) {
    const structured = {
      rule_type: 'accommodation',
      basic_conditions: {},
      special_conditions: [],
    };

    const text = naturalLanguage.toLowerCase();

    const amountMatch = naturalLanguage.match(/(\d+(\.\d+)?)\s*元/);
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1]);
      
      if (text.includes('不超过') || text.includes('限额')) {
        structured.basic_conditions.max_amount = amount;
      } else if (text.includes('不低于') || text.includes('至少')) {
        structured.basic_conditions.min_amount = amount;
      }
    }

    const cityTierMatch = naturalLanguage.match(/(一线|二线|三线|四线)城市/);
    if (cityTierMatch) {
      const tierMap = { '一线': 'tier1', '二线': 'tier2', '三线': 'tier3', '四线': 'tier4' };
      structured.basic_conditions.city_tier = tierMap[cityTierMatch[1]];
    }

    const positionMatch = naturalLanguage.match(/(普通员工|部门经理|总监|总经理)/);
    if (positionMatch) {
      const levelMap = { '普通员工': 'staff', '部门经理': 'manager', '总监': 'director', '总经理': 'executive' };
      structured.basic_conditions.position_level = levelMap[positionMatch[1]];
    }

    const unitMatch = naturalLanguage.match(/每(晚|天|夜)/);
    if (unitMatch) {
      structured.basic_conditions.unit = unitMatch[1] === '晚' || unitMatch[1] === '夜' ? 'night' : 'day';
    }

    const specialKeywords = ['特殊', '例外', '但是', '然而', '除非'];
    const hasSpecial = specialKeywords.some(kw => text.includes(kw));
    
    if (hasSpecial) {
      structured.special_conditions.push({
        type: 'exception',
        description: '存在特殊情况',
        requires_llm: true,
      });
    }

    return {
      structured,
      natural: {
        original_text: naturalLanguage,
        exceptions: this.extractExceptions(naturalLanguage),
        additional_requirements: this.extractRequirements(naturalLanguage),
      },
      validation_strategy: hasSpecial ? '先进行结构化验证，特殊情况使用LLM推理' : '使用结构化验证即可',
    };
  }

  async parseTransportRule(naturalLanguage) {
    const structured = {
      rule_type: 'transport',
      basic_conditions: {},
      special_conditions: [],
    };

    const text = naturalLanguage.toLowerCase();

    const transportTypeMatch = naturalLanguage.match(/(飞机|火车|高铁|汽车|动车|轮船)/);
    if (transportTypeMatch) {
      structured.basic_conditions.transport_type = transportTypeMatch[1];
    }

    const classMatch = naturalLanguage.match(/(经济舱|商务舱|头等舱|硬座|软座|硬卧|软卧|一等座|二等座)/);
    if (classMatch) {
      structured.basic_conditions.max_class = classMatch[1];
    }

    const amountMatch = naturalLanguage.match(/(\d+(\.\d+)?)\s*元/);
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1]);
      
      if (text.includes('不超过') || text.includes('限额')) {
        structured.basic_conditions.max_amount = amount;
      }
    }

    const distanceMatch = naturalLanguage.match(/(\d+)\s*公里/);
    if (distanceMatch) {
      structured.basic_conditions.max_distance = parseInt(distanceMatch[1]);
    }

    const positionMatch = naturalLanguage.match(/(普通员工|部门经理|总监|总经理)/);
    if (positionMatch) {
      const levelMap = { '普通员工': 'staff', '部门经理': 'manager', '总监': 'director', '总经理': 'executive' };
      structured.basic_conditions.position_level = levelMap[positionMatch[1]];
    }

    const specialKeywords = ['特殊', '例外', '但是', '然而', '除非', '紧急', '急需'];
    const hasSpecial = specialKeywords.some(kw => text.includes(kw));
    
    if (hasSpecial) {
      structured.special_conditions.push({
        type: 'exception',
        description: '存在特殊情况',
        requires_llm: true,
      });
    }

    return {
      structured,
      natural: {
        original_text: naturalLanguage,
        exceptions: this.extractExceptions(naturalLanguage),
        additional_requirements: this.extractRequirements(naturalLanguage),
      },
      validation_strategy: hasSpecial ? '先进行结构化验证，特殊情况使用LLM推理' : '使用结构化验证即可',
    };
  }

  async parseMealRule(naturalLanguage) {
    const structured = {
      rule_type: 'meal',
      basic_conditions: {},
      special_conditions: [],
    };

    const text = naturalLanguage.toLowerCase();

    const amountMatch = naturalLanguage.match(/(\d+(\.\d+)?)\s*元/);
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1]);
      
      if (text.includes('不超过') || text.includes('限额')) {
        structured.basic_conditions.max_amount = amount;
      } else if (text.includes('每日')) {
        structured.basic_conditions.daily_limit = amount;
      }
    }

    const mealTypeMatch = naturalLanguage.match(/(早餐|午餐|晚餐|宵夜)/);
    if (mealTypeMatch) {
      structured.basic_conditions.meal_type = mealTypeMatch[1];
    }

    const cityTierMatch = naturalLanguage.match(/(一线|二线|三线|四线)城市/);
    if (cityTierMatch) {
      const tierMap = { '一线': 'tier1', '二线': 'tier2', '三线': 'tier3', '四线': 'tier4' };
      structured.basic_conditions.city_tier = tierMap[cityTierMatch[1]];
    }

    const positionMatch = naturalLanguage.match(/(普通员工|部门经理|总监|总经理)/);
    if (positionMatch) {
      const levelMap = { '普通员工': 'staff', '部门经理': 'manager', '总监': 'director', '总经理': 'executive' };
      structured.basic_conditions.position_level = levelMap[positionMatch[1]];
    }

    const specialKeywords = ['特殊', '例外', '但是', '然而', '除非', '招待'];
    const hasSpecial = specialKeywords.some(kw => text.includes(kw));
    
    if (hasSpecial) {
      structured.special_conditions.push({
        type: 'exception',
        description: '存在特殊情况',
        requires_llm: true,
      });
    }

    return {
      structured,
      natural: {
        original_text: naturalLanguage,
        exceptions: this.extractExceptions(naturalLanguage),
        additional_requirements: this.extractRequirements(naturalLanguage),
      },
      validation_strategy: hasSpecial ? '先进行结构化验证，特殊情况使用LLM推理' : '使用结构化验证即可',
    };
  }

  extractExceptions(text) {
    const exceptions = [];
    
    const exceptionPatterns = [
      /(?:但|但是|然而|除了)([^。，]+)/g,
      /(?:特殊情况|例外)([^。，]+)/g,
    ];

    for (const pattern of exceptionPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        exceptions.push(match[1].trim());
      }
    }

    return exceptions.length > 0 ? exceptions : ['无特殊例外'];
  }

  extractRequirements(text) {
    const requirements = [];
    
    const requirementPatterns = [
      /(?:需要|必须|要求)([^。，]+)/g,
      /(?:提供|提交)([^。，]+)/g,
    ];

    for (const pattern of requirementPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        requirements.push(match[1].trim());
      }
    }

    return requirements.length > 0 ? requirements : ['无额外要求'];
  }

  async parseWithLLM(naturalLanguage, ruleType) {
    try {
      const prompt = `请将以下费用报销规则解析为混合规则格式：

规则描述：${naturalLanguage}
规则类型：${ruleType}

请返回JSON格式，包含结构化条件和自然语言描述：
{
  "structured": {
    "rule_type": "${ruleType}",
    "basic_conditions": {},
    "special_conditions": []
  },
  "natural": {
    "original_text": "${naturalLanguage}",
    "exceptions": [],
    "additional_requirements": []
  },
  "validation_strategy": "验证策略描述"
}`;

      const llmResult = await callLLMWithPrompt(prompt);
      let jsonContent = llmResult;

      if (jsonContent.includes('```json')) {
        jsonContent = jsonContent.replace(/```json/g, '').replace(/```/g, '').trim();
      } else if (jsonContent.includes('```')) {
        jsonContent = jsonContent.replace(/```/g, '').trim();
      }

      return JSON.parse(jsonContent);
    } catch (error) {
      throw new Error(`LLM解析失败: ${error.message}`);
    }
  }

  mergeStructuredContent(structuredContent, naturalContent) {
    let merged = {};

    try {
      if (structuredContent) {
        merged = typeof structuredContent === 'string' 
          ? JSON.parse(structuredContent) 
          : structuredContent;
      }

      if (naturalContent) {
        const parsedNatural = this.extractStructuredFromNatural(naturalContent);
        merged = { ...merged, ...parsedNatural };
      }

      return merged;
    } catch (error) {
      return structuredContent || {};
    }
  }

  extractStructuredFromNatural(naturalContent) {
    const extracted = {};
    const amountMatch = naturalContent.match(/(\d+(\.\d+)?)\s*元/);
    
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1]);
      if (naturalContent.toLowerCase().includes('不超过') || naturalContent.toLowerCase().includes('限额')) {
        extracted.max_amount = amount;
      }
    }

    return extracted;
  }
}

module.exports = new HybridRuleParser();
