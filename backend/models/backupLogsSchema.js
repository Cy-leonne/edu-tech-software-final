const mongoose = require("mongoose");

const backupLogsSchema = new mongoose.Schema({
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'school',
        required: true,
    },
    
    // Backup Information
    backupId: {
        type: String,
        required: true,
        unique: true,
    },
    backupType: {
        type: String,
        enum: ['manual', 'automatic', 'scheduled'],
        required: true,
    },
    backupMode: {
        type: String,
        enum: ['full', 'incremental', 'differential'],
        default: 'full',
    },
    
    // Backup Details
    startTime: {
        type: Date,
        required: true,
    },
    endTime: Date,
    durationSeconds: Number,
    
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'failed', 'verified'],
        default: 'pending',
    },
    errorMessage: String,
    
    // Storage Information
    storagePath: {
        type: String,
        required: true,
    },
    storageLocation: {
        type: String,
        enum: ['local', 'cloud_aws_s3', 'cloud_google', 'cloud_azure', 'external_drive'],
        required: true,
    },
    sizeInMB: {
        type: Number,
        required: true,
    },
    compressedSizeInMB: Number,
    
    // Backup Content
    databaseSize: Number,
    filesSize: Number,
    recordsCount: {
        students: Number,
        teachers: Number,
        classes: Number,
        assignments: Number,
        timetables: Number,
        messages: Number,
        notices: Number,
        total: Number,
    },
    
    // Cloud Backup Info
    cloudBackup: {
        enabled: {
            type: Boolean,
            default: false,
        },
        provider: {
            type: String,
            enum: ['AWS_S3', 'Google_Cloud_Storage', 'Azure_Blob_Storage', 'Dropbox', 'OneDrive'],
        },
        bucketName: String,
        objectKey: String,
        cloudStorageId: String,
        cloudStatus: {
            type: String,
            enum: ['not_uploaded', 'uploading', 'uploaded', 'failed'],
            default: 'not_uploaded',
        },
    },
    
    // Verification
    verification: {
        isVerified: {
            type: Boolean,
            default: false,
        },
        verifiedAt: Date,
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'admin',
        },
        integrityChecksum: String,
        integrityStatus: {
            type: String,
            enum: ['not_checked', 'valid', 'corrupted'],
            default: 'not_checked',
        },
        restorable: {
            type: Boolean,
            default: false,
        },
    },
    
    // Retention Settings
    retention: {
        retentionDays: {
            type: Number,
            default: 30,
        },
        autoDelete: {
            type: Boolean,
            default: true,
        },
        deleteAtDate: Date,
        permanent: {
            type: Boolean,
            default: false,
        },
    },
    
    // Created By
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true,
    },
    
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    
    // Restore Information (if used for restore)
    restoredAt: Date,
    restoredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
    },
    restoreStatus: {
        type: String,
        enum: ['not_restored', 'restoring', 'restored', 'restore_failed'],
        default: 'not_restored',
    },
});

// Index for faster queries
backupLogsSchema.index({ school: 1, createdAt: -1 });
backupLogsSchema.index({ status: 1 });
backupLogsSchema.index({ backupType: 1 });

module.exports = mongoose.model('backupLogs', backupLogsSchema);