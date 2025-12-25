const { User, Expense, ExpenseItem, Rule, RuleValidation, CityTier } = require('../models');

const testDatabase = async () => {
  try {
    console.log('🧪 开始数据库功能测试...');
    
    // 测试用户查询
    console.log('\n📋 测试用户查询...');
    const users = await User.findAll();
    console.log(`✅ 找到 ${users.length} 个用户`);
    users.forEach(user => {
      console.log(`  - ${user.username} (${user.name}) - ${user.position_level}`);
    });
    
    // 测试城市查询
    console.log('\n🏙️ 测试城市查询...');
    const cities = await CityTier.findAll({ limit: 5 });
    console.log(`✅ 找到 ${cities.length} 个城市`);
    cities.forEach(city => {
      console.log(`  - ${city.city_name} (${city.getTierLabel()})`);
    });
    
    // 测试规则查询
    console.log('\n📜 测试规则查询...');
    const rules = await Rule.findAll({ limit: 5 });
    console.log(`✅ 找到 ${rules.length} 个规则`);
    rules.forEach(rule => {
      console.log(`  - ${rule.name} (${rule.getTypeLabel()})`);
    });
    
    // 测试费用查询
    console.log('\n💰 测试费用查询...');
    const expenses = await Expense.findAll();
    console.log(`✅ 找到 ${expenses.length} 个费用记录`);
    
    // 测试关联查询
    console.log('\n🔗 测试关联查询...');
    const userWithExpenses = await User.findOne({
      where: { username: 'admin' },
      include: [{
        model: Expense,
        as: 'expenses',
      }],
    });
    
    if (userWithExpenses) {
      console.log(`✅ 用户 ${userWithExpenses.username} 有 ${userWithExpenses.expenses.length} 个费用记录`);
    }
    
    // 测试规则适用性
    console.log('\n🎯 测试规则适用性...');
    const applicableRules = await Rule.findApplicableRules('accommodation', 'employee', 'first');
    console.log(`✅ 找到 ${applicableRules.length} 个适用的住宿费规则`);
    applicableRules.forEach(rule => {
      console.log(`  - ${rule.name} (复杂度: ${rule.complexity_score})`);
    });
    
    console.log('\n🎉 数据库功能测试完成！');
    
  } catch (error) {
    console.error('❌ 数据库测试失败:', error);
    throw error;
  }
};

// 如果直接运行此脚本
if (require.main === module) {
  testDatabase()
    .then(() => {
      console.log('数据库测试成功完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('数据库测试失败:', error);
      process.exit(1);
    });
}

module.exports = testDatabase;