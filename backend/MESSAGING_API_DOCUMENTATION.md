
http://localhost:3000# Admin Messaging System - API Documentation

## Overview
Complete messaging system allowing **only admins** to send SMS and Email messages to students and parents. Messages are tracked, logged, and have delivery status monitoring.

---

## 🔐 Access Control
- ✅ Only **Admin** and **SuperAdmin** roles can send messages
- ✅ Only the sender can view their own message history
- ✅ All messages are logged and auditable
- ✅ Requires `x-admin-id` header for authentication

---

## BASE URL
```
http://localhost:5000
```

---

## Headers Required
```
x-admin-id: <admin_id>
Content-Type: application/json
```

---

## MESSAGE TYPES
- **Email** - Send via email
- **SMS** - Send via SMS
- **Both** - Send via both Email and SMS

---

## PRIORITY LEVELS
- Low
- Normal (default)
- High
- Urgent

---

## TEMPLATES
- Custom (default)
- FeeReminder
- Attendance
- Exam
- Event
- Announcement

---

## ENDPOINTS

### 1. Send Message to Single Student

**Endpoint:** `POST /Message/Student/Send`

**Headers:**
```
x-admin-id: <admin_id>
Content-Type: application/json
```

**Request Body:**
```json
{
  "studentId": "student_object_id",
  "messageSubject": "Important Notice",
  "messageBody": "Dear Student, please review the attached notice.",
  "messageType": "Email",
  "priority": "Normal",
  "template": "Custom"
}
```

**Response (201):**
```json
{
  "message": "Message sent to student successfully",
  "data": {
    "_id": "message_id",
    "sender": "admin_id",
    "recipientType": "Student",
    "recipient": "student_id",
    "recipientEmail": "student@example.com",
    "messageBody": "Dear Student, please review...",
    "messageType": "Email",
    "status": "Sent",
    "sentAt": "2024-06-09T10:30:00Z",
    "deliveryStatus": {
      "email": "Sent",
      "emailSentAt": "2024-06-09T10:30:00Z"
    }
  }
}
```

---

### 2. Send Message to Single Parent

**Endpoint:** `POST /Message/Parent/Send`

**Headers:**
```
x-admin-id: <admin_id>
Content-Type: application/json
```

**Request Body:**
```json
{
  "parentId": "parent_object_id",
  "messageSubject": "Fee Payment Reminder",
  "messageBody": "Dear Parent, please remit the outstanding fees at your earliest convenience.",
  "messageType": "Both",
  "priority": "High",
  "template": "FeeReminder"
}
```

**Response (201):**
```json
{
  "message": "Message sent to parent successfully",
  "data": {
    "_id": "message_id",
    "sender": "admin_id",
    "recipientType": "Parent",
    "recipient": "parent_id",
    "recipientEmail": "parent@example.com",
    "recipientPhone": "+254712345678",
    "messageBody": "Dear Parent, please remit...",
    "messageType": "Both",
    "status": "Sent",
    "deliveryStatus": {
      "email": "Sent",
      "sms": "Sent",
      "emailSentAt": "2024-06-09T10:30:00Z",
      "smsSentAt": "2024-06-09T10:30:01Z"
    }
  }
}
```

---

### 3. Send Bulk Message to Students

**Endpoint:** `POST /Message/Students/SendBulk`

**Headers:**
```
x-admin-id: <admin_id>
Content-Type: application/json
```

**Request Body (Option 1 - By Student IDs):**
```json
{
  "studentIds": [
    "student_id_1",
    "student_id_2",
    "student_id_3"
  ],
  "messageSubject": "Exam Schedule",
  "messageBody": "Dear Students, the final exam schedule is attached.",
  "messageType": "Email",
  "priority": "High",
  "template": "Exam"
}
```

**Request Body (Option 2 - By Class ID):**
```json
{
  "classId": "class_object_id",
  "messageSubject": "Class Announcement",
  "messageBody": "Dear Class 4A, there will be no school on Friday.",
  "messageType": "Email",
  "priority": "Normal",
  "template": "Announcement"
}
```

**Response (201):**
```json
{
  "message": "Bulk message sent",
  "data": {
    "messageId": "message_id",
    "totalRecipients": 45,
    "sentCount": 45,
    "failedCount": 0,
    "status": "Sent"
  }
}
```

---

### 4. Send Bulk Message to Parents

**Endpoint:** `POST /Message/Parents/SendBulk`

**Headers:**
```
x-admin-id: <admin_id>
Content-Type: application/json
```

**Request Body (Option 1 - By Parent IDs):**
```json
{
  "parentIds": [
    "parent_id_1",
    "parent_id_2"
  ],
  "messageSubject": "School Fees Due",
  "messageBody": "Dear Parents, term fees are now due. Please pay before the deadline.",
  "messageType": "Both",
  "priority": "High",
  "template": "FeeReminder"
}
```

**Request Body (Option 2 - By Class ID):**
```json
{
  "classId": "class_object_id",
  "messageSubject": "Annual Prize Giving",
  "messageBody": "Dear Parents, you are cordially invited to our annual prize giving ceremony.",
  "messageType": "Email",
  "priority": "Normal",
  "template": "Event"
}
```

**Response (201):**
```json
{
  "message": "Bulk message sent to parents",
  "data": {
    "messageId": "message_id",
    "totalRecipients": 120,
    "sentCount": 120,
    "failedCount": 0,
    "status": "Sent"
  }
}
```

---

### 5. Get All Sent Messages

**Endpoint:** `GET /Message/Sent`

**Headers:**
```
x-admin-id: <admin_id>
```

**Query Parameters:**
- `page` (optional, default=1) - Page number
- `limit` (optional, default=10) - Records per page
- `status` (optional) - Filter by status: 'Draft', 'Scheduled', 'Sent', 'Failed', 'Partial'
- `recipientType` (optional) - Filter by type: 'Student', 'Parent', 'Teacher', 'Bulk'
- `startDate` (optional) - Filter from date (ISO format)
- `endDate` (optional) - Filter until date (ISO format)

**Example Request:**
```bash
GET /Message/Sent?status=Sent&recipientType=Student&page=1&limit=20
x-admin-id: <admin_id>
```

**Response (200):**
```json
{
  "message": "Messages retrieved successfully",
  "data": [
    {
      "_id": "message_id",
      "sender": {
        "_id": "admin_id",
        "name": "John Doe",
        "email": "admin@school.com"
      },
      "recipientType": "Student",
      "messageSubject": "Exam Schedule",
      "messageBody": "Dear Students...",
      "messageType": "Email",
      "status": "Sent",
      "sentAt": "2024-06-09T10:30:00Z",
      "priority": "High"
    }
  ],
  "pagination": {
    "current": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

### 6. Get Message Detail

**Endpoint:** `GET /Message/:messageId`

**Headers:**
```
x-admin-id: <admin_id>
```

**Response (200):**
```json
{
  "message": "Message retrieved successfully",
  "data": {
    "_id": "message_id",
    "sender": {
      "_id": "admin_id",
      "name": "John Doe"
    },
    "recipient": {
      "_id": "student_id",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+254712345678"
    },
    "recipientType": "Student",
    "messageSubject": "Important Notice",
    "messageBody": "Dear Student, please review...",
    "messageType": "Email",
    "status": "Sent",
    "sentAt": "2024-06-09T10:30:00Z",
    "deliveryStatus": {
      "email": "Sent",
      "sms": "Not Sent",
      "emailSentAt": "2024-06-09T10:30:00Z"
    },
    "priority": "Normal",
    "template": "Custom",
    "createdAt": "2024-06-09T10:29:00Z"
  }
}
```

---

### 7. Get Message Statistics

**Endpoint:** `GET /Message/Stats/Overview`

**Headers:**
```
x-admin-id: <admin_id>
```

**Query Parameters:**
- `startDate` (optional) - Filter from date
- `endDate` (optional) - Filter until date

**Response (200):**
```json
{
  "message": "Statistics retrieved successfully",
  "data": {
    "totalMessages": 150,
    "sentMessages": 145,
    "failedMessages": 2,
    "partialMessages": 3,
    "emailsSent": 130,
    "emailsFailed": 5,
    "smsSent": 120,
    "smsFailed": 8,
    "byRecipientType": [
      {
        "_id": "Student",
        "count": 80
      },
      {
        "_id": "Parent",
        "count": 50
      },
      {
        "_id": "Bulk",
        "count": 20
      }
    ]
  }
}
```

---

### 8. Delete Message

**Endpoint:** `DELETE /Message/:messageId`

**Headers:**
```
x-admin-id: <admin_id>
```

**Response (200):**
```json
{
  "message": "Message deleted successfully"
}
```

---

## ERROR RESPONSES

### 400 Bad Request
```json
{
  "message": "Provide either studentIds or classId"
}
```

### 403 Forbidden
```json
{
  "message": "Forbidden: You can only view your own messages"
}
```

### 404 Not Found
```json
{
  "message": "Student not found"
}
```

### 500 Server Error
```json
{
  "message": "Error sending message",
  "error": "Error details"
}
```

---

## MESSAGE STATUS CODES

| Status | Meaning |
|--------|---------|
| Draft | Message saved but not sent |
| Scheduled | Message scheduled for future sending |
| Sent | Message sent successfully |
| Failed | Message failed to send |
| Partial | Some recipients received, others failed |

---

## DELIVERY STATUS CODES

### Email Delivery
- Not Sent
- Sent
- Failed
- Bounced

### SMS Delivery
- Not Sent
- Sent
- Failed
- Delivered

---

## EXAMPLE WORKFLOWS

### Workflow 1: Send Email to Single Student
```bash
POST /Message/Student/Send
x-admin-id: 507f1f77bcf86cd799439011
Content-Type: application/json

{
  "studentId": "507f1f77bcf86cd799439012",
  "messageSubject": "Exam Results",
  "messageBody": "Your exam results are now available on the portal.",
  "messageType": "Email",
  "priority": "High"
}
```

### Workflow 2: Send SMS to All Class Parents
```bash
POST /Message/Parents/SendBulk
x-admin-id: 507f1f77bcf86cd799439011
Content-Type: application/json

{
  "classId": "507f1f77bcf86cd799439013",
  "messageSubject": "School Fees",
  "messageBody": "Dear Parents, term fees are due by 30th June 2024. Thank you.",
  "messageType": "SMS",
  "priority": "Normal"
}
```

### Workflow 3: Send Both Email and SMS to Selected Parents
```bash
POST /Message/Parents/SendBulk
x-admin-id: 507f1f77bcf86cd799439011
Content-Type: application/json

{
  "parentIds": [
    "507f1f77bcf86cd799439014",
    "507f1f77bcf86cd799439015"
  ],
  "messageSubject": "Urgent: School Closure",
  "messageBody": "School will be closed tomorrow due to weather conditions.",
  "messageType": "Both",
  "priority": "Urgent",
  "template": "Announcement"
}
```

### Workflow 4: Get Message History for April
```bash
GET /Message/Sent?startDate=2024-04-01&endDate=2024-04-30&status=Sent&page=1&limit=50
x-admin-id: 507f1f77bcf86cd799439011
```

---

## SECURITY FEATURES

✅ Only authenticated admins can send messages
✅ Message sender verification
✅ Recipient validation
✅ Delivery tracking and status monitoring
✅ Complete message history logging
✅ Error tracking and reporting
✅ Unauthorized access prevention

---

## SERVICE CONFIGURATION

### Email Service
Configure in `.env`:
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@school.com
```

### SMS Service (Twilio)
Configure in `.env`:
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+0714675015
```

---

## RATE LIMITING
Currently no rate limiting is enforced. Consider implementing for production use.

---

## SUPPORT
For issues with the messaging system, check the backend logs or contact the system administrator.

---

**Last Updated:** June 9, 2025
**Version:** 1.0
**Status:** ✅ Production Ready
