
const mongoose = require('mongoose');
const Attendance = require('../models/attendanceSchema');
const Student = require('../models/studentSchema');
const Employee = require('../models/employeeSchema');
const School = require('../models/schoolSchema');
const { validateAttendance } = require('../utils/validation');
const { logEntityCreation, logEntityUpdate, logEntityDeletion } = require('../utils/auditLogger');

// Mark attendance
const markAttendance = async (req, res) => {
    try {
        const { schoolId, employeeId, date, status, checkInTime, checkOutTime, checkInMethod, remarks, overtimeHours } = req.body;

        // Validation
        const validation = validateAttendance({ employeeId, status, date });
        if (!validation.valid) {
            return res.status(400).json({ message: 'Validation error', errors: validation.errors });
        }

        // Check if employee exists
        const employeeObjId = mongoose.Types.ObjectId.isValid(employeeId) ? new mongoose.Types.ObjectId(employeeId) : employeeId;
        const employee = await Employee.findById(employeeObjId);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        const employeeSchoolId = employee.school;
        const relatedSchool = mongoose.Types.ObjectId.isValid(schoolId)
            ? await School.findOne({ _id: schoolId, schoolAdmin: employeeSchoolId }).select('_id')
            : null;
        const schoolMatchesEmployee = String(employeeSchoolId) === String(schoolId) || Boolean(relatedSchool);
        if (!schoolMatchesEmployee) {
            return res.status(403).json({ message: 'Employee does not belong to this school' });
        }
        const schoolObjId = employeeSchoolId;

        // Normalize date to avoid duplicates: use start/end of day range
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
            return res.status(400).json({ message: 'Invalid date provided' });
        }
        const startOfDay = new Date(dateObj);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateObj);
        endOfDay.setHours(23, 59, 59, 999);

        // Check if attendance already marked for this employee on that date
        const existingAttendance = await Attendance.findOne({
            employeeId: employeeObjId,
            schoolId: schoolObjId,
            date: { $gte: startOfDay, $lte: endOfDay },
        });
        if (existingAttendance) {
            return res.status(400).json({ message: 'Attendance already marked for this date' });
        }

        // Calculate hours worked if times provided
        let hoursWorked = 0;
        if (checkInTime && checkOutTime) {
            const checkIn = new Date(checkInTime);
            const checkOut = new Date(checkOutTime);
            hoursWorked = (checkOut - checkIn) / (1000 * 60 * 60);
        }

        // Create attendance record
        // Store date normalized to midnight so comparisons are consistent
        const storedDate = new Date(startOfDay);

        const attendance = new Attendance({
            schoolId: schoolObjId,
            employeeId: employeeObjId,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            department: employee.department,
            date: storedDate,
            dayOfWeek: storedDate.toLocaleDateString('en-US', { weekday: 'long' }),
            status,
            checkInTime: checkInTime ? new Date(checkInTime) : null,
            checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
            checkInMethod: checkInMethod || 'Manual',
            hoursWorked,
            remarks,
            overtimeHours: overtimeHours || 0,
            createdBy: req.user?._id,
        });

        await attendance.save();

        // Log action
        await logEntityCreation(
            schoolId,
            req.user?._id,
            req.user?.name || `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim(),
            req.user?.role || 'Admin',
            'Attendance',
            attendance._id,
            `Attendance marked for ${attendance.employeeName} on ${attendance.date.toISOString()}`,
            attendance.toObject(),
            req.clientIP,
            req.userAgent
        );

        res.status(201).json({
            message: 'Attendance marked successfully',
            attendance,
        });
    } catch (err) {
        console.error('Error marking attendance:', err);
        res.status(500).json({ message: 'Error marking attendance', error: err.message });
    }
};

// Get attendance records
const getAttendance = async (req, res) => {
    try {
        const { schoolId, employeeId, startDate, endDate, status, department } = req.query;

        let query = { schoolId };

        if (employeeId) query.employeeId = employeeId;
        if (status) query.status = status;
        if (department) query.department = department;

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const attendance = await Attendance.find(query)
            .populate('employeeId', 'firstName lastName email')
            .populate('approvedBy', 'firstName lastName')
            .sort({ date: -1 });

        res.status(200).json({
            message: 'Attendance records retrieved successfully',
            attendance,
        });
    } catch (err) {
        console.error('Error retrieving attendance:', err);
        res.status(500).json({ message: 'Error retrieving attendance', error: err.message });
    }
};

// Update attendance
const updateAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, checkOutTime, remarks, overtimeHours, overtimeApproved, approvedBy } = req.body;

        const attendance = await Attendance.findById(id);
        if (!attendance) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }

        const oldData = { ...attendance.toObject() };

        // Update fields
        if (status) attendance.status = status;
        if (checkOutTime) {
            attendance.checkOutTime = new Date(checkOutTime);
            if (attendance.checkInTime) {
                const hoursWorked = (attendance.checkOutTime - attendance.checkInTime) / (1000 * 60 * 60);
                attendance.hoursWorked = hoursWorked;
            }
        }
        if (remarks !== undefined) attendance.remarks = remarks;
        if (overtimeHours !== undefined) attendance.overtimeHours = overtimeHours;
        if (overtimeApproved !== undefined) attendance.overtimeApproved = overtimeApproved;
        if (approvedBy) {
            attendance.approvedBy = approvedBy;
            attendance.approvalDate = new Date();
        }

        attendance.editedBy = req.user?._id;
        attendance.isEdited = true;

        await attendance.save();

        // Log action
        await logEntityUpdate(
            attendance.schoolId,
            req.user?._id,
            req.user?.name || `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim(),
            req.user?.role || 'Admin',
            'Attendance',
            attendance._id,
            `Attendance updated for ${attendance.employeeName}`,
            oldData,
            attendance.toObject(),
            [],
            req.clientIP,
            req.userAgent
        );

        res.status(200).json({
            message: 'Attendance updated successfully',
            attendance,
        });
    } catch (err) {
        console.error('Error updating attendance:', err);
        res.status(500).json({ message: 'Error updating attendance', error: err.message });
    }
};

// Delete attendance
const deleteAttendance = async (req, res) => {
    try {
        const { id } = req.params;

        const attendance = await Attendance.findByIdAndDelete(id);
        if (!attendance) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }

        // Log action
        await logEntityDeletion(
            attendance.schoolId,
            req.user?._id,
            req.user?.name || `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim(),
            req.user?.role || 'Admin',
            'Attendance',
            attendance._id,
            `Attendance deleted for ${attendance.employeeName}`,
            attendance.toObject(),
            req.clientIP,
            req.userAgent
        );

        res.status(200).json({
            message: 'Attendance record deleted successfully',
        });
    } catch (err) {
        console.error('Error deleting attendance:', err);
        res.status(500).json({ message: 'Error deleting attendance', error: err.message });
    }
};

// Get attendance summary by department
const getAttendanceSummary = async (req, res) => {
    try {
        const { schoolId, startDate, endDate } = req.query;

        const query = { schoolId };
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const summary = await Attendance.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$department',
                    present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
                    absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
                    late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
                    earlyDeparture: { $sum: { $cond: [{ $eq: ['$status', 'Early Departure'] }, 1, 0] } },
                    onLeave: { $sum: { $cond: [{ $eq: ['$status', 'On Leave'] }, 1, 0] } },
                },
            },
        ]);

        res.status(200).json({
            message: 'Attendance summary retrieved',
            summary,
        });
    } catch (err) {
        console.error('Error getting attendance summary:', err);
        res.status(500).json({ message: 'Error getting attendance summary', error: err.message });
    }
};

// Get employee attendance statistics
const getEmployeeAttendanceStats = async (req, res) => {
    try {
        const { employeeId, schoolId, monthYear } = req.query;

        let dateFilter = {};
        if (monthYear) {
            const [year, month] = monthYear.split('-');
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            dateFilter = { $gte: startDate, $lte: endDate };
        }

        const stats = await Attendance.aggregate([
            {
                $match: {
                    employeeId: mongoose.Types.ObjectId(employeeId),
                    schoolId: mongoose.Types.ObjectId(schoolId),
                    date: dateFilter,
                },
            },
            {
                $group: {
                    _id: null,
                    totalDays: { $sum: 1 },
                    presentDays: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
                    absentDays: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
                    lateDays: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
                    earlyDepartureDays: { $sum: { $cond: [{ $eq: ['$status', 'Early Departure'] }, 1, 0] } },
                    totalOvertimeHours: { $sum: '$overtimeHours' },
                },
            },
        ]);

        const data = stats[0] || {
            totalDays: 0,
            presentDays: 0,
            absentDays: 0,
            lateDays: 0,
            earlyDepartureDays: 0,
            totalOvertimeHours: 0,
        };

        const attendancePercentage = data.totalDays > 0 ? ((data.presentDays / data.totalDays) * 100).toFixed(2) : 0;

        res.status(200).json({
            message: 'Employee attendance statistics retrieved',
            stats: {
                ...data,
                attendancePercentage,
            },
        });
    } catch (err) {
        console.error('Error getting employee stats:', err);
        res.status(500).json({ message: 'Error getting employee stats', error: err.message });
    }
};

const markBiometricStudentAttendance = async (req, res) => {
    try {
        const { biometricId, schoolId, subjectId } = req.body;
        if (!biometricId || !schoolId || !subjectId) return res.status(400).json({ message: 'Biometric ID, school ID, and subject ID are required for student attendance' });
        const student = await Student.findOne({ biometricId: biometricId.trim(), school: schoolId });
        if (!student) return res.status(404).json({ message: 'Student biometric ID not found' });
        const today = new Date();
        const alreadyMarked = student.attendance.some((record) => new Date(record.date).toDateString() === today.toDateString());
        if (!alreadyMarked) {
            student.attendance.push({ date: today, status: 'Present', checkInMethod: 'Biometric', subName: subjectId });
            await student.save();
        }
        res.json({ message: 'Student biometric attendance recorded', alreadyMarked, studentId: student._id });
    } catch (error) {
        res.status(500).json({ message: 'Unable to record student biometric attendance', error: error.message });
    }
};

const markBiometricStaffAttendance = async (req, res) => {
    try {
        const { biometricId, schoolId } = req.body;
        if (!biometricId || !schoolId) return res.status(400).json({ message: 'Biometric ID and school ID are required' });
        const employee = await Employee.findOne({ biometricId: biometricId.trim(), school: schoolId });
        if (!employee) return res.status(404).json({ message: 'Staff biometric ID not found' });
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const existing = await Attendance.findOne({ employeeId: employee._id, date: { $gte: startOfDay } });
        if (existing) return res.json({ message: 'Staff biometric attendance already recorded', alreadyMarked: true, attendance: existing });
        const attendance = await Attendance.create({
            schoolId,
            employeeId: employee._id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            department: employee.department,
            date: new Date(),
            checkInTime: new Date(),
            checkInMethod: 'Biometric',
            status: 'Present',
        });
        res.json({ message: 'Staff biometric attendance recorded', alreadyMarked: false, attendance });
    } catch (error) {
        res.status(500).json({ message: 'Unable to record staff biometric attendance', error: error.message });
    }
};

module.exports = {
    markAttendance,
    getAttendance,
    updateAttendance,
    deleteAttendance,
    getAttendanceSummary,
    getEmployeeAttendanceStats,
    markBiometricStudentAttendance,
    markBiometricStaffAttendance,
};
