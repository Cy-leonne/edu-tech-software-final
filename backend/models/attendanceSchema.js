
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
    {
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'School',
            required: true,
        },
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'employee',
            required: true,
        },
        employeeName: String, // Denormalized for quick access
        department: String,   // Denormalized for filtering

        date: {
            type: Date,
            required: true,
        },
        dayOfWeek: String, // Monday, Tuesday, etc.

        // Check-in/Check-out times
        checkInTime: Date,
        checkOutTime: Date,
        checkInMethod: {
            type: String,
            enum: ['Manual', 'Biometric', 'QR Code', 'GPS', 'Mobile App'],
            default: 'Manual',
        },
        checkInLocation: {
            latitude: Number,
            longitude: Number,
        },
        checkOutLocation: {
            latitude: Number,
            longitude: Number,
        },

        // Attendance status
        status: {
            type: String,
            enum: ['Present', 'Absent', 'Late', 'Early Departure', 'Half Day', 'On Leave'],
            default: 'Absent',
        },

        // Time tracking
        hoursWorked: Number,
        tardiness: Number, // Minutes late (if applicable)
        earlyDeparture: Number, // Minutes early (if applicable)

        // Notes and remarks
        remarks: String,
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
        },
        approvalDate: Date,

        // Overtime
        overtimeHours: {
            type: Number,
            default: 0,
        },
        overtimeReason: String,
        overtimeApproved: {
            type: Boolean,
            default: false,
        },

        // Linked leave (if on leave)
        linkedLeaveId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Leave',
        },

        // Additional metadata
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
        },
        editedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
        },
        isEdited: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// Index for quick filtering
attendanceSchema.index({ schoolId: 1, employeeId: 1, date: -1 });
attendanceSchema.index({ schoolId: 1, date: -1, status: 1 });
attendanceSchema.index({ schoolId: 1, department: 1, date: -1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;
