const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance-controller');
const leaveController = require('../controllers/leave-controller');
const { verifyAdmin, verifySuperAdmin } = require('../middleware/superadminAuth');

// ==================== ATTENDANCE ROUTES ====================

// Mark attendance
router.post('/Attendance/Mark', verifyAdmin, attendanceController.markAttendance);
router.post('/Attendance/Biometric/Student', verifyAdmin, attendanceController.markBiometricStudentAttendance);
router.post('/Attendance/Biometric/Staff', verifyAdmin, attendanceController.markBiometricStaffAttendance);

// Get attendance records
router.get('/Attendance/GetAll', verifyAdmin, attendanceController.getAttendance);

// Update attendance
router.put('/Attendance/:id', verifyAdmin, attendanceController.updateAttendance);

// Delete attendance
router.delete('/Attendance/:id', verifyAdmin, attendanceController.deleteAttendance);

// Get attendance summary by department
router.get('/Attendance/Summary/Department', verifyAdmin, attendanceController.getAttendanceSummary);

// Get employee attendance statistics
router.get('/Attendance/Stats/Employee', verifyAdmin, attendanceController.getEmployeeAttendanceStats);

// ==================== LEAVE ROUTES ====================

// Apply for leave
router.post('/Leave/Apply', verifyAdmin, leaveController.applyLeave);

// Get leave requests
router.get('/Leave/GetAll', verifyAdmin, leaveController.getLeaves);

// Approve/Reject leave
router.put('/Leave/:id/Approve', verifyAdmin, leaveController.approveLeave);

// Cancel leave
router.put('/Leave/:id/Cancel', verifyAdmin, leaveController.cancelLeave);

// Get leave balance for employee
router.get('/Leave/Balance/Employee', verifyAdmin, leaveController.getLeaveBalance);

// Get leave summary for department
router.get('/Leave/Summary/Department', verifyAdmin, leaveController.getLeaveSummary);

module.exports = router;