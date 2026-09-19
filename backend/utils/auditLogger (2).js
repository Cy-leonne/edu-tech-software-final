
const AuditLogs = require('../models/auditLogsSchema');
const UAParser = require('ua-parser-js');

/**
 * Parse browser information from user agent
 */
const parseBrowserInfo = (userAgent) => {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    
    return {
        browser: result.browser.name || 'Unknown',
        version: result.browser.version || '',
        os: result.os.name || 'Unknown',
        osVersion: result.os.version || '',
        isMobile: result.device.type === 'mobile',
    };
};

/**
 * Extract IP address from request
 */
const getClientIP = (req) => {
    return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
           req.socket.remoteAddress ||
           req.connection?.remoteAddress ||
           'Unknown';
};

const getAuditContextFromReq = (req) => {
    if (!req) return {};

    const moduleFromHeader = req.headers['x-audit-module'] || req.body?.auditModule || req.query?.auditModule || '';
    const pageFromHeader = req.headers['x-audit-page'] || req.body?.auditPage || req.query?.auditPage || '';
    const endpointFromHeader = req.headers['x-audit-endpoint'] || req.body?.auditEndpoint || req.query?.auditEndpoint || req.originalUrl || req.url || '';
    const methodFromReq = req.method || '';

    return {
        module: moduleFromHeader.toString().trim(),
        page: pageFromHeader.toString().trim(),
        endpoint: endpointFromHeader.toString().trim(),
        method: methodFromReq.toString().trim(),
    };
};

/**
 * Value normalisation ------------------------------------------------------
 * Historically audit writes silently failed validation because callers used
 * values outside the schema enums (e.g. `Teacher` instead of `teacher`,
 * `Success` instead of `success`, or empty `context.method`). The helpers
 * below coerce every incoming value into the canonical, schema-valid form so
 * audit records always persist.
 */
const VALID_USER_ROLES = ['SuperAdmin', 'Admin', 'Accountant', 'HR', 'Teacher', 'Student', 'Parent', 'System'];
const VALID_ACTIONS = [
    'LOGIN', 'LOGOUT', 'CREATE', 'READ', 'UPDATE', 'DELETE', 'DOWNLOAD',
    'UPLOAD', 'EXPORT', 'IMPORT', 'PUBLISH', 'APPROVE', 'REJECT',
    'RESET_PASSWORD', 'CHANGE_PASSWORD', 'ENABLE_2FA', 'DISABLE_2FA',
    'BACKUP_START', 'BACKUP_COMPLETE', 'RESTORE_START', 'RESTORE_COMPLETE',
    'SETTINGS_CHANGE', 'ACCESS_DENIED', 'SYSTEM_ERROR', 'CONFIGURATION_CHANGE',
    'BULK_OPERATION', 'INTEGRATION_CALL', 'REPORT_GENERATED', 'EMAIL_SENT',
    'SMS_SENT', 'PAYMENT_PROCESSED', 'PAYMENT_FAILED', 'PAYMENT_AMOUNT_MISMATCH'
];
const VALID_ENTITY_TYPES = [
    'student', 'teacher', 'admin', 'class', 'subject', 'assignment', 'notice',
    'message', 'timetable', 'attendance', 'grade', 'backup', 'user', 'school',
    'settings', 'report', 'subscription', 'system', 'settings_security',
    'settings_system', 'employee', 'branding', 'payment', 'salary', 'superadmin'
];
const VALID_HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const normalizeUserRole = (userRole) => {
    if (!userRole) return 'System';
    const value = userRole.toString().trim();
    const match = VALID_USER_ROLES.find(r => r.toLowerCase() === value.toLowerCase());
    if (match) return match;
    const aliases = {
        administrator: 'Admin', visitor: 'System', guest: 'System',
        hrmanager: 'HR', 'hr manager': 'HR',
    };
    return aliases[value.toLowerCase()] || 'System';
};

const normalizeAction = (action) => {
    if (!action) return 'SYSTEM_ERROR';
    const upper = action.toString().trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (VALID_ACTIONS.includes(upper)) return upper;
    if (/^(ADD|CREAT|REGIST|INSERT)/.test(upper)) return 'CREATE';
    if (/^(UPDAT|EDIT|MODIF|CHANGE|ADJUST)/.test(upper)) return upper.includes('PASSWORD') ? 'CHANGE_PASSWORD' : 'UPDATE';
    if (/^(DELET|REMOV|PURG)/.test(upper)) return 'DELETE';
    if (/LOG_?IN|SIGN_?IN/.test(upper)) return 'LOGIN';
    if (/LOG_?OUT|SIGN_?OUT/.test(upper)) return 'LOGOUT';
    if (/RESET.*PASSWORD|PASSWORD.*RESET/.test(upper)) return 'RESET_PASSWORD';
    if (/PROMOT|BULK/.test(upper)) return 'BULK_OPERATION';
    return 'UPDATE';
};

const normalizeEntityType = (entityType) => {
    if (!entityType) return 'system';
    const value = entityType.toString().trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (VALID_ENTITY_TYPES.includes(value)) return value;
    const aliases = {
        fee: 'payment', fees: 'payment', invoice: 'payment', exam: 'grade',
        result: 'grade', employee_record: 'employee', staff: 'employee',
    };
    return aliases[value] || 'system';
};

const normalizeStatus = (status) => {
    if (!status) return 'success';
    const value = status.toString().trim().toLowerCase();
    if (['success', 'successful', 'ok', 'passed'].includes(value)) return 'success';
    if (['failure', 'failed', 'fail', 'error', 'errored', 'denied'].includes(value)) return 'failure';
    if (['warning', 'warn', 'partial'].includes(value)) return 'warning';
    return 'success';
};

const normalizeContext = (context) => {
    if (!context || typeof context !== 'object') return undefined;
    const normalized = {};
    if (context.module) normalized.module = context.module.toString();
    if (context.page) normalized.page = context.page.toString();
    if (context.endpoint) normalized.endpoint = context.endpoint.toString();
    if (context.method) {
        const method = context.method.toString().trim().toUpperCase();
        if (VALID_HTTP_METHODS.includes(method)) normalized.method = method;
    }
    return Object.keys(normalized).length > 0 ? normalized : undefined;
};

/**
 * Log an audit action
 */
const logAuditAction = async (auditData) => {
    try {
        const {
            school,
            user,
            userName,
            userRole,
            action,
            entityType,
            entityId,
            entityName,
            changesBefore,
            changesAfter,
            changedFields,
            ipAddress,
            userAgent,
            status = 'success',
            statusCode,
            errorMessage,
            resultMessage,
            context,
            metadata,
            sensitivity = 'internal',
            req // Express request object for additional context
        } = auditData;

        const reqContext = getAuditContextFromReq(req);
        const finalContext = normalizeContext({
            module: context?.module || reqContext.module || '',
            page: context?.page || reqContext.page || '',
            endpoint: context?.endpoint || reqContext.endpoint || '',
            method: context?.method || reqContext.method || '',
        });

        const finalIpAddress = ipAddress || (req ? getClientIP(req) : 'Unknown') || 'Unknown';
        const safeGetHeader = typeof req?.get === 'function' ? req.get('user-agent') : undefined;
        const finalUserAgent = userAgent || (req ? req.userAgent || safeGetHeader : '') || '';

        let browserInfo = null;
        if (finalUserAgent) {
            browserInfo = parseBrowserInfo(finalUserAgent);
        }

        const auditLog = new AuditLogs({
            school,
            user,
            userName,
            userRole: normalizeUserRole(userRole),
            action: normalizeAction(action),
            entityType: normalizeEntityType(entityType),
            entityId,
            entityName,
            changesBefore: changesBefore || null,
            changesAfter: changesAfter || null,
            changedFields: changedFields || [],
            ipAddress: finalIpAddress,
            userAgent: finalUserAgent,
            browserInfo,
            status: normalizeStatus(status),
            statusCode,
            errorMessage,
            resultMessage,
            context: finalContext,
            metadata,
            sensitivity,
            timestamp: new Date(),
        });

        await auditLog.save();
        return auditLog;
    } catch (error) {
        console.error('Error logging audit action:', error);
        // Don't throw - we don't want audit logging failures to break functionality
    }
};

/**
 * Log user login attempt
 */
const logLoginAttempt = async (user, userName, userRole, school, ipAddress, userAgent, success = true, errorMessage = null) => {
    return logAuditAction({
        school,
        user,
        userName,
        userRole,
        action: success ? 'LOGIN' : 'ACCESS_DENIED',
        entityType: 'user',
        entityId: user,
        entityName: userName,
        ipAddress,
        userAgent,
        status: success ? 'success' : 'failure',
        errorMessage,
        resultMessage: success ? 'Login successful' : 'Login failed',
    });
};

/**
 * Log logout
 */
const logLogout = async (user, userName, userRole, school, ipAddress) => {
    return logAuditAction({
        school,
        user,
        userName,
        userRole,
        action: 'LOGOUT',
        entityType: 'user',
        entityId: user,
        entityName: userName,
        ipAddress,
        resultMessage: 'User logged out',
    });
};

/**
 * Log entity creation
 */
const logEntityCreation = async (school, user, userName, userRole, entityType, entityId, entityName, changesAfter, ipAddress, userAgent) => {
    return logAuditAction({
        school,
        user,
        userName,
        userRole,
        action: 'CREATE',
        entityType,
        entityId,
        entityName,
        changesAfter,
        ipAddress,
        userAgent,
        resultMessage: `${entityType} created successfully`,
    });
};

/**
 * Log entity update
 */
const logEntityUpdate = async (school, user, userName, userRole, entityType, entityId, entityName, changesBefore, changesAfter, changedFields, ipAddress, userAgent) => {
    return logAuditAction({
        school,
        user,
        userName,
        userRole,
        action: 'UPDATE',
        entityType,
        entityId,
        entityName,
        changesBefore,
        changesAfter,
        changedFields,
        ipAddress,
        userAgent,
        resultMessage: `${entityType} updated successfully`,
    });
};

/**
 * Log entity deletion
 */
const logEntityDeletion = async (school, user, userName, userRole, entityType, entityId, entityName, changesBefore, ipAddress, userAgent) => {
    return logAuditAction({
        school,
        user,
        userName,
        userRole,
        action: 'DELETE',
        entityType,
        entityId,
        entityName,
        changesBefore,
        ipAddress,
        userAgent,
        resultMessage: `${entityType} deleted successfully`,
    });
};

/**
 * Log data export
 */
const logDataExport = async (school, user, userName, userRole, entityType, format, recordCount, ipAddress, userAgent) => {
    return logAuditAction({
        school,
        user,
        userName,
        userRole,
        action: 'EXPORT',
        entityType,
        entityId: null,
        entityName: `${entityType} export (${recordCount} records, ${format} format)`,
        ipAddress,
        userAgent,
        resultMessage: `Exported ${recordCount} records in ${format} format`,
    });
};

/**
 * Log settings change
 */
const logSettingsChange = async (school, user, userName, userRole, entityType, settingName, changesBefore, changesAfter, ipAddress, userAgent) => {
    return logAuditAction({
        school,
        user,
        userName,
        userRole,
        action: 'SETTINGS_CHANGE',
        entityType,
        entityId: school,
        entityName: settingName,
        changesBefore,
        changesAfter,
        ipAddress,
        userAgent,
        resultMessage: `${settingName} settings updated`,
        sensitivity: 'sensitive',
    });
};

/**
 * Log system error
 */
const logSystemError = async (school, errorType, errorMessage, errorStack, context = {}) => {
    return logAuditAction({
        school,
        user: null,
        userName: 'System',
        userRole: 'System',
        action: 'SYSTEM_ERROR',
        entityType: 'system',
        entityId: null,
        entityName: errorType,
        ipAddress: 'N/A',
        status: 'failure',
        errorMessage: errorMessage,
        resultMessage: `System error: ${errorType}`,
        context,
        sensitivity: 'confidential',
    });
};

/**
 * Get audit logs with filtering
 */
const getAuditLogs = async (filters = {}, page = 1, limit = 50) => {
    try {
        const skip = (page - 1) * limit;
        
        let query = {};
        if (filters.school) query.school = filters.school;
        if (filters.user) query.user = filters.user;
        if (filters.action) query.action = filters.action;
        if (filters.entityType) query.entityType = filters.entityType;
        if (filters.status) query.status = filters.status;
        if (filters.userRole) query.userRole = filters.userRole;
        
        // Date range filter
        if (filters.startDate || filters.endDate) {
            query.timestamp = {};
            if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
            if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
        }

        const logs = await AuditLogs.find(query)
            .populate('school', 'schoolName')
            .populate('user', 'name email')
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await AuditLogs.countDocuments(query);

        return {
            logs,
            pagination: {
                current: page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        console.error('Error retrieving audit logs:', error);
        throw error;
    }
};

module.exports = {
    logAuditAction,
    logLoginAttempt,
    logLogout,
    logEntityCreation,
    logEntityUpdate,
    logEntityDeletion,
    logDataExport,
    logSettingsChange,
    logSystemError,
    getAuditLogs,
    getClientIP,
    parseBrowserInfo,
};
