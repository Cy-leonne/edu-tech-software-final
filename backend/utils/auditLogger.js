
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
        const finalContext = {
            module: context?.module || reqContext.module || '',
            page: context?.page || reqContext.page || '',
            endpoint: context?.endpoint || reqContext.endpoint || '',
            method: context?.method || reqContext.method || '',
        };

        const finalIpAddress = ipAddress || (req ? getClientIP(req) : 'Unknown');
        const finalUserAgent = userAgent || (req ? req.userAgent || req.get('user-agent') : '');

        let browserInfo = null;
        if (finalUserAgent) {
            browserInfo = parseBrowserInfo(finalUserAgent);
        }

        const auditLog = new AuditLogs({
            school,
            user,
            userName,
            userRole,
            action,
            entityType,
            entityId,
            entityName,
            changesBefore: changesBefore || null,
            changesAfter: changesAfter || null,
            changedFields: changedFields || [],
            ipAddress: finalIpAddress,
            userAgent: finalUserAgent,
            browserInfo,
            status,
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
