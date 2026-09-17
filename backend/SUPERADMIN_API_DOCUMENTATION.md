# SuperAdmin API Documentation

## Overview
This document provides complete API documentation for the SuperAdmin features in the School Management System. SuperAdmin has system-wide access and can manage all schools, subscriptions, admins, and system operations.

## Authentication
All SuperAdmin endpoints require the `x-admin-id` header containing a valid SuperAdmin user ID.

```
Header: x-admin-id: <superadmin_id>
```

---

## BASE URL
```
http://localhost:5000/api
```

---

## TABLE OF CONTENTS
1. [School Management](#school-management)
2. [School Admin Management](#school-admin-management)
3. [Subscription Management](#subscription-management)
4. [Academic Year Management](#academic-year-management)
5. [System Logs & Monitoring](#system-logs--monitoring)
6. [Backup Management](#backup-management)
7. [Reports](#reports)

---

## SCHOOL MANAGEMENT

### 1. Get All Schools
**Endpoint:** `GET /SuperAdmin/Schools`

**Query Parameters:**
- `status` (optional): Filter by status - 'Active', 'Suspended', 'Inactive', 'Pending'
- `subscriptionStatus` (optional): Filter by subscription status - 'Active', 'Expired', 'Suspended', 'Cancelled'
- `page` (optional, default=1): Pagination page number
- `limit` (optional, default=10): Number of records per page
- `search` (optional): Search by school name or email

**Example Request:**
```bash
curl -H "x-admin-id: <superadmin_id>" \
  "http://localhost:5000/SuperAdmin/Schools?status=Active&page=1&limit=10"
```

**Response:**
```json
{
  "message": "Schools retrieved successfully",
  "schools": [
    {
      "_id": "school_id",
      "schoolName": "ABC School",
      "email": "admin@abcschool.com",
      "phone": "0712345678",
      "status": "Active",
      "subscriptionStatus": "Active",
      "studentCount": 500,
      "teacherCount": 50,
      "registrationDate": "2024-01-15",
      "schoolAdmin": {
        "_id": "admin_id",
        "name": "John Doe",
        "email": "admin@abcschool.com"
      }
    }
  ],
  "pagination": {
    "current": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

---

### 2. Create a School
**Endpoint:** `POST /SuperAdmin/School/Create`

**Request Body:**
```json
{
  "schoolName": "ABC School",
  "email": "admin@abcschool.com",
  "phone": "0712345678",
  "address": {
    "street": "123 Main Street",
    "city": "Nairobi",
    "state": "Nairobi",
    "zipCode": "00100",
    "country": "Kenya"
  },
  "schoolAdminId": "<admin_id>",
  "metadata": {
    "principalName": "Dr. Jane Smith",
    "principalPhone": "0787654321",
    "establishedYear": 2010,
    "affiliation": "KCSE",
    "board": "Kenya"
  },
  "paymentSettings": {
    "paybillCode": "SCHOOL-001",
    "currency": "KES",
    "bankDetails": {
      "bankName": "Kenya Commercial Bank",
      "accountNumber": "1234567890",
      "accountName": "ABC School Limited"
    }
  }
}
```

**Response:**
```json
{
  "message": "School created successfully",
  "school": {
    "_id": "new_school_id",
    "schoolName": "ABC School",
    "email": "admin@abcschool.com",
    "status": "Active",
    "createdAt": "2024-06-09T10:30:00Z"
  }
}
```

---

### 3. Update School Details
**Endpoint:** `PUT /SuperAdmin/School/:schoolId`

**Request Body:**
```json
{
  "schoolName": "ABC School Updated",
  "phone": "0712345679",
  "metadata": {
    "principalName": "Dr. Jane Smith Updated"
  }
}
```

**Response:**
```json
{
  "message": "School updated successfully",
  "school": {
    "_id": "schoolId",
    "schoolName": "ABC School Updated",
    "updatedAt": "2024-06-09T11:00:00Z"
  }
}
```

---

### 4. Delete a School
**Endpoint:** `DELETE /SuperAdmin/School/:schoolId`

**Response:**
```json
{
  "message": "School deleted successfully"
}
```

---

### 5. Suspend a School
**Endpoint:** `POST /SuperAdmin/School/:schoolId/Suspend`

**Request Body:**
```json
{
  "reason": "Non-payment of subscription fees"
}
```

**Response:**
```json
{
  "message": "School suspended successfully",
  "school": {
    "_id": "schoolId",
    "status": "Suspended",
    "statusChangedAt": "2024-06-09T11:30:00Z"
  }
}
```

---

### 6. Activate a School
**Endpoint:** `POST /SuperAdmin/School/:schoolId/Activate`

**Response:**
```json
{
  "message": "School activated successfully",
  "school": {
    "_id": "schoolId",
    "status": "Active",
    "statusChangedAt": "2024-06-09T11:45:00Z"
  }
}
```

---

## SCHOOL ADMIN MANAGEMENT

### 1. Register New School Admin
**Endpoint:** `POST /SuperAdmin/Admin/Register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@abcschool.com",
  "password": "securePassword123",
  "schoolName": "ABC School"
}
```

**Response:**
```json
{
  "message": "School Admin registered successfully",
  "admin": {
    "_id": "admin_id",
    "name": "John Doe",
    "email": "john@abcschool.com",
    "schoolName": "ABC School"
  }
}
```

---

### 2. Get All School Admins
**Endpoint:** `GET /SuperAdmin/Admins`

**Query Parameters:**
- `approved` (optional): Filter by approval status - 'true' or 'false'
- `page` (optional, default=1): Pagination page number
- `limit` (optional, default=10): Number of records per page
- `search` (optional): Search by name, email, or school name

**Response:**
```json
{
  "message": "Admins retrieved successfully",
  "admins": [
    {
      "_id": "admin_id",
      "name": "John Doe",
      "email": "john@abcschool.com",
      "schoolName": "ABC School",
      "role": "Admin",
      "approved": true,
      "createdAt": "2024-01-15"
    }
  ],
  "pagination": {
    "current": 1,
    "limit": 10,
    "total": 15,
    "pages": 2
  }
}
```

---

### 3. Reset School Admin Password
**Endpoint:** `POST /SuperAdmin/Admin/:adminId/ResetPassword`

**Request Body:**
```json
{
  "newPassword": "newSecurePassword456"
}
```

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

---

### 4. Delete School Admin
**Endpoint:** `DELETE /SuperAdmin/Admin/:adminId`

**Response:**
```json
{
  "message": "Admin deleted successfully"
}
```

---

## SUBSCRIPTION MANAGEMENT

### 1. Create Subscription
**Endpoint:** `POST /SuperAdmin/Subscription/Create`

**Request Body:**
```json
{
  "schoolId": "school_id",
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

**Response:**
```json
{
  "message": "Subscription created successfully",
  "subscription": {
    "_id": "subscription_id",
    "school": "school_id",
    "planName": "Professional",
    "status": "Active",
    "startDate": "2024-06-09",
    "endDate": "2024-07-09"
  }
}
```

---

### 2. Update Subscription
**Endpoint:** `PUT /SuperAdmin/Subscription/:subscriptionId`

**Request Body:**
```json
{
  "planName": "Enterprise",
  "planPrice": 10000,
  "maxStudents": 2000,
  "features": {
    "customDomain": true,
    "bulkOperations": true,
    "prioritySupport": true
  }
}
```

**Response:**
```json
{
  "message": "Subscription updated successfully",
  "subscription": {
    "_id": "subscription_id",
    "planName": "Enterprise",
    "updated": true
  }
}
```

---

### 3. Cancel Subscription
**Endpoint:** `POST /SuperAdmin/Subscription/:subscriptionId/Cancel`

**Request Body:**
```json
{
  "reason": "School closure"
}
```

**Response:**
```json
{
  "message": "Subscription cancelled successfully",
  "subscription": {
    "_id": "subscription_id",
    "status": "Cancelled"
  }
}
```

---

### 4. Get School Subscription
**Endpoint:** `GET /SuperAdmin/Subscription/School/:schoolId`

**Response:**
```json
{
  "message": "Subscription retrieved successfully",
  "subscription": {
    "_id": "subscription_id",
    "school": {
      "_id": "school_id",
      "schoolName": "ABC School"
    },
    "planName": "Professional",
    "status": "Active"
  }
}
```

---

## ACADEMIC YEAR MANAGEMENT

### 1. Create Academic Year
**Endpoint:** `POST /SuperAdmin/AcademicYear/Create`

**Request Body:**
```json
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
    },
    {
      "termNumber": 2,
      "termName": "Term 2",
      "startDate": "2024-04-15",
      "endDate": "2024-07-26"
    },
    {
      "termNumber": 3,
      "termName": "Term 3",
      "startDate": "2024-08-12",
      "endDate": "2024-11-29"
    }
  ],
  "feesSchedule": [
    {
      "installmentName": "Term 1 Fees",
      "dueDate": "2024-01-08",
      "amount": 50000
    }
  ],
  "holidays": [
    {
      "holidayName": "Easter",
      "startDate": "2024-03-28",
      "endDate": "2024-04-14"
    }
  ]
}
```

**Response:**
```json
{
  "message": "Academic year created successfully",
  "academicYear": {
    "_id": "year_id",
    "yearName": "2024/2025",
    "status": "Active"
  }
}
```

---

### 2. Get All Academic Years
**Endpoint:** `GET /SuperAdmin/AcademicYears`

**Response:**
```json
{
  "message": "Academic years retrieved successfully",
  "academicYears": [
    {
      "_id": "year_id",
      "yearName": "2024/2025",
      "startDate": "2024-01-08",
      "endDate": "2024-11-29",
      "isActive": true
    }
  ]
}
```

---

### 3. Update Academic Year
**Endpoint:** `PUT /SuperAdmin/AcademicYear/:academicYearId`

**Request Body:**
```json
{
  "isActive": true,
  "examSchedule": "InProgress"
}
```

**Response:**
```json
{
  "message": "Academic year updated successfully",
  "academicYear": {
    "_id": "year_id",
    "yearName": "2024/2025",
    "updated": true
  }
}
```

---

## SYSTEM LOGS & MONITORING

### 1. Get System Logs
**Endpoint:** `GET /SuperAdmin/SystemLogs`

**Query Parameters:**
- `action` (optional): Filter by action type (e.g., 'CREATE_SCHOOL', 'SUSPEND_SCHOOL', etc.)
- `school` (optional): Filter by school ID
- `page` (optional, default=1): Pagination page number
- `limit` (optional, default=20): Number of records per page
- `startDate` (optional): Filter logs from this date
- `endDate` (optional): Filter logs until this date

**Example Request:**
```bash
curl -H "x-admin-id: <superadmin_id>" \
  "http://localhost:5000/SuperAdmin/SystemLogs?action=SUSPEND_SCHOOL&page=1"
```

**Response:**
```json
{
  "message": "System logs retrieved successfully",
  "logs": [
    {
      "_id": "log_id",
      "action": "SUSPEND_SCHOOL",
      "actor": {
        "_id": "superadmin_id",
        "name": "Super Admin",
        "email": "superadmin@system.com"
      },
      "school": {
        "_id": "school_id",
        "schoolName": "ABC School"
      },
      "description": "School suspended. Reason: Non-payment",
      "timestamp": "2024-06-09T10:30:00Z"
    }
  ],
  "pagination": {
    "current": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

---

### 2. Get System Statistics
**Endpoint:** `GET /SuperAdmin/SystemStats`

**Response:**
```json
{
  "message": "System stats retrieved successfully",
  "stats": {
    "totalSchools": 150,
    "activeSchools": 145,
    "suspendedSchools": 5,
    "totalAdmins": 160,
    "activeSubscriptions": 140,
    "totalSubscriptions": 150,
    "revenueData": [
      {
        "_id": "Professional",
        "total": 500000
      }
    ],
    "systemLogs": 2500,
    "backups": 25
  }
}
```

---

## BACKUP MANAGEMENT

### 1. Create Backup
**Endpoint:** `POST /SuperAdmin/Backup/Create`

**Request Body:**
```json
{
  "backupName": "Full_Backup_2024_06_09",
  "backupType": "Full",
  "schoolId": null,
  "backupLocation": "Cloud",
  "cloudProvider": "AWS",
  "encryptionStatus": true
}
```

**Response:**
```json
{
  "message": "Backup created successfully",
  "backup": {
    "_id": "backup_id",
    "backupName": "Full_Backup_2024_06_09",
    "status": "Running"
  }
}
```

---

### 2. Get All Backups
**Endpoint:** `GET /SuperAdmin/Backups`

**Query Parameters:**
- `status` (optional): Filter by status - 'Running', 'Completed', 'Failed', 'Verified'
- `school` (optional): Filter by school ID
- `page` (optional, default=1): Pagination page number
- `limit` (optional, default=10): Number of records per page

**Response:**
```json
{
  "message": "Backups retrieved successfully",
  "backups": [
    {
      "_id": "backup_id",
      "backupName": "Full_Backup_2024_06_09",
      "status": "Verified",
      "backupSize": 5368709120,
      "createdAt": "2024-06-09T10:00:00Z"
    }
  ],
  "pagination": {
    "current": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

---

### 3. Verify Backup
**Endpoint:** `POST /SuperAdmin/Backup/:backupId/Verify`

**Response:**
```json
{
  "message": "Backup verified successfully",
  "backup": {
    "_id": "backup_id",
    "verificationStatus": "Verified",
    "status": "Verified"
  }
}
```

---

## REPORTS

### 1. Generate Report
**Endpoint:** `POST /SuperAdmin/Report/Generate`

**Request Body:**
```json
{
  "reportType": "schools",
  "startDate": "2024-01-01",
  "endDate": "2024-06-09",
  "schoolId": null
}
```

**Report Types:**
- `schools`: List of all schools with details
- `subscriptions`: List of all subscriptions
- `revenue`: Revenue breakdown by plan
- `systemLogs`: System activity logs

**Response (Schools Report):**
```json
{
  "message": "Report generated successfully",
  "reportType": "schools",
  "reportData": [
    {
      "_id": "school_id",
      "schoolName": "ABC School",
      "email": "admin@abcschool.com",
      "status": "Active",
      "studentCount": 500,
      "schoolAdmin": {
        "name": "John Doe"
      }
    }
  ]
}
```

**Response (Revenue Report):**
```json
{
  "message": "Report generated successfully",
  "reportType": "revenue",
  "reportData": [
    {
      "_id": "Professional",
      "totalRevenue": 500000,
      "count": 100
    }
  ]
}
```

---

## ERROR RESPONSES

### 403 Forbidden
```json
{
  "message": "Forbidden: Only Super Admin can access this"
}
```

### 404 Not Found
```json
{
  "message": "School not found"
}
```

### 400 Bad Request
```json
{
  "message": "Invalid request data"
}
```

### 500 Server Error
```json
{
  "message": "Error creating school",
  "error": "Error details"
}
```

---

## AUTHENTICATION HEADER EXAMPLES

**Using SuperAdmin ID:**
```bash
curl -H "x-admin-id: 507f1f77bcf86cd799439011" \
  http://localhost:5000/SuperAdmin/Schools
```

---

## RATE LIMITING
Currently no rate limiting is enforced. Consider implementing rate limiting for production.

---

## SECURITY NOTES
1. Always use HTTPS in production
2. Protect the `x-admin-id` header value
3. Implement strong password policies
4. Enable encryption for all sensitive data
5. Regular backups are essential
6. Monitor system logs regularly
7. Implement audit trails for all critical operations

---

## SUPPORT
For API support and issues, contact the system administrator.