const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
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
        employeeName: String,
        department: String,

        // Leave type
        leaveType: {
            type: String,
            enum: [
                'Annual Leave',
                'Sick Leave',
                'Maternity Leave',
                'Paternity Leave',
                'Compassionate Leave',
                'Study Leave',
                'Unpaid Leave',
                'Other'
            ],
            required: true,
        },

        // Leave duration
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        numberOfDays: {
            type: Number,
            required: true,
        },
        workingDaysOnly: {
            type: Boolean,
            default: true,
        },

        // Leave details
        reason: {
            type: String,
            required: true,
        },
        attachmentUrl: String, // For medical certificates, etc.

        // Approval workflow
        status: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
            default: 'Pending',
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'admin',
        },
        approvalDate: Date,
        rejectionReason: String,

        // Leave balance tracking
        leaveBalanceBefore: Number,
        leaveBalanceAfter: Number,

        // Reliever during leave
        relieverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'employee',
        },
        relieverName: String,

        // Contact information during leave
        contactNumber: String,
        contactEmail: String,

        // Additional fields
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'admin',
        },
        editedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'admin',
        },
        isEdited: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// Index for quick filtering
leaveSchema.index({ schoolId: 1, employeeId: 1, startDate: -1 });
leaveSchema.index({ schoolId: 1, status: 1, startDate: -1 });
leaveSchema.index({ schoolId: 1, leaveType: 1, status: 1 });

const Leave = mongoose.model('Leave', leaveSchema);
module.exports = Leave;