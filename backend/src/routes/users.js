const express = require('express');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { Op } = require('sequelize');
const { authenticate, authorize, generateToken } = require('../middleware/auth');
const { validateUser, validatePagination } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.post('/login', validateUser.login, asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ where: { username } });
  if (!user) {
    const error = new Error('用户名或密码错误');
    error.status = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }



  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    const error = new Error('用户名或密码错误');
    error.status = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  const token = generateToken(user);

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      token,
    },
  });
}));

router.post('/register', validateUser.create, asyncHandler(async (req, res) => {
  const { username, password, email, name, role = 'user', department, position_level } = req.body;

  const existingUser = await User.findOne({ where: { username } });
  if (existingUser) {
    const error = new Error('用户名已存在');
    error.status = 400;
    error.code = 'USERNAME_EXISTS';
    throw error;
  }

  if (email) {
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      const error = new Error('邮箱已存在');
      error.status = 400;
      error.code = 'EMAIL_EXISTS';
      throw error;
    }
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    username,
    password: hashedPassword,
    email,
    name,
    role,
    department,
    position_level,
  });

  const token = generateToken(user);

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      token,
    },
  });
}));

router.get('/profile', authenticate, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
}));

router.put('/profile', authenticate, validateUser.update, asyncHandler(async (req, res) => {
  const { email, name } = req.body;
  const userId = req.user.id;

  if (email && email !== req.user.email) {
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      const error = new Error('邮箱已存在');
      error.status = 400;
      error.code = 'EMAIL_EXISTS';
      throw error;
    }
  }

  await User.update(
    { email, name },
    { where: { id: userId } }
  );

  const updatedUser = await User.findByPk(userId, {
    attributes: { exclude: ['password'] }
  });

  res.json({
    success: true,
    data: {
      user: updatedUser,
    },
  });
}));

router.get('/', authenticate, authorize('admin', 'executive', 'manager'), validatePagination, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, role, is_active } = req.query;
  const offset = (page - 1) * limit;

  const where = {};
  if (search) {
    where[Op.or] = [
      { username: { [Op.like]: `%${search}%` } },
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }
  if (role) {
    where.role = role;
  }

  const { count, rows: users } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['password'] },
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['created_at', 'DESC']],
  });

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    },
  });
}));

router.get('/:id', authenticate, authorize('admin', 'executive', 'manager'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByPk(id, {
    attributes: { exclude: ['password'] }
  });

  if (!user) {
    const error = new Error('用户不存在');
    error.status = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  res.json({
    success: true,
    data: {
      user,
    },
  });
}));

router.put('/:id', authenticate, authorize('admin'), validateUser.update, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { username, email, name, role, department, position_level } = req.body;

  const user = await User.findByPk(id);
  if (!user) {
    const error = new Error('用户不存在');
    error.status = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  if (username && username !== user.username) {
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      const error = new Error('用户名已存在');
      error.status = 400;
      error.code = 'USERNAME_EXISTS';
      throw error;
    }
  }

  if (email && email !== user.email) {
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      const error = new Error('邮箱已存在');
      error.status = 400;
      error.code = 'EMAIL_EXISTS';
      throw error;
    }
  }

  await user.update({
    username,
    email,
    name,
    role,
    department,
    position_level,
  });

  const updatedUser = await User.findByPk(id, {
    attributes: { exclude: ['password'] }
  });

  res.json({
    success: true,
    data: {
      user: updatedUser,
    },
  });
}));

router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByPk(id);
  if (!user) {
    const error = new Error('用户不存在');
    error.status = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  if (user.role === 'admin') {
    const error = new Error('不能删除管理员账户');
    error.status = 400;
    error.code = 'CANNOT_DELETE_ADMIN';
    throw error;
  }

  await user.destroy();

  res.json({
    success: true,
    message: '用户删除成功',
  });
}));

module.exports = router;