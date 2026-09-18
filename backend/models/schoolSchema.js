
const mongoose = require("mongoose")

const schoolSchema = new mongoose.Schema({
    schoolName: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    phone: {
        type: String,
        required: true,
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
    },
    schoolAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true,
    },
    status: {
        type: String,
        enum: ['Active', 'Suspended', 'Inactive', 'Pending'],
        default: 'Pending',
    },
    statusChangedAt: {
        type: Date,
        default: null,
    },
    statusChangedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        default: null,
    },
    statusChangeReason: {
        type: String,
        default: ''
    },
    subscriptionStatus: {
        type: String,
        enum: ['Active', 'Expired', 'Suspended', 'Cancelled'],
        default: 'Active',
    },
    currentSubscription: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'subscription',
        default: null,
    },
    studentCount: {
        type: Number,
        default: 0,
    },
    teacherCount: {
        type: Number,
        default: 0,
    },
    classCount: {
        type: Number,
        default: 0,
    },
    registrationDate: {
        type: Date,
        default: Date.now,
    },
    lastActivityDate: {
        type: Date,
        default: Date.now,
    },
    metadata: {
        principalName: String,
        principalPhone: String,
        establishedYear: Number,
        affiliation: String,
        board: String,
    },
    paymentSettings: {
        paybillCode: {
            type: String,
            default: 'SCHOOL-PAYBILL-001'
        },
        currency: {
            type: String,
            default: 'KES'
        },
        bankDetails: {
            bankName: String,
            accountNumber: String,
            accountName: String,
        }
    },
    accountBalance: {
        type: Number,
        default: 0,
    },
    accountLedger: [
        {
            type: {
                type: String,
                enum: ['Debit', 'Credit'],
                required: true,
            },
            amount: {
                type: Number,
                required: true,
            },
            reference: {
                type: String,
                default: '',
            },
            description: {
                type: String,
                required: true,
            },
            relatedEntity: {
                type: String,
                default: '',
            },
            entityId: {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
            },
            createdAt: {
                type: Date,
                default: Date.now,
            },
            createdBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'admin',
                default: null,
            },
        }
    ],
    features: {
        assignmentsEnabled: { type: Boolean, default: true },
        attendanceEnabled: { type: Boolean, default: true },
        feesEnabled: { type: Boolean, default: true },
        examsEnabled: { type: Boolean, default: true },
        complaintsEnabled: { type: Boolean, default: true },
        remindersEnabled: { type: Boolean, default: true },
        smsEnabled: { type: Boolean, default: true },
        emailEnabled: { type: Boolean, default: true },
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    }
}, { timestamps: true });

module.exports = mongoose.model("school", schoolSchema)
