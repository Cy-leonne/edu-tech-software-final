
const mongoose = require('mongoose');

const communicationSchema = new mongoose.Schema(
    {
        school: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'admin',
            required: true,
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'admin',
            required: true,
        },
        senderRole: {
            type: String,
            enum: ['HR', 'Accountant', 'Admin'],
            required: true,
        },
        senderName: String,
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'admin',
        },
        recipientRole: {
            type: String,
            enum: ['HR', 'Accountant', 'Admin'],
        },
        subject: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        messageType: {
            type: String,
            enum: ['query', 'notification', 'status_update', 'payment_alert', 'general'],
            default: 'general',
        },
        relatedPaymentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Teacher',
        },
        relatedTeacherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Teacher',
        },
        status: {
            type: String,
            enum: ['unread', 'read', 'resolved'],
            default: 'unread',
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
        },
        attachments: [
            {
                fileName: String,
                fileUrl: String,
                uploadedAt: Date,
            },
        ],
        responses: [
            {
                responder: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'admin',
                },
                responderRole: String,
                responderName: String,
                message: String,
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        createdAt: {
            type: Date,
            default: Date.now,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
        resolvedAt: Date,
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'admin',
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('HRAccountantCommunication', communicationSchema);
