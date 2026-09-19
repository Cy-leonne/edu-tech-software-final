
const mongoose = require('mongoose');

const learningMaterialSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        default: '',
    },
    material_type: {
        type: String,
        enum: ['Note', 'PDF', 'PPT', 'Document', 'Video'],
        default: 'Note',
    },
    file_url: {
        type: String,
        default: '',
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
        enum: ['Active', 'Archived'],
        default: 'Active',
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
    type: {
        type: String,
        enum: ['Note', 'PDF', 'PPT', 'Document', 'Video'],
        default: 'Note',
    },
    fileUrl: {
        type: String,
        default: '',
    },
}, { timestamps: true });

module.exports = mongoose.model('learningmaterial', learningMaterialSchema);
