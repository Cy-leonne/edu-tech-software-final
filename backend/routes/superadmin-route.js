
const router = require('express').Router();
const { verifyAuthenticatedAdmin, verifySuperAdmin, verifyRoles } = require('../middleware/superadminAuth.js');

/**
 * SECURITY: every /SuperAdmin/* endpoint requires an authenticated
 * administrator. Before this guard was added the whole router was reachable
 * without credentials (the controllers performed their own checks, but several
 * of them – e.g. academic years – did not).
 *
 * The router-level guard only requires a valid, approved administrator; the
 * SuperAdmin-only routes carry an additional role check, and the controllers
 * keep their own verifications as defence in depth.
 */
// NOTE: scope the guard to the /SuperAdmin prefix. This router is mounted at
// the application root, so an unscoped `router.use` would also intercept every
// unknown path and turn genuine 404s into 401s.
router.use('/SuperAdmin', verifyAuthenticatedAdmin);

// Monitoring endpoints are intentionally available to school admins as well
// (see controllers/superadmin-controller.js); everything else is SuperAdmin.
const schoolAdminAllowed = verifyRoles(['Admin', 'SuperAdmin']);

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
router.get('/SuperAdmin/Schools', verifySuperAdmin, getAllSchools);
router.post('/SuperAdmin/School/Create', verifySuperAdmin, createSchool);
router.put('/SuperAdmin/School/:schoolId', verifySuperAdmin, updateSchool);
router.delete('/SuperAdmin/School/:schoolId', verifySuperAdmin, deleteSchool);
router.post('/SuperAdmin/School/:schoolId/Suspend', verifySuperAdmin, suspendSchool);
router.post('/SuperAdmin/School/:schoolId/Activate', verifySuperAdmin, activateSchool);
router.post('/SuperAdmin/School/:schoolId/Deactivate', verifySuperAdmin, deactivateSchool);

// ==================== SCHOOL ADMIN MANAGEMENT ====================
router.post('/SuperAdmin/Admin/Register', verifySuperAdmin, registerSchoolAdmin);
router.get('/SuperAdmin/Admins', verifySuperAdmin, getAllAdmins);
router.post('/SuperAdmin/Admin/:adminId/ResetPassword', verifySuperAdmin, resetSchoolAdminPassword);
router.delete('/SuperAdmin/Admin/:adminId', verifySuperAdmin, deleteSchoolAdmin);

// ==================== SUBSCRIPTION MANAGEMENT ====================
router.post('/SuperAdmin/Subscription/Create', verifySuperAdmin, createSubscription);
router.put('/SuperAdmin/Subscription/:subscriptionId', verifySuperAdmin, updateSubscription);
router.post('/SuperAdmin/Subscription/:subscriptionId/Cancel', verifySuperAdmin, cancelSubscription);
router.get('/SuperAdmin/Subscription/School/:schoolId', verifySuperAdmin, getSchoolSubscription);

// ==================== ACADEMIC YEAR MANAGEMENT ====================
router.post('/SuperAdmin/AcademicYear/Create', verifySuperAdmin, createAcademicYear);
router.get('/SuperAdmin/AcademicYears', verifySuperAdmin, getAcademicYears);
router.put('/SuperAdmin/AcademicYear/:academicYearId', verifySuperAdmin, updateAcademicYear);

// ==================== SYSTEM MONITORING & LOGS ====================
router.get('/SuperAdmin/SystemLogs', schoolAdminAllowed, getSystemLogs);
router.get('/SuperAdmin/SystemStats', schoolAdminAllowed, getSystemStats);

// ==================== BACKUP MANAGEMENT ====================
router.post('/SuperAdmin/Backup/Create', verifySuperAdmin, createBackup);
router.get('/SuperAdmin/Backups', verifySuperAdmin, getAllBackups);
router.post('/SuperAdmin/Backup/:backupId/Verify', verifySuperAdmin, verifyBackup);

// ==================== REPORTING ====================
router.post('/SuperAdmin/Report/Generate', verifySuperAdmin, generateReport);

module.exports = router;
