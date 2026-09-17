const mongoose = require('mongoose');

const expenseClaimSchema = new mongoose.Schema(
    {
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'admin',
            required: true,
        },
        submittedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'admin',
            required: true,
        },
        submittedByName: {
            type: String,
            required: true,
        },
        claimType: {
            type: String,
            enum: ['Travel', 'Office Supplies', 'Medical', 'Training', 'Stationery', 'Other'],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            default: 'KES',
        },
        date: {
            type: Date,
            default: Date.now,
        },
        description: {
            type: String,
            required: true,
        },
        attachmentUrl: {
            type: String,
            default: '',
        },
        status: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected'],
            default: 'Pending',
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'admin',
        },
        approvedAt: {
            type: Date,
        },
        rejectionReason: {
            type: String,
            default: '',
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'admin',
        },
        editedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'admin',
        },
    },
    { timestamps: true }
);

expenseClaimSchema.index({ schoolId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('ExpenseClaim', expenseClaimSchema);