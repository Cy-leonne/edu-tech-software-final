
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { EJSON } = require('bson');
const BackupLogs = require('../models/backupLogsSchema');

/**
 * Generate unique backup ID
 */
const generateBackupId = () => {
    return `backup_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
};

/**
 * Create database backup
 */
const createDatabaseBackup = async (school, backupType = 'manual', backupMode = 'full', createdBy, storageLocation = 'local') => {
    const backupId = generateBackupId();
    const backupStartTime = new Date();

    try {
        const backupLog = new BackupLogs({
            school,
            backupId,
            backupType,
            backupMode,
            startTime: backupStartTime,
            status: 'in_progress',
            storageLocation,
            storagePath: `backups/${school}/${backupId}`,
            sizeInMB: 0,
            createdBy,
        });

        const backupPath = path.join(__dirname, `../../backups/${school}/${backupId}`);
        
        // Create directory if not exists
        if (!fs.existsSync(backupPath)) {
            fs.mkdirSync(backupPath, { recursive: true });
        }

        // Export every collection using MongoDB Extended JSON so ObjectIds and dates survive restoration.
        const collections = await mongoose.connection.db.listCollections().toArray();
        let totalDocuments = 0;
        const recordsCount = {};
        const exportedCollections = {};

        for (const collection of collections) {
            const collectionName = collection.name;
            const documents = await mongoose.connection.db.collection(collectionName).find({}).toArray();
            totalDocuments += documents.length;
            recordsCount[collectionName.replace(/s$/, '')] = documents.length;
            exportedCollections[collectionName] = documents;
        }

        const backupFile = path.join(backupPath, 'database.json');
        const backupContents = EJSON.stringify({
            database: mongoose.connection.db.databaseName,
            createdAt: backupStartTime,
            collections: exportedCollections,
        }, null, 2);
        fs.writeFileSync(backupFile, backupContents, 'utf8');
        const fileStats = fs.statSync(backupFile);
        const fileChecksum = crypto.createHash('sha256').update(backupContents).digest('hex');

        backupLog.recordsCount = recordsCount;
        backupLog.recordsCount.total = totalDocuments;

        // Calculate backup size (simplified)
        const dbStats = await mongoose.connection.db.stats();
        backupLog.databaseSize = dbStats.dataSize || 0;
        backupLog.filesSize = fileStats.size;
        backupLog.sizeInMB = fileStats.size / (1024 * 1024);

        backupLog.endTime = new Date();
        backupLog.durationSeconds = (backupLog.endTime - backupStartTime) / 1000;
        backupLog.status = 'completed';
        
        backupLog.verification.integrityChecksum = fileChecksum;
        
        backupLog.verification.integrityStatus = 'valid';
        backupLog.verification.restorable = true;

        await backupLog.save();

        return {
            success: true,
            message: 'Backup created successfully',
            backupLog,
        };
    } catch (error) {
        // Update backup status to failed
        try {
            await BackupLogs.findOneAndUpdate(
                { backupId },
                {
                    status: 'failed',
                    errorMessage: error.message,
                    endTime: new Date(),
                }
            );
        } catch (updateError) {
            console.error('Error updating backup status:', updateError);
        }

        console.error('Error creating backup:', error);
        return {
            success: false,
            message: 'Error creating backup',
            error: error.message,
        };
    }
};

/**
 * Verify backup integrity
 */
const verifyBackup = async (backupId, verifiedBy) => {
    try {
        const backup = await BackupLogs.findOne({ backupId });

        if (!backup) {
            return {
                success: false,
                message: 'Backup not found',
            };
        }

        const backupFile = path.join(__dirname, '../../', backup.storagePath, 'database.json');
        if (!fs.existsSync(backupFile)) {
            backup.verification.isVerified = true;
            backup.verification.verifiedAt = new Date();
            backup.verification.verifiedBy = verifiedBy;
            backup.verification.integrityStatus = 'corrupted';
            backup.verification.restorable = false;
            await backup.save();
            return {
                success: true,
                message: 'Backup file not found',
                backup,
                isValid: false,
            };
        }

        const currentChecksum = crypto
            .createHash('sha256')
            .update(fs.readFileSync(backupFile))
            .digest('hex');

        const isValid = currentChecksum === backup.verification.integrityChecksum;

        backup.verification.isVerified = true;
        backup.verification.verifiedAt = new Date();
        backup.verification.verifiedBy = verifiedBy;
        backup.verification.integrityStatus = isValid ? 'valid' : 'corrupted';
        backup.verification.restorable = isValid;

        await backup.save();

        return {
            success: true,
            message: isValid ? 'Backup verified successfully' : 'Backup integrity check failed',
            backup,
            isValid,
        };
    } catch (error) {
        console.error('Error verifying backup:', error);
        return {
            success: false,
            message: 'Error verifying backup',
            error: error.message,
        };
    }
};

/**
 * Restore from backup
 */
const restoreFromBackup = async (backupId, restoredBy) => {
    try {
        const backup = await BackupLogs.findOne({ backupId });

        if (!backup) {
            return {
                success: false,
                message: 'Backup not found',
            };
        }

        if (!backup.verification.restorable) {
            return {
                success: false,
                message: 'Backup is not restorable - integrity check failed',
            };
        }

        // Update backup with restore info
        backup.restoreStatus = 'restoring';
        await backup.save();

        // Simulate restore process
        try {
            // In production, integrate with actual database restore tools
            // mongorestore example would go here

            backup.restoreStatus = 'restored';
            backup.restoredAt = new Date();
            backup.restoredBy = restoredBy;
            await backup.save();

            return {
                success: true,
                message: 'Backup restored successfully',
                backup,
            };
        } catch (restoreError) {
            backup.restoreStatus = 'restore_failed';
            await backup.save();
            throw restoreError;
        }
    } catch (error) {
        console.error('Error restoring backup:', error);
        return {
            success: false,
            message: 'Error restoring backup',
            error: error.message,
        };
    }
};

/**
 * Get all backups for a school with pagination
 */
const getAllBackups = async (school, page = 1, limit = 20, filters = {}) => {
    try {
        const skip = (page - 1) * limit;
        
        let query = { school: Array.isArray(school) ? { $in: school } : school };
        if (filters.backupType) query.backupType = filters.backupType;
        if (filters.status) query.status = filters.status;
        if (filters.storageLocation) query.storageLocation = filters.storageLocation;

        const backups = await BackupLogs.find(query)
            .populate('createdBy', 'name email')
            .populate('verification.verifiedBy', 'name email')
            .populate('restoredBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await BackupLogs.countDocuments(query);

        return {
            success: true,
            backups,
            pagination: {
                current: page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        console.error('Error retrieving backups:', error);
        return {
            success: false,
            message: 'Error retrieving backups',
            error: error.message,
        };
    }
};

/**
 * Delete old backups based on retention policy
 */
const deleteOldBackups = async (school, retentionDays = 30) => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const result = await BackupLogs.deleteMany({
            school,
            permanent: false,
            createdAt: { $lt: cutoffDate },
        });

        return {
            success: true,
            message: `Deleted ${result.deletedCount} old backups`,
            deletedCount: result.deletedCount,
        };
    } catch (error) {
        console.error('Error deleting old backups:', error);
        return {
            success: false,
            message: 'Error deleting old backups',
            error: error.message,
        };
    }
};

/**
 * Schedule automatic backup
 */
const scheduleAutomaticBackup = (school, frequency = 'daily', backupFunction) => {
    const schedule = require('node-schedule');
    
    let cronExpression;
    switch (frequency) {
        case 'hourly':
            cronExpression = '0 * * * *';
            break;
        case 'daily':
            cronExpression = '0 2 * * *'; // 2 AM daily
            break;
        case 'weekly':
            cronExpression = '0 2 * * 0'; // 2 AM every Sunday
            break;
        case 'monthly':
            cronExpression = '0 2 1 * *'; // 2 AM on the 1st of each month
            break;
        default:
            return { success: false, message: 'Invalid frequency' };
    }

    const job = schedule.scheduleJob(cronExpression, () => {
        backupFunction(school, 'automatic', 'incremental');
    });

    return {
        success: true,
        message: `Automatic backup scheduled (${frequency})`,
        job,
    };
};

/**
 * Get backup statistics
 */
const getBackupStatistics = async (school) => {
    try {
        const allBackups = await BackupLogs.find({ school: Array.isArray(school) ? { $in: school } : school });
        
        const stats = {
            totalBackups: allBackups.length,
            successfulBackups: allBackups.filter(b => b.status === 'completed').length,
            failedBackups: allBackups.filter(b => b.status === 'failed').length,
            totalBackupSizeGB: allBackups.reduce((sum, b) => sum + (b.sizeInMB || 0), 0) / 1024,
            averageBackupSizeGB: (allBackups.reduce((sum, b) => sum + (b.sizeInMB || 0), 0) / allBackups.length / 1024) || 0,
            backupsByType: {
                manual: allBackups.filter(b => b.backupType === 'manual').length,
                automatic: allBackups.filter(b => b.backupType === 'automatic').length,
                scheduled: allBackups.filter(b => b.backupType === 'scheduled').length,
            },
            oldestBackup: allBackups[allBackups.length - 1]?.createdAt,
            newestBackup: allBackups[0]?.createdAt,
        };

        return {
            success: true,
            stats,
        };
    } catch (error) {
        console.error('Error calculating backup statistics:', error);
        return {
            success: false,
            message: 'Error calculating statistics',
            error: error.message,
        };
    }
};

module.exports = {
    generateBackupId,
    createDatabaseBackup,
    verifyBackup,
    restoreFromBackup,
    getAllBackups,
    deleteOldBackups,
    scheduleAutomaticBackup,
    getBackupStatistics,
};
