const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
    // System Settings
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'school',
        required: true,
        unique: true,
    },
    
    // Time & Date Settings
    timezone: {
        type: String,
        default: 'UTC',
        enum: ['UTC', 'Africa/Nairobi', 'Africa/Lagos', 'Africa/Johannesburg', 'Asia/Kolkata', 'Europe/London', 'America/New_York', 'America/Los_Angeles'],
    },
    dateFormat: {
        type: String,
        default: 'DD/MM/YYYY',
        enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
    },
    timeFormat: {
        type: String,
        default: '24H',
        enum: ['12H', '24H'],
    },
    attendanceTrackingMode: {
        type: String,
        enum: ['daily', 'perClass', 'hybrid'],
        default: 'daily',
    },
    markingAttendanceByTime: { type: Boolean, default: true },
    enableBiometricAttendance: { type: Boolean, default: false },
    workingDaysPerWeek: {
        type: Number,
        default: 5,
        min: 1,
        max: 7,
    },
    attendanceThreshold: {
        type: Number,
        default: 75,
        min: 0,
        max: 100,
    },
    autoGenerateAttendanceReports: { type: Boolean, default: true },
    allowLateEntry: { type: Boolean, default: true },
    lateEntryBuffer: {
        type: Number,
        default: 15,
        min: 0,
    },
    allowEarlyExit: { type: Boolean, default: false },
    
    // Language Settings
    language: {
        type: String,
        default: 'en',
        enum: ['en', 'es', 'fr', 'sw', 'pt', 'ar'],
    },

    // Assessment and grading settings
    gradingSystem: {
        enabled: {
            type: Boolean,
            default: true,
        },
        type: {
            type: String,
            enum: ['achievement', 'cdacc'],
            default: 'achievement',
        },
        scaleDescription: {
            type: String,
            default: '',
        },
    },
    
        // School Branding
        branding: {
        schoolLogo: {
            type: String, // URL or file path
            default: null,
        },
        primaryColor: {
            type: String,
            default: '#1976D2', // Blue
            match: /^#[0-9A-F]{6}$/i,
        },
        secondaryColor: {
            type: String,
            default: '#424242', // Dark Gray
            match: /^#[0-9A-F]{6}$/i,
        },
        accentColor: {
            type: String,
            default: '#FF9800', // Orange
            match: /^#[0-9A-F]{6}$/i,
        },
        schoolName: String,
        schoolTagline: String,
    },
    
    // Receipts
    receiptSettings: {
        enableReceipts: {
            type: Boolean,
            default: true,
        },
        includeLogoInReceipt: {
            type: Boolean,
            default: true,
        },
        receiptFooter: {
            type: String,
            default: 'Thank you for your payment.',
        },
    },

    // File Upload Settings
    fileUpload: {
        maxSizeInMB: {
            type: Number,
            default: 50,
            min: 1,
            max: 1000,
        },
        maxStudentPhotoBytesInMB: {
            type: Number,
            default: 5,
            min: 1,
            max: 100,
        },
        allowedFileTypes: {
            type: [String],
            default: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'zip'],
        },
        storageQuotaInGB: {
            type: Number,
            default: 100,
            min: 1,
            max: 10000,
        },
    },
    
    // Email Settings
    emailSettings: {
        emailProvider: {
            type: String,
            enum: ['Gmail', 'SendGrid', 'AWS_SES', 'Custom'],
            default: 'Gmail',
        },
        senderEmail: String,
        senderName: String,
        emailPassword: String, // Encrypted in actual implementation
        emailAPIKey: String, // Encrypted in actual implementation
    },
    
    // M-Pesa Settings
    mpesaSettings: {
        enabled: {
            type: Boolean,
            default: false,
        },
        businessShortCode: String, // Paybill Number
        businessTillNumber: String, // Till/Business Number
        accountNumberFormat: {
            type: String,
            default: 'Student Admission Number',
            enum: ['Student Admission Number', 'Student ID', 'Custom'],
        },
        consumerKey: String, // Encrypted
        consumerSecret: String, // Encrypted
        passkey: String, // Encrypted
        environment: {
            type: String,
            enum: ['sandbox', 'production'],
            default: 'sandbox',
        },
    },
    
    // SMS Settings
    smsSettings: {
        enabled: {
            type: Boolean,
            default: false,
        },
        smsProvider: {
            type: String,
            enum: ['Africa_Talking', 'Twilio', 'AWS_SNS', 'Custom'],
            default: 'Africa_Talking',
        },
        senderID: String,
        apiKey: String, // Encrypted
        apiSecret: String, // Encrypted
    },
    
    // API Settings
    apiSettings: {
        enableExternalAPI: {
            type: Boolean,
            default: false,
        },
        rateLimitPerMinute: {
            type: Number,
            default: 100,
        },
    },
    
    // Notification Settings
    notificationSettings: {
        enableEmailNotifications: {
            type: Boolean,
            default: true,
        },
        enableSMSNotifications: {
            type: Boolean,
            default: true,
        },
        enableInAppNotifications: {
            type: Boolean,
            default: true,
        },
    },

    // Finance / Accountant Settings
    financeSettings: {
        schoolCurrency: {
            type: String,
            default: 'KES',
        },
        paybillCode: {
            type: String,
            default: 'SCHOOL-PAYBILL-001',
        },
        paymentTerms: {
            type: String,
            default: '',
        },
        classFees: {
            type: [{
                classId: { type: mongoose.Schema.Types.ObjectId, ref: 'sclass' },
                className: { type: String, default: '' },
                feeAmount: { type: Number, default: 0 },
            }],
            default: [],
        },
        cheques: {
            type: [{
                type: { type: String, enum: ['incoming', 'outgoing'], default: 'incoming' },
                transactionType: { type: String, default: 'Received Cheque' },
                chequeNumber: { type: String, default: '' },
                chequeDate: { type: Date, default: Date.now },
                bankName: { type: String, default: '' },
                accountName: { type: String, default: '' },
                amount: { type: Number, default: 0 },
                payeePayer: { type: String, default: '' },
                purposeDescription: { type: String, default: '' },
                voucherReferenceNumber: { type: String, default: '' },
                relatedEntity: { type: String, default: '' },
                status: { type: String, enum: ['Pending', 'Deposited', 'Cleared', 'Bounced', 'Cancelled', 'Returned'], default: 'Pending' },
                clearanceDate: { type: Date, default: null },
                bankAccount: { type: String, default: '' },
                date: { type: Date, default: Date.now },
                payerPayee: { type: String, default: '' },
                note: { type: String, default: '' },
            }],
            default: [],
        },
        supplies: {
            type: [{
                supplier: { type: String, default: '' },
                item: { type: String, default: '' },
                amount: { type: Number, default: 0 },
                paymentMethod: { type: String, enum: ['Cash', 'Cheque', 'Bank Transfer', 'Mpesa'], default: 'Cash' },
                mpesaNumber: { type: String, default: '' },
                bankAccount: { type: String, default: '' },
                reference: { type: String, default: '' },
                status: { type: String, enum: ['Paid', 'Pending', 'Cancelled'], default: 'Paid' },
                paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'admin', default: null },
                date: { type: Date, default: Date.now },
                note: { type: String, default: '' },
            }],
            default: [],
        },
        supplierLedger: {
            type: [{
                type: { type: String, enum: ['Credit', 'Debit'], required: true },
                supplier: { type: String, required: true },
                amount: { type: Number, required: true, min: 0 },
                reference: { type: String, default: '' },
                description: { type: String, default: '' },
                paymentMethod: { type: String, default: 'Cash' },
                date: { type: Date, default: Date.now },
                createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'admin', default: null },
            }],
            default: [],
        },
        supplierAccounts: {
            type: [{
                supplier: { type: String, required: true },
                creditedAmount: { type: Number, default: 0, min: 0 },
                lastPaymentDate: { type: Date, default: null },
                lastReference: { type: String, default: '' },
            }],
            default: [],
        },
    },

    // Bank / Payment Gateway Integration Settings
    bankIntegration: {
        enabled: {
            type: Boolean,
            default: false,
        },
        integrationType: {
            type: String,
            enum: ['DirectBankAPI', 'PaymentGateway', 'Plaid', 'Custom'],
            default: 'DirectBankAPI',
        },
        bankName: String,
        bankCode: String,
        accountNumberFormat: {
            type: String,
            default: 'Student Admission Number',
            enum: ['Student Admission Number', 'Student ID', 'Custom'],
        },
        apiUrl: String,
        apiKey: String, // encrypted in real deployments
        clientId: String, // encrypted
        clientSecret: String, // encrypted
        webhookUrl: String,
        environment: {
            type: String,
            enum: ['sandbox', 'production'],
            default: 'sandbox',
        },
        additionalConfig: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    
    // Created/Updated Info
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

module.exports = mongoose.model('settings', settingsSchema);