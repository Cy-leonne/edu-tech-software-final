const mongoose = require("mongoose");

const systemHealthSchema = new mongoose.Schema({
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'school',
        required: true,
    },
    
    // Database Health
    databaseHealth: {
        status: {
            type: String,
            enum: ['healthy', 'warning', 'critical'],
            default: 'healthy',
        },
        connectionStatus: {
            type: String,
            enum: ['connected', 'disconnected', 'slow'],
            default: 'connected',
        },
        responseTimeMs: Number,
        lastConnectAttempt: Date,
        totalConnections: Number,
        activeConnections: Number,
        dbSizeGB: Number,
        freeSpaceGB: Number,
    },
    
    // Storage & Backup Health
    storageHealth: {
        status: {
            type: String,
            enum: ['healthy', 'warning', 'critical'],
            default: 'healthy',
        },
        totalStorageGB: Number,
        usedStorageGB: Number,
        availableStorageGB: Number,
        storageUsagePercent: Number,
        lastBackupAt: Date,
        dayssinceLastBackup: Number,
        backupStatus: {
            type: String,
            enum: ['success', 'failed', 'pending'],
        },
    },
    
    // API Health
    apiHealth: {
        status: {
            type: String,
            enum: ['operational', 'degraded', 'down'],
            default: 'operational',
        },
        uptime: Number, // in percentage
        averageResponseTimeMs: Number,
        requestsPerMinute: Number,
        errorRate: Number, // percentage
        lastErrorAt: Date,
    },
    
    // Application Performance
    performance: {
        cpuUsagePercent: Number,
        memoryUsagePercent: Number,
        diskIOPercent: Number,
        networkLatencyMs: Number,
        averagePageLoadTimeMs: Number,
        transactionSuccessRate: Number, // percentage
    },
    
    // Error Tracking
    errorMetrics: {
        errorCount: {
            type: Number,
            default: 0,
        },
        warningCount: {
            type: Number,
            default: 0,
        },
        criticalCount: {
            type: Number,
            default: 0,
        },
        lastErrorTime: Date,
        lastErrorMessage: String,
        topErrors: [
            {
                errorType: String,
                count: Number,
                lastOccurred: Date,
            }
        ],
    },
    
    // Security Status
    securityStatus: {
        status: {
            type: String,
            enum: ['secure', 'warning', 'breach'],
            default: 'secure',
        },
        failedLoginAttempts: Number,
        blockedIPs: Number,
        suspiciousActivities: Number,
        securityAlerts: [
            {
                type: String,
                timestamp: Date,
                severity: {
                    type: String,
                    enum: ['low', 'medium', 'high', 'critical'],
                },
            }
        ],
    },
    
    // User Activity
    userActivity: {
        activeUsers: Number,
        onlineUsers: {
            students: Number,
            teachers: Number,
            admins: Number,
        },
        loginAttemptsToday: Number,
        newUsersToday: Number,
        inactiveUsersCount: Number,
    },
    
    // Service Dependencies
    serviceDependencies: [
        {
            serviceName: String,
            status: {
                type: String,
                enum: ['up', 'down', 'degraded'],
            },
            responseTimeMs: Number,
            lastCheckAt: Date,
        }
    ],
    
    // Notification Alerts
    alerts: [
        {
            id: String,
            alertType: {
                type: String,
                enum: ['performance', 'security', 'storage', 'backup', 'error'],
            },
            severity: {
                type: String,
                enum: ['info', 'warning', 'critical'],
            },
            message: String,
            createdAt: Date,
            resolvedAt: Date,
            acknowledged: Boolean,
        }
    ],
    
    // Metrics Collection
    metricsCollection: {
        isActive: {
            type: Boolean,
            default: true,
        },
        collectionIntervalSeconds: {
            type: Number,
            default: 300, // 5 minutes
        },
        lastCollectionAt: Date,
    },
    
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Create indexes
systemHealthSchema.index({ school: 1, updatedAt: -1 });

module.exports = mongoose.model('systemHealth', systemHealthSchema);