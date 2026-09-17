const mongoose = require("mongoose");

const securitySettingsSchema = new mongoose.Schema({
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'school',
        required: true,
        unique: true,
    },
    
    // Password Policy
    passwordPolicy: {
        minLength: {
            type: Number,
            default: 8,
            min: 6,
            max: 20,
        },
        requireUppercase: {
            type: Boolean,
            default: true,
        },
        requireLowercase: {
            type: Boolean,
            default: true,
        },
        requireNumbers: {
            type: Boolean,
            default: true,
        },
        requireSpecialChars: {
            type: Boolean,
            default: true,
        },
        passwordExpiryDays: {
            type: Number,
            default: 90,
            min: 30,
            max: 365,
        },
        preventReusePreviousPasswords: {
            type: Number,
            default: 5,
            min: 0,
            max: 24,
        },
    },
    
    // Account Lockout Policy
    accountLockout: {
        enabled: {
            type: Boolean,
            default: true,
        },
        failedAttemptsBeforeLockout: {
            type: Number,
            default: 5,
            min: 3,
            max: 10,
        },
        lockoutDurationMinutes: {
            type: Number,
            default: 30,
            min: 5,
            max: 1440,
        },
        enableAutoUnlock: {
            type: Boolean,
            default: true,
        },
    },
    
    // Two-Factor Authentication (2FA)
    twoFactorAuth: {
        enabled: {
            type: Boolean,
            default: false,
        },
        mandatory: {
            type: Boolean,
            default: false,
        },
        methods: {
            type: [String],
            enum: ['email', 'sms', 'authenticator_app', 'backup_codes'],
            default: ['email', 'authenticator_app'],
        },
        allowBypass: {
            type: Boolean,
            default: false,
        },
    },
    
    // Session Management
    sessionManagement: {
        sessionTimeoutMinutes: {
            type: Number,
            default: 30,
            min: 5,
            max: 480,
        },
        idleTimeoutMinutes: {
            type: Number,
            default: 15,
            min: 5,
            max: 240,
        },
        allowConcurrentSessions: {
            type: Boolean,
            default: true,
        },
        maxConcurrentSessions: {
            type: Number,
            default: 3,
            min: 1,
            max: 10,
        },
        warningBeforeTimeoutSeconds: {
            type: Number,
            default: 60,
            min: 30,
            max: 300,
        },
    },
    
    // IP Restrictions
    ipRestrictions: {
        enabled: {
            type: Boolean,
            default: false,
        },
        whitelistMode: {
            type: Boolean,
            default: true, // true = whitelist, false = blacklist
        },
        ipList: {
            type: [String],
            default: [],
        },
        enableGeoRestrictions: {
            type: Boolean,
            default: false,
        },
        allowedCountries: {
            type: [String],
            default: [],
        },
    },
    
    // Login Audit Settings
    loginAudit: {
        enableLoginAudit: {
            type: Boolean,
            default: true,
        },
        retainLoginLogsMonths: {
            type: Number,
            default: 12,
            min: 1,
            max: 60,
        },
        alertOnSuspiciousLogin: {
            type: Boolean,
            default: true,
        },
    },
    
    // Data Protection
    dataProtection: {
        enableEncryption: {
            type: Boolean,
            default: true,
        },
        encryptionLevel: {
            type: String,
            enum: ['AES-128', 'AES-256'],
            default: 'AES-256',
        },
        maskSensitiveData: {
            type: Boolean,
            default: true,
        },
    },
    
    // Security Headers
    securityHeaders: {
        enableCSP: {
            type: Boolean,
            default: true,
        },
        enableXFrameOptions: {
            type: Boolean,
            default: true,
        },
        enableXContentTypeOptions: {
            type: Boolean,
            default: true,
        },
        enableHSTS: {
            type: Boolean,
            default: true,
        },
    },
    
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
    },
});

module.exports = mongoose.model('securitySettings', securitySettingsSchema);