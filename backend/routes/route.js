
const router = require('express').Router();
const { sendResetPasswordLink } = require('../services/emailService.js');

// Import rate limiters for sensitive endpoints
const { loginLimiter, passwordResetLimiter, studentRegistrationLimiter, adminTeacherRegistrationLimiter, fileUploadLimiter, paymentWebhookLimiter, parentLookupLimiter } = require('../middleware/rateLimiter');
const { testEmailEndpointEnabled, testPaymentEndpointsEnabled } = require('../utils/securityEnv.js');

// Import SuperAdmin routes
const superAdminRoutes = require('./superadmin-route.js');
const messageRoutes = require('./message-route.js');

// const { adminRegister, adminLogIn, deleteAdmin, getAdminDetail, updateAdmin } = require('../controllers/admin-controller.js');

const { adminRegister, adminLogIn, updateAdmin, addAccountant, addHR, getAccountants, getHRStaff, getAdminDetail, getPendingAdmins, approveAdmin, declineAdmin, getAdminSummary, getAdminSettings, updateAdminSettings, getSystemBackup, getRegisteredSchools, getPendingSchools, getAdminStats, updateAdminRole, requestAdminPasswordReset, resetAdminPassword, sendAdmin2FACode, verifyAdmin2FACode } = require('../controllers/admin-controller.js');
const { parentLogIn, getStudentFeeInfo, parentPayFee, getParentStudents, initiateStk, mockInitiateStk, checkStkStatus, mpesaCallback } = require('../controllers/parent-controller.js');

const { sclassCreate, sclassList, deleteSclass, deleteSclasses, getSclassDetail, getSclassStudents, promoteSclassStudents } = require('../controllers/class-controller.js');
const { generateTimetableForClass, updateTimetableForClass, getTimetableForClass } = require('../controllers/timetable-controller.js');
const { complainCreate, complainList } = require('../controllers/complain-controller.js');
const { noticeCreate, noticeList, deleteNotices, deleteNotice, updateNotice } = require('../controllers/notice-controller.js');
const {
    studentRegister,
    studentLogIn,
    getStudents,
    getStudentDetail,
    deleteStudents,
    deleteStudent,
    cleanupTempStudent,
    updateStudent,
    studentFeePayment,
    paymentWebhook,
    getPaymentReconciliation,
    applyPaymentReconciliation,
    verifyPayment,
    getPaymentStats,
    sendPaymentReminder,
    studentAttendance,
    deleteStudentsByClass,
    updateExamResult,
    clearAllStudentsAttendanceBySubject,
    clearAllStudentsAttendance,
    removeStudentAttendanceBySubject,
    removeStudentAttendance,
    requestStudentPasswordReset,
    resetStudentPassword,
    changeStudentPassword,
    resetStudentPasswordByAdmin,
    getAcademicReport,
    searchStudent,
    searchChequePayment,
    importStudents } = require('../controllers/student_controller.js');
const { verifyEntityBelongsToAdminSchool } = require('../middleware/schoolAccess.js');
const upload = require('../middleware/upload.js');
const csvUpload = require('../middleware/csvUpload.js');
const learningUpload = require('../middleware/learningUpload.js');
const { subjectCreate, classSubjects, deleteSubjectsByClass, getSubjectDetail, deleteSubject, freeSubjectList, allSubjects, deleteSubjects } = require('../controllers/subject-controller.js');
const { teacherRegister, teacherLogIn, getTeachers, getTeacherDetail, deleteTeachers, deleteTeachersByClass, deleteTeacher, updateTeacher, updateTeacherSubject, updateTeacherRole, teacherAttendance, requestTeacherPasswordReset, resetTeacherPassword, resetTeacherPasswordByAdmin, payTeacherSalary, approveSalaryPayment, rejectSalaryPayment, searchTeacher } = require('../controllers/teacher-controller.js');
const { payrollExport } = require('../controllers/teacher-controller.js');
const { createAssignment, getAssignmentsBySchool, getAssignmentsByClass, getAssignmentDetail, submitAssignment, getAssignmentSubmissions, searchAssignments } = require('../controllers/assignment-controller.js');
const { sendMessage, getInbox, getUnreadCount, markAsRead, addResponse, resolveCommunication, broadcastNotification, getCommunicationStats } = require('../controllers/hrAccountantCommunication-controller.js');const { submitExpenseClaim, getExpenseClaims, updateExpenseClaimStatus } = require('../controllers/expense-controller.js');const { createLearningMaterial, getLearningMaterialsByClass, getLearningMaterialsBySchool, createLiveClass, getLiveClassesByClass, joinLiveClass, createQuiz, getQuizzesByClass } = require('../controllers/learning-controller.js');
const { saveLegalAcceptance } = require('../controllers/legalAcceptance-controller.js');
const { exportSchoolData, exportTeacherStudents, exportHrData, exportAccountantData } = require('../controllers/dataExport-controller.js');

// Admin
router.post('/AdminReg', studentRegistrationLimiter, adminRegister);
router.post('/SuperAdminReg', studentRegistrationLimiter, adminRegister);
router.post('/AdminLogin', loginLimiter, adminLogIn);
router.post('/LegalAcceptance', saveLegalAcceptance);
router.get('/Exports/SchoolData', exportSchoolData);
router.get('/Exports/TeacherStudents', exportTeacherStudents);
router.get('/Exports/HRData', exportHrData);
router.get('/Exports/AccountantData', exportAccountantData);
router.post('/AccountantLogin', loginLimiter, adminLogIn);
router.post('/HRLogin', loginLimiter, adminLogIn);
router.post('/Admin/Accountant/Register', studentRegistrationLimiter, addAccountant);
router.post('/Admin/HR/Register', studentRegistrationLimiter, addHR);
router.get('/Admin/Accountants', getAccountants);
router.get('/Admin/HR', getHRStaff);
router.get('/Admin/Pending', getPendingAdmins);
router.get('/Admin/PendingSchools', getPendingSchools);
router.get('/Admin/RegisteredSchools', getRegisteredSchools);
router.get('/Admin/Stats', getAdminStats);
router.get('/Admin/Summary', getAdminSummary);
router.put('/Admin/Approve/:id', approveAdmin);
router.put('/Admin/Decline/:id', declineAdmin);
router.get('/Admin/Settings/:id', getAdminSettings);
router.put('/Admin/Settings/:id', updateAdminSettings);
router.put('/Admin/:id', updateAdmin);
router.get('/Admin/Backup/:id', getSystemBackup);
router.put('/Admin/Role/:id', updateAdminRole);
router.post('/Admin/2FA/SendCode', sendAdmin2FACode);
router.post('/Admin/2FA/Verify', verifyAdmin2FACode);
router.post('/Admin/RequestPasswordReset', passwordResetLimiter, requestAdminPasswordReset);
router.post('/Admin/ResetPassword/:token', passwordResetLimiter, resetAdminPassword);
router.post('/SuperAdmin/RequestPasswordReset', passwordResetLimiter, requestAdminPasswordReset);
router.post('/SuperAdmin/ResetPassword/:token', passwordResetLimiter, resetAdminPassword);
// Expose Accountant/HR endpoints that reuse admin reset handlers
router.post('/Accountant/RequestPasswordReset', passwordResetLimiter, requestAdminPasswordReset);
router.post('/Accountant/ResetPassword/:token', passwordResetLimiter, resetAdminPassword);
router.post('/HR/RequestPasswordReset', passwordResetLimiter, requestAdminPasswordReset);
router.post('/HR/ResetPassword/:token', passwordResetLimiter, resetAdminPassword);

// Developer diagnostic endpoint (disabled by default).
// SECURITY: this endpoint sends email through the configured provider without
// authentication, so it is only mounted when ENABLE_TEST_EMAIL_ENDPOINT=true
// and NODE_ENV is not production.
if (testEmailEndpointEnabled()) {
    router.post('/Test/SendResetEmail', async (req, res) => {
        try {
            const { email, name, url } = req.body;
            if (!email || !url) return res.status(400).send({ message: 'email and url are required' });
            const result = await sendResetPasswordLink(email, name || 'User', url);
            res.send({ message: 'Reset email sent (test)', result: { success: result?.success, provider: result?.provider } });
        } catch (err) {
            console.error('Test email endpoint failed:', err.message || err);
            res.status(500).send({ message: 'Failed to send test email' });
        }
    });
}

router.get("/Admin/:id", getAdminDetail)
// router.delete("/Admin/:id", deleteAdmin)

// router.put("/Admin/:id", updateAdmin)

// Student

router.post('/StudentReg', studentRegistrationLimiter, studentRegister);
router.post('/StudentLogin', loginLimiter, studentLogIn)
router.post('/Student/RequestPasswordReset', passwordResetLimiter, requestStudentPasswordReset)
router.post('/Students/Import/:id', fileUploadLimiter, csvUpload.single('studentsFile'), importStudents)
router.put('/Student/ResetPassword/:token', passwordResetLimiter, resetStudentPassword)
router.post('/Student/ChangePassword', changeStudentPassword)
router.post('/Student/:studentId/ResetByAdmin', passwordResetLimiter, resetStudentPasswordByAdmin)

router.get("/Students/:id", getStudents)
router.get("/Student/:id", getStudentDetail)
router.get("/Student/Search/:schoolId", searchStudent)

router.delete("/Students/:id", deleteStudents)
router.delete("/StudentsClass/:id", deleteStudentsByClass)
router.delete("/Student/:id", deleteStudent)
router.delete('/Test/Student/:id', cleanupTempStudent)

router.put("/Student/:id", updateStudent)

router.put('/UpdateExamResult/:id', updateExamResult)

router.put('/StudentPayment/:id', studentFeePayment)
// Authenticated payment-provider webhook (see student_controller.paymentWebhook):
// requires PAYMENT_WEBHOOK_SECRET to be configured, otherwise it fails closed.
router.post('/Student/PaymentWebhook', paymentWebhookLimiter, paymentWebhook)
router.get('/Student/PaymentReconciliation/:schoolId', getPaymentReconciliation)
router.post('/Student/PaymentReconciliation/:schoolId', applyPaymentReconciliation)
router.put('/Student/SendFeeReminder/:studentId', sendPaymentReminder)
router.get('/Student/AcademicReport/:schoolId', getAcademicReport)
router.get('/Student/PaymentStats/:schoolId', getPaymentStats)

// Manual notification endpoint for admin to notify a student's parent/guardian
router.post('/Student/NotifyParent/:id', async (req, res) => {
    try {
        const { message, subject, via } = req.body; // via: 'sms'|'email'|'both'
        const StudentModel = require('../models/studentSchema.js');
        const student = await StudentModel.findById(req.params.id);
        if (!(await verifyEntityBelongsToAdminSchool(req, res, student))) return;
        if (!student) return res.status(404).send({ message: 'Student not found' });

        const notifyResults = {};
        if ((via === 'sms' || via === 'both') && student.parentPhone) {
            const sms = require('../services/smsService');
            notifyResults.sms = await sms.sendSMS(student.parentPhone, message || `Notice regarding ${student.name}`);
        }
        if ((via === 'sms' || via === 'both') && student.guardianPhone && student.guardianPhone !== student.parentPhone) {
            const sms = require('../services/smsService');
            notifyResults.guardianSms = await sms.sendSMS(student.guardianPhone, message || `Notice regarding ${student.name}`);
        }
        if ((via === 'email' || via === 'both') && student.parentEmail) {
            const email = require('../services/emailService');
            notifyResults.email = await email.sendEmail(student.parentEmail, subject || 'School Notice', message || `Hello, note about ${student.name}`);
        }

        res.send({ message: 'Notification attempted', results: notifyResults });
    } catch (err) {
        res.status(500).json({ message: 'Notification failed', error: err.message });
    }
});

router.put('/StudentAttendance/:id', studentAttendance)

router.put('/RemoveAllStudentsSubAtten/:id', clearAllStudentsAttendanceBySubject);
router.put('/RemoveAllStudentsAtten/:id', clearAllStudentsAttendance);

router.put('/RemoveStudentSubAtten/:id', removeStudentAttendanceBySubject);
router.put('/RemoveStudentAtten/:id', removeStudentAttendance)
router.get('/Student/SearchCheque/:schoolId', searchChequePayment);

// Teacher

router.post('/TeacherReg', adminTeacherRegistrationLimiter, teacherRegister);
router.post('/TeacherLogin', loginLimiter, teacherLogIn)
router.post('/Teacher/RequestPasswordReset', passwordResetLimiter, requestTeacherPasswordReset)
router.put('/Teacher/ResetPassword/:token', passwordResetLimiter, resetTeacherPassword)

// Admin-driven teacher password reset
router.post('/Teacher/:teacherId/ResetByAdmin', passwordResetLimiter, resetTeacherPasswordByAdmin)

router.get("/Teachers/:id", getTeachers)
router.get("/Teacher/:id", getTeacherDetail)
router.get('/Teacher/Search/:schoolId', searchTeacher)
router.put("/Teacher/:id", updateTeacher)
router.put('/Teacher/SalaryPayment/:id', payTeacherSalary)
router.put('/Teacher/:teacherId/SalaryPayment/:paymentIndex/Approve', approveSalaryPayment)
router.put('/Teacher/:teacherId/SalaryPayment/:paymentIndex/Reject', rejectSalaryPayment)
router.get('/Teacher/PayrollExport/:schoolId', payrollExport);

router.delete("/Teachers/:id", deleteTeachers)
router.delete("/TeachersClass/:id", deleteTeachersByClass)
router.delete("/Teacher/:id", deleteTeacher)

router.put("/TeacherSubject", updateTeacherSubject)
router.put('/TeacherRole', updateTeacherRole)

router.post('/TeacherAttendance/:id', teacherAttendance)

// Notice

router.post('/NoticeCreate', noticeCreate);

router.get('/NoticeList/:id', noticeList);

router.delete("/Notices/:id", deleteNotices)
router.delete("/Notice/:id", deleteNotice)

router.put("/Notice/:id", updateNotice)

// Complain

router.post('/ComplainCreate', complainCreate);

router.get('/ComplainList/:id', complainList);

// Sclass

router.post('/SclassCreate', sclassCreate);

router.get('/SclassList/:id', sclassList);
router.get("/Sclass/:id", getSclassDetail)

router.get("/Sclass/Students/:id", getSclassStudents)

router.delete("/Sclasses/:id", deleteSclasses)
router.delete("/Sclass/:id", deleteSclass)

// Promote all students from one class to another (admin only)
router.put('/Sclass/Promote/:id', promoteSclassStudents);

// Subject

router.post('/SubjectCreate', subjectCreate);

router.get('/AllSubjects/:id', allSubjects);
router.get('/ClassSubjects/:id', classSubjects);
router.get('/FreeSubjectList/:id', freeSubjectList);
router.get("/Subject/:id", getSubjectDetail)

router.delete("/Subject/:id", deleteSubject)
router.delete("/Subjects/:id", deleteSubjects)
router.delete("/SubjectsClass/:id", deleteSubjectsByClass)

// Timetable

router.post('/Timetable/Generate/:id', generateTimetableForClass);
router.put('/Timetable/Update/:id', updateTimetableForClass);
router.get('/Timetable/Class/:id', getTimetableForClass);

// Assignment

// Accept up to 5 files under field name 'attachments'
router.post('/Assignment', fileUploadLimiter, upload.array('attachments', 5), createAssignment);
router.post('/LearningMaterial', fileUploadLimiter, learningUpload.array('file', 1), createLearningMaterial);
router.get('/LearningMaterials/:classId', getLearningMaterialsByClass);
router.get('/LearningMaterials/School/:schoolId', getLearningMaterialsBySchool);
router.post('/LiveClass', createLiveClass);
router.get('/LiveClasses/:classId', getLiveClassesByClass);
router.post('/LiveClasses/:liveClassId/Join', joinLiveClass);
router.post('/Quiz', createQuiz);
router.get('/Quizzes/:classId', getQuizzesByClass);
router.get('/Assignments/School/:schoolId', getAssignmentsBySchool);
router.get('/Assignments/Class/:classId', getAssignmentsByClass);
router.get('/Assignments/Search/:schoolId', searchAssignments);
router.get('/Assignment/:id', getAssignmentDetail);
router.post('/Assignment/:id/Submit', submitAssignment);
router.get('/Assignment/:id/Submissions', getAssignmentSubmissions);

// Parent
// NOTE: the parent portal authenticates with (admissionNo + parent email +
// password) and then sends the parent email with each request. Every parent
// endpoint is therefore rate limited to slow down email/account enumeration.
router.post('/ParentLogin', loginLimiter, parentLogIn);
router.get('/Parent/Students/:parentEmail', parentLookupLimiter, getParentStudents);
router.get('/Parent/StudentFees/:studentId', parentLookupLimiter, getStudentFeeInfo);
router.put('/Parent/PayFee/:studentId', parentLookupLimiter, parentPayFee);

// M-Pesa STK Push Payment
router.post('/Parent/PayFeeStk/:studentId', parentLookupLimiter, initiateStk);
router.post('/Parent/CheckStkStatus', parentLookupLimiter, checkStkStatus);
// Test-only helper: create a pending STK payment without contacting M-Pesa.
// Mounted only outside production (or when test payments are explicitly enabled).
if (testPaymentEndpointsEnabled()) {
    router.post('/Test/MockInitiateStk/:studentId', mockInitiateStk);
}
router.post('/Payment/MpesaCallback', mpesaCallback);

// HR-Accountant Communication Routes
router.post('/Communication/SendMessage', sendMessage);
router.get('/Communication/Inbox', getInbox);
router.get('/Communication/UnreadCount', getUnreadCount);
router.put('/Communication/:messageId/MarkRead', markAsRead);
router.post('/Communication/:messageId/AddResponse', addResponse);
router.put('/Communication/:messageId/Resolve', resolveCommunication);
router.post('/Communication/Broadcast', broadcastNotification);
router.get('/Communication/Stats', getCommunicationStats);

router.post('/ExpenseClaim', submitExpenseClaim);
router.get('/ExpenseClaims', getExpenseClaims);
router.put('/ExpenseClaim/:id/Status', updateExpenseClaimStatus);

// Include SuperAdmin routes
router.use('/', superAdminRoutes);

// Include Message routes
router.use('/', messageRoutes);

module.exports = router;
