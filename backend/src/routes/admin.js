const express = require('express');
const { Expense, ExpenseItem, User, RuleValidation, Rule } = require('../models');
const { Op } = require('sequelize');
const { asyncHandler, logger } = require('../middleware/errorHandler');
const csv = require('csv-writer');

const router = express.Router();

router.get('/stats', asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;

  const where = {};
  if (start_date || end_date) {
    where.created_at = {};
    if (start_date) {
      where.created_at[Op.gte] = start_date;
    }
    if (end_date) {
      where.created_at[Op.lte] = end_date;
    }
  }

  const totalExpenses = await Expense.count({ where });
  const totalAmount = await Expense.sum('total_amount', { where }) || 0;
  const approvedExpenses = await Expense.count({ where: { ...where, status: 'approved' } });
  const rejectedExpenses = await Expense.count({ where: { ...where, status: 'rejected' } });
  const pendingExpenses = await Expense.count({ where: { ...where, status: 'pending' } });

  const statusDistribution = await Expense.findAll({
    attributes: ['status', [Expense.sequelize.fn('COUNT', '*'), 'count']],
    where,
    group: ['status'],
  });

  const itemTypeDistribution = await ExpenseItem.findAll({
    attributes: ['item_type', [ExpenseItem.sequelize.fn('SUM', ExpenseItem.sequelize.col('amount')), 'total_amount']],
    include: [{
      model: Expense,
      as: 'expense',
      where,
      required: true,
    }],
    group: ['item_type'],
  });

  const topUsers = await Expense.findAll({
    attributes: [
      'user_id',
      [Expense.sequelize.fn('COUNT', '*'), 'expense_count'],
      [Expense.sequelize.fn('SUM', Expense.sequelize.col('total_amount')), 'total_amount'],
    ],
    where,
    include: [{
      model: User,
      as: 'user',
      attributes: ['name', 'position_level'],
    }],
    group: ['user_id'],
    order: [[Expense.sequelize.fn('SUM', Expense.sequelize.col('total_amount')), 'DESC']],
    limit: 10,
  });

  res.json({
    summary: {
      total_expenses: totalExpenses,
      total_amount: parseFloat(totalAmount.toFixed(2)),
      approved_expenses: approvedExpenses,
      rejected_expenses: rejectedExpenses,
      pending_expenses: pendingExpenses,
    },
    status_distribution: statusDistribution.map(item => ({
      status: item.status,
      count: parseInt(item.dataValues.count),
    })),
    item_type_distribution: itemTypeDistribution.map(item => ({
      item_type: item.item_type,
      total_amount: parseFloat(item.dataValues.total_amount.toFixed(2)),
    })),
    top_users: topUsers.map(item => ({
      user_id: item.user_id,
      user_name: item.user?.name,
      position_level: item.user?.position_level,
      expense_count: parseInt(item.dataValues.expense_count),
      total_amount: parseFloat(item.dataValues.total_amount.toFixed(2)),
    })),
  });
}));

router.get('/expenses', asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    user_id,
    user_name,
    start_date,
    end_date,
    min_amount,
    max_amount,
    sort_by = 'created_at',
    sort_order = 'DESC',
  } = req.query;

  const offset = (page - 1) * limit;

  const where = {};

  if (status) {
    where.status = status;
  }

  if (user_id) {
    where.user_id = user_id;
  }

  if (start_date || end_date) {
    where.trip_start_date = {};
    if (start_date) {
      where.trip_start_date[Op.gte] = start_date;
    }
    if (end_date) {
      where.trip_start_date[Op.lte] = end_date;
    }
  }

  if (min_amount || max_amount) {
    where.total_amount = {};
    if (min_amount) {
      where.total_amount[Op.gte] = parseFloat(min_amount);
    }
    if (max_amount) {
      where.total_amount[Op.lte] = parseFloat(max_amount);
    }
  }

  const includeOptions = [
    {
      model: User,
      as: 'user',
      attributes: ['id', 'name', 'position_level'],
    },
    {
      model: ExpenseItem,
      as: 'items',
      attributes: ['id', 'item_type', 'description', 'amount', 'date', 'details'],
    },
  ];

  if (user_name) {
    includeOptions[0].where = {
      name: {
        [Op.like]: `%${user_name}%`,
      },
    };
    includeOptions[0].required = true;
  }

  const validSortFields = ['created_at', 'total_amount', 'trip_start_date', 'updated_at'];
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
  const sortOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const { count, rows } = await Expense.findAndCountAll({
    where,
    include: includeOptions,
    order: [[sortField, sortOrder]],
    limit: parseInt(limit),
    offset: parseInt(offset),
  });

  const expenses = rows.map(expense => ({
    expense_id: expense.expense_id,
    user: expense.user,
    status: expense.status,
    trip_start_date: expense.trip_start_date,
    trip_end_date: expense.trip_end_date,
    destination_city: expense.destination_city,
    trip_reason: expense.trip_reason,
    project_name: expense.project_name,
    total_amount: parseFloat(expense.total_amount.toFixed(2)),
    item_count: expense.items?.length || 0,
    created_at: expense.created_at,
    updated_at: expense.updated_at,
    items: expense.items,
  }));

  res.json({
    expenses,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(count / limit),
    },
  });
}));

router.get('/expenses/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const expense = await Expense.findByPk(id, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'position_level'],
      },
      {
        model: ExpenseItem,
        as: 'items',
        attributes: ['id', 'item_type', 'description', 'amount', 'date', 'details'],
      },
      {
        model: RuleValidation,
        as: 'validations',
        attributes: ['id', 'rule_id', 'validation_type', 'validation_result', 'execution_time_ms', 'created_at'],
        include: [
          {
            model: Rule,
            as: 'rule',
            attributes: ['name', 'rule_type'],
          },
        ],
      },
    ],
  });

  if (!expense) {
    return res.status(404).json({ error: '费用记录不存在' });
  }

  const validations = expense.validations || [];
  const parsedValidations = validations.map(v => {
    let resultSummary = { passed: false, message: '', details: {} };
    try {
      const result = JSON.parse(v.validation_result);
      resultSummary = {
        passed: result.passed || false,
        message: result.message || '',
        details: result.details || {},
      };
    } catch (e) {
      resultSummary = {
        passed: false,
        message: v.validation_result,
        details: {},
      };
    }
    return { ...v.dataValues, ...resultSummary };
  });

  const passedCount = parsedValidations.filter(v => v.passed).length;
  const failedCount = parsedValidations.length - passedCount;

  res.json({
    expense: {
      expense_id: expense.expense_id,
      user: expense.user,
      status: expense.status,
      trip_start_date: expense.trip_start_date,
      trip_end_date: expense.trip_end_date,
      destination_city: expense.destination_city,
      trip_reason: expense.trip_reason,
      project_name: expense.project_name,
      total_amount: parseFloat(expense.total_amount.toFixed(2)),
      description: expense.description,
      created_at: expense.created_at,
      updated_at: expense.updated_at,
      items: expense.items,
    },
    validations: {
      total: validations.length,
      passed: passedCount,
      failed: failedCount,
      details: parsedValidations.map(v => ({
        validation_id: v.id,
        rule_id: v.rule_id,
        rule_name: v.rule?.name,
        rule_type: v.rule?.rule_type,
        validation_type: v.validation_type,
        passed: v.passed,
        message: v.message,
        details: v.details,
        execution_time_ms: v.execution_time_ms,
        created_at: v.created_at,
      })),
    },
  });
}));

router.get('/export/expenses', asyncHandler(async (req, res) => {
  const {
    status,
    user_id,
    user_name,
    start_date,
    end_date,
    min_amount,
    max_amount,
  } = req.query;

  const where = {};

  if (status) {
    where.status = status;
  }

  if (user_id) {
    where.user_id = user_id;
  }

  if (start_date || end_date) {
    where.trip_start_date = {};
    if (start_date) {
      where.trip_start_date[Op.gte] = start_date;
    }
    if (end_date) {
      where.trip_start_date[Op.lte] = end_date;
    }
  }

  if (min_amount || max_amount) {
    where.total_amount = {};
    if (min_amount) {
      where.total_amount[Op.gte] = parseFloat(min_amount);
    }
    if (max_amount) {
      where.total_amount[Op.lte] = parseFloat(max_amount);
    }
  }

  const includeOptions = [
    {
      model: User,
      as: 'user',
      attributes: ['id', 'name', 'position_level'],
    },
    {
      model: ExpenseItem,
      as: 'items',
      attributes: ['id', 'item_type', 'description', 'amount', 'date', 'details'],
    },
  ];

  if (user_name) {
    includeOptions[0].where = {
      name: {
        [Op.like]: `%${user_name}%`,
      },
    };
    includeOptions[0].required = true;
  }

  const expenses = await Expense.findAll({
    where,
    include: includeOptions,
    order: [['created_at', 'DESC']],
  });

  const statusMap = {
    draft: '草稿',
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
  };

  const csvData = expenses.map(expense => {
    const user = expense.user || {};
    const items = expense.items || [];
    const itemSummary = items.map(i => `${i.item_type}: ${i.amount}元`).join('; ');

    return {
      '报销单ID': expense.expense_id,
      '报销人': user.name || '',
      '职级': user.position_level || '',
      '状态': statusMap[expense.status] || expense.status,
      '开始日期': expense.trip_start_date || '',
      '结束日期': expense.trip_end_date || '',
      '目的地': expense.destination_city || '',
      '出差事由': expense.trip_reason || '',
      '项目名称': expense.project_name || '',
      '总金额': expense.total_amount.toFixed(2),
      '费用项目数': items.length,
      '费用项目汇总': itemSummary,
      '描述': expense.description || '',
      '创建时间': expense.created_at,
      '更新时间': expense.updated_at,
    };
  });

  const headers = [
    { id: '报销单ID', title: '报销单ID' },
    { id: '报销人', title: '报销人' },
    { id: '职级', title: '职级' },
    { id: '状态', title: '状态' },
    { id: '开始日期', title: '开始日期' },
    { id: '结束日期', title: '结束日期' },
    { id: '目的地', title: '目的地' },
    { id: '出差事由', title: '出差事由' },
    { id: '项目名称', title: '项目名称' },
    { id: '总金额', title: '总金额' },
    { id: '费用项目数', title: '费用项目数' },
    { id: '费用项目汇总', title: '费用项目汇总' },
    { id: '描述', title: '描述' },
    { id: '创建时间', title: '创建时间' },
    { id: '更新时间', title: '更新时间' },
  ];

  const fileName = `费用记录导出_${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

  const createCsvWriter = require('csv-writer').createObjectCsvStringifier;
  const csvWriter = createCsvWriter({
    header: headers,
  });

  const csvHeader = '\uFEFF' + csvWriter.getHeaderString();
  const csvRecords = csvWriter.stringifyRecords(csvData);

  res.send(csvHeader + csvRecords);
}));

router.get('/validations', asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    passed,
    rule_id,
    start_date,
    end_date,
  } = req.query;

  const offset = (page - 1) * limit;

  const where = {};

  if (rule_id) {
    where.rule_id = rule_id;
  }

  if (start_date || end_date) {
    where.created_at = {};
    if (start_date) {
      where.created_at[Op.gte] = start_date;
    }
    if (end_date) {
      where.created_at[Op.lte] = end_date;
    }
  }

  let passedFilter = null;
  if (passed !== undefined) {
    passedFilter = passed === 'true';
  }

  const { count, rows } = await RuleValidation.findAndCountAll({
    where,
    include: [
      {
        model: Rule,
        as: 'rule',
        attributes: ['name', 'rule_type'],
      },
      {
        model: Expense,
        as: 'expense',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'position_level'],
          },
        ],
      },
    ],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset),
  });

  let validations = rows.map(v => {
    let resultSummary = { passed: false, message: '', details: {} };
    try {
      const result = JSON.parse(v.validation_result);
      resultSummary = {
        passed: result.passed || false,
        message: result.message || '',
        details: result.details || {},
      };
    } catch (e) {
      resultSummary = {
        passed: false,
        message: v.validation_result,
        details: {},
      };
    }
    return {
      validation_id: v.id,
      rule_id: v.rule_id,
      rule_name: v.rule?.name,
      rule_type: v.rule?.rule_type,
      validation_type: v.validation_type,
      expense_id: v.expense_id,
      user_name: v.expense?.user?.name,
      passed: resultSummary.passed,
      message: resultSummary.message,
      details: resultSummary.details,
      execution_time_ms: v.execution_time_ms,
      created_at: v.created_at,
    };
  });

  if (passedFilter !== null) {
    validations = validations.filter(v => v.passed === passedFilter);
  }

  res.json({
    validations,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(count / limit),
    },
  });
}));

module.exports = router;
