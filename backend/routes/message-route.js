const router = require('express').Router();

const {
    sendMessageToStudent,
    sendMessageToParent,
    sendMessageToAdminUser,
    sendBulkMessageToStudents,
    sendBulkMessageToParents,
    getAdminStudentList,
    getAdminParentList,
    getSentMessages,
    getMessageDetail,
    getMessageStats,
    deleteMessage
} = require('../controllers/message-controller.js');

// ==================== SEND MESSAGES ====================

// Send message to single student
router.post('/Message/Student/Send', sendMessageToStudent);

// Send message to single parent
router.post('/Message/Parent/Send', sendMessageToParent);

// Send message to internal admin roles (Accountant, HR)
router.post('/Message/Admin/Send', sendMessageToAdminUser);

// Admin recipient lists
router.get('/Admin/StudentList/:id', getAdminStudentList);
router.get('/Admin/ParentList/:id', getAdminParentList);

// Send bulk message to students
router.post('/Message/Students/SendBulk', sendBulkMessageToStudents);

// Send bulk message to parents
router.post('/Message/Parents/SendBulk', sendBulkMessageToParents);

// ==================== GET MESSAGES ====================

// Get all sent messages
router.get('/Message/Sent', getSentMessages);

// Get message detail
router.get('/Message/:messageId', getMessageDetail);

// Get message statistics
router.get('/Message/Stats/Overview', getMessageStats);

// ==================== DELETE ====================

// Delete message
router.delete('/Message/:messageId', deleteMessage);

module.exports = router;