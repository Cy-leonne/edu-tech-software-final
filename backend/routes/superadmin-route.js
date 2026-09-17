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
router.get('/SuperAdmin/Schools', getAllSchools, verifySuperAdmin);
router.post('/SuperAdmin/School/Create', createSchool, verifySuperAdmin);
router.put('/SuperAdmin/School/:schoolId', updateSchool, verifySuperAdmin);
router.delete('/SuperAdmin/School/:schoolId', deleteSchool, verifySuperAdmin);
router.post('/SuperAdmin/School/:schoolId/Suspend', suspendSchool, verifySuperAdmin);
router.post('/SuperAdmin/School/:schoolId/Activate', activateSchool, verifySuperAdmin);
router.post('/SuperAdmin/School/:schoolId/Deactivate', deactivateSchool, verifySuperAdmin);

// ==================== SCHOOL ADMIN MANAGEMENT ====================
router.post('/SuperAdmin/Admin/Register', registerSchoolAdmin, verifySuperAdmin);
router.get('/SuperAdmin/Admins', getAllAdmins, verifySuperAdmin);
router.post('/SuperAdmin/Admin/:adminId/ResetPassword', resetSchoolAdminPassword, verifySuperAdmin);
router.delete('/SuperAdmin/Admin/:adminId', deleteSchoolAdmin, verifySuperAdmin);

// ==================== SUBSCRIPTION MANAGEMENT ====================
router.post('/SuperAdmin/Subscription/Create', createSubscription, verifySuperAdmin);
router.put('/SuperAdmin/Subscription/:subscriptionId', updateSubscription, verifySuperAdmin);
router.post('/SuperAdmin/Subscription/:subscriptionId/Cancel', cancelSubscription, verifySuperAdmin);
router.get('/SuperAdmin/Subscription/School/:schoolId', getSchoolSubscription, verifySuperAdmin);

// ==================== ACADEMIC YEAR MANAGEMENT ====================
router.post('/SuperAdmin/AcademicYear/Create', createAcademicYear, verifySuperAdmin);
router.get('/SuperAdmin/AcademicYears', getAcademicYears, verifySuperAdmin);
router.put('/SuperAdmin/AcademicYear/:academicYearId', updateAcademicYear, verifySuperAdmin);

// ==================== SYSTEM MONITORING & LOGS ====================
router.get('/SuperAdmin/SystemLogs', getSystemLogs, schoolAdminAllowed);
router.get('/SuperAdmin/SystemStats', getSystemStats, schoolAdminAllowed);

// ==================== BACKUP MANAGEMENT ====================
router.post('/SuperAdmin/Backup/Create', createBackup, verifySuperAdmin);
router.get('/SuperAdmin/Backups', getAllBackups, verifySuperAdmin);
router.post('/SuperAdmin/Backup/:backupId/Verify', verifyBackup, verifySuperAdmin);

// ==================== REPORTING ====================
router.post('/SuperAdmin/Report/Generate', generateReport, verifySuperAdmin);

module.exports = router;