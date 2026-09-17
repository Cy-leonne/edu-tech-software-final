# SuperAdmin Quick Reference Guide

## 🚀 Quick Start

### Step 1: Start Your Server
```bash
cd backend
npm start
```

### Step 2: Create SuperAdmin Account
```bash
POST /AdminReg
Content-Type: application/json

{
  "name": "Super Admin",
  "email": "superadmin@system.com",
  "password": "SecurePassword123",
  "schoolName": "System",
  "role": "SuperAdmin"
}
```

### Step 3: Use SuperAdmin ID in All Requests
All SuperAdmin endpoints require this header:
```
x-admin-id: <your_superadmin_id>
```

---

## 📋 Common Operations

### Create a School
```bash
POST /SuperAdmin/School/Create
x-admin-id: <superadmin_id>
Content-Type: application/json

{
  "schoolName": "ABC School",
  "email": "admin@abcschool.com",
  "phone": "0712345678",
  "address": {
    "street": "123 Main Street",
    "city": "Nairobi",
    "state": "Nairobi",
    "country": "Kenya"
  },
  "schoolAdminId": "<admin_id>"
}
```

### Get All Schools
```bash
GET /SuperAdmin/Schools?status=Active&page=1&limit=10
x-admin-id: <superadmin_id>
```

### Suspend a School
```bash
POST /SuperAdmin/School/:schoolId/Suspend
x-admin-id: <superadmin_id>
Content-Type: application/json

{
  "reason": "Non-payment of fees"
}
```

### Activate a School
```bash
POST /SuperAdmin/School/:schoolId/Activate
x-admin-id: <superadmin_id>
```

### Register School Admin
```bash
POST /SuperAdmin/Admin/Register
x-admin-id: <superadmin_id>
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@abcschool.com",
  "password": "AdminPassword123",
  "schoolName": "ABC School"
}
```

### Create Subscription
```bash
POST /SuperAdmin/Subscription/Create
x-admin-id: <superadmin_id>
Content-Type: application/json

{
  "schoolId": "<school_id>",
  "planName": "Professional",
  "planPrice": 5000,
  "billingCycle": "Monthly",
  "startDate": "2024-06-09",
  "endDate": "2024-07-09",
  "maxStudents": 1000,
  "maxTeachers": 100,
  "features": {
    "assignmentsEnabled": true,
    "attendanceEnabled": true,
    "feesEnabled": true,
    "examsEnabled": true,
    "smsNotifications": true,
    "advancedReports": true
  }
}
```

### Reset Admin Password
```bash
POST /SuperAdmin/Admin/:adminId/ResetPassword
x-admin-id: <superadmin_id>
Content-Type: application/json

{
  "newPassword": "NewPassword456"
}
```

### Create Academic Year
```bash
POST /SuperAdmin/AcademicYear/Create
x-admin-id: <superadmin_id>
Content-Type: application/json

{
  "yearName": "2024/2025",
  "startDate": "2024-01-08",
  "endDate": "2024-11-29",
  "terms": [
    {
      "termNumber": 1,
      "termName": "Term 1",
      "startDate": "2024-01-08",
      "endDate": "2024-03-29"
    }
  ]
}
```

### View System Logs
```bash
GET /SuperAdmin/SystemLogs?action=SUSPEND_SCHOOL&page=1&limit=20
x-admin-id: <superadmin_id>
```

### Get System Statistics
```bash
GET /SuperAdmin/SystemStats
x-admin-id: <superadmin_id>
```

### Create Backup
```bash
POST /SuperAdmin/Backup/Create
x-admin-id: <superadmin_id>
Content-Type: application/json

{
  "backupName": "Full_Backup_2024_06_09",
  "backupType": "Full",
  "backupLocation": "Cloud",
  "cloudProvider": "AWS",
  "encryptionStatus": true
}
```

### Generate Report
```bash
POST /SuperAdmin/Report/Generate
x-admin-id: <superadmin_id>
Content-Type: application/json

{
  "reportType": "schools",
  "startDate": "2024-01-01",
  "endDate": "2024-06-09"
}
```

---

## 🔍 Available Report Types

1. **schools** - List all schools with details
2. **subscriptions** - List all subscriptions
3. **revenue** - Revenue breakdown by plan
4. **systemLogs** - System activity logs

---

## 🎯 Endpoint Categories

### School Management (6 endpoints)
- `GET /SuperAdmin/Schools` - List schools
- `POST /SuperAdmin/School/Create` - Create school
- `PUT /SuperAdmin/School/:schoolId` - Update school
- `DELETE /SuperAdmin/School/:schoolId` - Delete school
- `POST /SuperAdmin/School/:schoolId/Suspend` - Suspend school
- `POST /SuperAdmin/School/:schoolId/Activate` - Activate school

### Admin Management (4 endpoints)
- `POST /SuperAdmin/Admin/Register` - Register admin
- `GET /SuperAdmin/Admins` - List admins
- `POST /SuperAdmin/Admin/:adminId/ResetPassword` - Reset password
- `DELETE /SuperAdmin/Admin/:adminId` - Delete admin

### Subscription Management (4 endpoints)
- `POST /SuperAdmin/Subscription/Create` - Create subscription
- `PUT /SuperAdmin/Subscription/:subscriptionId` - Update subscription
- `POST /SuperAdmin/Subscription/:subscriptionId/Cancel` - Cancel subscription
- `GET /SuperAdmin/Subscription/School/:schoolId` - Get school subscription

### Academic Year Management (3 endpoints)
- `POST /SuperAdmin/AcademicYear/Create` - Create academic year
- `GET /SuperAdmin/AcademicYears` - List academic years
- `PUT /SuperAdmin/AcademicYear/:academicYearId` - Update academic year

### System Monitoring (2 endpoints)
- `GET /SuperAdmin/SystemLogs` - View system logs
- `GET /SuperAdmin/SystemStats` - View system statistics

### Backup Management (3 endpoints)
- `POST /SuperAdmin/Backup/Create` - Create backup
- `GET /SuperAdmin/Backups` - List backups
- `POST /SuperAdmin/Backup/:backupId/Verify` - Verify backup

### Reporting (1 endpoint)
- `POST /SuperAdmin/Report/Generate` - Generate report

---

## 📊 Query Parameters

### Pagination
- `page` - Page number (default: 1)
- `limit` - Records per page (default: 10)

### Filtering
- `status` - Filter by status
- `subscriptionStatus` - Filter by subscription status
- `search` - Search by name, email, etc.
- `action` - Filter logs by action
- `startDate` - Filter from date
- `endDate` - Filter until date

---

## ✅ Response Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `403` - Forbidden (Not SuperAdmin)
- `404` - Not Found
- `500` - Server Error

---

## 🔐 Security Headers

Always include:
```
x-admin-id: <your_superadmin_id>
Content-Type: application/json
```

---

## 🐛 Troubleshooting

### Error: "Forbidden: Only Super Admin can access this"
- ✅ Check if x-admin-id header is provided
- ✅ Verify admin has SuperAdmin role
- ✅ Confirm admin exists in database

### Error: "School not found"
- ✅ Verify schoolId is correct
- ✅ Check if school has been deleted
- ✅ Ensure school ID format is valid MongoDB ObjectId

### Error: "Invalid School Admin ID"
- ✅ Verify admin exists in database
- ✅ Confirm admin has role "Admin"
- ✅ Check admin is approved

---

## 📝 Common Workflows

### Workflow 1: Onboard New School
1. Register School Admin: `POST /SuperAdmin/Admin/Register`
2. Create School: `POST /SuperAdmin/School/Create`
3. Create Subscription: `POST /SuperAdmin/Subscription/Create`
4. Activate Academic Year: `PUT /SuperAdmin/AcademicYear/:id`

### Workflow 2: Investigate School Issues
1. Get System Logs: `GET /SuperAdmin/SystemLogs?school=:schoolId`
2. Check School Details: `GET /SuperAdmin/Schools?search=schoolName`
3. View Subscription: `GET /SuperAdmin/Subscription/School/:schoolId`

### Workflow 3: Generate Monthly Report
1. Generate Schools Report: `POST /SuperAdmin/Report/Generate`
2. Generate Revenue Report: `POST /SuperAdmin/Report/Generate`
3. Download System Logs: `GET /SuperAdmin/SystemLogs`

---

## 📚 Documentation Files

- `SUPERADMIN_API_DOCUMENTATION.md` - Complete API reference
- `IMPLEMENTATION_GUIDE.md` - Technical implementation details
- `QUICK_REFERENCE.md` - This file

---

## 🆘 Need Help?

1. Check the full API documentation: `SUPERADMIN_API_DOCUMENTATION.md`
2. Review implementation guide: `IMPLEMENTATION_GUIDE.md`
3. Check your request headers and body format
4. Ensure MongoDB is running
5. Check backend console for error messages
6. Verify all models are imported correctly

---

## 🎓 Example: Complete School Onboarding Flow

```bash
# 1. Create SuperAdmin (if not exists)
POST /AdminReg
{
  "name": "Super Admin",
  "email": "superadmin@system.com",
  "password": "SuperPass123",
  "schoolName": "System",
  "role": "SuperAdmin"
}
# Response: superAdminId = "507f1f77bcf86cd799439011"

# 2. Register School Admin
POST /SuperAdmin/Admin/Register
x-admin-id: 507f1f77bcf86cd799439011
{
  "name": "School Admin",
  "email": "admin@newschool.com",
  "password": "AdminPass123",
  "schoolName": "New School"
}
# Response: adminId = "507f1f77bcf86cd799439012"

# 3. Create School
POST /SuperAdmin/School/Create
x-admin-id: 507f1f77bcf86cd799439011
{
  "schoolName": "New School",
  "email": "admin@newschool.com",
  "phone": "0712345678",
  "schoolAdminId": "507f1f77bcf86cd799439012",
  "address": {
    "city": "Nairobi",
    "country": "Kenya"
  }
}
# Response: schoolId = "507f1f77bcf86cd799439013"

# 4. Create Subscription
POST /SuperAdmin/Subscription/Create
x-admin-id: 507f1f77bcf86cd799439011
{
  "schoolId": "507f1f77bcf86cd799439013",
  "planName": "Professional",
  "planPrice": 5000,
  "billingCycle": "Monthly",
  "startDate": "2024-06-09",
  "endDate": "2024-07-09",
  "maxStudents": 1000,
  "maxTeachers": 100,
  "features": {
    "assignmentsEnabled": true,
    "attendanceEnabled": true,
    "feesEnabled": true,
    "examsEnabled": true
  }
}
# Response: Subscription created successfully!

# 5. School is now ready to use!
```

---

**Last Updated:** June 9, 2024
**Version:** 1.0