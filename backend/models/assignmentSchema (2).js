
const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'student',
        required: true,
    },
    submissionText: {
        type: String,
        default: '',
    },
    fileUrl: {
        type: String,
        default: '',
    },
    submittedAt: {
        type: Date,
        default: Date.now,
    },
    grade: {
        type: String,
        default: 'Ungraded',
    },
    feedback: {
        type: String,
        default: '',
    },
});

const assignmentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        default: '',
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'subject',
        required: true,
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true,
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'teacher',
        required: true,
    },
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'sclass',
        required: true,
    },
    dueDate: {
        type: Date,
        default: null,
    },
    attachments: [{
        type: String,
        default: ''
    }],
    status: {
        type: String,
        enum: ['Open', 'Closed'],
        default: 'Open'
    },
    submissions: [submissionSchema]
}, { timestamps: true });

module.exports = mongoose.model('assignment', assignmentSchema);
