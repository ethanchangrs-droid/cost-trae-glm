const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('users', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [3, 50],
    },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [6, 255],
    },
  },
  email: {
    type: DataTypes.STRING(100),
    validate: {
      isEmail: true,
    },
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100],
    },
  },
  employee_id: {
    type: DataTypes.STRING(50),
    unique: true,
    field: 'employee_id',
  },
  department: {
    type: DataTypes.STRING(100),
  },
  position_level: {
    type: DataTypes.ENUM('employee', 'manager', 'executive'),
    allowNull: false,
    defaultValue: 'employee',
    field: 'position_level',
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    allowNull: false,
    defaultValue: 'user',
  },
}, {
  tableName: 'users',
  indexes: [
    {
      unique: true,
      fields: ['username'],
    },
    {
      unique: true,
      fields: ['employee_id'],
    },
  ],
});

// 实例方法
User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

// 类方法
User.findByUsername = function(username) {
  return this.findOne({ where: { username } });
};

User.findByEmployeeId = function(employeeId) {
  return this.findOne({ where: { employee_id: employeeId } });
};

module.exports = User;