const mongoose = require("mongoose")
const { encryptText, decryptText } = require('../utils/encryption');

const teacherSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        set: encryptText,
        get: decryptText
    },
    email: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        default: '',
        set: encryptText,
        get: decryptText
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        default: "Teacher"
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true,
    },
    teachSubject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'subject',
    },
    teachSubjects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'subject',
    }],
    teachSclass: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'sclass',
        required: true,
    },
    salary: {
        type: Number,
        default: 0,
    },
    accountBalance: {
        type: Number,
        default: 0,
    },
    accountLedger: {
        type: [mongoose.Schema.Types.Mixed],
        default: [],
    },
    bankName: {
        type: String,
        default: '',
    },
    bankAccount: {
        type: String,
        default: '',
    },
    accountHolderName: {
        type: String,
        default: '',
    },
    salaryHistory: [
        {
            amount: { type: Number, required: true },
            method: { type: String, default: 'Cash' },
            note: { type: String, default: '' },
            reference: { type: String, default: '' },
            bankName: { type: String, default: '' },
            bankAccount: { type: String, default: '' },
            accountHolderName: { type: String, default: '' },
            paidBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'admin',
            },
            date: {
                type: Date,
                default: Date.now,
            },
            payrollPeriod: {
                type: String,
                default: '',
            },
            status: {
                type: String,
                enum: ['Paid', 'Pending', 'Failed'],
                default: 'Pending', // Changed to Pending - requires approval
            },
            approvalStatus: {
                type: String,
                enum: ['Pending', 'Approved', 'Rejected'],
                default: 'Pending',
            },
            approvedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'admin',
                default: null,
            },
            approvalDate: {
                type: Date,
                default: null,
            },
            rejectionReason: {
                type: String,
                default: '',
            },
        }
    ],
    attendance: [{
        date: {
            type: Date,
            required: true
        },
        presentCount: {
            type: String,
        },
        absentCount: {
            type: String,
        }
    }],
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
}, { timestamps: true });

teacherSchema.set('toJSON', { getters: true });
teacherSchema.set('toObject', { getters: true });

teacherSchema.index({ school: 1, email: 1 }, { unique: true });

module.exports = mongoose.model("teacher", teacherSchema)