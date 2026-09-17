const Leave = require('../models/leaveSchema');
const Employee = require('../models/employeeSchema');
const { validateLeave } = require('../utils/validation');
const { logEntityCreation, logEntityUpdate } = require('../utils/auditLogger');

// Apply for leave
const applyLeave = async (req, res) => {
    try {
        const {
            schoolId,
            employeeId,
            leaveType,
            startDate,
            endDate,
            reason,
            relieverId,
            contactNumber,
            contactEmail,
            workingDaysOnly,
        } = req.body;

        // Validation
        const validation = validateLeave({ employeeId, leaveType, startDate, endDate });
        if (!validation.valid) {
            return res.status(400).json({ message: 'Validation error', errors: validation.errors });
        }

        // Check if employee exists
        const employee = await Employee.findOne({ _id: employeeId, school: schoolId });
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Calculate number of days
        const start = new Date(startDate);
        const end = new Date(endDate);
        let numberOfDays = 0;

        if (workingDaysOnly) {
            // Count only working days (Monday-Friday)
            let current = new Date(start);
            while (current <= end) {
                const dayOfWeek = current.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    numberOfDays++;
                }
                current.setDate(current.getDate() + 1);
            }
        } else {
            numberOfDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        }

        // Check for overlapping leaves
        const overlappingLeave = await Leave.findOne({
            employeeId,
            schoolId,
            status: { $in: ['Pending', 'Approved'] },
            $or: [
                { startDate: { $lte: end }, endDate: { $gte: start } },
            ],
        });

        if (overlappingLeave) {
            return res.status(400).json({ message: 'Leave request overlaps with existing leave' });
        }

        // Create leave request
        const leave = new Leave({
            schoolId,
            employeeId,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            department: employee.department,
            leaveType,
            startDate: start,
            endDate: end,
            numberOfDays,
            workingDaysOnly,
            reason,
            relieverId,
            relieverName: relieverId ? (await Employee.findById(relieverId))?.firstName + ' ' + (await Employee.findById(relieverId))?.lastName : null,
            contactNumber,
            contactEmail,
            createdBy: req.user?._id,
        });

        await leave.save();

        // Log action
        await logEntityCreation(
            schoolId,
            req.user?._id,
            req.user?.name || `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim(),
            req.user?.role || 'Admin',
            'Leave',
            leave._id,
            `Leave request submitted for ${leave.employeeName}`,
            leave.toObject(),
            req.clientIP,
            req.userAgent
        );

        res.status(201).json({
            message: 'Leave request submitted successfully',
            leave,
        });
    } catch (err) {
        console.error('Error applying for leave:', err);
        res.status(500).json({ message: 'Error applying for leave', error: err.message });
    }
};

// Get leave requests
const getLeaves = async (req, res) => {
    try {
        const { schoolId, employeeId, status, leaveType, startDate, endDate } = req.query;

        let query = { schoolId };

        if (employeeId) query.employeeId = employeeId;
        if (status) query.status = status;
        if (leaveType) query.leaveType = leaveType;

        if (startDate || endDate) {
            query.startDate = {};
            if (startDate) query.startDate.$gte = new Date(startDate);
            if (endDate) query.startDate.$lte = new Date(endDate);
        }

        const leaves = await Leave.find(query)
            .populate('employeeId', 'firstName lastName email')
            .populate('relieverId', 'firstName lastName')
            .populate('approvedBy', 'firstName lastName')
            .sort({ startDate: -1 });

        res.status(200).json({
            message: 'Leave requests retrieved successfully',
            leaves,
        });
    } catch (err) {
        console.error('Error retrieving leaves:', err);
        res.status(500).json({ message: 'Error retrieving leaves', error: err.message });
    }
};

// Approve/Reject leave
const approveLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, approvedBy, rejectionReason } = req.body;

        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const leave = await Leave.findById(id);
        if (!leave) {
            return res.status(404).json({ message: 'Leave request not found' });
        }

        const oldData = { ...leave.toObject() };

        leave.status = status;
        leave.approvedBy = approvedBy || req.user?._id;
        leave.approvalDate = new Date();
        if (status === 'Rejected') {
            leave.rejectionReason = rejectionReason;
        }

        await leave.save();

        // Log action
        await logEntityUpdate(
            leave.schoolId,
            req.user?._id,
            req.user?.name || `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim(),
            req.user?.role || 'Admin',
            'Leave',
            leave._id,
            `Leave request ${status.toLowerCase()} for ${leave.employeeName}`,
            oldData,
            leave.toObject(),
            [],
            req.clientIP,
            req.userAgent
        );

        res.status(200).json({
            message: `Leave request ${status.toLowerCase()} successfully`,
            leave,
        });
    } catch (err) {
        console.error('Error approving leave:', err);
        res.status(500).json({ message: 'Error approving leave', error: err.message });
    }
};

// Cancel leave
const cancelLeave = async (req, res) => {
    try {
        const { id } = req.params;

        const leave = await Leave.findById(id);
        if (!leave) {
            return res.status(404).json({ message: 'Leave request not found' });
        }

        if (leave.status === 'Approved') {
            return res.status(400).json({ message: 'Cannot cancel approved leave' });
        }

        const oldData = { ...leave.toObject() };
        leave.status = 'Cancelled';
        await leave.save();

        // Log action
        await logEntityUpdate(
            leave.schoolId,
            req.user?._id,
            req.user?.name || `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim(),
            req.user?.role || 'Admin',
            'Leave',
            leave._id,
            `Leave cancelled for ${leave.employeeName}`,
            oldData,
            leave.toObject(),
            ['status'],
            req.clientIP,
            req.userAgent
        );

        res.status(200).json({
            message: 'Leave request cancelled successfully',
            leave,
        });
    } catch (err) {
        console.error('Error cancelling leave:', err);
        res.status(500).json({ message: 'Error cancelling leave', error: err.message });
    }
};

// Get leave balance for employee
const getLeaveBalance = async (req, res) => {
    try {
        const { employeeId, schoolId } = req.query;

        // Define leave types and annual allowance
        const leaveAllowance = {
            'Annual Leave': 20,
            'Sick Leave': 10,
            'Maternity Leave': 90,
            'Paternity Leave': 14,
            'Compassionate Leave': 5,
            'Study Leave': 5,
        };

        const balance = {};

        for (const [leaveType, allowedDays] of Object.entries(leaveAllowance)) {
            const usedLeaves = await Leave.aggregate([
                {
                    $match: {
                        employeeId: mongoose.Types.ObjectId(employeeId),
                        schoolId: mongoose.Types.ObjectId(schoolId),
                        leaveType,
                        status: 'Approved',
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalUsed: { $sum: '$numberOfDays' },
                    },
                },
            ]);

            const used = usedLeaves[0]?.totalUsed || 0;
            balance[leaveType] = {
                allowed: allowedDays,
                used,
                remaining: allowedDays - used,
            };
        }

        res.status(200).json({
            message: 'Leave balance retrieved successfully',
            balance,
        });
    } catch (err) {
        console.error('Error getting leave balance:', err);
        res.status(500).json({ message: 'Error getting leave balance', error: err.message });
    }
};

// Get leave summary for department
const getLeaveSummary = async (req, res) => {
    try {
        const { schoolId, department, startDate, endDate } = req.query;

        let query = { schoolId, status: 'Approved' };
        if (department) query.department = department;

        if (startDate || endDate) {
            query.startDate = {};
            if (startDate) query.startDate.$gte = new Date(startDate);
            if (endDate) query.startDate.$lte = new Date(endDate);
        }

        const summary = await Leave.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$leaveType',
                    count: { $sum: 1 },
                    totalDays: { $sum: '$numberOfDays' },
                },
            },
        ]);

        res.status(200).json({
            message: 'Leave summary retrieved',
            summary,
        });
    } catch (err) {
        console.error('Error getting leave summary:', err);
        res.status(500).json({ message: 'Error getting leave summary', error: err.message });
    }
};

module.exports = {
    applyLeave,
    getLeaves,
    approveLeave,
    cancelLeave,
    getLeaveBalance,
    getLeaveSummary,
};