
const mongoose = require("mongoose")

const backupSchema = new mongoose.Schema({
    backupName: {
        type: String,
        required: true,
    },
    backupType: {
        type: String,
        enum: ['Full', 'Incremental', 'Differential', 'SchoolSpecific'],
        default: 'Full',
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'school',
        default: null, // null for full system backups
    },
    backupSize: {
        type: Number, // in bytes
        required: true,
    },
    backupPath: {
        type: String,
        required: true,
    },
    backupLocation: {
        type: String,
        enum: ['Local', 'Cloud', 'External'],
        default: 'Local',
    },
    cloudProvider: {
        type: String,
        enum: ['AWS', 'Azure', 'Google Cloud', 'Local'],
        default: 'Local',
    },
    status: {
        type: String,
        enum: ['Running', 'Completed', 'Failed', 'Verified'],
        default: 'Running',
    },
    startTime: {
        type: Date,
        required: true,
    },
    endTime: {
        type: Date,
        default: null,
    },
    duration: {
        type: Number, // in seconds
        default: null,
    },
    tablesBackedUp: [{
        tableName: String,
        recordCount: Number,
    }],
    encryptionStatus: {
        type: Boolean,
        default: true,
    },
    encryptionKey: String,
    verificationStatus: {
        type: String,
        enum: ['NotVerified', 'Verified', 'Failed'],
        default: 'NotVerified',
    },
    verifiedAt: Date,
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
    },
    restoreCount: {
        type: Number,
        default: 0,
    },
    lastRestored: Date,
    restoredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true,
    },
    notes: String,
    retention: {
        type: String,
        enum: ['Weekly', 'Monthly', 'Quarterly', 'Annual', 'Permanent'],
        default: 'Monthly',
    },
    expiryDate: Date,
    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    }
}, { timestamps: true });

module.exports = mongoose.model("backup", backupSchema)
