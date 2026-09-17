const mongoose = require('mongoose');

const liveClassSchema = new mongoose.Schema({
    topic: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: false,
    },
    description: {
        type: String,
        default: '',
    },
    meeting_url: {
        type: String,
        required: true,
    },
    start_time: {
        type: Date,
        required: true,
    },
    end_time: {
        type: Date,
        required: false,
    },
    school_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true,
    },
    teacher_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'teacher',
        required: true,
    },
    subject_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'subject',
        required: true,
    },
    class_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'sclass',
        required: true,
    },
    status: {
        type: String,
        enum: ['Scheduled', 'Completed', 'Cancelled'],
        default: 'Scheduled',
    },
    scheduledAt: {
        type: Date,
    },
    meetingLink: {
        type: String,
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'teacher',
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'subject',
    },
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'sclass',
    },
}, { timestamps: true });

module.exports = mongoose.model('liveclass', liveClassSchema);