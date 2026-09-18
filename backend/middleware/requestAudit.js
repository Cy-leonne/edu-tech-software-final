
const mongoose = require('mongoose');
const Admin = require('../models/adminSchema');
const { logAuditAction } = require('../utils/auditLogger');

const ignoredPaths = ['/SuperAdmin/SystemLogs', '/SuperAdmin/SystemStats'];
const mutationActions = { POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE' };
const entityTypes = {
    admin: 'admin', assignment: 'assignment', attendance: 'attendance', backup: 'backup',
    class: 'class', employee: 'teacher', expense: 'report', leave: 'report', message: 'message',
    notice: 'notice', parent: 'user', payment: 'report', payroll: 'report', school: 'school',
    settings: 'settings', student: 'student', subject: 'subject', teacher: 'teacher',
    timetable: 'timetable', user: 'user',
};

const sensitiveKeys = /password|token|secret|otp|authorization/i;

const sanitize = (value) => {
    if (Array.isArray(value)) return value.map(sanitize);
    if (!value || typeof value !== 'object') return value;

    return Object.entries(value).reduce((result, [key, item]) => {
        result[key] = sensitiveKeys.test(key) ? '[REDACTED]' : sanitize(item);
        return result;
    }, {});
};

const getEntityType = (req) => {
    const routePath = `${req.baseUrl || ''}${req.path || req.url || ''}`.toLowerCase();
    const match = routePath.match(/(?:^|\/)(student|teacher|employee|admin|school|class|subject|assignment|notice|message|timetable|attendance|leave|backup|settings|payment|payroll|parent)(?:\/|$)/);
    return entityTypes[match?.[1]] || 'system';
};

const getEntityId = (req) => {
    const candidate = req.params?.studentId || req.params?.teacherId || req.params?.adminId || req.params?.schoolId || req.params?.id;
    return candidate && mongoose.Types.ObjectId.isValid(candidate) ? candidate : undefined;
};

const getEntityName = (body, req) => {
    const name = body?.name || body?.schoolName || body?.studentName || body?.teacherName || body?.title || body?.email;
    return name ? String(name) : `${getEntityType(req)} record`;
};

const requestAudit = (req, res, next) => {
    const action = mutationActions[req.method];
    if (!action || ignoredPaths.some((path) => req.originalUrl?.startsWith(path))) return next();

    res.once('finish', async () => {
        if (res.statusCode >= 400) return;

        try {
            const actorId = req.get('x-admin-id') || req.get('x-user-id');
            let actor = null;
            if (actorId && mongoose.Types.ObjectId.isValid(actorId)) {
                actor = await Admin.findById(actorId).select('name email role school').lean();
            }

            const bodySnapshot = sanitize(req.body || {});
            const school = actor?.school || (mongoose.Types.ObjectId.isValid(req.body?.school) ? req.body.school : undefined);
            const userRole = actor?.role || 'System';
            const userName = actor?.name || actor?.email || req.get('x-user-name') || 'System';

            await logAuditAction({
                school,
                user: actor?._id,
                userName,
                userRole,
                action,
                entityType: getEntityType(req),
                entityId: getEntityId(req),
                entityName: getEntityName(bodySnapshot, req),
                changesAfter: action === 'DELETE' ? null : bodySnapshot,
                changesBefore: action === 'DELETE' ? bodySnapshot : null,
                changedFields: Object.keys(bodySnapshot),
                status: 'success',
                statusCode: res.statusCode,
                resultMessage: `${action} action recorded from ${req.method} ${req.originalUrl}`,
                metadata: { requestPath: req.originalUrl, source: 'request-audit-middleware' },
                req,
            });
        } catch (error) {
            console.error('Request audit middleware error:', error.message);
        }
    });

    next();
};

module.exports = requestAudit;
