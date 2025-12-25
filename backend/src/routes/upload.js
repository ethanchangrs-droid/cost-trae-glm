const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const config = require('../config');

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

router.post('/receipt', authenticate, upload.single('file'), asyncHandler(async (req, res) => {
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

  res.json({
    success: true,
    data: {
      file: fileInfo,
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

router.delete('/:filename', authenticate, asyncHandler(async (req, res) => {
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