const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

const testData = {
  users: [
    { name: '张三', employee_id: 'EMP001', level: 'employee' },
    { name: '李四', employee_id: 'EMP002', level: 'manager' },
    { name: '王五', employee_id: 'EMP003', level: 'executive' },
    { name: '赵六', employee_id: 'EMP004', level: 'employee' },
    { name: '孙七', employee_id: 'EMP005', level: 'manager' }
  ],
  cityTiers: [
    { name: '北京', tier: 1 },
    { name: '上海', tier: 1 },
    { name: '广州', tier: 1 },
    { name: '深圳', tier: 1 },
    { name: '杭州', tier: 1 },
    { name: '成都', tier: 2 },
    { name: '武汉', tier: 2 },
    { name: '西安', tier: 2 },
    { name: '南京', tier: 2 },
    { name: '重庆', tier: 2 },
    { name: '苏州', tier: 2 },
    { name: '天津', tier: 2 },
    { name: '长沙', tier: 2 },
    { name: '青岛', tier: 3 },
    { name: '大连', tier: 3 },
    { name: '厦门', tier: 3 },
    { name: '济南', tier: 3 },
    { name: '郑州', tier: 3 },
    { name: '福州', tier: 3 }
  ],
  rules: [
    {
      type: 'accommodation',
      description: '普通员工在一线城市住宿，每晚不超过400元',
      config: {
        level: 'employee',
        city_tier: 1,
        max_amount: 400
      }
    },
    {
      type: 'accommodation',
      description: '普通员工在二线城市住宿，每晚不超过300元',
      config: {
        level: 'employee',
        city_tier: 2,
        max_amount: 300
      }
    },
    {
      type: 'accommodation',
      description: '经理在一线城市住宿，每晚不超过600元',
      config: {
        level: 'manager',
        city_tier: 1,
        max_amount: 600
      }
    },
    {
      type: 'accommodation',
      description: '经理在二线城市住宿，每晚不超过500元',
      config: {
        level: 'manager',
        city_tier: 2,
        max_amount: 500
      }
    },
    {
      type: 'accommodation',
      description: '高管在一线城市住宿，每晚不超过1000元',
      config: {
        level: 'executive',
        city_tier: 1,
        max_amount: 1000
      }
    },
    {
      type: 'transportation',
      description: '普通员工只能乘坐经济舱和二等座',
      config: {
        level: 'employee',
        flight_class: 'economy',
        train_class: 'second'
      }
    },
    {
      type: 'transportation',
      description: '经理可以乘坐商务舱和一等座',
      config: {
        level: 'manager',
        flight_class: 'business',
        train_class: 'first'
      }
    },
    {
      type: 'transportation',
      description: '高管可以乘坐头等舱和商务座',
      config: {
        level: 'executive',
        flight_class: 'first',
        train_class: 'business'
      }
    },
    {
      type: 'allowance',
      description: '普通员工每日补贴100元',
      config: {
        level: 'employee',
        daily_allowance: 100
      }
    },
    {
      type: 'allowance',
      description: '经理每日补贴150元',
      config: {
        level: 'manager',
        daily_allowance: 150
      }
    },
    {
      type: 'allowance',
      description: '高管每日补贴200元',
      config: {
        level: 'executive',
        daily_allowance: 200
      }
    }
  ]
};

async function setupTestData() {
  try {
    console.log('开始初始化测试数据...');

    console.log('1. 创建用户...');
    for (const user of testData.users) {
      try {
        await axios.post(`${API_BASE}/users`, user);
        console.log(`   ✅ 用户 ${user.name} 创建成功`);
      } catch (error) {
        if (error.response?.status === 409) {
          console.log(`   ⚠️  用户 ${user.name} 已存在`);
        } else {
          console.error(`   ❌ 创建用户 ${user.name} 失败:`, error.message);
        }
      }
    }

    console.log('2. 创建城市等级...');
    for (const city of testData.cityTiers) {
      try {
        await axios.post(`${API_BASE}/city-tiers`, city);
        console.log(`   ✅ 城市 ${city.name} 创建成功`);
      } catch (error) {
        if (error.response?.status === 409) {
          console.log(`   ⚠️  城市 ${city.name} 已存在`);
        } else {
          console.error(`   ❌ 创建城市 ${city.name} 失败:`, error.message);
        }
      }
    }

    console.log('3. 创建规则...');
    for (const rule of testData.rules) {
      try {
        await axios.post(`${API_BASE}/rules`, rule);
        console.log(`   ✅ 规则 "${rule.description.substring(0, 20)}..." 创建成功`);
      } catch (error) {
        console.error(`   ❌ 创建规则失败:`, error.message);
      }
    }

    console.log('\n✅ 测试数据初始化完成!');
    console.log(`   - 用户: ${testData.users.length} 条`);
    console.log(`   - 城市: ${testData.cityTiers.length} 条`);
    console.log(`   - 规则: ${testData.rules.length} 条`);
  } catch (error) {
    console.error('❌ 初始化测试数据失败:', error.message);
    process.exit(1);
  }
}

setupTestData();
