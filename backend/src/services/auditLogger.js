const logger = require('../utils/logger');

class AuditLogger {
  constructor() {
    this.logLevels = {
      INFO: 'info',
      WARN: 'warn',
      ERROR: 'error'
    };
  }

  log(action, details = {}) {
    const auditLog = {
      timestamp: new Date().toISOString(),
      action: details.action || action,
      category: details.category || 'GENERAL',
      user: details.user || null,
      userId: details.userId || null,
      resource: details.resource || null,
      resourceId: details.resourceId || null,
      method: details.method || null,
      path: details.path || null,
      ip: details.ip || null,
      userAgent: details.userAgent || null,
      success: details.success !== false,
      status: details.status || 200,
      errorMessage: details.errorMessage || null,
      metadata: details.metadata || {}
    };

    const logLevel = auditLog.success ? this.logLevels.INFO : this.logLevels.ERROR;
    const message = `AUDIT: ${auditLog.action} - ${auditLog.category}`;

    logger.log(logLevel, message, auditLog);
  }

  logUserAction(action, user, details = {}) {
    this.log(action, {
      ...details,
      user: user?.name || user?.email || null,
      userId: user?.user_id || user?.id || null
    });
  }

  logResourceAction(action, resource, resourceId, details = {}) {
    this.log(action, {
      ...details,
      resource,
      resourceId
    });
  }

  logApiRequest(method, path, user, details = {}) {
    this.log(`API_${method.toUpperCase()}`, {
      ...details,
      action: `API_${method.toUpperCase()}`,
      category: 'API_REQUEST',
      user: user?.name || user?.email || null,
      userId: user?.user_id || user?.id || null,
      method,
      path
    });
  }

  logExpenseAction(action, expenseId, user, details = {}) {
    this.log(action, {
      ...details,
      category: 'EXPENSE',
      resource: 'Expense',
      resourceId: expenseId,
      user: user?.name || user?.email || null,
      userId: user?.user_id || user?.id || null
    });
  }

  logRuleAction(action, ruleId, user, details = {}) {
    this.log(action, {
      ...details,
      category: 'RULE',
      resource: 'Rule',
      resourceId: ruleId,
      user: user?.name || user?.email || null,
      userId: user?.user_id || user?.id || null
    });
  }

  logUserManagement(action, targetUser, operatorUser, details = {}) {
    this.log(action, {
      ...details,
      category: 'USER_MANAGEMENT',
      resource: 'User',
      resourceId: targetUser?.user_id || targetUser?.id || null,
      user: operatorUser?.name || operatorUser?.email || null,
      userId: operatorUser?.user_id || operatorUser?.id || null,
      metadata: {
        targetUser: targetUser?.name || targetUser?.email || null,
        targetUserId: targetUser?.user_id || targetUser?.id || null
      }
    });
  }

  logValidationAction(action, expenseId, validationResults, user, details = {}) {
    this.log(action, {
      ...details,
      category: 'VALIDATION',
      resource: 'Expense',
      resourceId: expenseId,
      user: user?.name || user?.email || null,
      userId: user?.user_id || user?.id || null,
      metadata: {
        validationResults: {
          total: validationResults?.total || 0,
          passed: validationResults?.passed || 0,
          failed: validationResults?.failed || 0,
          warnings: validationResults?.warnings || 0
        }
      }
    });
  }

  logLlmAction(action, model, user, details = {}) {
    this.log(action, {
      ...details,
      category: 'LLM',
      user: user?.name || user?.email || null,
      userId: user?.user_id || user?.id || null,
      metadata: {
        model,
        ...details.metadata
      }
    });
  }

  logFileUpload(fileInfo, user, details = {}) {
    this.log('FILE_UPLOAD', {
      ...details,
      category: 'FILE_UPLOAD',
      resource: 'File',
      resourceId: fileInfo?.filename || null,
      user: user?.name || user?.email || null,
      userId: user?.user_id || user?.id || null,
      metadata: {
        originalName: fileInfo?.originalname || null,
        mimetype: fileInfo?.mimetype || null,
        size: fileInfo?.size || null
      }
    });
  }

  logSystemEvent(action, details = {}) {
    this.log(action, {
      ...details,
      category: 'SYSTEM'
    });
  }
}

module.exports = new AuditLogger();
