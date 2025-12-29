class ConfigValidator {
  constructor(config) {
    this.config = config;
    this.errors = [];
    this.warnings = [];
  }

  validate() {
    this.reset();
    this.validateServerConfig();
    this.validateDatabaseConfig();
    this.validateLLMConfig();
    this.validateUploadConfig();
    this.validateLoggingConfig();
    this.validateCorsConfig();
    this.validateRateLimitConfig();

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  reset() {
    this.errors = [];
    this.warnings = [];
  }

  validateServerConfig() {
    const { server } = this.config;

    if (!server.port || typeof server.port !== 'number' || server.port < 1 || server.port > 65535) {
      this.errors.push({
        field: 'server.port',
        message: '端口号必须在 1-65535 范围内',
        current: server.port,
      });
    }

    if (!server.env || !['development', 'production', 'test'].includes(server.env)) {
      this.warnings.push({
        field: 'server.env',
        message: '环境变量应为 development、production 或 test',
        current: server.env,
      });
    }
  }

  validateDatabaseConfig() {
    const { database } = this.config;

    if (!database.path || typeof database.path !== 'string') {
      this.errors.push({
        field: 'database.path',
        message: '数据库路径不能为空',
        current: database.path,
      });
    }
  }

  validateLLMConfig() {
    const { llm } = this.config;

    if (!llm.apiKey || typeof llm.apiKey !== 'string' || llm.apiKey.length < 10) {
      this.errors.push({
        field: 'llm.apiKey',
        message: 'LLM API Key 不能为空且长度应大于 10',
        current: llm.apiKey ? '***' : null,
      });
    }

    if (!llm.model || typeof llm.model !== 'string') {
      this.errors.push({
        field: 'llm.model',
        message: 'LLM 模型名称不能为空',
        current: llm.model,
      });
    }

    if (!llm.baseUrl || !this.isValidUrl(llm.baseUrl)) {
      this.errors.push({
        field: 'llm.baseUrl',
        message: 'LLM API Base URL 格式不正确',
        current: llm.baseUrl,
      });
    }
  }

  validateUploadConfig() {
    const { upload } = this.config;

    if (!upload.path || typeof upload.path !== 'string') {
      this.errors.push({
        field: 'upload.path',
        message: '上传文件路径不能为空',
        current: upload.path,
      });
    }

    if (!upload.maxFileSize || typeof upload.maxFileSize !== 'number' || upload.maxFileSize <= 0) {
      this.errors.push({
        field: 'upload.maxFileSize',
        message: '最大文件大小必须为正数',
        current: upload.maxFileSize,
      });
    }

    if (upload.maxFileSize > 52428800) {
      this.warnings.push({
        field: 'upload.maxFileSize',
        message: '最大文件大小超过 50MB，可能影响性能',
        current: `${(upload.maxFileSize / 1024 / 1024).toFixed(2)}MB`,
      });
    }

    if (!Array.isArray(upload.allowedTypes) || upload.allowedTypes.length === 0) {
      this.warnings.push({
        field: 'upload.allowedTypes',
        message: '允许的文件类型为空',
        current: upload.allowedTypes,
      });
    }
  }

  validateLoggingConfig() {
    const { logging } = this.config;

    if (!logging.level || !['error', 'warn', 'info', 'debug'].includes(logging.level)) {
      this.warnings.push({
        field: 'logging.level',
        message: '日志级别应为 error、warn、info 或 debug',
        current: logging.level,
      });
    }

    if (!logging.dir || typeof logging.dir !== 'string') {
      this.warnings.push({
        field: 'logging.dir',
        message: '日志目录为空，将使用默认路径',
        current: logging.dir,
      });
    }
  }

  validateCorsConfig() {
    const { cors } = this.config;

    if (!cors.origin || !Array.isArray(cors.origin)) {
      this.warnings.push({
        field: 'cors.origin',
        message: 'CORS origin 应为数组',
        current: cors.origin,
      });
    }

    if (cors.origin && cors.origin.length > 0) {
      const invalidOrigins = cors.origin.filter(origin => !this.isValidUrl(origin) && origin !== '*');
      if (invalidOrigins.length > 0) {
        this.warnings.push({
          field: 'cors.origin',
          message: '部分 CORS origin 格式不正确',
          current: invalidOrigins,
        });
      }
    }
  }

  validateRateLimitConfig() {
    const { rateLimit } = this.config;

    if (!rateLimit.max || typeof rateLimit.max !== 'number' || rateLimit.max <= 0) {
      this.errors.push({
        field: 'rateLimit.max',
        message: '速率限制最大值必须为正数',
        current: rateLimit.max,
      });
    }

    if (rateLimit.max < 10) {
      this.warnings.push({
        field: 'rateLimit.max',
        message: '速率限制过小，可能影响正常使用',
        current: rateLimit.max,
      });
    }
  }

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }
}

module.exports = ConfigValidator;
