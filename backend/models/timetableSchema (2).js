
const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true,
    },
    sclass: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'sclass',
        required: true,
    },
    generatedAt: {
        type: Date,
        default: Date.now,
    },
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
    },
    schedule: [
        {
            day: {
                type: String,
                enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                required: true,
            },
            period: {
                type: Number,
                required: true,
            },
            subject: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'subject',
                default: null,
            },
            teacher: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'teacher',
                default: null,
            },
            subjectName: {
                type: String,
                default: 'Free Period',
            },
            teacherName: {
                type: String,
                default: 'Unassigned',
            },
        },
    ],
    history: [
        {
            action: {
                type: String,
                enum: ['GENERATED', 'UPDATED', 'MANUAL_EDIT'],
                required: true,
            },
            performedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'admin',
            },
            performedByRole: {
                type: String,
                enum: ['Admin', 'SuperAdmin', 'Teacher', 'Parent', 'System'],
            },
            performedAt: {
                type: Date,
                default: Date.now,
            },
            comment: {
                type: String,
                default: '',
            },
            changesBefore: mongoose.Schema.Types.Mixed,
            changesAfter: mongoose.Schema.Types.Mixed,
        },
    ],
}, { timestamps: true });

module.exports = mongoose.model('timetable', timetableSchema);
