
const mongoose = require("mongoose");

const auditLogsSchema = new mongoose.Schema({
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'school',
    },
    
    // User Information
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: false,
    },
    userName: String,
    userRole: {
        type: String,
        enum: ['SuperAdmin', 'Admin', 'Accountant', 'HR', 'Teacher', 'Student', 'Parent', 'System'],
        required: true,
    },
    
    // Activity Information
    action: {
        type: String,
        enum: [
            'LOGIN',
            'LOGOUT',
            'CREATE',
            'READ',
            'UPDATE',
            'DELETE',
            'DOWNLOAD',
            'UPLOAD',
            'EXPORT',
            'IMPORT',
            'PUBLISH',
            'APPROVE',
            'REJECT',
            'RESET_PASSWORD',
            'CHANGE_PASSWORD',
            'ENABLE_2FA',
            'DISABLE_2FA',
            'BACKUP_START',
            'BACKUP_COMPLETE',
            'RESTORE_START',
            'RESTORE_COMPLETE',
            'SETTINGS_CHANGE',
            'ACCESS_DENIED',
            'SYSTEM_ERROR',
            'CONFIGURATION_CHANGE',
            'BULK_OPERATION',
            'INTEGRATION_CALL',
            'REPORT_GENERATED',
            'EMAIL_SENT',
            'SMS_SENT',
            'PAYMENT_PROCESSED',
            'PAYMENT_FAILED',
            'PAYMENT_AMOUNT_MISMATCH',
        ],
        required: true,
    },
    
    // Entity Information
    entityType: {
        type: String,
        enum: [
            'student', 'teacher', 'admin', 'class', 'subject', 'assignment',
            'notice', 'message', 'timetable', 'attendance', 'grade',
            'backup', 'user', 'school', 'settings', 'report', 'subscription',
            'system', 'settings_security', 'settings_system', 'employee',
            'branding', 'payment', 'salary', 'superadmin'
        ],
        required: true,
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
    },
    entityName: String,
    
    // Changes Tracking
    changesBefore: mongoose.Schema.Types.Mixed, // Previous values
    changesAfter: mongoose.Schema.Types.Mixed,  // New values
    changedFields: [String], // List of fields that changed
    
    // Request Information
    ipAddress: {
        type: String,
        required: true,
    },
    userAgent: String,
    browserInfo: {
        browser: String,
        version: String,
        os: String,
        osVersion: String,
        isMobile: Boolean,
    },
    
    // Status & Result
    status: {
        type: String,
        enum: ['success', 'failure', 'warning'],
        default: 'success',
    },
    statusCode: Number,
    errorMessage: String,
    resultMessage: String,
    metadata: mongoose.Schema.Types.Mixed,
    
    // Additional Context
    context: {
        module: String,
        page: String,
        endpoint: String,
        method: {
            type: String,
            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        },
    },
    
    // Timestamps
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
    
    // Data Sensitivity
    sensitivity: {
        type: String,
        enum: ['public', 'internal', 'confidential', 'sensitive'],
        default: 'internal',
    },
    
    // Related Information
    relatedAuditIds: [mongoose.Schema.Types.ObjectId],
    
    // Geolocation (if available)
    geoLocation: {
        country: String,
        city: String,
        latitude: Number,
        longitude: Number,
    },
});

// Create indexes for efficient querying
auditLogsSchema.index({ school: 1, timestamp: -1 });
auditLogsSchema.index({ user: 1, timestamp: -1 });
auditLogsSchema.index({ action: 1, timestamp: -1 });
auditLogsSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditLogsSchema.index({ status: 1, timestamp: -1 });
auditLogsSchema.index({ ipAddress: 1, timestamp: -1 });
auditLogsSchema.index({ timestamp: -1 });
auditLogsSchema.index({ userRole: 1, timestamp: -1 });

// TTL Index to auto-delete logs after 1 year
auditLogsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 });

module.exports = mongoose.model('auditLogs', auditLogsSchema);
