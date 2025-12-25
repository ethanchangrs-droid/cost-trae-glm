const { sequelize, CityTier } = require('../models');
const bcrypt = require('bcryptjs');

const migrate = async () => {
  try {
    console.log('🔄 开始数据库迁移...');
    
    // 同步数据库结构
    await sequelize.sync({ force: false });
    console.log('✅ 数据库表结构同步完成');
    
    // 初始化城市数据
    await CityTier.initializeCities();
    console.log('✅ 城市数据初始化完成');
    
    // 创建默认管理员用户
    const User = require('../models/User');
    const adminExists = await User.findOne({ where: { username: 'admin' } });
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@example.com',
        name: '系统管理员',
        employee_id: 'ADMIN001',
        department: 'IT',
        position_level: 'executive',
        role: 'admin',
      });
      console.log('✅ 默认管理员用户创建完成 (用户名: admin, 密码: admin123)');
    }
    
    console.log('🎉 数据库迁移完成！');
    
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error);
    throw error;
  }
};

// 如果直接运行此脚本
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('迁移成功完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('迁移失败:', error);
      process.exit(1);
    });
}

module.exports = migrate;