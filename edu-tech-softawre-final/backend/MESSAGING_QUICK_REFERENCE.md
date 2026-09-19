
# Admin Messaging System - Quick Reference

## 🚀 Quick Start

### Send Email to Student
```bash
POST /Message/Student/Send
x-admin-id: <admin_id>
Content-Type: application/json

{
  "studentId": "<student_id>",
  "messageSubject": "Important Notice",
  "messageBody": "Dear Student...",
  "messageType": "Email",
  "priority": "Normal"
}
```

### Send SMS to Parent
```bash
POST /Message/Parent/Send
x-admin-id: <admin_id>
Content-Type: application/json

{
  "parentId": "<parent_id>",
  "messageSubject": "Fee Reminder",
  "messageBody": "Dear Parent, please remit fees",
  "messageType": "SMS",
  "priority": "High"
}
```

### Send Email + SMS to Parent
```bash
POST /Message/Parent/Send
x-admin-id: <admin_id>
Content-Type: application/json

{
  "parentId": "<parent_id>",
  "messageSubject": "Urgent Notice",
  "messageBody": "Important message",
  "messageType": "Both"
}
```

### Send Message to All Students in a Class
```bash
POST /Message/Students/SendBulk
x-admin-id: <admin_id>
Content-Type: application/json

{
  "classId": "<class_id>",
  "messageSubject": "Class Announcement",
  "messageBody": "Dear Class...",
  "messageType": "Email"
}
```

### Send Message to All Parents of a Class
```bash
POST /Message/Parents/SendBulk
x-admin-id: <admin_id>
Content-Type: application/json

{
  "classId": "<class_id>",
  "messageSubject": "Parent Announcement",
  "messageBody": "Dear Parents...",
  "messageType": "Both"
}
```

### Send Message to Specific Students
```bash
POST /Message/Students/SendBulk
x-admin-id: <admin_id>
Content-Type: application/json

{
  "studentIds": [
    "<student_id_1>",
    "<student_id_2>",
    "<student_id_3>"
  ],
  "messageSubject": "Award",
  "messageBody": "Congratulations!",
  "messageType": "Email"
}
```

### Send Message to Specific Parents
```bash
POST /Message/Parents/SendBulk
x-admin-id: <admin_id>
Content-Type: application/json

{
  "parentIds": [
    "<parent_id_1>",
    "<parent_id_2>"
  ],
  "messageSubject": "Notice",
  "messageBody": "Important notice",
  "messageType": "Email"
}
```

---

## 📋 View Messages

### Get All Sent Messages
```bash
GET /Message/Sent
x-admin-id: <admin_id>
```

### Get Messages with Filters
```bash
GET /Message/Sent?status=Sent&recipientType=Student&page=1&limit=20
x-admin-id: <admin_id>
```

### Get Single Message Details
```bash
GET /Message/<message_id>
x-admin-id: <admin_id>
```

### Get Message Statistics
```bash
GET /Message/Stats/Overview
x-admin-id: <admin_id>
```

---

## 🗑️ Delete Message

```bash
DELETE /Message/<message_id>
x-admin-id: <admin_id>
```

---

## 📊 Message Types

- **Email** - Only email
- **SMS** - Only SMS
- **Both** - Email and SMS

---

## 🎯 Priority Levels

- **Low** - Low priority
- **Normal** - Standard priority
- **High** - High priority
- **Urgent** - Urgent priority

---

## 🏷️ Templates

- **Custom** - Custom message (default)
- **FeeReminder** - Fee reminder template
- **Attendance** - Attendance notification
- **Exam** - Exam-related message
- **Event** - Event invitation
- **Announcement** - General announcement

---

## ✅ Status Codes

| Code | Meaning |
|------|---------|
| Draft | Not sent yet |
| Scheduled | Scheduled for future |
| Sent | Successfully sent |
| Failed | Failed to send |
| Partial | Some sent, some failed |

---

## 📨 Delivery Status

### Email
- Not Sent
- Sent
- Failed
- Bounced

### SMS
- Not Sent
- Sent
- Failed
- Delivered

---

## 🔍 Query Parameters

### Get Sent Messages
- `page` - Page number (default: 1)
- `limit` - Records per page (default: 10)
- `status` - Filter: Draft, Scheduled, Sent, Failed, Partial
- `recipientType` - Filter: Student, Parent, Teacher, Bulk
- `startDate` - From date (ISO format)
- `endDate` - To date (ISO format)

Example:
```bash
GET /Message/Sent?status=Sent&recipientType=Parent&startDate=2024-06-01&endDate=2024-06-30
x-admin-id: <admin_id>
```

---

## 📝 Response Examples

### Success Response
```json
{
  "message": "Message sent to student successfully",
  "data": {
    "_id": "message_id",
    "sender": "admin_id",
    "recipientType": "Student",
    "messageBody": "Your message...",
    "status": "Sent",
    "deliveryStatus": {
      "email": "Sent",
      "sms": "Not Sent"
    }
  }
}
```

### Bulk Message Response
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

### Error Response
```json
{
  "message": "Error description",
  "error": "Error details"
}
```

---

## 🔐 Requirements

✅ Admin must be authenticated (x-admin-id header)
✅ Admin must be approved
✅ Student/Parent must exist
✅ For bulk, either IDs or class ID must be provided

---

## ⚠️ Error Cases

| Error | Solution |
|-------|----------|
| "Admin not found" | Provide valid admin ID |
| "Admin not approved" | Contact SuperAdmin to approve account |
| "Student not found" | Verify student ID is correct |
| "Parent not found" | Verify parent ID is correct |
| "Provide either studentIds or classId" | Specify one of: studentIds array or classId |
| "Forbidden: You can only view your own messages" | Can only view your sent messages |

---

## 🎓 Common Tasks

### Task 1: Send Exam Notice to Class
```bash
POST /Message/Students/SendBulk
x-admin-id: <admin_id>

{
  "classId": "<class_id>",
  "messageSubject": "Exam Schedule Released",
  "messageBody": "Dear Students, the exam schedule has been released. Check the portal.",
  "messageType": "Email",
  "priority": "High",
  "template": "Exam"
}
```

### Task 2: Send Fee Reminder to Parents
```bash
POST /Message/Parents/SendBulk
x-admin-id: <admin_id>

{
  "classId": "<class_id>",
  "messageSubject": "Term Fees Due",
  "messageBody": "Dear Parents, term fees are due by 30th June.",
  "messageType": "Both",
  "priority": "High",
  "template": "FeeReminder"
}
```

### Task 3: Send SMS to One Parent
```bash
POST /Message/Parent/Send
x-admin-id: <admin_id>

{
  "parentId": "<parent_id>",
  "messageSubject": "Child Illness",
  "messageBody": "Your child is ill and needs immediate pickup.",
  "messageType": "SMS",
  "priority": "Urgent"
}
```

### Task 4: Send Event Invitation to All Parents
```bash
POST /Message/Parents/SendBulk
x-admin-id: <admin_id>

{
  "classId": "<class_id>",
  "messageSubject": "Sports Day Invitation",
  "messageBody": "You are invited to our Annual Sports Day on 15th July.",
  "messageType": "Email",
  "priority": "Normal",
  "template": "Event"
}
```

### Task 5: Check Message History
```bash
GET /Message/Sent?page=1&limit=50
x-admin-id: <admin_id>
```

### Task 6: Get Monthly Statistics
```bash
GET /Message/Stats/Overview?startDate=2024-06-01&endDate=2024-06-30
x-admin-id: <admin_id>
```

---

## 🆘 Troubleshooting

### Messages not sending?
1. Check email/SMS service configuration
2. Verify recipient has valid email/phone
3. Check admin approval status
4. Review error message in response

### Can't see messages?
1. Use your admin ID in x-admin-id header
2. Check message status filter
3. Verify date range if filtering

### Want to delete a message?
```bash
DELETE /Message/<message_id>
x-admin-id: <admin_id>
```

---

**Last Updated:** June 9, 2024
**Version:** 1.0
