const mongoose = require("mongoose")

const subscriptionSchema = new mongoose.Schema({
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'school',
        required: true,
    },
    planName: {
        type: String,
        enum: ['Free', 'Basic', 'Professional', 'Enterprise'],
        required: true,
    },
    planPrice: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        default: 'KES'
    },
    maxStudents: {
        type: Number,
        default: 500,
    },
    maxTeachers: {
        type: Number,
        default: 50,
    },
    maxClasses: {
        type: Number,
        default: 20,
    },
    features: {
        assignmentsEnabled: { type: Boolean, default: true },
        attendanceEnabled: { type: Boolean, default: true },
        feesEnabled: { type: Boolean, default: true },
        examsEnabled: { type: Boolean, default: true },
        complaintsEnabled: { type: Boolean, default: true },
        smsNotifications: { type: Boolean, default: false },
        emailNotifications: { type: Boolean, default: true },
        advancedReports: { type: Boolean, default: false },
        apiAccess: { type: Boolean, default: false },
        customDomain: { type: Boolean, default: false },
        bulkOperations: { type: Boolean, default: false },
        prioritySupport: { type: Boolean, default: false },
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    billingCycle: {
        type: String,
        enum: ['Monthly', 'Quarterly', 'Annually'],
        default: 'Monthly',
    },
    status: {
        type: String,
        enum: ['Active', 'Expired', 'Suspended', 'Cancelled'],
        default: 'Active',
    },
    autoRenew: {
        type: Boolean,
        default: true,
    },
    paymentMethod: {
        type: String,
        enum: ['Credit Card', 'Bank Transfer', 'Mpesa', 'Cheque'],
        default: 'Mpesa',
    },
    lastPaymentDate: {
        type: Date,
        default: null,
    },
    nextPaymentDate: {
        type: Date,
        required: true,
    },
    paymentStatus: {
        type: String,
        enum: ['Paid', 'Pending', 'Failed', 'Overdue'],
        default: 'Pending',
    },
    discountPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
    },
    discountReason: String,
    totalAmountPaid: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
    }
}, { timestamps: true });

module.exports = mongoose.model("subscription", subscriptionSchema)