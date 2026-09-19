
const mongoose = require("mongoose")

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true,
    },
    senderRole: {
        type: String,
        enum: ['Admin', 'SuperAdmin', 'Accountant', 'HR'],
        default: 'Admin'
    },
    recipientType: {
        type: String,
        enum: ['Student', 'Parent', 'Teacher', 'Accountant', 'HR', 'Bulk'],
        required: true,
    },
    recipientModel: {
        type: String,
        enum: ['student', 'parent', 'teacher', 'admin', null],
        default: null,
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'recipientModel',
        default: null,
    },
    recipientEmail: String,
    recipientPhone: String,
    bulkRecipients: [{
        _id: mongoose.Schema.Types.ObjectId,
        email: String,
        phone: String,
        name: String,
    }],
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true,
    },
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'sclass',
        default: null,
    },
    messageSubject: String,
    messageBody: {
        type: String,
        required: true,
    },
    messageType: {
        type: String,
        enum: ['SMS', 'Email', 'Both'],
        default: 'Email',
    },
    priority: {
        type: String,
        enum: ['Low', 'Normal', 'High', 'Urgent'],
        default: 'Normal',
    },
    status: {
        type: String,
        enum: ['Draft', 'Scheduled', 'Sent', 'Failed', 'Partial'],
        default: 'Sent',
    },
    sentAt: {
        type: Date,
        default: null,
    },
    scheduledFor: {
        type: Date,
        default: null,
    },
    deliveryStatus: {
        email: {
            type: String,
            enum: ['Not Sent', 'Sent', 'Failed', 'Bounced'],
            default: 'Not Sent',
        },
        sms: {
            type: String,
            enum: ['Not Sent', 'Sent', 'Failed', 'Delivered'],
            default: 'Not Sent',
        },
        emailSentAt: Date,
        smsSentAt: Date,
        emailErrorMessage: String,
        smsErrorMessage: String,
    },
    attachments: [{
        filename: String,
        url: String,
        size: Number,
    }],
    template: {
        type: String,
        enum: ['Custom', 'FeeReminder', 'Attendance', 'Exam', 'Event', 'Announcement'],
        default: 'Custom',
    },
    tags: [String],
    isRead: {
        type: Boolean,
        default: false,
    },
    readAt: {
        type: Date,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    }
}, { timestamps: true });

// Index for efficient querying
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ school: 1, createdAt: -1 });
messageSchema.index({ recipientType: 1, recipient: 1 });
messageSchema.index({ status: 1, sentAt: -1 });
messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model("message", messageSchema)
