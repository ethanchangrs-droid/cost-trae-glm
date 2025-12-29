const dotenv = require('dotenv');
const path = require('path');
const ConfigManager = require('./manager');

// 加载环境变量
dotenv.config();

const configManager = new ConfigManager();
configManager.initialize();

const config = {
  get(key) {
    return configManager.get(key);
  },

  set(key, value) {
    return configManager.set(key, value);
  },

  reload() {
    return configManager.reload();
  },

  validate() {
    return configManager.validateConfig();
  },

  export() {
    return configManager.exportConfig();
  },

  getPublicConfig() {
    return configManager.getPublicConfig();
  },

  subscribe(callback) {
    return configManager.subscribe(callback);
  },

  unsubscribe(callback) {
    return configManager.unsubscribe(callback);
  },

  watchEnv(callback) {
    return configManager.watchEnv(callback);
  },

  stopWatching() {
    return configManager.stopWatching();
  },

  get server() {
    return this.get('server');
  },

  get database() {
    return this.get('database');
  },

  get auth() {
    return this.get('auth');
  },

  get llm() {
    return this.get('llm');
  },

  get upload() {
    return this.get('upload');
  },

  get logging() {
    return this.get('logging');
  },

  get cors() {
    return this.get('cors');
  },

  get rateLimit() {
    return this.get('rateLimit');
  },

  getConfigHash() {
    return configManager.getConfigHash();
  },
};

module.exports = config;
module.exports.ConfigManager = ConfigManager;