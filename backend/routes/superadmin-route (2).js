
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

const { verifyAuthenticatedAdmin, verifySuperAdmin, verifyRoles } = require('../middleware/superadminAuth.js');

// All supervisory endpoints require an authenticated, approved admin
// credential. SuperAdmin-only routes run the role guard BEFORE their
// controller; monitoring routes are additionally available to school admins.
const superAdminOnly = [verifyAuthenticatedAdmin, verifySuperAdmin];
const adminMonitoring = [verifyAuthenticatedAdmin, verifyRoles(['Admin', 'SuperAdmin'])];

// ==================== SCHOOL MANAGEMENT ====================
router.get('/SuperAdmin/Schools', ...superAdminOnly, getAllSchools);
router.post('/SuperAdmin/School/Create', ...superAdminOnly, createSchool);
router.put('/SuperAdmin/School/:schoolId', ...superAdminOnly, updateSchool);
router.delete('/SuperAdmin/School/:schoolId', ...superAdminOnly, deleteSchool);
router.post('/SuperAdmin/School/:schoolId/Suspend', ...superAdminOnly, suspendSchool);
router.post('/SuperAdmin/School/:schoolId/Activate', ...superAdminOnly, activateSchool);
router.post('/SuperAdmin/School/:schoolId/Deactivate', ...superAdminOnly, deactivateSchool);

// ==================== SCHOOL ADMIN MANAGEMENT ====================
router.post('/SuperAdmin/Admin/Register', ...superAdminOnly, registerSchoolAdmin);
router.get('/SuperAdmin/Admins', ...superAdminOnly, getAllAdmins);
router.post('/SuperAdmin/Admin/:adminId/ResetPassword', ...superAdminOnly, resetSchoolAdminPassword);
router.delete('/SuperAdmin/Admin/:adminId', ...superAdminOnly, deleteSchoolAdmin);

// ==================== SUBSCRIPTION MANAGEMENT ====================
router.post('/SuperAdmin/Subscription/Create', ...superAdminOnly, createSubscription);
router.put('/SuperAdmin/Subscription/:subscriptionId', ...superAdminOnly, updateSubscription);
router.post('/SuperAdmin/Subscription/:subscriptionId/Cancel', ...superAdminOnly, cancelSubscription);
router.get('/SuperAdmin/Subscription/School/:schoolId', ...superAdminOnly, getSchoolSubscription);

// ==================== ACADEMIC YEAR MANAGEMENT ====================
router.post('/SuperAdmin/AcademicYear/Create', ...superAdminOnly, createAcademicYear);
router.get('/SuperAdmin/AcademicYears', ...superAdminOnly, getAcademicYears);
router.put('/SuperAdmin/AcademicYear/:academicYearId', ...superAdminOnly, updateAcademicYear);

// ==================== SYSTEM MONITORING & LOGS ====================
router.get('/SuperAdmin/SystemLogs', adminMonitoring, getSystemLogs);
router.get('/SuperAdmin/SystemStats', adminMonitoring, getSystemStats);

// ==================== BACKUP MANAGEMENT ====================
router.post('/SuperAdmin/Backup/Create', ...superAdminOnly, createBackup);
router.get('/SuperAdmin/Backups', ...superAdminOnly, getAllBackups);
router.post('/SuperAdmin/Backup/:backupId/Verify', ...superAdminOnly, verifyBackup);

// ==================== REPORTING ====================
router.post('/SuperAdmin/Report/Generate', ...superAdminOnly, generateReport);

module.exports = router;
