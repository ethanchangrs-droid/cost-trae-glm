const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { asyncHandler } = require('../middleware/errorHandler');
const config = require('../config');
const { extractStructuredData } = require('../services/ocrService');

const callLLM = async (prompt) => {
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
          content: '你是一个专业的费用报销助手，能够基于票据识别结果生成简洁、专业的报销描述。'
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API调用失败: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

const router = express.Router();

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `receipt-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('只允许上传图片（JPEG、JPG、PNG、GIF）和文档（PDF、DOC、DOCX）文件'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter,
});

router.post('/receipt', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    const error = new Error('没有上传文件');
    error.status = 400;
    error.code = 'NO_FILE_UPLOADED';
    throw error;
  }

  const fileInfo = {
    filename: req.file.filename,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: req.file.path,
    url: `/uploads/${req.file.filename}`,
  };

  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

  const ocrResult = await extractStructuredData(imageUrl);

  let extractedData;
  let description = '';

  if (ocrResult.success) {
    extractedData = ocrResult.data;

    const descriptionPrompt = `请为以下票据识别结果生成简洁、专业的报销描述（50-100字）：

票据类型：${extractedData.item_type}
金额：${extractedData.amount}
日期：${extractedData.date}
商家：${extractedData.merchant}
详情：${JSON.stringify(extractedData.details)}`;

    try {
      description = await callLLM(descriptionPrompt);
    } catch (error) {
      console.error('LLM描述生成失败:', error);
      description = '系统自动生成的描述';
    }
  } else {
    extractedData = {
      item_type: 'other',
      description: '未识别的票据',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      merchant: '未知',
      details: {},
    };
    description = '票据识别失败，请手动填写信息';
  }

  res.json({
    success: true,
    data: {
      preview_url: `/uploads/${req.file.filename}`,
      extracted_data: extractedData,
      description: description.trim(),
    },
  });
}));

router.get('/:filename', asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(process.cwd(), 'uploads', filename);

  try {
    await fs.access(filePath);
    res.sendFile(filePath);
  } catch (error) {
    const notFoundError = new Error('文件不存在');
    notFoundError.status = 404;
    notFoundError.code = 'FILE_NOT_FOUND';
    throw notFoundError;
  }
}));

router.delete('/:filename', asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(process.cwd(), 'uploads', filename);

  try {
    await fs.unlink(filePath);
    res.json({
      success: true,
      message: '文件删除成功',
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      const notFoundError = new Error('文件不存在');
      notFoundError.status = 404;
      notFoundError.code = 'FILE_NOT_FOUND';
      throw notFoundError;
    }
    throw error;
  }
}));

module.exports = router;