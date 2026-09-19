
const mongoose = require("mongoose")

const academicYearSchema = new mongoose.Schema({
    yearName: {
        type: String,
        required: true,
        unique: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    description: String,
    isActive: {
        type: Boolean,
        default: false,
    },
    terms: [{
        termNumber: Number,
        termName: String,
        startDate: Date,
        endDate: Date,
    }],
    examSchedule: {
        type: String,
        enum: ['NotScheduled', 'InProgress', 'Completed'],
        default: 'NotScheduled',
    },
    feesSchedule: [{
        installmentName: String,
        dueDate: Date,
        amount: Number,
        description: String,
    }],
    holidays: [{
        holidayName: String,
        startDate: Date,
        endDate: Date,
        description: String,
    }],
    template: {
        type: Boolean,
        default: true, // This can be used as a template for other years
    },
    schools: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'school',
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    }
}, { timestamps: true });

module.exports = mongoose.model("academicYear", academicYearSchema)
