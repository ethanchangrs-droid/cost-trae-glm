const { body, param, query, validationResult } = require('express-validator');
const { asyncHandler } = require('./errorHandler');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('数据验证失败');
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    error.details = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value,
    }));
    throw error;
  }
  next();
};

const validateUser = {
  create: [
    body('username')
      .isLength({ min: 3, max: 50 })
      .withMessage('用户名长度必须在3-50个字符之间')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('用户名只能包含字母、数字和下划线'),
    body('password')
      .isLength({ min: 6, max: 100 })
      .withMessage('密码长度必须在6-100个字符之间'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('邮箱格式不正确')
      .normalizeEmail(),
    body('full_name')
      .optional()
      .isLength({ max: 100 })
      .withMessage('姓名长度不能超过100个字符'),
    body('role')
      .optional()
      .isIn(['employee', 'manager', 'executive', 'admin'])
      .withMessage('角色必须是 employee、manager、executive 或 admin'),
    handleValidationErrors,
  ],
  
  update: [
    body('username')
      .optional()
      .isLength({ min: 3, max: 50 })
      .withMessage('用户名长度必须在3-50个字符之间')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('用户名只能包含字母、数字和下划线'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('邮箱格式不正确')
      .normalizeEmail(),
    body('full_name')
      .optional()
      .isLength({ max: 100 })
      .withMessage('姓名长度不能超过100个字符'),
    body('role')
      .optional()
      .isIn(['employee', 'manager', 'executive', 'admin'])
      .withMessage('角色必须是 employee、manager、executive 或 admin'),
    handleValidationErrors,
  ],
  
  login: [
    body('username')
      .notEmpty()
      .withMessage('用户名不能为空'),
    body('password')
      .notEmpty()
      .withMessage('密码不能为空'),
    handleValidationErrors,
  ],
};

const validateExpense = {
  create: [
    body('title')
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage('报销标题长度必须在1-200个字符之间'),
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('报销描述长度不能超过1000个字符'),
    body('total_amount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('总金额必须是非负数'),
    body('trip_start_date')
      .optional()
      .isISO8601()
      .withMessage('出差开始日期格式不正确'),
    body('trip_end_date')
      .optional()
      .isISO8601()
      .withMessage('出差结束日期格式不正确'),
    body('expense_date')
      .optional()
      .isISO8601()
      .withMessage('报销日期格式不正确'),
    body('destination_city')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('目的地城市名称长度必须在1-100个字符之间'),
    body('purpose')
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage('出差目的长度必须在1-200个字符之间'),
    body('status')
      .optional()
      .isIn(['draft', 'submitted', 'approved', 'rejected'])
      .withMessage('状态必须是 draft、submitted、approved 或 rejected'),
    body('items')
      .optional()
      .isArray()
      .withMessage('费用项目必须是数组'),
    body('items.*.item_type')
      .optional()
      .isIn(['transport', 'accommodation', 'meal', 'entertainment', 'office', 'other'])
      .withMessage('费用类别必须是 transport、accommodation、meal、entertainment、office 或 other'),
    body('items.*.amount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('费用金额必须是非负数'),
    body('items.*.description')
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage('费用描述长度必须在1-200个字符之间'),
    handleValidationErrors,
  ],
  
  update: [
    body('title')
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage('报销标题长度必须在1-200个字符之间'),
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('报销描述长度不能超过1000个字符'),
    body('total_amount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('总金额必须是非负数'),
    body('expense_date')
      .optional()
      .isISO8601()
      .withMessage('报销日期格式不正确'),
    body('destination_city')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('城市名称长度必须在1-100个字符之间'),
    body('status')
      .optional()
      .isIn(['draft', 'submitted', 'approved', 'rejected'])
      .withMessage('状态必须是 draft、submitted、approved 或 rejected'),
    body('items')
      .optional()
      .isArray()
      .withMessage('费用项目必须是数组'),
    handleValidationErrors,
  ],
};

const validateRule = {
  create: [
    body('name')
      .isLength({ min: 1, max: 200 })
      .withMessage('规则名称长度必须在1-200个字符之间'),
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('规则描述长度不能超过1000个字符'),
    body('rule_type')
      .isIn(['structured', 'natural_language'])
      .withMessage('规则类型必须是 structured 或 natural_language'),
    body('rule_content')
      .notEmpty()
      .withMessage('规则内容不能为空'),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('激活状态必须是布尔值'),
    handleValidationErrors,
  ],
  
  update: [
    body('name')
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage('规则名称长度必须在1-200个字符之间'),
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('规则描述长度不能超过1000个字符'),
    body('rule_type')
      .optional()
      .isIn(['structured', 'natural_language'])
      .withMessage('规则类型必须是 structured 或 natural_language'),
    body('rule_content')
      .optional()
      .notEmpty()
      .withMessage('规则内容不能为空'),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('激活状态必须是布尔值'),
    handleValidationErrors,
  ],
};

const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID必须是正整数'),
  handleValidationErrors,
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须在1-100之间'),
  handleValidationErrors,
];

module.exports = {
  validateUser,
  validateExpense,
  validateRule,
  validateId,
  validatePagination,
  handleValidationErrors,
};