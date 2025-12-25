const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { asyncHandler } = require('./errorHandler');
const config = require('../config');

const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    const error = new Error('访问令牌缺失');
    error.status = 401;
    error.code = 'TOKEN_MISSING';
    throw error;
  }

  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      const error = new Error('用户不存在');
      error.status = 401;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }



    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      const jwtError = new Error('无效的访问令牌');
      jwtError.status = 401;
      jwtError.code = 'INVALID_TOKEN';
      throw jwtError;
    } else if (error.name === 'TokenExpiredError') {
      const jwtError = new Error('访问令牌已过期');
      jwtError.status = 401;
      jwtError.code = 'TOKEN_EXPIRED';
      throw jwtError;
    }
    throw error;
  }
});

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      const error = new Error('用户未认证');
      error.status = 401;
      error.code = 'USER_NOT_AUTHENTICATED';
      throw error;
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      const error = new Error('权限不足');
      error.status = 403;
      error.code = 'INSUFFICIENT_PERMISSIONS';
      throw error;
    }

    next();
  };
};

const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (user) {
      req.user = user;
    } else {
      req.user = null;
    }
  } catch (error) {
    req.user = null;
  }

  next();
});

const generateToken = (user) => {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
  };

  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn,
  });
};

const generateRefreshToken = (user) => {
  const payload = {
    id: user.id,
    type: 'refresh',
  };

  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.refreshTokenExpiresIn,
  });
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  generateToken,
  generateRefreshToken,
};