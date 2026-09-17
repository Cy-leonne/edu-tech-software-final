const mongoose = require("mongoose")

const systemLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: [
            'LOGIN', 'LOGOUT', 'CREATE_SCHOOL', 'UPDATE_SCHOOL', 'DELETE_SCHOOL',
            'SUSPEND_SCHOOL', 'ACTIVATE_SCHOOL', 'CREATE_SUBSCRIPTION', 'UPDATE_SUBSCRIPTION',
            'CANCEL_SUBSCRIPTION', 'APPROVE_ADMIN', 'REJECT_ADMIN', 'DELETE_ADMIN',
            'RESET_PASSWORD', 'BACKUP_CREATED', 'BACKUP_RESTORED', 'SETTINGS_UPDATED',
            'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'ACADEMIC_YEAR_CREATED', 'ACADEMIC_YEAR_UPDATED',
            'SYSTEM_ERROR', 'SECURITY_ALERT', 'DATABASE_MAINTENANCE', 'DATA_EXPORT'
        ]
    },
    actor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true,
    },
    actorRole: {
        type: String,
        enum: ['SuperAdmin', 'Admin'],
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'school',
        default: null,
    },
    entityType: {
        type: String,
        enum: ['School', 'Admin', 'Subscription', 'AcademicYear', 'Backup', 'Settings', 'Payment'],
    },
    entityId: mongoose.Schema.Types.ObjectId,
    entityName: String,
    description: String,
    changes: {
        before: mongoose.Schema.Types.Mixed,
        after: mongoose.Schema.Types.Mixed,
    },
    status: {
        type: String,
        enum: ['Success', 'Failed', 'Pending'],
        default: 'Success',
    },
    errorMessage: String,
    ipAddress: String,
    userAgent: String,
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
    metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

// Index for efficient querying
systemLogSchema.index({ actor: 1, timestamp: -1 });
systemLogSchema.index({ school: 1, timestamp: -1 });
systemLogSchema.index({ action: 1, timestamp: -1 });
systemLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model("systemLog", systemLogSchema)