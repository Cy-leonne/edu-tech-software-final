
# Advanced Settings & Features Implementation Guide

## Overview
This document provides comprehensive documentation for the advanced settings, backup & recovery, security, audit, and monitoring features implemented in the MERN School Management System.

---

## Table of Contents
1. [System Settings](#system-settings)
2. [Security Settings](#security-settings)
3. [Report Settings](#report-settings)
4. [Backup & Recovery](#backup--recovery)
5. [Audit & Monitoring](#audit--monitoring)
6. [Role-Based Access Control](#role-based-access-control)
7. [API Endpoints](#api-endpoints)

---

## System Settings

### Features
- **Time & Date Configuration**
  - Timezone selection (UTC, Africa/Nairobi, Asia/Kolkata, etc.)
  - Date format (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
  - Time format (12H/24H)

- **Language & Localization**
  - Multi-language support (English, Spanish, French, Swahili, Portuguese, Arabic)

- **School Branding**
  - Logo upload and storage
  - Custom colors (primary, secondary, accent)
  - School name and tagline

- **File Upload Management**
  - Maximum file size limits (default: 50MB, max: 1000MB)
  - Student photo size limits (default: 5MB, max: 100MB)
  - Allowed file types configuration
  - Storage quota management

- **Email Configuration**
  - Email provider selection (Gmail, SendGrid, AWS SES, Custom)
  - Sender email and name configuration

- **M-Pesa Integration**
  - Enable/disable M-Pesa payments
  - Business short code configuration
  - API credentials (Consumer Key, Consumer Secret, Passkey)
  - Environment selection (sandbox/production)

- **Notification Settings**
  - Enable/disable email notifications
  - Enable/disable SMS notifications
  - Enable/disable in-app notifications

### Database Schema
```javascript
settingsSchema {
  school: ObjectId,
  timezone: String,
  dateFormat: String,
  timeFormat: String,
  language: String,
  branding: {
    schoolLogo: String,
    primaryColor: String,
    secondaryColor: String,
    accentColor: String,
    schoolName: String,
    schoolTagline: String
  },
  fileUpload: {
    maxSizeInMB: Number,
    maxStudentPhotoBytesInMB: Number,
    allowedFileTypes: [String],
    storageQuotaInGB: Number
  },
  emailSettings: {...},
  mpesaSettings: {...},
  apiSettings: {...},
  notificationSettings: {...}
}
```

---

## Security Settings

### Password Policy
- **Minimum password length** (default: 8 chars, range: 6-20)
- **Complexity requirements**
  - Uppercase letters required
  - Lowercase letters required
  - Numbers required
  - Special characters required
- **Password expiry** (default: 90 days, range: 30-365)
- **Prevent password reuse** (last N passwords, default: 5)

### Account Lockout Policy
- **Enable/disable account lockout**
- **Failed attempts threshold** (default: 5, range: 3-10)
- **Lockout duration** (default: 30 minutes, range: 5-1440 minutes)
- **Auto-unlock capability**

### Two-Factor Authentication (2FA)
- **Enable/disable 2FA** globally
- **Make 2FA mandatory** for all users
- **Authentication methods**
  - Email verification
  - SMS verification
  - Authenticator app (TOTP)
  - Backup codes
- **Bypass options** for emergency access

### Session Management
- **Session timeout** (default: 30 minutes, range: 5-480)
- **Idle timeout** (default: 15 minutes, range: 5-240)
- **Concurrent session limits** (allow multiple/single per user)
- **Max concurrent sessions** (default: 3, range: 1-10)
- **Warning before timeout** (default: 60 seconds)

### IP Restrictions
- **Enable/disable IP filtering**
- **Whitelist mode** (whitelist = allowed IPs, blacklist = blocked IPs)
- **IP list management**
- **Geo-restrictions** (by country)
- **Allowed countries list**

### Login Audit
- **Enable/disable login audit logs**
- **Log retention period** (default: 12 months)
- **Suspicious login alerts**

### Data Protection
- **Enable/disable encryption**
- **Encryption level** (AES-128 or AES-256)
- **Mask sensitive data** in logs

### Security Headers
- **Content Security Policy (CSP)**
- **X-Frame-Options** (clickjacking protection)
- **X-Content-Type-Options** (MIME sniffing protection)
- **HTTP Strict Transport Security (HSTS)**

### Database Schema
```javascript
securitySettingsSchema {
  school: ObjectId,
  passwordPolicy: {
    minLength: Number,
    requireUppercase: Boolean,
    requireLowercase: Boolean,
    requireNumbers: Boolean,
    requireSpecialChars: Boolean,
    passwordExpiryDays: Number,
    preventReusePreviousPasswords: Number
  },
  accountLockout: {...},
  twoFactorAuth: {...},
  sessionManagement: {...},
  ipRestrictions: {...},
  loginAudit: {...},
  dataProtection: {...},
  securityHeaders: {...}
}
```

---

## Report Settings

### Report Templates
- **Pre-built templates** for common reports:
  - Attendance reports
  - Performance reports
  - Financial reports
  - Student progress reports
  - Staff reports
- **Custom template creation**
- **Field customization**
- **Default template selection**

### PDF Export Options
- **Orientation** (portrait/landscape)
- **Page size** (A4, A3, Letter, Legal)
- **Watermark inclusion**
- **Header and footer customization**
- **Page numbering**
- **Logo inclusion in PDF**
- **Font size adjustment** (8-16pt)

### Report Generation
- **Include charts and graphs**
- **Summary section**
- **Detailed breakdowns**
- **Max records per report limit** (default: 10,000)

### Scheduled Report Emails
- **Report scheduling** (daily, weekly, monthly, quarterly, annually)
- **Specific time configuration**
- **Recipient management** (by role)
- **Filter options** (by class, department, section)
- **Automatic email delivery**
- **Track last run and next run times**

### Data Export Formats
- **Excel export** (.xlsx)
- **CSV export** (.csv)
- **JSON export** (.json)
- **XML export** (.xml) optional
- **Include timestamp** in exports

### Report Delivery
- **Immediate delivery** after generation
- **Cloud storage integration**
  - AWS S3
  - Google Cloud Storage
  - Azure Blob Storage
  - Dropbox
  - OneDrive
- **Report retention period** (default: 90 days)

### Custom Reports
- **Allow custom report creation**
- **Per-admin custom report limits**
- **Public sharing options**

### Database Schema
```javascript
reportSettingsSchema {
  school: ObjectId,
  reportTemplates: [{
    id: String,
    name: String,
    type: String,
    fields: [String],
    format: String,
    isDefault: Boolean
  }],
  pdfExport: {...},
  scheduledReports: [{
    id: String,
    name: String,
    frequency: String,
    recipients: [{email, role}],
    filters: {...}
  }],
  reportGeneration: {...},
  dataExport: {...},
  reportDelivery: {...},
  customReports: {...}
}
```

---

## Backup & Recovery

### Manual Backups
- **Initiate backups** on-demand
- **Backup modes**
  - Full backup
  - Incremental backup
  - Differential backup

### Automatic Backups
- **Schedule automatic backups**
  - Hourly
  - Daily (default: 2 AM)
  - Weekly (default: Sunday 2 AM)
  - Monthly (default: 1st of month 2 AM)

### Backup Storage Options
- **Local storage** (default)
- **Cloud storage** options
  - AWS S3
  - Google Cloud Storage
  - Azure Blob Storage
  - Dropbox
  - External drives

### Backup Verification
- **Integrity verification**
- **Checksum validation**
- **Restorable status check**
- **Corruption detection**

### Backup Restoration
- **Restore from verified backups** (SuperAdmin only)
- **Pre-restore validation**
- **Restoration progress tracking**
- **Automatic rollback on failure** (manual)

### Backup Management
- **Retention policies** (default: 30 days)
- **Auto-deletion** of expired backups
- **Permanent backup marking** (no auto-delete)
- **Backup download** capability

### Backup Statistics
- **Total backup count**
- **Success/failure rate**
- **Average backup size**
- **Backup breakdown** (by type)
- **Storage usage tracking**

### Backup Content Tracking
- Records count for:
  - Students
  - Teachers
  - Classes
  - Assignments
  - Timetables
  - Messages
  - Notices

### Database Schema
```javascript
backupLogsSchema {
  school: ObjectId,
  backupId: String,
  backupType: String, // manual, automatic, scheduled
  backupMode: String, // full, incremental, differential
  startTime: Date,
  endTime: Date,
  status: String,
  storagePath: String,
  storageLocation: String,
  sizeInMB: Number,
  databaseSize: Number,
  recordsCount: {...},
  cloudBackup: {...},
  verification: {
    isVerified: Boolean,
    integrityChecksum: String,
    integrityStatus: String,
    restorable: Boolean
  },
  retention: {
    retentionDays: Number,
    autoDelete: Boolean,
    permanent: Boolean
  },
  restoredAt: Date,
  restoreStatus: String
}
```

---

## Audit & Monitoring

### Audit Logging
**Logged Actions:**
- LOGIN / LOGOUT
- CREATE / READ / UPDATE / DELETE
- DOWNLOAD / UPLOAD / EXPORT / IMPORT
- PUBLISH / APPROVE / REJECT
- RESET_PASSWORD / CHANGE_PASSWORD
- ENABLE_2FA / DISABLE_2FA
- BACKUP operations
- RESTORE operations
- SETTINGS changes
- ACCESS_DENIED
- SYSTEM_ERROR
- PAYMENT operations
- EMAIL/SMS operations

**Tracked Information:**
- User identification
- Action type
- Entity type and ID
- Previous values (changesBefore)
- New values (changesAfter)
- Changed fields list
- IP address
- Browser information
- Timestamp
- Status (success/failure/warning)
- Error messages

**Security:**
- Sensitivity classification (public/internal/confidential/sensitive)
- Encryption for sensitive data
- Automatic rotation (TTL: 1 year)

### System Health Monitoring

**Database Health**
- Connection status
- Response time
- Total/active connections
- Database size and free space
- Health status (healthy/warning/critical)

**Storage Health**
- Total/used/available storage
- Storage usage percentage
- Last backup timestamp
- Backup status

**API Performance**
- Uptime percentage
- Average response time
- Requests per minute
- Error rate
- Last error information

**Application Performance**
- CPU usage
- Memory usage
- Disk I/O
- Network latency
- Page load times
- Transaction success rate

**Error Tracking**
- Error count
- Warning count
- Critical alert count
- Top errors
- Last error details

**Security Status**
- Failed login attempts
- Blocked IPs
- Suspicious activities
- Security alerts

**User Activity**
- Active users
- Online users (by role)
- New users today
- Inactive users

**Service Dependencies**
- External service status
- Response times
- Last check time

### Database Schema
```javascript
auditLogsSchema {
  school: ObjectId,
  user: ObjectId,
  userName: String,
  userRole: String,
  action: String,
  entityType: String,
  entityId: ObjectId,
  changesBefore: Mixed,
  changesAfter: Mixed,
  ipAddress: String,
  userAgent: String,
  browserInfo: {...},
  status: String,
  errorMessage: String,
  timestamp: Date,
  sensitivity: String
}

systemHealthSchema {
  school: ObjectId,
  databaseHealth: {...},
  storageHealth: {...},
  apiHealth: {...},
  performance: {...},
  errors: {...},
  securityStatus: {...},
  userActivity: {...},
  serviceDependencies: [...]
}
```

---

## Role-Based Access Control

### SuperAdmin Access
- **Full access** to all settings across all schools
- **Can create/delete schools**
- **Can manage school admins**
- **Can view all audit logs** across system
- **Can restore backups** (critical operation)
- **Can manage subscriptions**
- **Can view system-wide health**
- **Can manage security policies** globally

### Admin Access
- **School-specific** settings only
- **Cannot modify other schools'** settings
- **Can create manual backups** for their school
- **Can verify backups**
- **Can view audit logs** for their school
- **Can manage security settings** for their school
- **Cannot restore backups** (SuperAdmin only)
- **Can configure reports** for their school

---

## API Endpoints

### System Settings

#### Get System Settings
```
GET /School/:schoolId/SystemSettings
```
**Authorization:** Admin, SuperAdmin (own school)

**Response:**
```json
{
  "message": "Settings retrieved successfully",
  "settings": { ... }
}
```

#### Update System Settings
```
PUT /School/:schoolId/SystemSettings
```
**Authorization:** Admin, SuperAdmin (own school)

**Body:**
```json
{
  "timezone": "Africa/Nairobi",
  "dateFormat": "DD/MM/YYYY",
  "language": "en",
  "branding": { ... },
  "fileUpload": { ... }
}
```

### Security Settings

#### Get Security Settings
```
GET /School/:schoolId/SecuritySettings
```

#### Update Security Settings
```
PUT /School/:schoolId/SecuritySettings
```

**Body:**
```json
{
  "passwordPolicy": {
    "minLength": 8,
    "requireUppercase": true,
    "requireNumbers": true,
    "passwordExpiryDays": 90
  },
  "accountLockout": { ... },
  "twoFactorAuth": { ... }
}
```

### Report Settings

#### Get Report Settings
```
GET /School/:schoolId/ReportSettings
```

#### Update Report Settings
```
PUT /School/:schoolId/ReportSettings
```

#### Create Report Template
```
POST /School/:schoolId/ReportTemplate/Create
```

**Body:**
```json
{
  "name": "Monthly Attendance Report",
  "type": "attendance",
  "format": "pdf",
  "fields": ["date", "student_name", "attendance_status"]
}
```

### Backup & Recovery

#### Create Manual Backup
```
POST /School/:schoolId/Backup/Create
```

**Body:**
```json
{
  "backupMode": "full",
  "storageLocation": "local"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Backup created successfully",
  "backupLog": { ... }
}
```

#### Get All Backups
```
GET /School/:schoolId/Backups?page=1&limit=20&backupType=manual&status=completed
```

#### Verify Backup
```
POST /School/:schoolId/Backup/:backupId/Verify
```

#### Restore from Backup (SuperAdmin Only)
```
POST /School/:schoolId/Backup/:backupId/Restore
```

#### Get Backup Statistics
```
GET /School/:schoolId/Backup/Statistics
```

### Audit & Monitoring

#### Get Audit Logs
```
GET /School/:schoolId/AuditLogs?page=1&limit=50&action=CREATE&entityType=student
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Records per page (default: 50)
- `action`: Filter by action
- `entityType`: Filter by entity type
- `status`: Filter by status (success/failure/warning)

**Response:**
```json
{
  "message": "Audit logs retrieved successfully",
  "logs": [ ... ],
  "pagination": { ... }
}
```

#### Get System Health Status
```
GET /School/:schoolId/SystemHealth
```

**Response:**
```json
{
  "message": "System health status retrieved successfully",
  "health": {
    "databaseHealth": { ... },
    "storageHealth": { ... },
    "apiHealth": { ... },
    "performance": { ... }
  }
}
```

---

## Usage Examples

### Example 1: Configure Security Settings

```bash
curl -X PUT \
  http://localhost:5000/School/63f7d8c9b21d4e5a9f8g7h6i/SecuritySettings \
  -H "Content-Type: application/json" \
  -H "x-admin-id: 63f7d8c9b21d4e5a9f8g7h6j" \
  -d '{
    "passwordPolicy": {
      "minLength": 10,
      "requireUppercase": true,
      "requireLowercase": true,
      "requireNumbers": true,
      "requireSpecialChars": true,
      "passwordExpiryDays": 60
    },
    "twoFactorAuth": {
      "enabled": true,
      "mandatory": true,
      "methods": ["email", "authenticator_app"]
    },
    "ipRestrictions": {
      "enabled": true,
      "whitelistMode": true,
      "ipList": ["192.168.1.0/24", "10.0.0.0/8"]
    }
  }'
```

### Example 2: Create Manual Backup

```bash
curl -X POST \
  http://localhost:5000/School/63f7d8c9b21d4e5a9f8g7h6i/Backup/Create \
  -H "Content-Type: application/json" \
  -H "x-admin-id: 63f7d8c9b21d4e5a9f8g7h6j" \
  -d '{
    "backupMode": "full",
    "storageLocation": "local"
  }'
```

### Example 3: Get Audit Logs with Filters

```bash
curl -X GET \
  "http://localhost:5000/School/63f7d8c9b21d4e5a9f8g7h6i/AuditLogs?page=1&limit=50&action=UPDATE&entityType=student&status=success" \
  -H "x-admin-id: 63f7d8c9b21d4e5a9f8g7h6j"
```

### Example 4: Create Report Template

```bash
curl -X POST \
  http://localhost:5000/School/63f7d8c9b21d4e5a9f8g7h6i/ReportTemplate/Create \
  -H "Content-Type: application/json" \
  -H "x-admin-id: 63f7d8c9b21d4e5a9f8g7h6j" \
  -d '{
    "name": "Custom Performance Report",
    "description": "Monthly student performance analysis",
    "type": "performance",
    "fields": ["student_id", "student_name", "class", "average_score", "grade"],
    "format": "pdf"
  }'
```

---

## Integration with Main Application

### Add to Express App

```javascript
const settingsRoute = require('./routes/settings-route');

app.use('/api', settingsRoute);
```

### Initialize Settings for New School

In the school creation controller, add:

```javascript
const { initializeSettings, initializeSecuritySettings } = require('../controllers/settings-controller');

// After creating school
await initializeSettings(newSchool._id);
await initializeSecuritySettings(newSchool._id);
```

### Middleware for Audit Logging

```javascript
const { logAuditAction, getClientIP } = require('../utils/auditLogger');

app.use((req, res, next) => {
    // Store client info for audit logging
    req.clientIP = getClientIP(req);
    req.userAgent = req.get('user-agent');
    next();
});
```

---

## Security Best Practices

1. **Always verify user authorization** before allowing settings changes
2. **Log all security-sensitive changes** with full audit trail
3. **Encrypt sensitive configuration** in database
4. **Use HTTPS** for all communication
5. **Implement rate limiting** on sensitive endpoints
6. **Regular backup verification** to ensure recoverability
7. **Monitor audit logs** for suspicious activities
8. **Implement IP whitelisting** for admin access
9. **Enforce strong password policies**
10. **Enable 2FA** for all administrators

---

## Future Enhancements

- [ ] Integration with cloud backup providers (AWS S3, Google Cloud)
- [ ] Advanced analytics dashboard
- [ ] Real-time system health alerts
- [ ] Machine learning-based anomaly detection
- [ ] Automated recovery procedures
- [ ] Role-based audit log viewing
- [ ] Custom alert notifications
- [ ] Compliance reporting (GDPR, FERPA)
- [ ] Data retention policy automation
- [ ] Multi-tenancy audit separation

---

## Support & Troubleshooting

For issues or questions, refer to:
- System logs in `/logs` directory
- Audit logs in the database
- System health dashboard
- Application error logs

---

**Last Updated:** June 2024
**Version:** 1.0
