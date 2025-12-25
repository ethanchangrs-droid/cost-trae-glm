const { User, Rule } = require('../models');
const bcrypt = require('bcryptjs');

const seed = async () => {
  try {
    console.log('🌱 开始种子数据填充...');
    
    // 创建测试用户
    const testUsers = [
      {
        username: 'employee1',
        password: await bcrypt.hash('password123', 10),
        email: 'employee1@example.com',
        name: '张三',
        employee_id: 'EMP001',
        department: '销售部',
        position_level: 'employee',
        role: 'user',
      },
      {
        username: 'manager1',
        password: await bcrypt.hash('password123', 10),
        email: 'manager1@example.com',
        name: '李四',
        employee_id: 'MGR001',
        department: '销售部',
        position_level: 'manager',
        role: 'user',
      },
      {
        username: 'executive1',
        password: await bcrypt.hash('password123', 10),
        email: 'executive1@example.com',
        name: '王五',
        employee_id: 'EXE001',
        department: '管理层',
        position_level: 'executive',
        role: 'user',
      },
    ];
    
    for (const userData of testUsers) {
      const [user, created] = await User.findOrCreate({
        where: { username: userData.username },
        defaults: userData,
      });
      if (created) {
        console.log(`✅ 创建测试用户: ${user.username}`);
      }
    }
    
    // 创建基础规则
    const baseRules = [
      {
        name: '一线城市住宿费标准',
        rule_storage_type: 'structured',
        rule_type: 'accommodation',
        position_level: 'employee',
        city_tier: 'first',
        complexity_score: 10,
        structured_content: JSON.stringify({
          max_amount: 500,
          currency: 'CNY',
          description: '一线城市员工住宿费每日最高500元',
        }),
        validation_strategy: 'structured',
        is_active: true,
      },
      {
        name: '二线城市住宿费标准',
        rule_storage_type: 'structured',
        rule_type: 'accommodation',
        position_level: 'employee',
        city_tier: 'second',
        complexity_score: 10,
        structured_content: JSON.stringify({
          max_amount: 400,
          currency: 'CNY',
          description: '二线城市员工住宿费每日最高400元',
        }),
        validation_strategy: 'structured',
        is_active: true,
      },
      {
        name: '三线城市住宿费标准',
        rule_storage_type: 'structured',
        rule_type: 'accommodation',
        position_level: 'employee',
        city_tier: 'third',
        complexity_score: 10,
        structured_content: JSON.stringify({
          max_amount: 300,
          currency: 'CNY',
          description: '三线城市员工住宿费每日最高300元',
        }),
        validation_strategy: 'structured',
        is_active: true,
      },
      {
        name: '经理级住宿费标准',
        rule_storage_type: 'structured',
        rule_type: 'accommodation',
        position_level: 'manager',
        complexity_score: 10,
        structured_content: JSON.stringify({
          max_amount: 800,
          currency: 'CNY',
          description: '经理级住宿费每日最高800元',
        }),
        validation_strategy: 'structured',
        is_active: true,
      },
      {
        name: '高管级住宿费标准',
        rule_storage_type: 'structured',
        rule_type: 'accommodation',
        position_level: 'executive',
        complexity_score: 10,
        structured_content: JSON.stringify({
          max_amount: 1200,
          currency: 'CNY',
          description: '高管级住宿费每日最高1200元',
        }),
        validation_strategy: 'structured',
        is_active: true,
      },
      {
        name: '交通费标准',
        rule_storage_type: 'structured',
        rule_type: 'transport',
        complexity_score: 10,
        structured_content: JSON.stringify({
          max_amount: 1000,
          currency: 'CNY',
          description: '单次交通费最高1000元',
        }),
        validation_strategy: 'structured',
        is_active: true,
      },
      {
        name: '餐费标准',
        rule_storage_type: 'structured',
        rule_type: 'meal',
        complexity_score: 10,
        structured_content: JSON.stringify({
          max_amount_per_day: 200,
          currency: 'CNY',
          description: '每日餐费最高200元',
        }),
        validation_strategy: 'structured',
        is_active: true,
      },
      {
        name: '住宿费自然语言规则',
        rule_storage_type: 'natural',
        rule_type: 'accommodation',
        complexity_score: 30,
        natural_content: '住宿费用需要符合公司差旅标准，一线城市不超过500元/天，二线城市不超过400元/天，三线城市不超过300元/天。经理级可享受800元/天标准，高管级可享受1200元/天标准。',
        validation_strategy: 'natural',
        is_active: true,
      },
    ];
    
    for (const ruleData of baseRules) {
      const [rule, created] = await Rule.findOrCreate({
        where: { 
          name: ruleData.name,
          rule_type: ruleData.rule_type,
        },
        defaults: ruleData,
      });
      if (created) {
        console.log(`✅ 创建规则: ${rule.name}`);
      }
    }
    
    console.log('🎉 种子数据填充完成！');
    
  } catch (error) {
    console.error('❌ 种子数据填充失败:', error);
    throw error;
  }
};

// 如果直接运行此脚本
if (require.main === module) {
  seed()
    .then(() => {
      console.log('种子数据填充成功完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('种子数据填充失败:', error);
      process.exit(1);
    });
}

module.exports = seed;