const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { CityTier } = require('../models');
const logger = require('../utils/logger');

const router = express.Router();

// 按等级获取城市列表（需要放在 :cityName 之前）
router.get('/tier/:tier', asyncHandler(async (req, res) => {
  const { tier } = req.params;

  const cities = await CityTier.findAll({
    where: { tier },
    order: [['city_name', 'ASC']],
  });

  res.json({
    success: true,
    data: {
      tier,
      cities: cities.map(city => ({
        id: city.id,
        cityName: city.city_name,
        createdAt: city.createdAt,
        updatedAt: city.updatedAt,
      })),
      total: cities.length,
    },
  });
}));

// 根据城市名获取等级
router.get('/name/:cityName', asyncHandler(async (req, res) => {
  const { cityName } = req.params;

  const cityTier = await CityTier.findOne({
    where: { city_name: cityName },
  });

  if (!cityTier) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'CITY_NOT_FOUND',
        message: `城市 ${cityName} 未找到`,
      },
    });
  }

  res.json({
    success: true,
    data: {
      id: cityTier.id,
      cityName: cityTier.city_name,
      tier: cityTier.tier,
      createdAt: cityTier.createdAt,
      updatedAt: cityTier.updatedAt,
    },
  });
}));

// 获取所有城市等级
router.get('/', asyncHandler(async (req, res) => {
  const cityTiers = await CityTier.findAll({
    order: [['tier', 'ASC'], ['city_name', 'ASC']],
  });

  res.json({
    success: true,
    data: {
      cityTiers: cityTiers.map(tier => ({
        id: tier.id,
        cityName: tier.city_name,
        tier: tier.tier,
        createdAt: tier.createdAt,
        updatedAt: tier.updatedAt,
      })),
      total: cityTiers.length,
    },
  });
}));

module.exports = router;