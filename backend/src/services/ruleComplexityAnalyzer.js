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
          content: '你是一个专业的费用报销规则分析专家，能够准确分析规则复杂度并提供建议。'
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

class RuleComplexityAnalyzer {
  constructor() {
    this.complexityFactors = {
      ruleLength: { weight: 0.2, threshold: 50 },
      conditionCount: { weight: 0.3, threshold: 3 },
      specialKeywords: { weight: 0.25, keywords: ['特殊', '例外', '但是', '然而', '除非', '其他', '额外', '特殊情况'] },
      quantityKeywords: { weight: 0.15, keywords: ['多个', '至少', '不超过', '限额', '限制', '上限', '下限'] },
      timeKeywords: { weight: 0.1, keywords: ['每天', '每月', '每年', '每周', '临时', '长期', '短期'] },
    };
  }

  analyzeComplexity(naturalLanguage) {
    const analysis = {
      score: 0,
      details: {},
      recommendation: 'structured',
      reason: '',
      factors: {},
    };

    const text = naturalLanguage.toLowerCase();

    for (const [factorName, config] of Object.entries(this.complexityFactors)) {
      const factorScore = this.calculateFactorScore(factorName, config, text, naturalLanguage);
      analysis.factors[factorName] = factorScore;
      analysis.score += factorScore * config.weight;
    }

    analysis.score = Math.min(100, Math.round(analysis.score));

    this.setRecommendation(analysis, naturalLanguage);

    return analysis;
  }

  calculateFactorScore(factorName, config, text, originalText) {
    switch (factorName) {
      case 'ruleLength':
        return Math.min(100, Math.round((originalText.length / config.threshold) * 50));

      case 'conditionCount':
        const conditions = originalText.match(/[，,、；;]/g) || [];
        return Math.min(100, (conditions.length + 1) * 20);

      case 'specialKeywords':
        const specialCount = config.keywords.filter(kw => text.includes(kw)).length;
        return Math.min(100, specialCount * 30);

      case 'quantityKeywords':
        const quantityCount = config.keywords.filter(kw => text.includes(kw)).length;
        return Math.min(100, quantityCount * 20);

      case 'timeKeywords':
        const timeCount = config.keywords.filter(kw => text.includes(kw)).length;
        return Math.min(100, timeCount * 25);

      default:
        return 0;
    }
  }

  setRecommendation(analysis, naturalLanguage) {
    const { score, factors } = analysis;

    if (score >= 70) {
      analysis.recommendation = 'hybrid';
      analysis.reason = '规则包含复杂条件和特殊要求，建议使用混合模式以兼顾精确性和灵活性';
    } else if (score >= 40) {
      analysis.recommendation = 'natural';
      analysis.reason = '规则描述较为复杂，建议使用自然语言模式以保持灵活性';
    } else {
      analysis.recommendation = 'structured';
      analysis.reason = '规则描述简单明确，适合结构化存储以提高验证效率';
    }
  }

  async analyzeWithLLM(naturalLanguage) {
    try {
      const prompt = `请分析以下费用报销规则的复杂程度：

规则描述：${naturalLanguage}

请从以下维度分析并返回JSON格式：
1. 复杂度分数（0-100）
2. 推荐的存储类型
3. 分析原因
4. 规则类型
5. 适用角色
6. 城市等级

返回格式：
{
  "complexity_score": 数字,
  "recommendation": "structured" | "natural" | "hybrid",
  "reason": "分析原因",
  "rule_type": "accommodation" | "transport" | "meal",
  "position_level": "staff" | "manager" | "executive" | "all",
  "city_tier": "tier1" | "tier2" | "tier3" | "all"
}`;

      const llmResult = await callLLMWithPrompt(prompt);
      let jsonContent = llmResult;

      if (jsonContent.includes('```json')) {
        jsonContent = jsonContent.replace(/```json/g, '').replace(/```/g, '').trim();
      } else if (jsonContent.includes('```')) {
        jsonContent = jsonContent.replace(/```/g, '').trim();
      }

      const parsed = JSON.parse(jsonContent);

      return {
        method: 'llm',
        score: parsed.complexity_score || 50,
        recommendation: parsed.recommendation || 'structured',
        reason: parsed.reason || '',
        rule_type: parsed.rule_type,
        position_level: parsed.position_level,
        city_tier: parsed.city_tier,
      };
    } catch (error) {
      return this.analyzeComplexity(naturalLanguage);
    }
  }

  compareAnalysis(naturalLanguage) {
    const heuristicResult = this.analyzeComplexity(naturalLanguage);

    return {
      primary: heuristicResult,
      details: heuristicResult,
    };
  }
}

module.exports = new RuleComplexityAnalyzer();
