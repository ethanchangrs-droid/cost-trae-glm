const config = require('../config');

const callOCR = async (imageUrl) => {
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
          content: '你是一个专业的票据识别助手，能够从票据图片中提取结构化信息。请准确识别票据类型、金额、日期、商家、出发地、目的地、交通工具、座位等级等关键信息。'
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
            {
              type: 'text',
              text: `请识别这张票据并提取以下信息：
1. 票据类型（transport/accommodation/meal/other）
2. 金额（数字）
3. 日期（YYYY-MM-DD格式）
4. 商家名称
5. 如果是交通票：出发地、目的地、交通工具、座位等级、票号
6. 如果是住宿票：酒店名称、入住日期、退房日期、城市
7. 如果是餐饮票：餐厅名称、用餐时间、用餐人数

请以JSON格式返回：
{
  "item_type": "票据类型",
  "amount": 金额,
  "date": "日期",
  "merchant": "商家名称",
  "details": {
    "departure": "出发地",
    "arrival": "目的地",
    "transport": "交通工具",
    "seat_class": "座位等级",
    "ticket_number": "票号",
    "hotel_name": "酒店名称",
    "check_in_date": "入住日期",
    "check_out_date": "退房日期",
    "city": "城市",
    "restaurant_name": "餐厅名称",
    "meal_time": "用餐时间",
    "party_size": "用餐人数"
  }
}`,
            },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OCR API调用失败: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

const extractStructuredData = async (imageUrl) => {
  try {
    const ocrResponse = await callOCR(imageUrl);

    let extractedData;
    try {
      extractedData = JSON.parse(ocrResponse);
    } catch (parseError) {
      console.error('OCR结果解析失败，返回默认结构');
      extractedData = {
        item_type: 'other',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        merchant: '未知商家',
        details: {},
      };
    }

    return {
      success: true,
      data: extractedData,
      raw_response: ocrResponse,
    };
  } catch (error) {
    console.error('票据识别失败:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  extractStructuredData,
};
