
const Admin = require('../models/adminSchema.js');
const Student = require('../models/studentSchema.js');
const Teacher = require('../models/teacherSchema.js');
const Employee = require('../models/employeeSchema.js');
const { logAuditAction } = require('../utils/auditLogger');

const csvEscape = (value) => {
    const text = value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
    return `"${text.replace(/"/g, '""')}"`;
};

const toCsv = (rows) => {
    if (!rows.length) return 'No records\n';
    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    return [columns.map(csvEscape).join(','), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(','))].join('\n');
};

const clean = (document) => {
    const value = document.toObject ? document.toObject({ getters: true }) : { ...document };
    ['password', 'resetPasswordToken', 'resetPasswordExpires', 'twoFactorSecret', 'encryptionKey', 'apiKey', 'apiSecret', 'consumerKey', 'consumerSecret', 'passkey', 'emailPassword'].forEach((field) => delete value[field]);
    return value;
};

const flattenStudents = (students) => students.flatMap((student) => {
    const base = clean(student);
    const payments = student.paymentHistory || [];
    if (!payments.length) return [{ record_type: 'student', ...base, paymentHistory: undefined }];
    return payments.map((payment) => ({
        record_type: 'student_payment',
        student_id: student._id,
        student_name: student.name,
        admission_no: student.admissionNo,
        total_fees: student.totalFees,
        amount_paid: student.amountPaid,
        balance: student.balance,
        ...clean(payment),
    }));
});

const getRequester = async (req) => {
    const id = req.get('x-admin-id') || req.get('x-user-id');
    if (!id) return null;
    return Admin.findById(id).select('name email role school schoolName');
};

const getSchoolId = (requester) => requester?.school || requester?._id;

const exportSchoolData = async (req, res) => {
    try {
        const requester = await getRequester(req);
        if (!requester || !['SuperAdmin', 'Admin'].includes(requester.role)) return res.status(403).json({ message: 'Only SuperAdmin or school Admin can export school data' });
        const schoolFilter = requester.role === 'SuperAdmin' && !req.query.schoolId
            ? {}
            : { school: requester.role === 'SuperAdmin' ? req.query.schoolId : getSchoolId(requester) };
        const [students, teachers, employees] = await Promise.all([
            Student.find(schoolFilter).select('-password -resetPasswordToken -resetPasswordExpires').lean(),
            Teacher.find(schoolFilter).select('-password').lean(),
            Employee.find(schoolFilter).lean(),
        ]);
        const rows = [
            ...flattenStudents(students),
            ...teachers.map((teacher) => ({ record_type: 'teacher', ...clean(teacher) })),
            ...employees.map((employee) => ({ record_type: 'employee', ...clean(employee) })),
        ];
        await recordExport(requester, req.query.schoolId || null, req, 'school_data', rows.length);
        return sendCsv(res, 'school-data.csv', rows);
    } catch (error) { return res.status(500).json({ message: 'School data export failed', error: error.message }); }
};

const exportTeacherStudents = async (req, res) => {
    try {
        const requesterId = req.get('x-user-id') || req.get('x-admin-id');
        const teacher = await Teacher.findById(requesterId).select('name school teachSclass role');
        if (!teacher || teacher.role !== 'Teacher') return res.status(403).json({ message: 'Only teachers can export student data' });
        const students = await Student.find({ school: teacher.school, sclassName: teacher.teachSclass }).select('-password -resetPasswordToken -resetPasswordExpires').lean();
        await recordExport(teacher, teacher.school, req, 'teacher_students', students.length);
        return sendCsv(res, 'assigned-students.csv', students.map((student) => ({ record_type: 'student', ...clean(student) })));
    } catch (error) { return res.status(500).json({ message: 'Student export failed', error: error.message }); }
};

const exportHrData = async (req, res) => {
    try {
        const requester = await getRequester(req);
        if (!requester || !['SuperAdmin', 'Admin', 'HR'].includes(requester.role)) return res.status(403).json({ message: 'Only HR, school Admin, or SuperAdmin can export HR data' });
        const schoolId = getSchoolId(requester);
        const employees = await Employee.find({ school: schoolId }).lean();
        await recordExport(requester, schoolId, req, 'hr_data', employees.length);
        return sendCsv(res, 'hr-data.csv', employees.map((employee) => ({ record_type: 'employee', ...clean(employee) })));
    } catch (error) { return res.status(500).json({ message: 'HR export failed', error: error.message }); }
};

const exportAccountantData = async (req, res) => {
    try {
        const requester = await getRequester(req);
        if (!requester || !['SuperAdmin', 'Admin', 'Accountant'].includes(requester.role)) return res.status(403).json({ message: 'Only Accountant, school Admin, or SuperAdmin can export finance data' });
        const schoolId = getSchoolId(requester);
        const students = await Student.find({ school: schoolId }).select('name admissionNo rollNum totalFees amountPaid balance paymentStatus paymentHistory').lean();
        const rows = flattenStudents(students);
        await recordExport(requester, schoolId, req, 'accounting_data', rows.length);
        return sendCsv(res, 'accounting-data.csv', rows);
    } catch (error) { return res.status(500).json({ message: 'Accounting export failed', error: error.message }); }
};

const sendCsv = (res, filename, rows) => {
    res.status(200).type('text/csv').attachment(filename).send(toCsv(rows));
};

const recordExport = async (requester, schoolId, req, exportType, recordCount) => {
    await logAuditAction({
        school: schoolId,
        user: requester._id,
        userName: requester.name || requester.email,
        userRole: requester.role,
        action: 'EXPORT',
        entityType: 'report',
        entityName: exportType,
        ipAddress: req.clientIP || req.ip || 'Unknown',
        userAgent: req.get('user-agent') || '',
        resultMessage: `Exported ${recordCount} records`,
        metadata: { exportType, recordCount },
        req,
    });
};

module.exports = { exportSchoolData, exportTeacherStudents, exportHrData, exportAccountantData };
