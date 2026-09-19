
const router = require('express').Router();
const {
    // System Settings
    getSystemSettings,
    getFinanceReport,
    updateSystemSettings,
    paySupplier,
    
    // Security Settings
    getSecuritySettings,
    updateSecuritySettings,
    
    // Report Settings
    getReportSettings,
    updateReportSettings,
    createReportTemplate,
    
    // Backup & Recovery
    createManualBackup,
    getSchoolBackups,
    verifyBackupIntegrity,
    restoreBackup,
    getBackupStats,
    
    // Audit & Monitoring
    getAuditLogsForSchool,
    getSystemHealthStatus,
    uploadSchoolLogo,
} = require('../controllers/settings-controller.js');

// ==================== SYSTEM SETTINGS ====================
// Available to: SuperAdmin, Admin
router.get('/School/:schoolId/SystemSettings', getSystemSettings);
router.put('/School/:schoolId/SystemSettings', updateSystemSettings);
router.get('/Settings/School/:schoolId/SystemSettings', getSystemSettings);
router.put('/Settings/School/:schoolId/SystemSettings', updateSystemSettings);
router.post('/Settings/School/:schoolId/SupplierPayment', paySupplier);
router.get('/Settings/School/:schoolId/FinanceReport', getFinanceReport);

// ==================== SECURITY SETTINGS ====================
// Available to: SuperAdmin, Admin
router.get('/School/:schoolId/SecuritySettings', getSecuritySettings);
router.put('/School/:schoolId/SecuritySettings', updateSecuritySettings);

// ==================== REPORT SETTINGS ====================
// Available to: SuperAdmin, Admin
router.get('/School/:schoolId/ReportSettings', getReportSettings);
router.put('/School/:schoolId/ReportSettings', updateReportSettings);
router.post('/School/:schoolId/ReportTemplate/Create', createReportTemplate);

// ==================== BACKUP & RECOVERY ====================
// Available to: SuperAdmin, Admin

// Create manual backup
router.post('/School/:schoolId/Backup/Create', createManualBackup);

// Get all backups
router.get('/School/:schoolId/Backups', getSchoolBackups);

// Verify backup integrity
router.post('/School/:schoolId/Backup/:backupId/Verify', verifyBackupIntegrity);

// Restore from backup (SuperAdmin only)
router.post('/School/:schoolId/Backup/:backupId/Restore', restoreBackup);

// Get backup statistics
router.get('/School/:schoolId/Backup/Statistics', getBackupStats);

// ==================== BRANDING UPLOAD ====================
// Upload school logo (Available to Admin & SuperAdmin)
const brandingUpload = require('../middleware/brandingUpload');
const { fileUploadLimiter } = require('../middleware/rateLimiter');
router.post('/School/:schoolId/Branding/UploadLogo', fileUploadLimiter, brandingUpload.single('logo'), uploadSchoolLogo);

// ==================== AUDIT & MONITORING ====================
// Available to: SuperAdmin, Admin

// Get audit logs
router.get('/School/:schoolId/AuditLogs', getAuditLogsForSchool);

// Get system health status
router.get('/School/:schoolId/SystemHealth', getSystemHealthStatus);

// SuperAdmin only routes
// ==================== SUPERADMIN ADVANCED SETTINGS ====================

// Note: SuperAdmin can also access all school settings by providing schoolId in query
// Example: GET /SuperAdmin/SystemSettings?page=1&limit=10

module.exports = router;
