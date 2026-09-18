
const mongoose = require('mongoose');
const { encryptText, decryptText } = require('../utils/encryption');

const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        set: encryptText,
        get: decryptText
    },
    admissionNo: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    email: {
        type: String,
        default: '',
        unique: true,
        sparse: true,
        lowercase: true,
        trim: true
    },
    rollNum: {
        type: Number,
        required: true
    },
    photo: {
        type: String,
        default: ''
    },
    parentName: {
        type: String,
        default: '',
        set: encryptText,
        get: decryptText
    },
    parentPhone: {
        type: String,
        default: '',
        set: encryptText,
        get: decryptText
    },
    parentEmail: {
        type: String,
        default: ''
    },
    guardianName: {
        type: String,
        default: '',
        set: encryptText,
        get: decryptText
    },
    guardianPhone: {
        type: String,
        default: '',
        set: encryptText,
        get: decryptText
    },
    guardianEmail: {
        type: String,
        default: '',
        lowercase: true,
        trim: true
    },
    guardianRelation: {
        type: String,
        default: ''
    },
    // Additional identification fields
    nationalId: {
        type: String,
        default: ''
    },
    birthCertificateNumber: {
        type: String,
        default: ''
    },
    nemisNumber: {
        type: String,
        default: ''
    },
    // Previous level information (optional)
    previousLevelGrade: {
        type: String,
        default: ''
    },
    password: {
        type: String,
        required: true
    },
    forcePasswordChange: {
        type: Boolean,
        default: false
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
    },
    sclassName: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'sclass',
        required: true,
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true,
    },
    biometricId: {
        type: String,
        trim: true,
        sparse: true,
        unique: true,
    },
    role: {
        type: String,
        default: "Student"
    },
    totalFees: {
        type: Number,
        default: 0
    },
    amountPaid: {
        type: Number,
        default: 0
    },
    balance: {
        type: Number,
        default: 0
    },
    classTeacherRemarks: {
        type: String,
        default: ''
    },
    principalRemarks: {
        type: String,
        default: ''
    },
    nextSchoolOpeningDate: {
        type: Date,
        default: null
    },
    feePeriodKey: {
        type: String,
        default: 'initial'
    },
    carriedForwardBalance: {
        type: Number,
        default: 0,
        min: 0
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed', 'Verified'],
        default: 'Pending'
    },
    paymentHistory: {
        type: [{
            amount: { type: Number, required: true },
            paymentMethod: { type: String, enum: ['Paybill', 'Card', 'Bank Transfer', 'Cash', 'Account Number', 'Online Transfer', 'Mpesa', 'M-Pesa STK Push', 'Cheque', 'Lipa Na Mpesa'], default: 'Paybill' },
            date: { type: Date, default: Date.now },
            receiptNumber: { type: String, required: true },
            status: { type: String, enum: ['Pending', 'Completed', 'Failed', 'Verified', 'Cancelled'], default: 'Pending' },
            transactionId: { type: String, default: '' },
            // Gateway correlation + provider confirmation details.
            // These fields are written by the STK/payment flows and were
            // previously dropped by mongoose strict mode, which broke payment
            // status lookups and callback reconciliation.
            checkoutRequestId: { type: String, default: '' },
            phoneNumber: { type: String, default: '' },
            mpesaReceiptNumber: { type: String, default: '' },
            transactionDate: { type: String, default: '' },
            balanceAfter: { type: Number, required: true, default: 0 },
            feePeriodKey: { type: String, default: 'initial' },
            verifiedBy: { type: String, default: '' },
            verifiedDate: { type: Date, default: null },
            provider: { type: String, default: '' },
            reference: { type: String, default: '' },
            paymentReference: { type: String, default: '' },
            chequeNumber: { type: String, default: '' },
            paymentNote: { type: String, default: '' }
        }],
        default: []
    },
    resetPasswordToken: {
        type: String,
        default: ''
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    },
    examResult: [
        {
            subName: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'subject',
            },
            examType: {
                type: String,
                enum: ['CAT', 'END_TERM'],
                default: 'CAT'
            },
            term: {
                type: String,
                trim: true,
                default: 'Term 1'
            },
            marksObtained: {
                type: Number,
                default: 0
            },
            grade: {
                type: String,
                default: ''
            },
            level: {
                type: String,
                default: ''
            },
            points: {
                type: Number,
                default: 0
            },
            remark: {
                type: String,
                default: ''
            },
            gradingSystem: {
                type: String,
                enum: ['achievement', 'cdacc', 'knec'],
                default: 'achievement'
            }
        }
    ],
    attendance: [{
        date: {
            type: Date,
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: ['Present', 'Absent'],
            required: true
        },
        checkInMethod: {
            type: String,
            enum: ['Manual', 'Biometric', 'Online Class'],
            default: 'Manual'
        },
        subName: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'subject',
            required: true,
            index: true
        }
    }]
});
studentSchema.set('toJSON', { getters: true });
studentSchema.set('toObject', { getters: true });

studentSchema.pre('validate', function assignPaymentPeriod(next) {
    const currentPeriod = this.feePeriodKey || 'initial';
    if (Array.isArray(this.paymentHistory)) {
        this.paymentHistory.forEach((payment) => {
            if (!payment.feePeriodKey) payment.feePeriodKey = currentPeriod;
            if (payment.balanceAfter === undefined || payment.balanceAfter === null || Number.isNaN(Number(payment.balanceAfter))) {
                payment.balanceAfter = Number(this.balance || 0);
            }
        });
    }
    next();
});

studentSchema.index({ school: 1, admissionNo: 1 }, { unique: true });
studentSchema.index({ school: 1, sclassName: 1, rollNum: 1 }, { unique: true });
studentSchema.index({ school: 1, email: 1 }, { unique: true, sparse: true });
studentSchema.index({ 'attendance.subName': 1, 'attendance.date': 1 });
module.exports = mongoose.model("student", studentSchema);
