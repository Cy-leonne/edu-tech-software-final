const mongoose = require("mongoose")

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['SuperAdmin', 'Admin', 'Accountant', 'HR'],
        default: "Admin"
    },
    approved: {
        type: Boolean,
        default: false
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        default: null
    },
    approvedAt: {
        type: Date,
        default: null
    },
    rejectedAt: {
        type: Date,
        default: null
    },
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        default: null
    },
    rejectionReason: {
        type: String,
        default: ''
    },
    disabled: {
        type: Boolean,
        default: false
    },
    disabledReason: {
        type: String,
        default: ''
    },
    disabledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        default: null
    },
    failedLoginAttempts: {
        type: Number,
        default: 0
    },
    lockoutUntil: {
        type: Date,
        default: null
    },
    lastLoginAt: {
        type: Date,
        default: null
    },
    lastLoginIp: {
        type: String,
        default: ''
    },
    twoFactorSecret: {
        type: String,
        default: ''
    },
    twoFactorPhone: {
        type: String,
        default: ''
    },
    twoFactorEmail: {
        type: String,
        default: ''
    },
    twoFactorBackupCodes: {
        type: [
            {
                code: { type: String },
                used: { type: Boolean, default: false }
            }
        ],
        default: []
    },
    settings: {
        paybillCode: {
            type: String,
            default: 'SCHOOL-PAYBILL-001'
        },
        schoolCurrency: {
            type: String,
            default: 'KES'
        },
        assignmentsEnabled: {
            type: Boolean,
            default: true
        },
        remindersEnabled: {
            type: Boolean,
            default: true
        },
        backupEmail: {
            type: String,
            default: ''
        },
        schoolProfile: {
            description: { type: String, default: '' },
            address: { type: String, default: '' },
            phone: { type: String, default: '' },
            email: { type: String, default: '' },
            website: { type: String, default: '' }
        },
        calendarEvents: {
            type: [
                {
                    title: { type: String, default: '' },
                    date: { type: String, default: '' },
                    type: { type: String, default: 'Event' },
                    description: { type: String, default: '' }
                }
            ],
            default: []
        },
        gradingSystem: {
            enabled: { type: Boolean, default: true },
            scaleDescription: { type: String, default: '' }
        },
        schoolPolicies: {
            type: [String],
            default: []
        },
        erpIntegration: {
            enabled: { type: Boolean, default: false },
            provider: { type: String, default: '' },
            apiUrl: { type: String, default: '' },
            apiKey: { type: String, default: '' },
            username: { type: String, default: '' },
            password: { type: String, default: '' }
        }
    },
    roles: {
        type: [{ type: String, enum: ['SuperAdmin', 'Admin', 'Accountant', 'HR'] }],
        default: ['Admin']
    },
    permissions: {
        manageTeachers: { type: Boolean, default: true },
        manageStudents: { type: Boolean, default: true },
        manageClasses: { type: Boolean, default: true },
        assignSubjects: { type: Boolean, default: true },
        manageAttendance: { type: Boolean, default: true },
        manageExaminations: { type: Boolean, default: true },
        manageFees: { type: Boolean, default: true },
        generateReports: { type: Boolean, default: true },
        sendAnnouncements: { type: Boolean, default: true },
        manageTimetables: { type: Boolean, default: true },
        createAccounts: { type: Boolean, default: true },
        updateSchoolProfile: { type: Boolean, default: true },
        resetPasswords: { type: Boolean, default: true },
        sendBulkSMS: { type: Boolean, default: true },
        sendBulkEmail: { type: Boolean, default: true }
        ,
        // Accountant / Finance permissions
        createFeeStructures: { type: Boolean, default: false },
        recordPayments: { type: Boolean, default: false },
        verifyOnlinePayments: { type: Boolean, default: false },
        generateReceipts: { type: Boolean, default: false },
        issueFeeStatements: { type: Boolean, default: false },
        manageInvoices: { type: Boolean, default: false },
        generateFinancialReports: { type: Boolean, default: false },
        recordExpenses: { type: Boolean, default: false },
        manageBudgets: { type: Boolean, default: false }
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        default: null,
        index: true
    },
    schoolName: {
        type: String,
        required: true,
        index: false
    },
    resetPasswordToken: {
        type: String,
        default: ''
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    },
    acceptedTerms: {
        type: Boolean,
        default: false
    },
    acceptedPrivacyPolicy: {
        type: Boolean,
        default: false
    },
    acceptedTermsAt: {
        type: Date,
        default: null
    },
    acceptedPrivacyPolicyAt: {
        type: Date,
        default: null
    }
});

module.exports = mongoose.model("admin", adminSchema)