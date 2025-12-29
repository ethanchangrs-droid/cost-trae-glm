const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const ConfigValidator = require('./validator');

class ConfigManager {
  constructor() {
    this.currentConfig = null;
    this.validator = null;
    this.envPath = path.join(__dirname, '../../../.env');
    this.configCache = new Map();
    this.subscribers = [];
    this.watchers = [];
  }

  initialize() {
    this.loadConfig();
    this.validator = new ConfigValidator(this.currentConfig);
    this.validateConfig();
    return this;
  }

  loadConfig() {
    const envVars = ['PORT', 'NODE_ENV', 'DB_PATH', 'JWT_SECRET', 'JWT_EXPIRES_IN', 'LLM_API_KEY', 'LLM_MODEL', 'LLM_BASE_URL', 'UPLOAD_PATH', 'MAX_FILE_SIZE', 'ALLOWED_FILE_TYPES', 'LOG_LEVEL', 'LOG_DIR', 'CORS_ORIGIN', 'RATE_LIMIT_MAX'];
    
    envVars.forEach(key => {
      delete process.env[key];
    });

    const envConfig = dotenv.config({ path: this.envPath }).parsed || {};
    
    this.currentConfig = {
      server: {
        port: parseInt(envConfig.PORT) || 3002,
        env: envConfig.NODE_ENV || 'development',
      },
      database: {
        path: envConfig.DB_PATH || path.join(__dirname, '../../../database/expense_system.db'),
      },
      llm: {
        apiKey: envConfig.LLM_API_KEY,
        model: envConfig.LLM_MODEL || 'deepseek-v3',
        baseUrl: envConfig.LLM_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      },
      upload: {
        path: envConfig.UPLOAD_PATH || path.join(__dirname, '../../../uploads'),
        maxFileSize: parseInt(envConfig.MAX_FILE_SIZE) || 10485760,
        allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
      },
      logging: {
        level: envConfig.LOG_LEVEL || 'info',
        dir: envConfig.LOG_DIR || path.join(__dirname, '../../../logs'),
      },
      cors: {
        origin: envConfig.CORS_ORIGIN ? envConfig.CORS_ORIGIN.split(',') : ['http://localhost:5173'],
        credentials: true,
      },
      rateLimit: {
        max: parseInt(envConfig.RATE_LIMIT_MAX) || 100,
      },
    };

    this.notifySubscribers();
  }

  validateConfig() {
    const result = this.validator.validate();
    
    if (!result.isValid) {
      console.error('配置验证失败:');
      result.errors.forEach(error => {
        console.error(`  [ERROR] ${error.field}: ${error.message}`);
        console.error(`    当前值: ${JSON.stringify(error.current)}`);
      });
    }

    if (result.warnings.length > 0) {
      console.warn('配置警告:');
      result.warnings.forEach(warning => {
        console.warn(`  [WARN] ${warning.field}: ${warning.message}`);
        console.warn(`    当前值: ${JSON.stringify(warning.current)}`);
      });
    }

    return result;
  }

  get(key) {
    if (!this.currentConfig) {
      throw new Error('配置未初始化，请先调用 initialize() 方法');
    }

    if (!key) {
      return this.currentConfig;
    }

    const keys = key.split('.');
    let value = this.currentConfig;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }

    return value;
  }

  set(key, value) {
    if (!this.currentConfig) {
      throw new Error('配置未初始化');
    }

    const keys = key.split('.');
    let target = this.currentConfig;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in target) || typeof target[k] !== 'object') {
        target[k] = {};
      }
      target = target[k];
    }

    const lastKey = keys[keys.length - 1];
    const oldValue = target[lastKey];
    target[lastKey] = value;

    if (this.validator) {
      this.validator.config = this.currentConfig;
    }

    this.notifySubscribers(key, oldValue, value);
    return this;
  }

  reload() {
    try {
      const oldConfig = JSON.parse(JSON.stringify(this.currentConfig));
      this.loadConfig();
      this.validateConfig();
      return { success: true, oldConfig, newConfig: this.currentConfig };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  watchEnv(callback) {
    if (!fs.existsSync(this.envPath)) {
      console.warn(`.env 文件不存在: ${this.envPath}`);
      return;
    }

    const watcher = fs.watch(this.envPath, (eventType) => {
      if (eventType === 'change') {
        console.log('检测到 .env 文件变更，重新加载配置...');
        const result = this.reload();
        if (callback) {
          callback(result);
        }
      }
    });

    this.watchers.push(watcher);
    console.log(`已启用配置文件监听: ${this.envPath}`);
  }

  stopWatching() {
    this.watchers.forEach(watcher => watcher.close());
    this.watchers = [];
  }

  subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new Error('回调函数必须是一个函数');
    }
    this.subscribers.push(callback);
  }

  unsubscribe(callback) {
    const index = this.subscribers.indexOf(callback);
    if (index > -1) {
      this.subscribers.splice(index, 1);
    }
  }

  notifySubscribers(key, oldValue, newValue) {
    this.subscribers.forEach(callback => {
      try {
        callback(key, oldValue, newValue);
      } catch (error) {
        console.error('配置订阅者回调执行失败:', error);
      }
    });
  }

  getConfigHash() {
    return require('crypto')
      .createHash('md5')
      .update(JSON.stringify(this.currentConfig))
      .digest('hex');
  }

  exportConfig() {
    return {
      timestamp: new Date().toISOString(),
      config: JSON.parse(JSON.stringify(this.currentConfig)),
      hash: this.getConfigHash(),
    };
  }

  validateChange(key, value) {
    const tempConfig = JSON.parse(JSON.stringify(this.currentConfig));
    const keys = key.split('.');
    let target = tempConfig;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in target) || typeof target[k] !== 'object') {
        target[k] = {};
      }
      target = target[k];
    }

    target[keys[keys.length - 1]] = value;
    
    const tempManager = new ConfigManager();
    tempManager.currentConfig = tempConfig;
    return tempManager.validateConfig();
  }

  getPublicConfig() {
    return {
      server: {
        port: this.get('server.port'),
        env: this.get('server.env'),
      },
      app: {
        version: '1.0.0',
        title: '费用报销系统',
      },
      features: {
        upload: true,
        llm: true,
        ruleEngine: true,
      },
    };
  }
}

module.exports = ConfigManager;
