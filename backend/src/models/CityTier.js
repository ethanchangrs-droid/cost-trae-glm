const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CityTier = sequelize.define('city_tiers', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  city_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'city_name',
    validate: {
      notEmpty: true,
      len: [1, 100],
    },
  },
  tier: {
    type: DataTypes.ENUM('first', 'second', 'third'),
    allowNull: false,
    validate: {
      notEmpty: true,
      isIn: [['first', 'second', 'third']],
    },
  },
}, {
  tableName: 'city_tiers',
  indexes: [
    {
      unique: true,
      fields: ['city_name'],
    },
    {
      fields: ['tier'],
    },
  ],
});

// 实例方法
CityTier.prototype.getTierLabel = function() {
  const labels = {
    first: '一线城市',
    second: '二线城市',
    third: '三线城市',
  };
  return labels[this.tier] || this.tier;
};

// 类方法
CityTier.findByCityName = function(cityName) {
  return this.findOne({ where: { city_name: cityName } });
};

CityTier.findByTier = function(tier) {
  return this.findAll({ 
    where: { tier },
    order: [['city_name', 'ASC']],
  });
};

CityTier.getAllCities = function() {
  return this.findAll({
    order: [
      ['tier', 'ASC'],
      ['city_name', 'ASC'],
    ],
  });
};

CityTier.getCityTier = function(cityName) {
  return this.findOne({ where: { city_name: cityName } })
    .then(city => city ? city.tier : null);
};

// 初始化城市数据
CityTier.initializeCities = function() {
  const cities = [
    // 一线城市
    { city_name: '北京', tier: 'first' },
    { city_name: '上海', tier: 'first' },
    { city_name: '广州', tier: 'first' },
    { city_name: '深圳', tier: 'first' },
    { city_name: '杭州', tier: 'first' },
    
    // 二线城市
    { city_name: '南京', tier: 'second' },
    { city_name: '武汉', tier: 'second' },
    { city_name: '成都', tier: 'second' },
    { city_name: '西安', tier: 'second' },
    { city_name: '郑州', tier: 'second' },
    { city_name: '重庆', tier: 'second' },
    { city_name: '天津', tier: 'second' },
    { city_name: '苏州', tier: 'second' },
    { city_name: '长沙', tier: 'second' },
    { city_name: '青岛', tier: 'second' },
    
    // 三线城市
    { city_name: '石家庄', tier: 'third' },
    { city_name: '太原', tier: 'third' },
    { city_name: '呼和浩特', tier: 'third' },
    { city_name: '沈阳', tier: 'third' },
    { city_name: '长春', tier: 'third' },
    { city_name: '哈尔滨', tier: 'third' },
    { city_name: '济南', tier: 'third' },
    { city_name: '昆明', tier: 'third' },
    { city_name: '兰州', tier: 'third' },
    { city_name: '银川', tier: 'third' },
    { city_name: '西宁', tier: 'third' },
    { city_name: '乌鲁木齐', tier: 'third' },
    { city_name: '拉萨', tier: 'third' },
    { city_name: '海口', tier: 'third' },
    { city_name: '南宁', tier: 'third' },
    { city_name: '贵阳', tier: 'third' },
    { city_name: '福州', tier: 'third' },
    { city_name: '南昌', tier: 'third' },
    { city_name: '合肥', tier: 'third' },
  ];

  return this.bulkCreate(cities, { 
    ignoreDuplicates: true,
    validate: true,
  });
};

module.exports = CityTier;