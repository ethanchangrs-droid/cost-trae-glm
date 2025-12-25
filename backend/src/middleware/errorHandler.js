const logger = require('../utils/logger');
const config = require('../config');

const notFound = (req, res, next) => {
  const error = new Error(`未找到路径: ${req.originalUrl}`);
  error.status = 404;
  error.code = 'NOT_FOUND';
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  logger.error('错误处理中间件:', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    error.message = '数据验证失败';
    error.details = messages;
  } else if (err.name === 'CastError') {
    error.status = 400;
    error.code = 'INVALID_ID';
    error.message = '无效的ID格式';
  } else if (err.code === 11000) {
    error.status = 400;
    error.code = 'DUPLICATE_ENTRY';
    error.message = '数据已存在';
  } else if (err.name === 'JsonWebTokenError') {
    error.status = 401;
    error.code = 'INVALID_TOKEN';
    error.message = '无效的访问令牌';
  } else if (err.name === 'TokenExpiredError') {
    error.status = 401;
    error.code = 'TOKEN_EXPIRED';
    error.message = '访问令牌已过期';
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    error.status = 400;
    error.code = 'DUPLICATE_ENTRY';
    error.message = '数据已存在';
    error.details = err.errors.map(e => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err.name === 'SequelizeValidationError') {
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    error.message = '数据验证失败';
    error.details = err.errors.map(e => ({
      field: e.path,
      message: e.message,
      value: e.value,
    }));
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    error.status = 400;
    error.code = 'FOREIGN_KEY_CONSTRAINT';
    error.message = '外键约束错误';
  } else if (err.name === 'SequelizeDatabaseError') {
    error.status = 500;
    error.code = 'DATABASE_ERROR';
    error.message = '数据库操作错误';
  }

  const status = error.status || 500;
  const code = error.code || 'INTERNAL_SERVER_ERROR';

  const response = {
    success: false,
    error: {
      code,
      message: error.message || '服务器内部错误',
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
    }
  };

  if (error.details) {
    response.error.details = error.details;
  }

  if (config.server.env === 'development') {
    response.error.stack = error.stack;
  }

  res.status(status).json(response);
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  notFound,
  errorHandler,
  asyncHandler,
};