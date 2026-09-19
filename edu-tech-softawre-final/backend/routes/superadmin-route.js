
const router = require('express').Router();

const {
    // School Management
    getAllSchools,
    createSchool,
    updateSchool,
    deleteSchool,
    suspendSchool,
    activateSchool,
    deactivateSchool,

    // Admin Management
    registerSchoolAdmin,
    getAllAdmins,
    resetSchoolAdminPassword,
    deleteSchoolAdmin,

    // Subscription Management
    createSubscription,
    updateSubscription,
    cancelSubscription,
    getSchoolSubscription,

    // Academic Year Management
    createAcademicYear,
    getAcademicYears,
    updateAcademicYear,

    // System Monitoring & Logs
    getSystemLogs,
    getSystemStats,

    // Backup Management
    createBackup,
    getAllBackups,
    verifyBackup,

    // Reporting
    generateReport
} = require('../controllers/superadmin-controller.js');

// ==================== SCHOOL MANAGEMENT ====================
router.get('/SuperAdmin/Schools', getAllSchools);
router.post('/SuperAdmin/School/Create', createSchool);
router.put('/SuperAdmin/School/:schoolId', updateSchool);
router.delete('/SuperAdmin/School/:schoolId', deleteSchool);
router.post('/SuperAdmin/School/:schoolId/Suspend', suspendSchool);
router.post('/SuperAdmin/School/:schoolId/Activate', activateSchool);
router.post('/SuperAdmin/School/:schoolId/Deactivate', deactivateSchool);

// ==================== SCHOOL ADMIN MANAGEMENT ====================
router.post('/SuperAdmin/Admin/Register', registerSchoolAdmin);
router.get('/SuperAdmin/Admins', getAllAdmins);
router.post('/SuperAdmin/Admin/:adminId/ResetPassword', resetSchoolAdminPassword);
router.delete('/SuperAdmin/Admin/:adminId', deleteSchoolAdmin);

// ==================== SUBSCRIPTION MANAGEMENT ====================
router.post('/SuperAdmin/Subscription/Create', createSubscription);
router.put('/SuperAdmin/Subscription/:subscriptionId', updateSubscription);
router.post('/SuperAdmin/Subscription/:subscriptionId/Cancel', cancelSubscription);
router.get('/SuperAdmin/Subscription/School/:schoolId', getSchoolSubscription);

// ==================== ACADEMIC YEAR MANAGEMENT ====================
router.post('/SuperAdmin/AcademicYear/Create', createAcademicYear);
router.get('/SuperAdmin/AcademicYears', getAcademicYears);
router.put('/SuperAdmin/AcademicYear/:academicYearId', updateAcademicYear);

// ==================== SYSTEM MONITORING & LOGS ====================
router.get('/SuperAdmin/SystemLogs', getSystemLogs);
router.get('/SuperAdmin/SystemStats', getSystemStats);

// ==================== BACKUP MANAGEMENT ====================
router.post('/SuperAdmin/Backup/Create', createBackup);
router.get('/SuperAdmin/Backups', getAllBackups);
router.post('/SuperAdmin/Backup/:backupId/Verify', verifyBackup);

// ==================== REPORTING ====================
router.post('/SuperAdmin/Report/Generate', generateReport);

module.exports = router;
