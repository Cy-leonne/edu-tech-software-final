
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const Teacher = require('../models/teacherSchema.js');
const Admin = require('../models/adminSchema.js');
const Subject = require('../models/subjectSchema.js');
const School = require('../models/schoolSchema.js');
const { sendResetPasswordLink, sendPasswordResetEmail, sendEmail } = require('../services/emailService.js');
const { sendSMS } = require('../services/smsService.js');
const { logAuditAction } = require('../utils/auditLogger');
const { validateTeacherInput, validateTeacherUpdateInput, validatePassword } = require('../utils/validation.js');
const { getAdminIdFromReq, verifySchoolId, verifyEntityBelongsToAdminSchool, enforceSubscriptionStatus } = require('../middleware/schoolAccess.js');

// Helper function to check if admin has permission to edit employee/salary details
const getAdminRole = async (adminId) => {
    try {
        const admin = await Admin.findById(adminId).select('role roles');
        return admin?.role || admin?.roles?.[0] || 'Admin';
    } catch (err) {
        return 'Admin';
    }
};
// Check if admin can edit employee details (HR and Admin only, not Accountant)
const canEditEmployeeDetails = (adminRole) => {
    return ['Admin', 'SuperAdmin', 'HR'].includes(adminRole);
};

// Check if admin can edit salary (HR and Admin only, not Accountant)
const canEditSalary = (adminRole) => {
    return ['Admin', 'SuperAdmin', 'HR'].includes(adminRole);
};

const normalizeTeacherSubjectIds = (teachSubject, teachSubjects) => {
    const subjectIds = [];

    const addId = (subjectId) => {
        if (!subjectId) return;
        const value = subjectId.toString();
        if (!subjectIds.includes(value)) {
            subjectIds.push(value);
        }
    };

    if (Array.isArray(teachSubjects)) {
        teachSubjects.forEach(addId);
    }

    if (teachSubject) {
        addId(teachSubject);
    }

    return subjectIds;
};

const syncTeacherSubjectAssignments = async (teacherId, subjectIds) => {
    const uniqueSubjectIds = Array.isArray(subjectIds) ? [...new Set(subjectIds.map((id) => id.toString()))] : [];

    await Subject.updateMany(
        { teacher: teacherId },
        { $unset: { teacher: '' } }
    );

    if (uniqueSubjectIds.length === 0) {
        return;
    }

    await Subject.updateMany(
        { _id: { $in: uniqueSubjectIds } },
        { teacher: teacherId }
    );
};

const teacherRegister = async (req, res) => {
    const { name, email, password, phone, role, teachSubject, teachSubjects, teachSclass, salary, bankName, bankAccount, accountHolderName, school: bodySchool } = req.body;
    let school = bodySchool || getAdminIdFromReq(req);
    
    try {
        if (!school) {
            return res.status(400).json({ message: 'School ID is required' });
        }

        // Validate input
        const validation = validateTeacherInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ message: 'Validation errors', errors: validation.errors });
        }
        if (salary !== undefined && typeof salary !== 'number' && isNaN(Number(salary))) {
            return res.status(400).json({ message: 'Salary must be a valid number' });
        }
        if (salary !== undefined && Number(salary) < 0) {
            return res.status(400).json({ message: 'Salary cannot be negative' });
        }

        // Validate password
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({ message: passwordValidation.error });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(password, salt);
        const normalizedSubjectIds = normalizeTeacherSubjectIds(teachSubject, teachSubjects);
        const primarySubjectId = normalizedSubjectIds[0] || null;

        // A teacher may be created without a class/subject yet (e.g. by HR as
        // an employee); omit optional ids instead of casting ''/undefined to
        // ObjectId which produced a 500 on save.
        const isUsableId = (value) => value && value !== 'undefined' && value !== 'null' && mongoose.Types.ObjectId.isValid(value);
        const teacher = new Teacher({
            name,
            email,
            password: hashedPass,
            phone: phone || '',
            role,
            school,
            teachSubject: isUsableId(primarySubjectId) ? primarySubjectId : undefined,
            teachSubjects: normalizedSubjectIds.filter(isUsableId),
            teachSclass: isUsableId(teachSclass) ? teachSclass : undefined,
            salary: salary !== undefined ? Number(salary) : 0,
            bankName: bankName || '',
            bankAccount: bankAccount || '',
            accountHolderName: accountHolderName || ''
        });

        const existingTeacherByEmail = await Teacher.findOne({ email, school });

        if (existingTeacherByEmail) {
            res.send({ message: 'Email already exists for this school' });
        }
        else {
            let result = await teacher.save();
            await syncTeacherSubjectAssignments(result._id, normalizedSubjectIds);
            result.password = undefined;
            
            // Log the action
            await logAuditAction({
                school,
                user: school,
                action: 'CREATE',
                entityType: 'Teacher',
                entityId: result._id,
                status: 'Success',
                details: `Teacher ${name} registered`,
            });
            
            res.send({ ...result.toObject(), message: 'Teacher registered successfully' });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const mongoose = require('mongoose');
const { findTeacher } = require('../testdb');

const teacherLogIn = async (req, res) => {
    try {
        // Fallback to in-memory DB if mongoose not connected
        if (mongoose.connection.readyState !== 1) {
            const teacher = findTeacher(req.body.email);
            if (!teacher) return res.status(404).send({ message: 'Teacher not found' });
            const validated = await bcrypt.compare(req.body.password, teacher.password);
            if (!validated) return res.status(401).send({ message: 'Invalid password' });
            if (String(teacher.status || teacher.schoolStatus || '').trim().toLowerCase() === 'suspended') {
                return res.status(403).send({ message: 'Login blocked: your school is suspended.', role: 'Teacher', schoolStatus: 'Suspended' });
            }
            const safe = { ...teacher };
            delete safe.password;
            return res.send(safe);
        }

        let teacher = await Teacher.findOne({ email: req.body.email });
        let usingFallbackTeacher = false;
        if (!teacher) {
            teacher = findTeacher(req.body.email);
            usingFallbackTeacher = Boolean(teacher);
        }
        if (teacher) {
            if (!usingFallbackTeacher) {
                const schoolRecord = await School.findOne({
                    $or: [{ _id: teacher.school }, { schoolAdmin: teacher.school }]
                }).select('status statusChangeReason schoolName');
                const school = await enforceSubscriptionStatus(schoolRecord?._id || teacher.school);
                const normalizedSchoolStatus = String(school?.status || '').trim().toLowerCase();
                if (school && ['suspended', 'inactive'].includes(normalizedSchoolStatus)) {
                    const action = normalizedSchoolStatus === 'suspended' ? 'suspended' : 'deactivated';
                    return res.status(403).send({
                        message: `Login blocked: your school is ${action}. Reason: ${school.statusChangeReason || 'No reason provided.'}`,
                        role: 'Teacher',
                        schoolStatus: school.status,
                        reason: school.statusChangeReason || 'No reason provided.'
                    });
                }
            }
            const validated = await bcrypt.compare(req.body.password, teacher.password);
            if (validated) {
                if (usingFallbackTeacher) {
                    const safeTeacher = { ...teacher };
                    delete safeTeacher.password;
                    return res.send(safeTeacher);
                }
                teacher = await teacher.populate("teachSubject", "subName sessions")
                teacher = await teacher.populate("teachSubjects", "subName sessions")
                teacher = await teacher.populate("school", "schoolName")
                teacher = await teacher.populate("teachSclass", "sclassName")
                if (!teacher.teachSubject && Array.isArray(teacher.teachSubjects) && teacher.teachSubjects.length > 0) {
                    teacher.teachSubject = teacher.teachSubjects[0];
                }
                teacher.password = undefined;
                res.send(teacher);
            } else {
                res.status(401).send({ message: "Invalid password", role: "Teacher" });
            }
        } else {
            res.status(404).send({ message: "Teacher not found", role: "Teacher" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const getTeachers = async (req, res) => {
    try {
        const requesterId = getAdminIdFromReq(req);
        const requester = requesterId ? await Admin.findById(requesterId).select('role school schoolName') : null;
        if (!(await verifySchoolId(req, res, req.params.id))) return;

        const matchingSchoolAdmins = requester?.schoolName
            ? await Admin.find({ schoolName: requester.schoolName }).select('_id')
            : [];
        const schoolIds = [requester?.school, req.params.id, requesterId, ...matchingSchoolAdmins.map((admin) => admin._id)]
            .filter(Boolean)
            .map((school) => school?._id || school?.id || school);
        const query = { school: { $in: schoolIds } };
        if (req.query.email) {
            const emailSearch = req.query.email.trim();
            if (emailSearch.length > 0) {
                query.email = { $regex: emailSearch, $options: 'i' };
            }
        }

        let teachers = await Teacher.find(query)
            .populate("teachSubject", "subName")
            .populate("teachSubjects", "subName")
            .populate("teachSclass", "sclassName");
        if (teachers.length > 0) {
            let modifiedTeachers = teachers.map((teacher) => {
                const normalizedTeacher = teacher.toObject({ getters: true });
                normalizedTeacher.password = undefined;
                normalizedTeacher.teachSubject = normalizedTeacher.teachSubject || normalizedTeacher.teachSubjects?.[0] || null;
                normalizedTeacher.subjectCount = normalizedTeacher.teachSubjects?.length || 0;
                return normalizedTeacher;
            });
            res.send(modifiedTeachers);
        } else {
            res.send({ message: "No teachers found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const searchTeacher = async (req, res) => {
    try {
        const { schoolId } = req.params;
        const { query, email } = req.query;
        if (!(await verifySchoolId(req, res, schoolId))) return;

        const searchQuery = { school: schoolId };
        const conditions = [];
        if (email) {
            conditions.push({ email: { $regex: `^${email.trim()}`, $options: 'i' } });
        }
        if (query) {
            conditions.push({ name: { $regex: query, $options: 'i' } });
            conditions.push({ email: { $regex: query, $options: 'i' } });
        }

        if (conditions.length === 0) return res.status(400).send({ message: 'Please provide a search query or email' });

        searchQuery.$or = conditions;

        const teachers = await Teacher.find(searchQuery)
            .populate('teachSubject', 'subName')
            .populate('teachSubjects', 'subName')
            .populate('teachSclass', 'sclassName')
            .select('-password');

        if (!teachers || teachers.length === 0) return res.send({ message: 'No teachers found', results: [] });
        res.send({ message: `Found ${teachers.length} teacher(s)`, count: teachers.length, results: teachers });
    } catch (err) {
        res.status(500).json(err);
    }
};

const getTeacherDetail = async (req, res) => {
    try {
        let teacher = await Teacher.findById(req.params.id)
            .populate("teachSubject", "subName sessions")
            .populate("teachSubjects", "subName sessions")
            .populate("school", "schoolName")
            .populate("teachSclass", "sclassName")
        if (!(await verifyEntityBelongsToAdminSchool(req, res, teacher))) return;
        if (teacher) {
            teacher.password = undefined;
            res.send(teacher);
        }
        else {
            res.send({ message: "No teacher found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
}

const updateTeacherSubject = async (req, res) => {
    const { teacherId, teachSubject, teachSubjects } = req.body;
    try {
        const teacher = await Teacher.findById(teacherId);
        if (!(await verifyEntityBelongsToAdminSchool(req, res, teacher))) return;

        // Check permission - only HR and Admin can change subjects
        const adminId = getAdminIdFromReq(req);
        const adminRole = await getAdminRole(adminId);
        
        if (!canEditEmployeeDetails(adminRole)) {
            return res.status(403).send({ 
                message: 'Permission denied. Only HR and Admin staff can modify teacher assignments.' 
            });
        }

        const normalizedSubjectIds = normalizeTeacherSubjectIds(teachSubject, teachSubjects);
        const previousSubjectIds = Array.isArray(teacher.teachSubjects) ? teacher.teachSubjects.map(subject => subject.toString()) : [];

        await Subject.updateMany(
            { _id: { $in: previousSubjectIds }, teacher: teacherId },
            { $unset: { teacher: '' } }
        );

        const updatedTeacher = await Teacher.findByIdAndUpdate(
            teacherId,
            {
                teachSubject: normalizedSubjectIds[0] || null,
                teachSubjects: normalizedSubjectIds
            },
            { new: true }
        )
            .populate('teachSubject', 'subName sessions')
            .populate('teachSubjects', 'subName sessions');

        await syncTeacherSubjectAssignments(updatedTeacher._id, normalizedSubjectIds);

        res.send(updatedTeacher);
    } catch (error) {
        res.status(500).json(error);
    }
};

const updateTeacherRole = async (req, res) => {
    const { teacherId, role } = req.body;
    try {
        const teacher = await Teacher.findById(teacherId);
        if (!(await verifyEntityBelongsToAdminSchool(req, res, teacher))) return;

        // Check permission - only HR and Admin can change roles
        const adminId = getAdminIdFromReq(req);
        const adminRole = await getAdminRole(adminId);
        
        if (!canEditEmployeeDetails(adminRole)) {
            return res.status(403).send({ 
                message: 'Permission denied. Only HR and Admin staff can modify teacher roles.' 
            });
        }

        const updatedTeacher = await Teacher.findByIdAndUpdate(
            teacherId,
            { role },
            { new: true }
        )
            .populate('teachSubject', 'subName sessions')
            .populate('school', 'schoolName')
            .populate('teachSclass', 'sclassName');

        if (!updatedTeacher) {
            return res.status(404).send({ message: 'Teacher not found' });
        }

        updatedTeacher.password = undefined;
        res.send(updatedTeacher);
    } catch (error) {
        res.status(500).json(error);
    }
};

const updateTeacher = async (req, res) => {
    const { name, email, phone, role, teachSubject, teachSubjects, teachSclass, salary, bankName, bankAccount, accountHolderName } = req.body;
    try {
        const teacher = await Teacher.findById(req.params.id);
        if (!(await verifyEntityBelongsToAdminSchool(req, res, teacher))) return;
        if (!teacher) {
            return res.status(404).send({ message: 'Teacher not found' });
        }

        // Get admin role for permission check
        const adminId = getAdminIdFromReq(req);
        const adminRole = await getAdminRole(adminId);

        // Check if accountant is trying to edit salary or employee details
        if (!canEditEmployeeDetails(adminRole)) {
            return res.status(403).send({ 
                message: 'Permission denied. Only HR and Admin staff can edit employee details. Accountants can only submit salary payments for approval.' 
            });
        }

        // Additional check: if trying to edit salary, ensure user has permission
        if (salary !== undefined && !canEditSalary(adminRole)) {
            return res.status(403).send({ 
                message: 'Permission denied. Only HR and Admin can modify employee salary.' 
            });
        }

        const validation = validateTeacherUpdateInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ message: 'Validation errors', errors: validation.errors });
        }

        if (email && email !== teacher.email) {
            const existingTeacher = await Teacher.findOne({
                email,
                school: teacher.school,
                _id: { $ne: teacher._id }
            });
            if (existingTeacher) {
                return res.status(400).send({ message: 'Email already exists for this school' });
            }
        }

        const normalizedSubjectIds = normalizeTeacherSubjectIds(teachSubject, teachSubjects);
        if (normalizedSubjectIds.length > 0) {
            const assignedSubject = await Subject.findOne({
                _id: { $in: normalizedSubjectIds },
                teacher: { $exists: true, $ne: teacher._id }
            });
            if (assignedSubject) {
                return res.status(400).send({ message: 'One or more selected subjects are already assigned to another teacher' });
            }
        }

        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (role) updateData.role = role;
        if (teachSclass) updateData.teachSclass = teachSclass;
        if (teachSubject !== undefined || teachSubjects !== undefined) {
            updateData.teachSubject = normalizedSubjectIds[0] || null;
            updateData.teachSubjects = normalizedSubjectIds;
        }
        if (salary !== undefined) updateData.salary = Number(salary);
        if (bankName !== undefined) updateData.bankName = bankName;
        if (bankAccount !== undefined) updateData.bankAccount = bankAccount;
        if (accountHolderName !== undefined) updateData.accountHolderName = accountHolderName;

        const previousSubjectIds = Array.isArray(teacher.teachSubjects)
            ? teacher.teachSubjects.map((subject) => subject.toString())
            : (teacher.teachSubject ? [teacher.teachSubject.toString()] : []);

        const updatedTeacher = await Teacher.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        )
            .populate('teachSubject', 'subName sessions')
            .populate('teachSubjects', 'subName sessions')
            .populate('school', 'schoolName')
            .populate('teachSclass', 'sclassName');

        await syncTeacherSubjectAssignments(updatedTeacher._id, normalizedSubjectIds);

        updatedTeacher.password = undefined;
        res.send(updatedTeacher);
    } catch (error) {
        res.status(500).json(error);
    }
};

const deleteTeacher = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id);
        if (!(await verifyEntityBelongsToAdminSchool(req, res, teacher))) return;

        // Check permission - only HR and Admin can delete
        const adminId = getAdminIdFromReq(req);
        const adminRole = await getAdminRole(adminId);
        
        if (!canEditEmployeeDetails(adminRole)) {
            return res.status(403).send({ 
                message: 'Permission denied. Only HR and Admin staff can delete employees.' 
            });
        }

        const deletedTeacher = await Teacher.findByIdAndDelete(req.params.id);

        await Subject.updateMany(
            { teacher: deletedTeacher._id, teacher: { $exists: true } },
            { $unset: { teacher: 1 } }
        );

        res.send(deletedTeacher);
    } catch (error) {
        res.status(500).json(error);
    }
};

const payTeacherSalary = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id);
        if (!teacher) {
            return res.status(404).send({ message: 'Teacher not found' });
        }
        if (!(await verifyEntityBelongsToAdminSchool(req, res, teacher))) return;

        const { amount, paymentMethod = 'Cash', note = '', reference = '', bankName = '', bankAccount = '', accountHolderName = '' } = req.body;
        let numericAmount = Number(amount);
        if ((!amount || numericAmount <= 0) && typeof teacher.salary === 'number') {
            numericAmount = Number(teacher.salary);
        }

        if (!numericAmount || numericAmount <= 0) {
            return res.status(400).send({ message: 'Salary amount must be greater than zero and should be set by HR.' });
        }

        teacher.salaryHistory = teacher.salaryHistory || [];
        const paymentDate = new Date();
        const payrollPeriod = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
        const alreadyPaidThisPeriod = teacher.salaryHistory.some((entry) => {
            const entryDate = entry.date || paymentDate;
            const entryPeriod = entry.payrollPeriod || `${new Date(entryDate).getFullYear()}-${String(new Date(entryDate).getMonth() + 1).padStart(2, '0')}`;
            return entryPeriod === payrollPeriod
                && (entry.status === 'Paid' || entry.approvalStatus === 'Approved');
        });
        if (alreadyPaidThisPeriod) {
            return res.status(400).send({ message: 'This teacher has already received salary for the current month.' });
        }
        const hasPendingPayment = teacher.salaryHistory.some((entry) =>
            entry.approvalStatus === 'Pending' || entry.status === 'Pending'
        );

        if (hasPendingPayment) {
            return res.status(400).send({ message: 'A salary payment is already pending for this teacher. Please wait until it is approved or rejected before submitting another payment.' });
        }

        teacher.bankName = bankName || teacher.bankName;
        teacher.bankAccount = bankAccount || teacher.bankAccount;
        teacher.accountHolderName = accountHolderName || teacher.accountHolderName;

        teacher.salaryHistory.push({
            amount: numericAmount,
            method: paymentMethod,
            note,
            reference,
            bankName: bankName || teacher.bankName || '',
            bankAccount: bankAccount || teacher.bankAccount || '',
            accountHolderName: accountHolderName || teacher.accountHolderName || '',
            paidBy: getAdminIdFromReq(req),
            date: paymentDate,
            payrollPeriod,
            status: 'Pending', // Changed from 'Paid' to require approval
            approvalStatus: 'Pending',
            approvedBy: null,
            approvalDate: null,
        });

        await teacher.save();

        const notificationResults = {};
        const paymentMessage = `Your salary payment of KES ${numericAmount.toFixed(2)} has been recorded. Reference: ${reference || 'N/A'}.`;
        const emailBody = `
            <p>Hi ${teacher.name || teacher.email},</p>
            <p>Your salary payment of <strong>KES ${numericAmount.toFixed(2)}</strong> has been successfully recorded by the finance team.</p>
            <p><strong>Payment method:</strong> ${paymentMethod}</p>
            <p><strong>Reference:</strong> ${reference || 'N/A'}</p>
            <p>Note: ${note || 'No additional notes.'}</p>
            <p>Thank you for your service.</p>
        `;

        if (teacher.email) {
            notificationResults.email = await sendEmail(teacher.email, 'Salary Payment Recorded', emailBody);
        }
        if (teacher.phone) {
            notificationResults.sms = await sendSMS(teacher.phone, paymentMessage);
        }

        teacher.password = undefined;
        res.send({ message: 'Salary payment recorded and pending principal approval', teacher, notifications: notificationResults });
    } catch (error) {
        res.status(500).json(error);
    }
};

const approveSalaryPayment = async (req, res) => {
    try {
        const { teacherId, paymentIndex } = req.params;
        const { approvedBy } = req.body;

        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).send({ message: 'Teacher not found' });
        }
        if (!(await verifyEntityBelongsToAdminSchool(req, res, teacher))) return;

        if (!teacher.salaryHistory || !teacher.salaryHistory[paymentIndex]) {
            return res.status(404).send({ message: 'Salary payment not found' });
        }

        const payment = teacher.salaryHistory[paymentIndex];
        const paymentDate = payment.date || new Date();
        const payrollPeriod = payment.payrollPeriod || `${new Date(paymentDate).getFullYear()}-${String(new Date(paymentDate).getMonth() + 1).padStart(2, '0')}`;
        const duplicateApprovedPayment = teacher.salaryHistory.some((entry, index) => {
            if (index === Number(paymentIndex)) return false;
            const entryDate = entry.date || new Date();
            const entryPeriod = entry.payrollPeriod || `${new Date(entryDate).getFullYear()}-${String(new Date(entryDate).getMonth() + 1).padStart(2, '0')}`;
            return entryPeriod === payrollPeriod
                && (entry.status === 'Paid' || entry.approvalStatus === 'Approved');
        });
        if (duplicateApprovedPayment) {
            return res.status(400).send({ message: 'This teacher has already received salary for this payroll month.' });
        }
        const approverId = approvedBy || getAdminIdFromReq(req);
        const paymentAmount = Number(payment.amount) || 0;

        payment.status = 'Paid';
        payment.approvalStatus = 'Approved';
        payment.approvedBy = approverId;
        payment.approvalDate = new Date();

        const school = await School.findById(teacher.school);
        if (school) {
            const currentBalance = Number(school.accountBalance || 0);
            school.accountBalance = currentBalance - paymentAmount;
            school.accountLedger = school.accountLedger || [];
            school.accountLedger.push({
                type: 'Debit',
                amount: paymentAmount,
                reference: payment.reference || `SALARY-${teacher._id}-${paymentIndex}`,
                description: `Approved salary payment for ${teacher.name || teacher.email || 'teacher'}`,
                relatedEntity: 'Teacher',
                entityId: teacher._id,
                createdBy: approverId,
            });
            await school.save();
        }

        teacher.accountBalance = Number(teacher.accountBalance || 0) + paymentAmount;
        teacher.accountLedger = teacher.accountLedger || [];
        teacher.accountLedger.push({
            type: 'Credit',
            amount: paymentAmount,
            reference: payment.reference || `SALARY-${teacher._id}-${paymentIndex}`,
            description: `Approved salary payment for ${teacher.name || teacher.email || 'teacher'}`,
            relatedEntity: 'Teacher',
            entityId: teacher._id,
            createdBy: approverId,
        });

        await teacher.save();

        teacher.password = undefined;
        res.send({
            message: 'Salary payment approved successfully and school account has been debited',
            teacher,
            schoolBalance: school ? school.accountBalance : null,
        });
    } catch (error) {
        console.error('Error approving salary payment:', error);
        res.status(500).json({ message: 'Failed to approve salary payment' });
    }
};

const rejectSalaryPayment = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.teacherId);
        if (!teacher) return res.status(404).send({ message: 'Teacher not found' });
        if (!(await verifyEntityBelongsToAdminSchool(req, res, teacher))) return;
        const payment = teacher.salaryHistory?.[req.params.paymentIndex];
        if (!payment) return res.status(404).send({ message: 'Salary payment not found' });
        if (payment.approvalStatus !== 'Pending' && payment.status !== 'Pending') {
            return res.status(400).send({ message: 'Only pending salary payments can be rejected' });
        }
        payment.status = 'Failed';
        payment.approvalStatus = 'Rejected';
        payment.approvedBy = getAdminIdFromReq(req);
        payment.approvalDate = new Date();
        payment.rejectionReason = req.body.reason || 'Payment details were rejected';
        await teacher.save();
        res.send({ message: 'Salary payment rejected; school funds were not debited', teacher });
    } catch (error) {
        res.status(500).json({ message: 'Failed to reject salary payment', error: error.message });
    }
};

// Export payroll CSV for bank uploads
const payrollExport = async (req, res) => {
    try {
        const schoolId = req.params.schoolId;
        if (!(await verifySchoolId(req, res, schoolId))) return;

        const markProcessed = req.query.markProcessed === 'true';

        // Find teachers in school with approved salary payments that are not yet bankProcessed
        const teachers = await Teacher.find({ school: schoolId });

        const rows = [];
        teachers.forEach((teacher) => {
            (teacher.salaryHistory || []).forEach((entry, idx) => {
                const approved = entry.approvalStatus === 'Approved' || entry.status === 'Paid';
                const bankProcessed = entry.bankProcessed === true;
                if (approved && !bankProcessed) {
                    rows.push({
                        teacherId: teacher._id.toString(),
                        teacherName: teacher.name || teacher.email || '',
                        bankAccount: teacher.bankAccount || '',
                        bankName: teacher.bankName || '',
                        amount: entry.amount || 0,
                        reference: entry.reference || '',
                        date: entry.date ? new Date(entry.date).toISOString() : '',
                        salaryIndex: idx
                    });
                    if (markProcessed) {
                        entry.bankProcessed = true;
                    }
                }
            });
        });

        // If requested, persist bankProcessed flags
        if (markProcessed) {
            await Promise.all(teachers.map(t => t.save()));
        }

        // Generate CSV
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=payroll_export_${schoolId}_${Date.now()}.csv`);

        // Fetch school info to include in CSV top metadata
        const schoolInfo = await School.findById(schoolId).select('schoolName address logo');
        const escape = (v) => '"' + String(v || '').replace(/"/g, '""') + '"';
        const addressObj = schoolInfo?.address || {};
        const addressStr = [addressObj.street, addressObj.city, addressObj.state, addressObj.zipCode, addressObj.country]
            .filter(Boolean)
            .join(', ');
        const logoUrl = schoolInfo?.logo || '';

        // Write school metadata as first rows (key,value) then a blank line
        res.write(`"SchoolName",${escape(schoolInfo?.schoolName || '')}\n`);
        res.write(`"SchoolAddress",${escape(addressStr)}\n`);
        res.write(`"SchoolLogo",${escape(logoUrl)}\n\n`);

        // Write header
        res.write('teacherId,teacherName,bankName,bankAccount,amount,reference,date,salaryIndex\n');
        rows.forEach(r => {
            res.write(`${escape(r.teacherId)},${escape(r.teacherName)},${escape(r.bankName)},${escape(r.bankAccount)},${r.amount},${escape(r.reference)},${escape(r.date)},${r.salaryIndex}\n`);
        });
        res.end();
    } catch (error) {
        console.error('Payroll export error:', error);
        res.status(500).json({ message: 'Failed to export payroll', error: error.message });
    }
};

const deleteTeachers = async (req, res) => {
    try {
        if (!(await verifySchoolId(req, res, req.params.id))) return;
        const deletionResult = await Teacher.deleteMany({ school: req.params.id });

        const deletedCount = deletionResult.deletedCount || 0;

        if (deletedCount === 0) {
            res.send({ message: "No teachers found to delete" });
            return;
        }

        const deletedTeachers = await Teacher.find({ school: req.params.id });

        await Subject.updateMany(
            { teacher: { $in: deletedTeachers.map(teacher => teacher._id) } },
            { $unset: { teacher: "" } }
        );

        res.send(deletionResult);
    } catch (error) {
        res.status(500).json(error);
    }
};

const deleteTeachersByClass = async (req, res) => {
    try {
        const adminId = req.get('x-admin-id') || req.body.adminID || req.query.adminID || req.query.adminId;
        const query = { sclassName: req.params.id };
        if (adminId) query.school = adminId;
        const deletionResult = await Teacher.deleteMany(query);

        const deletedCount = deletionResult.deletedCount || 0;

        if (deletedCount === 0) {
            res.send({ message: "No teachers found to delete" });
            return;
        }

        const deletedTeachers = await Teacher.find({ sclassName: req.params.id });

        await Subject.updateMany(
            { teacher: { $in: deletedTeachers.map(teacher => teacher._id) }, teacher: { $exists: true } },
            { $unset: { teacher: "" }, $unset: { teacher: null } }
        );

        res.send(deletionResult);
    } catch (error) {
        res.status(500).json(error);
    }
};

const teacherAttendance = async (req, res) => {
    const { status, date } = req.body;

    try {
        const teacher = await Teacher.findById(req.params.id);
        if (!(await verifyEntityBelongsToAdminSchool(req, res, teacher))) return;

        if (!teacher) {
            return res.send({ message: 'Teacher not found' });
        }

        const existingAttendance = teacher.attendance.find(
            (a) =>
                a.date.toDateString() === new Date(date).toDateString()
        );

        if (existingAttendance) {
            existingAttendance.status = status;
        } else {
            teacher.attendance.push({ date, status });
        }

        const result = await teacher.save();
        return res.send(result);
    } catch (error) {
        res.status(500).json(error)
    }
};

const requestTeacherPasswordReset = async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ email: req.body.email });
        if (!teacher) {
            return res.status(404).send({ message: 'Teacher not found' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        teacher.resetPasswordToken = token;
        teacher.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await teacher.save();

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/Teacher/reset-password/${token}`;
        const emailResult = await sendResetPasswordLink(teacher.email, teacher.name, resetUrl);

        res.send({ message: 'Password reset link sent', emailResult });
    } catch (error) {
        res.status(500).json(error);
    }
};

const resetTeacherPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const teacher = await Teacher.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!teacher) {
            return res.status(400).send({ message: 'Invalid or expired token' });
        }

        const salt = await bcrypt.genSalt(10);
        teacher.password = await bcrypt.hash(password, salt);
        teacher.resetPasswordToken = '';
        teacher.resetPasswordExpires = null;

        await teacher.save();
        res.send({ message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json(error);
    }
};

// Admin-driven teacher password reset (Admin or SuperAdmin)
const resetTeacherPasswordByAdmin = async (req, res) => {
    try {
        const adminId = getAdminIdFromReq(req);
        const teacherId = req.params.teacherId || req.params.id;
        const { newPassword } = req.body;

        if (!newPassword) return res.status(400).send({ message: 'newPassword is required' });

        const teacher = await Teacher.findById(teacherId);
        if (!teacher) return res.status(404).send({ message: 'Teacher not found' });

        // Verify the requesting admin belongs to same school or is SuperAdmin
        if (!(await verifyEntityBelongsToAdminSchool(req, res, teacher))) return;

        const salt = await bcrypt.genSalt(10);
        teacher.password = await bcrypt.hash(newPassword, salt);
        await teacher.save();

        // Send notification email with temporary password (best-effort)
        try {
            await sendPasswordResetEmail(teacher.email, teacher.name, newPassword);
        } catch (emailErr) {
            console.error('Failed to send password email to teacher:', emailErr);
        }

        // Audit log the password reset
        try {
            const adminRecord = await Admin.findById(adminId);
            const actorRole = adminRecord ? (adminRecord.role || 'Admin') : 'Admin';
            await logAuditAction({
                school: teacher.school,
                user: adminId,
                userName: adminRecord ? adminRecord.name : undefined,
                userRole: actorRole,
                action: 'RESET_PASSWORD',
                entityType: 'Teacher',
                entityId: teacher._id,
                entityName: teacher.email,
                ipAddress: req.clientIP || null,
                userAgent: req.userAgent || req.get('user-agent') || '',
                resultMessage: 'Password reset by admin'
            });
        } catch (logErr) {
            console.error('Failed to write audit log for teacher password reset:', logErr);
        }

        res.send({ message: 'Password reset successfully' });
    } catch (err) {
        res.status(500).json(err);
    }
};

module.exports = {
    teacherRegister,
    teacherLogIn,
    getTeachers,
    getTeacherDetail,
    updateTeacher,
    updateTeacherSubject,
    updateTeacherRole,
    deleteTeacher,
    deleteTeachers,
    deleteTeachersByClass,
    teacherAttendance,
    payTeacherSalary,
    approveSalaryPayment,
    rejectSalaryPayment,
    payrollExport,
    requestTeacherPasswordReset,
    resetTeacherPassword,
    resetTeacherPasswordByAdmin
    ,
    searchTeacher
};
