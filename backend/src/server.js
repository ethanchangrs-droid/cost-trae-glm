const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { sequelize } = require('./config/database');
const { CityTier } = require('./models');

const startServer = async () => {
  try {
    logger.info('正在启动服务器...');
    
    await sequelize.authenticate();
    logger.info('数据库连接成功');
    
    if (config.server.env === 'development') {
      await sequelize.sync({ force: true });
      logger.info('数据库模型同步完成');
      
      await CityTier.initializeCities();
      logger.info('城市数据初始化完成');
    }
    
    const server = app.listen(config.server.port, () => {
      logger.info(`服务器启动成功`);
      logger.info(`环境: ${config.server.env}`);
      logger.info(`端口: ${config.server.port}`);
      logger.info(`健康检查: http://localhost:${config.server.port}/health`);
      logger.info(`API信息: http://localhost:${config.server.port}/api/info`);
    });
    
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`端口 ${config.server.port} 已被占用`);
      } else {
        logger.error('服务器启动失败:', error);
      }
      process.exit(1);
    });
    
    return server;
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = startServer;