const express = require('express');
const router = express.Router();
const config = require('../config');
const logger = require('../utils/logger');

router.get('/', (req, res) => {
  try {
    const publicConfig = config.getPublicConfig();
    res.json({
      success: true,
      data: publicConfig,
    });
  } catch (error) {
    logger.error('获取配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置失败',
      error: error.message,
    });
  }
});

router.get('/validate', (req, res) => {
  try {
    const validationResult = config.validate();
    res.json({
      success: true,
      data: validationResult,
    });
  } catch (error) {
    logger.error('验证配置失败:', error);
    res.status(500).json({
      success: false,
      message: '验证配置失败',
      error: error.message,
    });
  }
});

router.post('/reload', (req, res) => {
  try {
    const result = config.reload();
    
    if (result.success) {
      logger.info('配置已重新加载');
      res.json({
        success: true,
        message: '配置重新加载成功',
        data: {
          hash: config.getConfigHash(),
          config: config.getPublicConfig(),
        },
      });
    } else {
      logger.error('配置重新加载失败:', result.error);
      res.status(500).json({
        success: false,
        message: '配置重新加载失败',
        error: result.error,
      });
    }
  } catch (error) {
    logger.error('重新加载配置失败:', error);
    res.status(500).json({
      success: false,
      message: '重新加载配置失败',
      error: error.message,
    });
  }
});

router.get('/export', (req, res) => {
  try {
    const exportData = config.export();
    
    res.json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    logger.error('导出配置失败:', error);
    res.status(500).json({
      success: false,
      message: '导出配置失败',
      error: error.message,
    });
  }
});

router.get('/health', (req, res) => {
  try {
    const validationResult = config.validate();
    
    res.json({
      success: true,
      data: {
        status: validationResult.isValid ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        config: config.getPublicConfig(),
        validation: validationResult,
      },
    });
  } catch (error) {
    logger.error('配置健康检查失败:', error);
    res.status(500).json({
      success: false,
      message: '配置健康检查失败',
      error: error.message,
    });
  }
});

module.exports = router;
