
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const Student = require('../models/studentSchema.js');
const Sclass = require('../models/sclassSchema.js');
const Parent = require('../models/parentSchema.js');
const Subject = require('../models/subjectSchema.js');
const Admin = require('../models/adminSchema.js');
const Teacher = require('../models/teacherSchema.js');
const Settings = require('../models/settingsSchema.js');
const { sendFeeConfirmationToParent, sendPaymentReminderToParent, sendSMS } = require('../services/smsService.js');
const { sendResetPasswordLink, sendEmail, sendPasswordResetEmail } = require('../services/emailService.js');
const { logAuditAction } = require('../utils/auditLogger');
const { validateStudentInput, validateStudentUpdateInput, validatePassword, validateEmail } = require('../utils/validation.js');
const { getAdminIdFromReq, verifySchoolId, verifyEntityBelongsToAdminSchool, enforceSubscriptionStatus } = require('../middleware/schoolAccess.js');
const {
    GENERIC_RESET_REQUEST_MESSAGE,
    buildResetUrl,
    clearResetToken,
    createResetToken,
    findUserByResetToken,
    validateNewPassword,
    safeCompare,
} = require('../utils/passwordReset.js');
const { escapeRegExp, sanitizeSearchTerm } = require('../utils/searchUtils.js');

const GRADING_TABLES = {
    achievement: [
        { min: 90, grade: 'EE1', level: 'AL8', points: 8, remark: 'Exceeding Expectation' },
        { min: 75, grade: 'EE2', level: 'AL7', points: 7, remark: 'Exceeding Expectation' },
        { min: 58, grade: 'ME1', level: 'AL6', points: 6, remark: 'Meeting Expectation' },
        { min: 41, grade: 'ME2', level: 'AL5', points: 5, remark: 'Meeting Expectation' },
        { min: 31, grade: 'AE1', level: 'AL4', points: 4, remark: 'Approaching Expectation' },
        { min: 21, grade: 'AE2', level: 'AL3', points: 3, remark: 'Approaching Expectation' },
        { min: 11, grade: 'BE1', level: 'AL2', points: 2, remark: 'Below Expectation' },
        { min: 0, grade: 'BE2', level: 'AL1', points: 1, remark: 'Below Expectation' },
    ],
    cdacc: [
        { min: 80, grade: 'M', level: 'Mastery', points: 4, remark: 'Mastery' },
        { min: 65, grade: 'P', level: 'Proficient', points: 3, remark: 'Proficient' },
        { min: 50, grade: 'C', level: 'Competent', points: 2, remark: 'Competent' },
        { min: 0, grade: 'NYC', level: 'Not Yet Competent', points: 1, remark: 'Not Yet Competent' },
    ],
    knec: [
        { min: 80, grade: '1', level: 'Distinction', points: 1, remark: 'Distinction' },
        { min: 75, grade: '2', level: 'Distinction', points: 2, remark: 'Distinction' },
        { min: 70, grade: '3', level: 'Credit', points: 3, remark: 'Credit' },
        { min: 60, grade: '4', level: 'Credit', points: 4, remark: 'Credit' },
        { min: 50, grade: '5', level: 'Pass', points: 5, remark: 'Pass' },
        { min: 40, grade: '6', level: 'Pass', points: 6, remark: 'Pass' },
        { min: 0, grade: '7', level: 'Fail', points: 7, remark: 'Fail' },
    ],
};

const calculateResultGrade = (marks, gradingSystem = 'achievement') => {
    const numericMarks = Number(marks);
    const table = GRADING_TABLES[gradingSystem] || GRADING_TABLES.achievement;
    return table.find((entry, index) => numericMarks >= entry.min && (index === 0 || numericMarks < table[index - 1].min)) || table[table.length - 1];
};

const getComputedResult = (result) => {
    const gradingSystem = GRADING_TABLES[result.gradingSystem] ? result.gradingSystem : 'achievement';
    const grade = calculateResultGrade(result.marksObtained, gradingSystem);
    return { ...result, gradingSystem, ...grade };
};

const getCbcReportRemarks = (average, hasResults) => {
    if (!hasResults) {
        return {
            teacher: 'No assessment recorded for this term.',
            principal: 'Awaiting assessment results for this term.',
        };
    }
    if (average >= 75) {
        return {
            teacher: 'Exceeding Expectations (EE) - Excellent performance. Keep up the outstanding work.',
            principal: 'The learner is exceeding expectations and demonstrates excellent achievement.',
        };
    }
    if (average >= 50) {
        return {
            teacher: 'Meeting Expectations (ME) - Good progress and satisfactory achievement.',
            principal: 'The learner is meeting expectations. Continue with consistent effort.',
        };
    }
    if (average >= 30) {
        return {
            teacher: 'Approaching Expectations (AE) - Making progress with continued support.',
            principal: 'The learner is approaching expectations and should receive additional practice and guidance.',
        };
    }
    return {
        teacher: 'Below Expectations (BE) - Needs more effort, practice, and close guidance.',
        principal: 'The learner requires additional support and a focused improvement plan.',
    };
};

const getSchoolCode = (admin) => {
    if (!admin?.schoolName) return 'school';
    const normalized = admin.schoolName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalized || 'school';
};

const normalizeEmailLocalPart = (name, admissionNo, schoolCode) => {
    const namePart = name ? name.trim().toLowerCase().split(/\s+/)[0].replace(/[^a-z0-9]/g, '') : '';
    const admissionPart = admissionNo ? admissionNo.toString().trim().replace(/[^a-z0-9]/g, '') : '';
    const schoolPart = schoolCode ? schoolCode.toLowerCase().replace(/[^a-z0-9]/g, '') : '';

    let localPart = `${namePart || 'student'}${admissionPart}${schoolPart}`;
    if (!localPart || localPart === 'student') {
        localPart = `student${admissionPart || Date.now()}`;
    }

    return localPart;
};

const getSchoolEmailDomain = (admin) => {
    if (!admin) return 'school.ac.ke';

    const domainCandidates = [
        admin.settings?.schoolProfile?.email,
        admin.email,
    ];

    for (const candidate of domainCandidates) {
        if (!candidate) continue;
        const trimmed = candidate.trim();
        const emailMatch = trimmed.match(/@(.+)$/);
        if (emailMatch) {
            return emailMatch[1].toLowerCase();
        }

        try {
            const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
            const hostname = url.hostname.toLowerCase();
            return hostname.replace(/^www\./, '');
        } catch (error) {
            continue;
        }
    }

    const schoolCode = getSchoolCode(admin);
    return `${schoolCode}.ac.ke`;
};

const generateDefaultPassword = () => {
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    const all = lower + upper + digits;

    const randomChar = (chars) => chars[Math.floor(Math.random() * chars.length)];
    const passwordChars = [
        randomChar(lower),
        randomChar(upper),
        randomChar(digits),
    ];

    while (passwordChars.length < 10) {
        passwordChars.push(randomChar(all));
    }

    return passwordChars.sort(() => Math.random() - 0.5).join('');
};

const generateUniqueStudentEmail = async (studentName, admissionNo, schoolId) => {
    const admin = await Admin.findById(schoolId).select('email schoolName settings');
    const schoolCode = getSchoolCode(admin);
    const localPartBase = normalizeEmailLocalPart(studentName, admissionNo, schoolCode);
    const domain = getSchoolEmailDomain(admin);
    let email = `${localPartBase}@${domain}`;
    let tryCount = 1;

    while (await Student.findOne({ email, school: schoolId })) {
        email = `${localPartBase}${tryCount}@${domain}`;
        tryCount += 1;
    }

    return email;
};

const generateAdmissionNumber = async (schoolId) => {
    const admin = await Admin.findById(schoolId).select('schoolName');
    const schoolCode = getSchoolCode(admin).toUpperCase();
    const year = new Date().getFullYear();
    const prefix = `${schoolCode}-${year}`;
    const regex = new RegExp(`^${prefix}-(\\d{4})$`);

    const existing = await Student.find({ school: schoolId, admissionNo: { $regex: `^${prefix}-\\d{4}$` } }).select('admissionNo');
    const numbers = existing
        .map((item) => {
            const match = item.admissionNo.match(regex);
            return match ? Number(match[1]) : 0;
        })
        .filter((num) => !Number.isNaN(num));

    const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    const padded = nextNumber.toString().padStart(4, '0');
    return `${prefix}-${padded}`;
};

const createParentAccounts = async (student) => {
    const parentContacts = [];

    if (student.parentEmail) {
        parentContacts.push({
            email: student.parentEmail.toLowerCase().trim(),
            name: student.parentName || `${student.name} Parent`,
            phone: student.parentPhone,
        });
    }

    if (student.guardianEmail && student.guardianEmail.toLowerCase().trim() !== student.parentEmail?.toLowerCase().trim()) {
        parentContacts.push({
            email: student.guardianEmail.toLowerCase().trim(),
            name: student.guardianName || `${student.name} Guardian`,
            phone: student.guardianPhone,
        });
    }

    for (const contact of parentContacts) {
        if (!validateEmail(contact.email)) continue;

        try {
            const existingParent = await Parent.findOne({ email: contact.email, studentId: student._id, school: student.school });
            if (existingParent) continue;

            const parentPasswordHash = await bcrypt.hash(student.admissionNo, 10);
            const parent = new Parent({
                email: contact.email,
                password: parentPasswordHash,
                name: contact.name,
                phone: contact.phone || '',
                studentId: student._id,
                school: student.school,
                role: 'Parent'
            });
            await parent.save();
        } catch (parentErr) {
            console.error('Parent account creation failed for', contact.email, parentErr);
        }
    }
};

const studentRegister = async (req, res) => {
    try {
        const schoolId = req.body.adminID || getAdminIdFromReq(req);

        if (!schoolId) {
            return res.status(401).json({ message: 'Admin credentials are required for registration' });
        }

        const settings = await Settings.findOne({ school: schoolId }).select('enableBiometricAttendance');
        const biometricEnabled = Boolean(settings?.enableBiometricAttendance);
        const biometricId = typeof req.body.biometricId === 'string' ? req.body.biometricId.trim() : '';

        if (biometricId && !biometricEnabled) {
            return res.status(400).json({ message: 'Fingerprint registration is disabled in school settings' });
        }
        if (biometricEnabled && !biometricId) {
            return res.status(400).json({ message: 'Fingerprint ID is required because biometric attendance is enabled' });
        }

        // Validate input
        const validation = validateStudentInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ message: 'Validation errors', errors: validation.errors });
        }

        const studentName = req.body.name || req.body.studentName;
        const requestedAdmissionNo = req.body.admissionNo ? req.body.admissionNo.toString().trim() : '';
        const admissionNo = requestedAdmissionNo || await generateAdmissionNumber(schoolId);

        const passwordPlain = req.body.password && req.body.password.trim().length > 0
            ? req.body.password.trim()
            : admissionNo;
        if (req.body.password && req.body.password.trim().length > 0) {
            const passwordValidation = validatePassword(passwordPlain);
            if (!passwordValidation.valid) {
                return res.status(400).json({ message: passwordValidation.error });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(passwordPlain, salt);

        const email = await generateUniqueStudentEmail(studentName, admissionNo, schoolId);

        const query = [
            {
                school: schoolId,
                sclassName: req.body.sclassName,
                rollNum: req.body.rollNum,
            }
        ];

        if (admissionNo) {
            query.push({ school: schoolId, admissionNo });
        }

        const existingStudent = await Student.findOne({ $or: query });

        if (existingStudent) {
            const conflictField = existingStudent.admissionNo === admissionNo ? 'Admission number' : 'Roll Number';
            return res.status(409).json({ message: `${conflictField} already exists` });
        }
        if (biometricId) {
            const existingBiometricStudent = await Student.findOne({ biometricId });
            if (existingBiometricStudent) {
                return res.status(409).json({ message: 'This fingerprint ID is already registered to another student' });
            }
        }
        const studentData = {
                ...req.body,
                ...(biometricEnabled && biometricId ? { biometricId } : {}),
        };
            if (!biometricEnabled) {
                delete studentData.biometricId;
            }

        const student = new Student({
                ...studentData,
                admissionNo,
                name: studentName,
                email,
                school: schoolId,
                password: hashedPass,
                role: 'Student',
                forcePasswordChange: !requestedAdmissionNo && !req.body.password ? true : (!req.body.password ? true : false),
        });

        const result = await student.save();
        await createParentAccounts(student);

            const responseStudent = result.toObject();
            delete responseStudent.password;

            // Send immediate response - don't wait for notifications
            responseStudent.forcePasswordChange = student.forcePasswordChange;
            res.status(201).json({
                message: 'Student registered successfully',
                student: responseStudent,
                defaultPassword: req.body.password ? undefined : passwordPlain,
            });

            // Process notifications asynchronously in background (fire and forget)
            setImmediate(async () => {
                try {
                    const defaultMessage = `Dear Parent/Guardian, ${student.name} has been registered successfully. Admission No: ${student.admissionNo}. Class: ${student.sclassName || 'N/A'}.`;
                    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/Studentlogin`;
                    const emailSubject = 'Student Portal Account Created';
                    const emailHtml = `
                        <p>Dear Parent/Guardian,</p>
                        <p>${student.name} has been successfully registered in the school system.</p>
                        <p><strong>Admission Number:</strong> ${student.admissionNo}</p>
                        <p><strong>Email:</strong> ${student.email}</p>
                        <p><strong>Password:</strong> ${passwordPlain}</p>
                        <p>Please log in at <a href="${loginUrl}">${loginUrl}</a> and change the password on first login.</p>
                        <br/><p>Thank you,</p>
                        <p>School Management System</p>
                    `;

                    if (student.parentPhone) {
                        sendSMS(student.parentPhone, defaultMessage).catch(err => 
                            console.error('Parent SMS error:', err.message)
                        );
                    }
                    if (student.guardianPhone && student.guardianPhone !== student.parentPhone) {
                        sendSMS(student.guardianPhone, defaultMessage.replace('Parent', 'Guardian')).catch(err => 
                            console.error('Guardian SMS error:', err.message)
                        );
                    }
                    if (student.parentEmail) {
                        sendEmail(student.parentEmail, emailSubject, emailHtml).catch(err => 
                            console.error('Parent email error:', err.message)
                        );
                    }
                    if (student.guardianEmail && student.guardianEmail !== student.parentEmail) {
                        sendEmail(student.guardianEmail, emailSubject, emailHtml).catch(err => 
                            console.error('Guardian email error:', err.message)
                        );
                    }
                    if (student.email) {
                        sendEmail(student.email, emailSubject, emailHtml).catch(err => 
                            console.error('Student email error:', err.message)
                        );
                    }
                    
                    createParentAccounts(student).catch(err => 
                        console.error('Parent account creation error:', err.message)
                    );
                } catch (bgError) {
                    console.error('Background notification processing error:', bgError);
                }
            });
    } catch (err) {
        console.error('StudentReg error:', err);
        res.status(500).json({ message: err.message || 'Registration failure', error: err });
    }
};

const mongoose = require('mongoose');
const { findStudent } = require('../testdb');

const normalizeCsvHeader = (header) => header ? header.toString().trim().toLowerCase().replace(/\s+/g, '').replace(/_/g, '') : '';

const getCsvField = (row, ...names) => {
    for (const name of names) {
        const key = normalizeCsvHeader(name);
        if (row[key] !== undefined && row[key] !== null) {
            return row[key].toString().trim();
        }
    }
    return '';
};

const parseCsvText = (text) => {
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n').filter((line) => line.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

    const headers = lines[0].split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map((h) => normalizeCsvHeader(h));
    const rows = [];

    for (let i = 1; i < lines.length; i += 1) {
        const line = lines[i];
        const values = line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map((v) => v.trim().replace(/^\"|\"$/g, ''));
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] !== undefined ? values[index].trim() : '';
        });
        rows.push({ row, lineNumber: i + 1 });
    }

    return { headers, rows };
};

const findClassId = async (schoolId, value) => {
    if (!value) return null;
    const trimmedValue = value.toString().trim();

    if (mongoose.Types.ObjectId.isValid(trimmedValue)) {
        const found = await Sclass.findOne({ _id: trimmedValue, school: schoolId }).select('_id');
        if (found) return found._id;
    }

    const foundByName = await Sclass.findOne({ school: schoolId, sclassName: trimmedValue }).select('_id');
    return foundByName ? foundByName._id : null;
};

const createStudentFromCsvRow = async (row, schoolId) => {
    const studentName = getCsvField(row, 'name', 'studentname');
    const admissionNoInput = getCsvField(row, 'admissionno', 'admissionnumber', 'admno');
    const rollNumValue = getCsvField(row, 'rollnum', 'rollnumber', 'roll');
    const sclassValue = getCsvField(row, 'sclassname', 'classname', 'class', 'classid');
    const parentName = getCsvField(row, 'parentname');
    const parentPhone = getCsvField(row, 'parentphone', 'parenttelephone', 'parenttel', 'parentmobile');
    const parentEmail = getCsvField(row, 'parentemail', 'parentemailaddress');
    const guardianName = getCsvField(row, 'guardianname');
    const guardianPhone = getCsvField(row, 'guardianphone', 'guardiantel', 'guardianmobile');
    const guardianEmail = getCsvField(row, 'guardianemail');
    const guardianRelation = getCsvField(row, 'guardianrelation', 'guardianrelation');
    const nationalId = getCsvField(row, 'nationalid', 'nationalidnumber');
    const birthCertificateNumber = getCsvField(row, 'birthcertificatenumber', 'birthcertificate');
    const nemisNumber = getCsvField(row, 'nemisnumber', 'nemis');
    const previousLevelGrade = getCsvField(row, 'previouslevelgrade', 'previousgrade', 'previousgradelevel');
    const passwordInput = getCsvField(row, 'password');
    const emailInput = getCsvField(row, 'email');

    const sclassId = await findClassId(schoolId, sclassValue);
    if (!sclassId) {
        return { error: `Class '${sclassValue || 'unknown'}' was not found` };
    }

    const rollNum = Number(rollNumValue);
    if (!rollNum || rollNum <= 0) {
        return { error: 'Roll number is required and must be a positive value' };
    }

    const studentData = {
        name: studentName,
        admissionNo: admissionNoInput || '',
        rollNum,
        sclassName: sclassId,
        parentName,
        parentPhone,
        parentEmail,
        guardianName,
        guardianPhone,
        guardianEmail,
        guardianRelation,
        nationalId,
        birthCertificateNumber,
        nemisNumber,
        previousLevelGrade,
        school: schoolId,
        role: 'Student'
    };

    const validation = validateStudentInput(studentData);
    if (!validation.valid) {
        return { error: validation.errors.join('; ') };
    }

    const duplicateQuery = {
        school: schoolId,
        $or: [
            { rollNum },
        ]
    };
    if (studentData.admissionNo) duplicateQuery.$or.push({ admissionNo: studentData.admissionNo });
    if (emailInput) duplicateQuery.$or.push({ email: emailInput.toLowerCase() });

    const existingStudent = await Student.findOne(duplicateQuery);
    if (existingStudent) {
        const duplicateReasons = [];
        if (existingStudent.rollNum === rollNum) duplicateReasons.push('Roll number already exists');
        if (studentData.admissionNo && existingStudent.admissionNo === studentData.admissionNo) duplicateReasons.push('Admission number already exists');
        if (emailInput && existingStudent.email === emailInput.toLowerCase()) duplicateReasons.push('Email already exists');
        return { error: duplicateReasons.length > 0 ? duplicateReasons.join('; ') : 'Duplicate student record found' };
    }

    const admissionNo = studentData.admissionNo || await generateAdmissionNumber(schoolId);
    const passwordPlain = passwordInput || admissionNo;
    if (passwordInput) {
        const passwordValidation = validatePassword(passwordPlain);
        if (!passwordValidation.valid) {
            return { error: passwordValidation.error };
        }
    }

    const email = emailInput ? emailInput.toLowerCase() : await generateUniqueStudentEmail(studentName, admissionNo, schoolId);
    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(passwordPlain, salt);

    const student = new Student({
        ...studentData,
        admissionNo,
        email,
        password: hashedPass,
        forcePasswordChange: !passwordInput,
    });

    const result = await student.save();
    await createParentAccounts(result);
    const safeResult = result.toObject({ getters: true });
    delete safeResult.password;
    return { student: safeResult, password: passwordPlain };
};

const importStudents = async (req, res) => {
    try {
        const schoolId = req.params.id;
        if (!(await verifySchoolId(req, res, schoolId))) return;

        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ message: 'CSV file is required' });
        }

        const body = req.file.buffer.toString('utf8');
        const { rows } = parseCsvText(body);
        if (!rows.length) {
            return res.status(400).json({ message: 'CSV file contains no student rows' });
        }

        const results = [];
        for (const item of rows) {
            const row = item.row;
            const lineNumber = item.lineNumber;
            try {
                const importResult = await createStudentFromCsvRow(row, schoolId);
                if (importResult.error) {
                    results.push({ lineNumber, status: 'failed', error: importResult.error });
                    continue;
                }
                results.push({ lineNumber, status: 'created', student: importResult.student, password: importResult.password });
            } catch (createError) {
                console.error('Student import error on line', lineNumber, createError);
                results.push({ lineNumber, status: 'failed', error: createError.message || 'Unknown processing error' });
            }
        }

        const createdCount = results.filter((item) => item.status === 'created').length;
        const failedCount = results.filter((item) => item.status === 'failed').length;

        res.send({
            message: 'Student import finished',
            createdCount,
            failedCount,
            results,
        });
    } catch (err) {
        console.error('ImportStudents error:', err);
        res.status(500).json({ message: err.message || 'Student import failed', error: err });
    }
};


const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const studentLogIn = async (req, res) => {
    try {
        const identifier = req.body.email || req.body.admissionNo || req.body.rollNum;

        // If mongoose is not connected, fall back to in-memory test DB
        if (mongoose.connection.readyState !== 1) {
            const student = findStudent(identifier, req.body.studentName);
            if (!student) return res.status(404).send({ message: 'Student not found' });
            const validated = await bcrypt.compare(req.body.password, student.password);
            if (!validated) return res.status(401).send({ message: 'Invalid password' });
            const safe = { ...student };
            delete safe.password;
            return res.send(safe);
        }

        const normalizedEmail = req.body.email ? req.body.email.toString().trim().toLowerCase() : null;
        const normalizedAdmissionNo = req.body.admissionNo ? req.body.admissionNo.toString().trim() : null;
        const normalizedRollNum = req.body.rollNum ? Number(req.body.rollNum) : null;
        const normalizedName = req.body.studentName ? req.body.studentName.toString().trim() : null;

        let student = null;
        let usingFallbackStudent = false;
        if (normalizedEmail) {
            student = await Student.findOne({ email: normalizedEmail });
        }

        if (!student && normalizedAdmissionNo) {
            if (normalizedName) {
                const nameRegex = new RegExp(`^${escapeRegex(normalizedName)}$`, 'i');
                student = await Student.findOne({ admissionNo: normalizedAdmissionNo, name: nameRegex });
            }
            if (!student) {
                student = await Student.findOne({ admissionNo: normalizedAdmissionNo });
            }
        }

        if (!student && normalizedRollNum !== null) {
            if (normalizedName) {
                const nameRegex = new RegExp(`^${escapeRegex(normalizedName)}$`, 'i');
                student = await Student.findOne({ rollNum: normalizedRollNum, name: nameRegex });
            }
            if (!student) {
                student = await Student.findOne({ rollNum: normalizedRollNum });
            }
        }

        if (!student) {
            student = findStudent(identifier, req.body.studentName);
            usingFallbackStudent = Boolean(student);
        }

        if (student) {
            const school = await enforceSubscriptionStatus(student.school);
            if (school?.status === 'Suspended') {
                return res.status(403).send({
                    message: `Login blocked: ${school.statusChangeReason || 'school subscription is not active.'}`,
                    role: 'Student',
                    schoolStatus: 'Suspended'
                });
            }

            const validated = await bcrypt.compare(req.body.password, student.password);
            if (validated) {
                if (usingFallbackStudent) {
                    const safeStudent = { ...student };
                    delete safeStudent.password;
                    return res.send(safeStudent);
                }
                student = await student.populate('school', 'schoolName');
                student = await student.populate('sclassName', 'sclassName');
                student = await student.populate('examResult.subName', 'subName');
                student = await student.populate('attendance.subName', 'subName');
                const studentObj = student.toObject({ getters: true });
                delete studentObj.password;
                studentObj.forcePasswordChange = Boolean(studentObj.forcePasswordChange);
                return res.send(studentObj);
            }
            return res.status(401).send({ message: 'Invalid password', role: 'Student' });
        }

        return res.status(404).send({ message: 'Student not found', role: 'Student' });
    } catch (err) {
        res.status(500).json(err);
    }
};

const getStudents = async (req, res) => {
    try {
        const requesterId = getAdminIdFromReq(req);
        const requester = requesterId ? await Admin.findById(requesterId).select('role school') : null;
        if (!(await verifySchoolId(req, res, req.params.id))) return;
        const studentQuery = requester?.role === 'SuperAdmin'
            ? {}
            : { school: { $in: [requester?.school, req.params.id, requesterId].filter(Boolean) } };
        let students = await Student.find(studentQuery).populate("sclassName", "sclassName");
        if (students.length > 0) {
            students.forEach(reconcileAmounts);
            let modifiedStudents = students.map((student) => {
                const studentObj = student.toObject({ getters: true });
                delete studentObj.password;
                return studentObj;
            });
            res.send(modifiedStudents);
        } else {
            res.send({ message: "No students found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const getStudentDetail = async (req, res) => {
    try {
        let student = await Student.findById(req.params.id)
            .populate("school", "schoolName")
            .populate("sclassName", "sclassName")
            .populate({ path: 'examResult.subName', select: 'subName teacher', populate: { path: 'teacher', select: 'name' } })
            .populate('attendance.subName', 'subName')
            .select("-password");
        if (!(await verifyEntityBelongsToAdminSchool(req, res, student))) return;
        reconcileAmounts(student);
        const studentObj = student.toObject({ getters: true });
        delete studentObj.password;

        const classmates = await Student.find({
            school: student.school?._id || student.school,
            sclassName: student.sclassName?._id || student.sclassName,
        }).select('examResult');
        const totals = classmates.map((classmate) => {
            const results = (classmate.examResult || []).map(getComputedResult);
            return {
                totalMarks: results.reduce((sum, result) => sum + Number(result.marksObtained || 0), 0),
                totalPoints: results.reduce((sum, result) => sum + Number(result.points || 0), 0),
            };
        });
        const studentTotalMarks = totals.find((_, index) => String(classmates[index]._id) === String(student._id))?.totalMarks || 0;
        const studentTotalPoints = totals.find((_, index) => String(classmates[index]._id) === String(student._id))?.totalPoints || 0;
        const rankFor = (value, key) => 1 + totals.filter((entry) => entry[key] > value).length;
        const subjectRanks = {};
        (student.examResult || []).forEach((result) => {
            const subjectId = String(result.subName?._id || result.subName);
            const studentSubjectMarks = (student.examResult || [])
                .filter((entry) => String(entry.subName?._id || entry.subName) === subjectId)
                .reduce((sum, entry) => sum + Number(entry.marksObtained || 0), 0);
            const classSubjectMarks = classmates.map((classmate) => (classmate.examResult || [])
                .filter((entry) => String(entry.subName?._id || entry.subName) === subjectId)
                .reduce((sum, entry) => sum + Number(entry.marksObtained || 0), 0));
            subjectRanks[subjectId] = {
                rank: 1 + classSubjectMarks.filter((marks) => marks > studentSubjectMarks).length,
                outOf: classSubjectMarks.length,
            };
        });
        studentObj.reportSummary = {
            totalMarks: studentTotalMarks,
            totalPoints: studentTotalPoints,
            average: (student.examResult || []).length ? studentTotalMarks / student.examResult.length : 0,
            overallRank: rankFor(studentTotalMarks, 'totalMarks'),
            overallOutOf: totals.length,
            subjectRanks,
        };
        const automaticRemarks = getCbcReportRemarks(studentObj.reportSummary.average, (student.examResult || []).length > 0);
        studentObj.suggestedClassTeacherRemarks = automaticRemarks.teacher;
        studentObj.suggestedPrincipalRemarks = automaticRemarks.principal;
        const assignedTeachers = await Teacher.find({
            school: student.school?._id || student.school,
            teachSclass: student.sclassName?._id || student.sclassName,
        }).select('name teachSubject teachSubjects');
        const subjectTeacherMap = new Map();
        assignedTeachers.forEach((teacher) => {
            [teacher.teachSubject, ...(teacher.teachSubjects || [])].filter(Boolean).forEach((subjectId) => {
                if (!subjectTeacherMap.has(String(subjectId))) subjectTeacherMap.set(String(subjectId), teacher.name || 'Not assigned');
            });
        });
        studentObj.classTeacherName = assignedTeachers[0]?.name || 'Not assigned';
        studentObj.examResult = (studentObj.examResult || []).map((result) => ({
            ...getComputedResult(result),
            subjectTeacher: result.subName?.teacher?.name || subjectTeacherMap.get(String(result.subName?._id || result.subName)) || 'Not assigned',
        }));
        res.send(studentObj);
    } catch (err) {
        res.status(500).json(err);
    }
}

const deleteStudent = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!(await verifyEntityBelongsToAdminSchool(req, res, student))) return;
        const result = await Student.findByIdAndDelete(req.params.id);
        res.send(result)
    } catch (error) {
        res.status(500).json(error);
    }
}

const cleanupTempStudent = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!(await verifyEntityBelongsToAdminSchool(req, res, student))) return;
        const result = await Student.findByIdAndDelete(req.params.id);
        res.send({ message: 'Temporary student removed', studentId: req.params.id, deleted: !!result });
    } catch (error) {
        res.status(500).json(error);
    }
}


const deleteStudents = async (req, res) => {
    try {
        const result = await Student.deleteMany({ school: req.params.id })
        if (result.deletedCount === 0) {
            res.send({ message: "No students found to delete" })
        } else {
            res.send(result)
        }
    } catch (error) {
        res.status(500).json(err);
    }
}

const deleteStudentsByClass = async (req, res) => {
    try {
        const result = await Student.deleteMany({ sclassName: req.params.id })
        if (result.deletedCount === 0) {
            res.send({ message: "No students found to delete" })
        } else {
            res.send(result)
        }
    } catch (error) {
        res.status(500).json(err);
    }
}

const updateStudent = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!(await verifyEntityBelongsToAdminSchool(req, res, student))) return;

        const validation = validateStudentUpdateInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ message: 'Validation errors', errors: validation.errors });
        }

        const updateData = { ...req.body };
        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(req.body.password, salt);
        }

        let result = await Student.findByIdAndUpdate(req.params.id,
            { $set: updateData },
            { new: true });

        if (result) {
            reconcileAmounts(result);
            await result.save();
            result.password = undefined;
        }
        res.send(result)
    } catch (error) {
        res.status(500).json(error);
    }
}

const normalizePaymentStatus = (status) => {
    if (!status) return 'Completed';
    const normalized = status.toString().toLowerCase();
    if (['completed', 'success'].includes(normalized)) return 'Completed';
    if (normalized === 'verified') return 'Verified';
    if (['failed', 'declined', 'error'].includes(normalized)) return 'Failed';
    return 'Pending';
};

const reconcileAmounts = (student) => {
    const history = Array.isArray(student.paymentHistory) ? student.paymentHistory : [];
    const currentPeriod = student.feePeriodKey || 'initial';
    const totalFees = Number(student.totalFees) || 0;
    const normalizedHistory = history
        .map((p) => ({
            ...p,
            status: normalizePaymentStatus(p.status),
            amount: Number(p.amount || 0)
        }))
        .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

    let runningTotal = 0;
    const updatedHistory = normalizedHistory.map((payment) => {
        if (payment.feePeriodKey === currentPeriod && ['Completed', 'Verified'].includes(payment.status)) {
            runningTotal += payment.amount;
        }
        const balanceAfter = payment.feePeriodKey === currentPeriod ? totalFees - runningTotal : payment.balanceAfter;
        return {
            ...payment,
            balanceAfter,
        };
    });

    student.amountPaid = runningTotal;
    student.balance = totalFees - runningTotal;

    if (totalFees > 0 && student.balance <= 0) {
        student.paymentStatus = 'Completed';
    } else if (updatedHistory.some(p => p.status === 'Pending')) {
        student.paymentStatus = 'Pending';
    } else if (runningTotal > 0) {
        student.paymentStatus = 'Pending';
    } else {
        student.paymentStatus = 'Pending';
    }

    student.paymentHistory = updatedHistory;
};

const findStudentForPayment = async ({ studentId, admissionNo, rollNum, studentName, paybill, accountNumber, school }) => {
    if (studentId) {
        const student = await Student.findById(studentId);
        if (student) return student;
    }

    if (admissionNo) {
        const query = { admissionNo };
        if (school) query.school = school;
        const student = await Student.findOne(query);
        if (student) return student;
    }

    if (rollNum && studentName) {
        const query = { rollNum, name: studentName };
        if (school) query.school = school;
        const student = await Student.findOne(query);
        if (student) return student;
    }

    if (paybill) {
        const student = await Student.findOne({ 'paymentHistory.paybill': paybill });
        if (student) return student;
    }

    if (accountNumber) {
        const student = await Student.findOne({ 'paymentHistory.accountNumber': accountNumber });
        if (student) return student;
    }

    return null;
};

const createOrUpdatePaymentEntry = (student, paymentData) => {
    const {
        amount,
        paymentMethod,
        paybill,
        accountNumber,
        transactionId,
        status,
        receiptNumber,
        provider,
        reference,
        paymentReference,
        chequeNumber,
        paymentNote,
    } = paymentData;

    const normalizedReference = paymentReference || reference || transactionId || '';
    const normalizedTransactionId = transactionId || paymentReference || reference || '';

    let payment = null;
    if (normalizedTransactionId) {
        payment = student.paymentHistory.find(p => p.transactionId === normalizedTransactionId || p.receiptNumber === receiptNumber || p.reference === normalizedReference || p.paymentReference === normalizedReference);
    }

    if (!payment) {
        payment = {
            amount: Number(amount),
            paymentMethod,
            paybill: paybill || '',
            accountNumber: accountNumber || '',
            receiptNumber: receiptNumber || `RCPT-${student.admissionNo || student.rollNum || student._id}-${Date.now()}`,
            status,
            transactionId: normalizedTransactionId,
            balanceAfter: 0,
            verifiedBy: '',
            verifiedDate: null,
            provider: provider || '',
            reference: normalizedReference,
            paymentReference: normalizedReference,
            chequeNumber: chequeNumber || '',
            paymentNote: paymentNote || '',
        };
        student.paymentHistory.push(payment);
    } else {
        payment.amount = Number(amount);
        payment.paymentMethod = paymentMethod;
        payment.paybill = paybill || payment.paybill;
        payment.accountNumber = accountNumber || payment.accountNumber;
        payment.status = status;
        payment.transactionId = normalizedTransactionId || payment.transactionId;
        payment.provider = provider || payment.provider;
        payment.reference = normalizedReference || payment.reference;
        payment.paymentReference = normalizedReference || payment.paymentReference;
        payment.chequeNumber = chequeNumber || payment.chequeNumber;
        payment.paymentNote = paymentNote || payment.paymentNote;
    }

    return payment;
};

/**
 * External payment-provider webhook.
 *
 * SECURITY: this endpoint is reachable from the internet and changes fee
 * balances, so it must be authenticated. It previously accepted *any*
 * unauthenticated JSON payload (which allowed an attacker to mark any
 * student's fees as paid and to overwrite `totalFees`).
 *
 * Configure PAYMENT_WEBHOOK_SECRET and send either
 *   - header `x-webhook-secret: <secret>`, or
 *   - header `x-payment-signature: <hex HMAC-SHA256 of the raw body with that secret>`.
 * Without a configured secret the endpoint refuses to process payments.
 */
const isAuthorizedWebhookRequest = (req) => {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret) return false;

    const providedSecret = req.get('x-webhook-secret');
    if (providedSecret && safeCompare(providedSecret, secret)) return true;

    const signature = req.get('x-payment-signature');
    const rawBody = req.rawBody;
    if (signature && rawBody) {
        const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
        return safeCompare(String(signature).toLowerCase(), expected);
    }

    return false;
};

const paymentWebhook = async (req, res) => {
    try {
        if (!process.env.PAYMENT_WEBHOOK_SECRET) {
            console.error('[PAYMENT SECURITY] /Student/PaymentWebhook rejected: PAYMENT_WEBHOOK_SECRET is not configured');
            return res.status(503).send({ message: 'Payment webhook is not configured on this server' });
        }

        if (!isAuthorizedWebhookRequest(req)) {
            console.warn('[PAYMENT SECURITY] Rejected unauthenticated payment webhook request');
            return res.status(401).send({ message: 'Unauthorized webhook request' });
        }

        const {
            provider,
            studentId,
            admissionNo,
            rollNum,
            studentName,
            paymentMethod = 'Paybill',
            amount,
            paybill,
            accountNumber,
            transactionId,
            status = 'Completed',
            totalFees,
            receiptNumber,
            reference,
            school,
            adminID,
        } = req.body;

        const paymentSchool = school || adminID;

        if (!amount || Number(amount) <= 0) {
            return res.status(400).send({ message: 'Webhook payment must include a valid amount' });
        }

        const student = await findStudentForPayment({ studentId, admissionNo, rollNum, studentName, paybill, accountNumber, school: paymentSchool });
        if (!student) {
            return res.status(404).send({ message: 'Student not found for webhook payment' });
        }

        if (!isNaN(totalFees) && Number(totalFees) >= 0) {
            student.totalFees = Number(totalFees);
        }

        const normalizedStatus = normalizePaymentStatus(status);
        const payment = createOrUpdatePaymentEntry(student, {
            amount: Number(amount),
            paymentMethod,
            paybill: paybill || '',
            accountNumber: accountNumber || '',
            transactionId: transactionId || '',
            status: normalizedStatus,
            receiptNumber,
            provider: provider || '',
            reference: reference || '',
        });

        reconcileAmounts(student);
        payment.balanceAfter = student.balance;

        const result = await student.save();

        return res.send({
            message: 'Payment webhook processed successfully',
            student: {
                id: result._id,
                amountPaid: result.amountPaid,
                balance: result.balance,
                paymentStatus: result.paymentStatus,
            },
            payment,
        });
    } catch (error) {
        console.error('Webhook payment error:', error.message || error);
        res.status(500).json({ message: 'Webhook processing failed' });
    }
};

const getPaymentReconciliation = async (req, res) => {
    try {
        const { schoolId } = req.params;
        if (!(await verifySchoolId(req, res, schoolId))) return;
        const students = await Student.find({ school: schoolId });

        const transactionMap = {};
        const studentReconciliations = students.map((student) => {
            reconcileAmounts(student);
            const currentPeriod = student.feePeriodKey || 'initial';
            const completedPayments = student.paymentHistory.filter(p => p.feePeriodKey === currentPeriod && ['Completed', 'Verified'].includes(p.status));
            const computedPaid = completedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            const expectedBalance = Number(student.totalFees || 0) - computedPaid;

            student.paymentHistory.forEach((payment) => {
                const transactionId = payment.transactionId || payment.paymentReference || payment.reference;
                if (transactionId) {
                    transactionMap[transactionId] = transactionMap[transactionId] || [];
                    transactionMap[transactionId].push({
                        studentId: student._id,
                        studentName: student.name,
                        admissionNo: student.admissionNo,
                        rollNum: student.rollNum,
                        paymentId: payment._id,
                        amount: payment.amount,
                        status: payment.status,
                    });
                }
            });

            return {
                studentId: student._id,
                name: student.name,
                admissionNo: student.admissionNo,
                rollNum: student.rollNum,
                totalFees: student.totalFees,
                amountPaid: student.amountPaid,
                computedPaid,
                balance: student.balance,
                expectedBalance,
                mismatch: computedPaid !== (student.amountPaid || 0),
                pendingPayments: student.paymentHistory.filter(p => p.status === 'Pending'),
            };
        });

        const duplicateTransactions = Object.entries(transactionMap)
            .filter(([_, entries]) => entries.length > 1)
            .map(([transactionId, entries]) => ({ transactionId, entries }));

        const summary = {
            schoolId,
            totalStudents: students.length,
            totalExpectedFees: students.reduce((sum, student) => sum + (student.totalFees || 0), 0),
            totalCollected: students.reduce((sum, student) => sum + Number(student.amountPaid || 0), 0),
            totalOutstanding: students.reduce((sum, student) => sum + Number(student.balance || 0), 0),
            duplicateTransactionCount: duplicateTransactions.length,
        };

        res.send({ summary, duplicateTransactions, studentReconciliations });
    } catch (error) {
        console.error('Reconciliation report error:', error);
        res.status(500).json({ message: 'Reconciliation report failed', error: error.message });
    }
};

const applyPaymentReconciliation = async (req, res) => {
    try {
        const { schoolId } = req.params;
        if (!(await verifySchoolId(req, res, schoolId))) return;
        const students = await Student.find({ school: schoolId });
        const updatedStudents = [];

        for (const student of students) {
            let modified = false;

            student.paymentHistory.forEach((payment) => {
                if (payment.status === 'Pending' && payment.transactionId) {
                    payment.status = 'Completed';
                    modified = true;
                }
            });

            if (modified) {
                reconcileAmounts(student);
                await student.save();
                updatedStudents.push({
                    studentId: student._id,
                    name: student.name,
                    amountPaid: student.amountPaid,
                    balance: student.balance,
                });
            }
        }

        res.send({
            message: 'Payment reconciliation applied',
            updatedStudentsCount: updatedStudents.length,
            updatedStudents,
        });
    } catch (error) {
        console.error('Apply reconciliation error:', error);
        res.status(500).json({ message: 'Apply reconciliation failed', error: error.message });
    }
};

const studentFeePayment = async (req, res) => {
    const {
        amount,
        paymentMethod,
        paybill,
        accountNumber,
        totalFees,
        transactionId,
        reference,
        paymentReference,
        chequeNumber,
        paymentNote,
    } = req.body;

    if (!amount || Number(amount) <= 0) {
        console.error('Invalid payment amount:', amount);
        return res.status(400).send({ message: 'Please enter a valid payment amount' });
    }

    try {
        const student = await Student.findById(req.params.id);
        if (!(await verifyEntityBelongsToAdminSchool(req, res, student))) return;

        if (!student) {
            console.error('Student not found with ID:', req.params.id);
            return res.send({ message: 'Student not found' });
        }

        console.log('Processing payment for student:', student.name, 'Amount:', amount, 'Method:', paymentMethod);

        if (!isNaN(totalFees) && totalFees >= 0) {
            student.totalFees = Number(totalFees);
        }

        const paymentMethodValue = paymentMethod || 'Cash';
        const autoCompleteMethods = ['Paybill', 'Mpesa', 'Cheque', 'Cash', 'Lipa Na Mpesa', 'Bank Transfer'];
        const paymentStatus = autoCompleteMethods.includes(paymentMethodValue)
            ? 'Completed'
            : 'Pending';

        const receiptNumber = `RCPT-${student.admissionNo || student.rollNum || student._id}-${Date.now()}`;
        const paymentEntry = createOrUpdatePaymentEntry(student, {
            amount: Number(amount),
            paymentMethod: paymentMethodValue,
            paybill: paybill || '',
            accountNumber: accountNumber || '',
            receiptNumber,
            status: paymentStatus,
            transactionId: transactionId || '',
            provider: '',
            reference: reference || paymentReference || '',
            paymentReference: paymentReference || reference || '',
            chequeNumber: chequeNumber || '',
            paymentNote: paymentNote || '',
        });

        reconcileAmounts(student);
        paymentEntry.balanceAfter = student.balance;

        const result = await student.save();

        if (student.parentPhone) {
            await sendFeeConfirmationToParent(
                student.name,
                student.parentPhone,
                amount,
                student.balance,
                receiptNumber,
                paybill || 'N/A'
            );
        }

        const resultObj = result.toObject({ getters: true });
        delete resultObj.password;
        res.send({
            ...resultObj,
            message: 'Payment recorded successfully',
            receiptNumber,
            smsNotified: !!student.parentPhone
        });
    } catch (error) {
        console.error('Payment processing error:', error.message || error);
        res.status(500).json({ message: 'Payment could not be recorded. Please try again.' });
    }
}

// Verify payment and update status
const verifyPayment = async (req, res) => {
    try {
        const { studentId, paymentIndex, verifiedBy } = req.body;
        const student = await Student.findById(studentId);
        if (!(await verifyEntityBelongsToAdminSchool(req, res, student))) return;

        if (!student || !student.paymentHistory[paymentIndex]) {
            return res.send({ message: 'Payment not found' });
        }

        const payment = student.paymentHistory[paymentIndex];
        payment.status = 'Verified';
        // Prefer the authenticated requester for the audit trail; fall back to
        // the supplied value for backwards compatibility.
        payment.verifiedBy = getAdminIdFromReq(req) || verifiedBy || '';
        payment.verifiedDate = new Date();

        // Recompute totals and balance after verification
        reconcileAmounts(student);

        // Update the payment's balanceAfter to reflect the new student balance
        payment.balanceAfter = student.balance;

        const result = await student.save();
        result.password = undefined;
        res.send({ message: 'Payment verified successfully', student: result });
    } catch (error) {
        console.error('Payment verification error:', error.message || error);
        res.status(500).json({ message: 'Payment could not be verified. Please try again.' });
    }
}

// Get payment statistics for admin
const getPaymentStats = async (req, res) => {
    try {
        const requestedSchoolId = req.params.schoolId;
        const requesterId = getAdminIdFromReq(req);
        const requester = requesterId ? await Admin.findById(requesterId).select('role school') : null;
        const requesterSchool = requester?.school && typeof requester.school === 'object'
            ? requester.school._id || requester.school.id
            : requester?.school;
        const schoolId = requestedSchoolId && requestedSchoolId !== '[object Object]'
            ? requestedSchoolId
            : requester?.role === 'SuperAdmin'
                ? null
                : requesterSchool || requesterId;
        if (!(await verifySchoolId(req, res, schoolId || requesterId))) return;

        const students = await Student.find(schoolId ? { school: schoolId } : {});
        const { period = 'all', month, quarter, year } = req.query;
        let periodStart = null;
        let periodEnd = null;

        if (period === 'month' && /^\d{4}-\d{2}$/.test(month || '')) {
            periodStart = new Date(`${month}-01T00:00:00.000Z`);
            periodEnd = new Date(periodStart);
            periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
        } else if (period === 'quarter' && /^(\d{4})-Q([1-4])$/.test(quarter || '')) {
            const [, selectedYear, selectedQuarter] = quarter.match(/^(\d{4})-Q([1-4])$/);
            periodStart = new Date(Date.UTC(Number(selectedYear), (Number(selectedQuarter) - 1) * 3, 1));
            periodEnd = new Date(Date.UTC(Number(selectedYear), Number(selectedQuarter) * 3, 1));
        } else if (period === 'year' && /^\d{4}$/.test(year || '')) {
            periodStart = new Date(Date.UTC(Number(year), 0, 1));
            periodEnd = new Date(Date.UTC(Number(year) + 1, 0, 1));
        }

        const isInPeriod = (payment) => {
            if (!periodStart || !periodEnd) return true;
            const paymentDate = new Date(payment.date);
            return paymentDate >= periodStart && paymentDate < periodEnd;
        };

        const studentDetails = students.map((s) => {
            reconcileAmounts(s);
            const completedPayments = s.paymentHistory.filter(p => ['Completed', 'Verified'].includes(p.status) && isInPeriod(p));
            const periodAmountPaid = completedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            return {
                id: s._id,
                name: s.name,
                rollNum: s.rollNum,
                totalFees: s.totalFees,
                amountPaid: Number(s.amountPaid || 0),
                periodAmountPaid,
                balance: Number(s.balance || 0),
                paymentStatus: s.paymentStatus,
                parentPhone: s.parentPhone,
                lastPaymentDate: s.paymentHistory.length > 0 ? s.paymentHistory[s.paymentHistory.length - 1].date : null,
                paymentHistory: s.paymentHistory.filter(isInPeriod)
            };
        });

        const paymentByMethod = {};
        students.forEach((s) => {
            s.paymentHistory.forEach((p) => {
                if (['Completed', 'Verified'].includes(p.status) && isInPeriod(p)) {
                    const method = p.paymentMethod || 'Unknown';
                    paymentByMethod[method] = (paymentByMethod[method] || 0) + Number(p.amount || 0);
                }
            });
        });

        const totalFeesCollected = studentDetails.reduce((sum, s) => sum + s.periodAmountPaid, 0);
        const totalOutstanding = studentDetails.reduce((sum, s) => sum + s.balance, 0);

        const stats = {
            totalStudents: studentDetails.length,
            studentsPaid: studentDetails.filter(s => s.amountPaid > 0).length,
            studentsNotPaid: studentDetails.filter(s => s.amountPaid === 0).length,
            totalFeesExpected: studentDetails.reduce((sum, s) => sum + (s.totalFees || 0), 0),
            totalFeesCollected,
            totalOutstanding,
            paymentByMethod,
            studentDetails,
            period: periodStart && periodEnd ? { type: period, start: periodStart, end: periodEnd } : { type: 'all' }
        };

        res.send(stats);
    } catch (error) {
        console.error('Payment stats error:', error);
        res.status(500).json(error);
    }
}

// Send payment reminder to parent
const sendPaymentReminder = async (req, res) => {
    try {
        const { studentId } = req.params;
        const student = await Student.findById(studentId);
        if (!verifyEntityBelongsToAdminSchool(req, res, student)) return;

        if (!student || !student.parentPhone) {
            return res.send({ message: 'Parent phone number not found' });
        }

        const result = await sendPaymentReminderToParent(
            student.name,
            student.parentPhone,
            student.totalFees,
            student.balance,
            'SCHOOL-PAYBILL-001' // You should make this configurable
        );

        res.send({ message: 'Payment reminder sent', result });
    } catch (error) {
        res.status(500).json(error);
    }
}

const updateExamResult = async (req, res) => {
    const { subName, marksObtained, examType, term, gradingSystem, changeReason } = req.body;

    try {
        if (!subName) {
            return res.status(400).send({ message: 'Subject is required' });
        }

        const numericMarks = Number(marksObtained);
        if (!Number.isFinite(numericMarks) || numericMarks < 0 || numericMarks > 100) {
            return res.status(400).send({ message: 'Marks must be a number between 0 and 100' });
        }

        const normalizedExamType = (examType || 'CAT').toString().trim().toUpperCase();
        if (!['CAT', 'END_TERM'].includes(normalizedExamType)) {
            return res.status(400).send({ message: 'Invalid exam type' });
        }

        const normalizedGradingSystem = GRADING_TABLES[gradingSystem] ? gradingSystem : 'achievement';
        const normalizedTerm = (term || 'Term 1').toString().trim() || 'Term 1';
        const computedGrade = calculateResultGrade(numericMarks, normalizedGradingSystem);

        const student = await Student.findById(req.params.id).select('_id name school examResult');
        if (!(await verifyEntityBelongsToAdminSchool(req, res, student))) return;

        if (!student) {
            return res.status(404).send({ message: 'Student not found' });
        }

        const existingResult = student.examResult?.find((result) =>
            String(result.subName) === String(subName) && result.examType === normalizedExamType
        );
        const previousMark = existingResult?.marksObtained;

        const updateFields = {
            'examResult.$[elem].marksObtained': numericMarks,
            'examResult.$[elem].examType': normalizedExamType,
            'examResult.$[elem].term': normalizedTerm,
            'examResult.$[elem].gradingSystem': normalizedGradingSystem,
            'examResult.$[elem].grade': computedGrade.grade,
            'examResult.$[elem].level': computedGrade.level,
            'examResult.$[elem].points': computedGrade.points,
            'examResult.$[elem].remark': computedGrade.remark,
        };

        const updateResult = await Student.updateOne(
            {
                _id: req.params.id,
                'examResult.subName': subName,
                'examResult.examType': normalizedExamType,
            },
            { $set: updateFields },
            { arrayFilters: [{ 'elem.subName': subName, 'elem.examType': normalizedExamType }] }
        );

        if (updateResult.matchedCount > 0) {
            const updatedStudent = await Student.findById(req.params.id).populate('examResult.subName', 'subName');
            if (previousMark !== undefined && Number(previousMark) !== Number(marksObtained)) {
                const actorId = getAdminIdFromReq(req);
                const actor = actorId ? await Admin.findById(actorId).select('name email role') : null;
                const subject = await Subject.findById(subName).select('subName');
                await logAuditAction({
                    school: student.school,
                    user: actorId || null,
                    userName: actor?.name || actor?.email || 'Unknown user',
                    userRole: actor?.role || 'Teacher',
                    action: 'UPDATE',
                    entityType: 'grade',
                    entityId: student._id,
                        entityName: `${student.name || student._id} ${subject?.subName || 'subject'} ${normalizedExamType} mark`,
                    changesBefore: { marksObtained: previousMark },
                    changesAfter: { marksObtained: numericMarks, ...computedGrade, gradingSystem: normalizedGradingSystem },
                    changedFields: ['marksObtained', 'grade', 'level', 'points', 'remark', 'gradingSystem'],
                    ipAddress: req.clientIP || req.ip || 'Unknown',
                    userAgent: req.get('user-agent') || '',
                    status: 'warning',
                    resultMessage: 'Mark correction recorded and awaiting approval',
                    context: { module: 'Marks', page: 'Exam Results', method: req.method },
                    metadata: {
                        studentName: student.name,
                        subjectId: subName,
                        subjectName: subject?.subName || '',
                        examType: normalizedExamType,
                        previousMark,
                        newMark: marksObtained,
                        reason: changeReason || 'No reason provided',
                        approvalStatus: 'Awaiting Approval',
                    },
                });
            }
            return res.send(updatedStudent);
        }

        const newEntry = {
            subName,
            examType: normalizedExamType,
            term: normalizedTerm,
            marksObtained: numericMarks,
            gradingSystem: normalizedGradingSystem,
            ...computedGrade,
        };

        await Student.updateOne(
            { _id: req.params.id },
            { $push: { examResult: newEntry } }
        );

        const updatedStudent = await Student.findById(req.params.id).populate('examResult.subName', 'subName');
        return res.send(updatedStudent);
    } catch (error) {
        res.status(500).json(error);
    }
};

const requestStudentPasswordReset = async (req, res) => {
    try {
        // Support multiple lookup methods: admissionNo, rollNum, email, parentEmail
        let student = null;

        if (req.body.admissionNo) {
            student = await Student.findOne({ admissionNo: String(req.body.admissionNo).trim() });
        }

        if (!student && req.body.rollNum) {
            student = await Student.findOne({ rollNum: req.body.rollNum });
        }

        // Allow frontend to send `email` (or `parentEmail`) when requesting reset
        if (!student && req.body.email) {
            student = await Student.findOne({ email: String(req.body.email).trim().toLowerCase() });
        }

        if (!student && req.body.parentEmail) {
            student = await Student.findOne({ parentEmail: String(req.body.parentEmail).trim().toLowerCase() });
        }

        // Never reveal whether an account exists (user enumeration protection).
        if (!student) {
            return res.send({ message: GENERIC_RESET_REQUEST_MESSAGE });
        }

        const targetEmail = student.email || student.parentEmail;
        if (!targetEmail) {
            console.warn('[PASSWORD RESET] Student has no email address on file; reset link not sent');
            return res.send({ message: GENERIC_RESET_REQUEST_MESSAGE });
        }

        const { token, hashedToken, expiresAt } = createResetToken();
        student.resetPasswordToken = hashedToken;
        student.resetPasswordExpires = expiresAt;
        await student.save();

        const resetUrl = buildResetUrl('Student', token);
        const emailResult = await sendResetPasswordLink(targetEmail, student.name, resetUrl);
        if (!emailResult?.success) {
            console.error('[PASSWORD RESET] Delivery failed for student reset request');
        }

        return res.send({ message: GENERIC_RESET_REQUEST_MESSAGE });
    } catch (error) {
        console.error('Student password reset request error:', error.message || error);
        return res.status(500).send({ message: 'Unable to process the request right now. Please try again later.' });
    }
};

const resetStudentPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const passwordCheck = validateNewPassword(password);
        if (!passwordCheck.valid) {
            return res.status(400).send({ message: passwordCheck.error });
        }

        // Only the hash of the token is stored, and only an unexpired token is
        // accepted, which also guarantees single use (it is cleared below).
        const student = await findUserByResetToken(Student, token);
        if (!student) {
            return res.status(400).send({ message: 'Invalid or expired token' });
        }

        const salt = await bcrypt.genSalt(10);
        student.password = await bcrypt.hash(password, salt);
        student.forcePasswordChange = false;
        clearResetToken(student);
        await student.save();

        return res.send({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Student password reset error:', error.message || error);
        return res.status(500).send({ message: 'Password reset failed. Please request a new reset link.' });
    }
};

const changeStudentPassword = async (req, res) => {
    try {
        const studentId = req.body.studentId || req.user?.id;
        const { currentPassword, newPassword } = req.body;

        if (!studentId) {
            return res.status(400).send({ message: 'Student identifier is required' });
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).send({ message: 'Current password and new password are required' });
        }

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).send({ message: 'Student not found' });
        }

        const isValidCurrentPassword = await bcrypt.compare(currentPassword, student.password);
        if (!isValidCurrentPassword) {
            return res.status(401).send({ message: 'Current password is incorrect' });
        }

        const passwordCheck = validateNewPassword(newPassword);
        if (!passwordCheck.valid) {
            return res.status(400).send({ message: passwordCheck.error });
        }

        const salt = await bcrypt.genSalt(10);
        student.password = await bcrypt.hash(newPassword, salt);
        student.forcePasswordChange = false;
        await student.save();

        const safeStudent = student.toObject();
        delete safeStudent.password;

        return res.send({ message: 'Password changed successfully', student: safeStudent });
    } catch (error) {
        console.error('Change student password error:', error);
        return res.status(500).send({ message: 'Failed to change password' });
    }
};

// Admin-driven student password reset (Admin or SuperAdmin)
const resetStudentPasswordByAdmin = async (req, res) => {
    try {
        const adminId = getAdminIdFromReq(req);
        const studentId = req.params.studentId || req.params.id;
        const { newPassword } = req.body;

        if (!newPassword) return res.status(400).send({ message: 'newPassword is required' });

        const student = await Student.findById(studentId);
        if (!student) return res.status(404).send({ message: 'Student not found' });

        if (!(await verifyEntityBelongsToAdminSchool(req, res, student))) return;

        const salt = await bcrypt.genSalt(10);
        student.password = await bcrypt.hash(newPassword, salt);
        student.forcePasswordChange = false;
        await student.save();

        try {
            await sendPasswordResetEmail(student.email || student.parentEmail, student.name, newPassword);
        } catch (emailErr) {
            console.error('Failed to send password email to student:', emailErr);
        }

        try {
            const adminRecord = await Admin.findById(adminId);
            const actorRole = adminRecord ? (adminRecord.role || 'Admin') : 'Admin';
            await logAuditAction({
                school: student.school,
                user: adminId,
                userName: adminRecord ? adminRecord.name : undefined,
                userRole: actorRole,
                action: 'RESET_PASSWORD',
                entityType: 'Student',
                entityId: student._id,
                entityName: student.email || student.name,
                ipAddress: req.clientIP || null,
                userAgent: req.userAgent || req.get('user-agent') || '',
                resultMessage: 'Password reset by admin'
            });
        } catch (logErr) {
            console.error('Failed to write audit log for student password reset:', logErr);
        }

        res.send({ message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json(error);
    }
};

const getAcademicReport = async (req, res) => {
    try {
    const requestedTerm = (req.query.term || 'Term 1').toString().trim() || 'Term 1';
        const requestedSchoolId = req.params.schoolId;
        const requesterId = getAdminIdFromReq(req);
        const requester = requesterId ? await Admin.findById(requesterId).select('role school') : null;
        const requesterSchool = requester?.school && typeof requester.school === 'object'
            ? requester.school._id || requester.school.id
            : requester?.school;
        const schoolId = requestedSchoolId && requestedSchoolId !== '[object Object]'
            ? requestedSchoolId
            : requester?.role === 'SuperAdmin'
                ? null
                : requesterSchool || requesterId;
        if (!(await verifySchoolId(req, res, schoolId || requesterId))) return;

        const students = await Student.find(schoolId ? { school: schoolId } : {})
            .populate({ path: 'examResult.subName', select: 'subName teacher', populate: { path: 'teacher', select: 'name' } })
            .populate('sclassName', 'sclassName');
        const subjectTeacherMap = new Map();
        const reportTeachers = await Teacher.find(schoolId ? { school: schoolId } : {})
            .select('name teachSubject teachSubjects teachSclass');
        reportTeachers.forEach((teacher) => {
            const subjectIds = [teacher.teachSubject, ...(teacher.teachSubjects || [])].filter(Boolean);
            subjectIds.forEach((subjectId) => {
                if (!subjectTeacherMap.has(String(subjectId))) subjectTeacherMap.set(String(subjectId), teacher.name || 'Not assigned');
            });
        });

        const getTermResults = (student) => (student.examResult || [])
            .filter((result) => (result.term || 'Term 1') === requestedTerm)
            .map(getComputedResult);
        const totals = students.map((student) => ({
            id: String(student._id),
            totalMarks: getTermResults(student).reduce((sum, result) => sum + Number(result.marksObtained || 0), 0),
            totalPoints: getTermResults(student).reduce((sum, result) => sum + Number(result.points || 0), 0),
        }));
        const rankFor = (value, key) => 1 + totals.filter((entry) => entry[key] > value).length;
        const report = students.map(student => {
            const studentId = String(student._id);
            const studentTotal = totals.find((entry) => entry.id === studentId) || { totalMarks: 0, totalPoints: 0 };
            const termResults = getTermResults(student);
            const termAverage = termResults.length ? studentTotal.totalMarks / termResults.length : 0;
            const automaticRemarks = getCbcReportRemarks(termAverage, termResults.length > 0);
            const subjectTotals = {};
            getTermResults(student).forEach((result) => {
                const subjectId = String(result.subName?._id || result.subName);
                subjectTotals[subjectId] = (subjectTotals[subjectId] || 0) + Number(result.marksObtained || 0);
            });
            const subjectRanks = {};
            Object.entries(subjectTotals).forEach(([subjectId, subjectTotal]) => {
                const classSubjectTotals = students.map((classmate) => getTermResults(classmate)
                    .filter((result) => String(result.subName?._id || result.subName) === subjectId)
                    .reduce((sum, result) => sum + Number(result.marksObtained || 0), 0));
                subjectRanks[subjectId] = {
                    rank: 1 + classSubjectTotals.filter((value) => value > subjectTotal).length,
                    outOf: classSubjectTotals.length,
                };
            });
            return {
                id: student._id,
                name: student.name,
                rollNum: student.rollNum,
                admissionNo: student.admissionNo,
                class: student.sclassName?.sclassName || student.sclassName || 'N/A',
                stream: student.stream || student.streamName || '',
                session: student.term || student.session || student.academicYear || '',
                nextSchoolOpeningDate: student.nextSchoolOpeningDate || student.nextOpeningDate || null,
                classTeacherRemarks: student.classTeacherRemarks || student.teacherRemarks || '',
                principalRemarks: student.principalRemarks || student.headTeacherRemarks || '',
                suggestedClassTeacherRemarks: automaticRemarks.teacher,
                suggestedPrincipalRemarks: automaticRemarks.principal,
                reportSummary: {
                    totalMarks: studentTotal.totalMarks,
                    totalMarksPossible: (student.examResult || []).length * 100,
                    average: termAverage,
                    totalPoints: studentTotal.totalPoints,
                    overallRank: rankFor(studentTotal.totalMarks, 'totalMarks'),
                    overallOutOf: totals.length,
                    subjectRanks,
                },
                results: getTermResults(student).map(result => {
                    const computedResult = getComputedResult(result);
                    return {
                    subject: result.subName?.subName || 'Unknown',
                    subjectId: String(result.subName?._id || result.subName),
                    subjectTeacher: result.subName?.teacher?.name || subjectTeacherMap.get(String(result.subName?._id || result.subName)) || 'Not assigned',
                    examType: result.examType || 'CAT',
                    marksObtained: result.marksObtained,
                    grade: computedResult.grade,
                    level: computedResult.level,
                    points: computedResult.points,
                    remark: computedResult.remark,
                    gradingSystem: computedResult.gradingSystem,
                    term: requestedTerm,
                    };
                })
            };
        });

        const classTeacherMap = new Map();
        const classIds = [...new Set(students.map((student) => String(student.sclassName?._id || student.sclassName)).filter(Boolean))];
        const classTeachers = await Teacher.find({
            ...(schoolId ? { school: schoolId } : {}),
            teachSclass: { $in: classIds },
        }).select('name teachSclass');
        classTeachers.forEach((teacher) => {
            const classId = String(teacher.teachSclass);
            if (!classTeacherMap.has(classId)) classTeacherMap.set(classId, teacher.name || 'Not assigned');
        });
        report.forEach((studentReport, index) => {
            const student = students[index];
            studentReport.classTeacher = classTeacherMap.get(String(student.sclassName?._id || student.sclassName)) || 'Not assigned';
        });

        res.send({ totalStudents: students.length, academicReport: report });
    } catch (error) {
        res.status(500).json(error);
    }
};

const studentAttendance = async (req, res) => {
    const { subName, status, date } = req.body;

    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.send({ message: 'Student not found' });
        }

        if (!(await verifyEntityBelongsToAdminSchool(req, res, student))) return;

        const normalizedStatus = typeof status === 'string' ? status.trim() : status;
        const normalizedDate = date ? new Date(date) : new Date();
        const normalizedSubject = subName && subName.toString().trim() ? subName.toString().trim() : '';

        if (!normalizedSubject || !normalizedStatus || !normalizedDate || Number.isNaN(normalizedDate.getTime())) {
            return res.status(400).send({ message: 'Subject, status, and date are required' });
        }

        const subject = await Subject.findById(normalizedSubject);
        
        // Check for existing attendance record
        const existingAttendance = student.attendance.find((a) => {
            const attendanceDate = a.date instanceof Date ? a.date : new Date(a.date);
            return attendanceDate.toDateString() === normalizedDate.toDateString() && 
                   a.subName?.toString() === normalizedSubject;
        });

        if (existingAttendance) {
            existingAttendance.status = normalizedStatus;
        } else {
            const attendedSessions = student.attendance.filter((a) => a.subName?.toString() === normalizedSubject).length;
            // Support an explicit override from the caller (e.g., admin UI) to force-add attendance
            const override = req.body.override === true || req.body.override === 'true';
            const maxSessions = subject && subject.sessions !== undefined ? Number(subject.sessions) : null;
            // If maxSessions is null the subject has no configured limit. If maxSessions <= 0 treat as unlimited.
            if (maxSessions !== null && maxSessions > 0 && attendedSessions >= maxSessions && !override) {
                return res.send({ message: 'Maximum attendance limit reached' });
            }

            student.attendance.push({ 
                date: normalizedDate, 
                status: normalizedStatus, 
                subName: normalizedSubject 
            });
        }

        const result = await student.save();
        return res.send(result);
    } catch (error) {
        console.error('Attendance update error:', error);
        res.status(500).json({ message: 'Attendance update failed', error: error.message });
    }
};

const clearAllStudentsAttendanceBySubject = async (req, res) => {
    const subName = req.params.id;
    const adminId = req.get('x-admin-id') || req.body.adminID || req.query.adminID || req.query.adminId;

    try {
        const query = { 'attendance.subName': subName };
        if (adminId) query.school = adminId;

        const result = await Student.updateMany(
            query,
            { $pull: { attendance: { subName } } }
        );
        return res.send(result);
    } catch (error) {
        res.status(500).json(error);
    }
};

const clearAllStudentsAttendance = async (req, res) => {
    const schoolId = req.params.id

    try {
        if (!(await verifySchoolId(req, res, schoolId))) return;
        const result = await Student.updateMany(
            { school: schoolId },
            { $set: { attendance: [] } }
        );

        return res.send(result);
    } catch (error) {
        res.status(500).json(error);
    }
};

const removeStudentAttendanceBySubject = async (req, res) => {
    const studentId = req.params.id;
    const subName = req.body.subId

    try {
        const student = await Student.findById(studentId);
        if (!(await verifyEntityBelongsToAdminSchool(req, res, student))) return;

        const result = await Student.updateOne(
            { _id: studentId },
            { $pull: { attendance: { subName: subName } } }
        );

        return res.send(result);
    } catch (error) {
        res.status(500).json(error);
    }
};

const removeStudentAttendance = async (req, res) => {
    const studentId = req.params.id;

    try {
        const student = await Student.findById(studentId);
        if (!(await verifyEntityBelongsToAdminSchool(req, res, student))) return;

        const result = await Student.updateOne(
            { _id: studentId },
            { $set: { attendance: [] } }
        );

        return res.send(result);
    } catch (error) {
        res.status(500).json(error);
    }
};

const searchStudent = async (req, res) => {
    try {
        const { schoolId } = req.params;
        const { rollNum, admissionNo, query } = req.query;

        if (!(await verifySchoolId(req, res, schoolId))) return;

        const searchQuery = { school: schoolId };
        const searchConditions = [];
        const digitsOnly = (value) => typeof value === 'string' && /^[0-9]+$/.test(value);
        // Search terms are escaped before they reach MongoDB so user input can
        // never inject regular expression operators.
        const safeRollNum = sanitizeSearchTerm(rollNum);
        const safeAdmissionNo = sanitizeSearchTerm(admissionNo);
        const safeQuery = sanitizeSearchTerm(query);

        if (rollNum) {
            if (digitsOnly(rollNum)) {
                searchConditions.push({ rollNum: Number(rollNum) });
            } else if (safeRollNum) {
                searchConditions.push({ rollNum: { $regex: safeRollNum, $options: 'i' } });
            }
        }

        if (admissionNo) {
            if (digitsOnly(admissionNo)) {
                searchConditions.push({ admissionNo: admissionNo });
            } else if (safeAdmissionNo) {
                searchConditions.push({ admissionNo: { $regex: safeAdmissionNo, $options: 'i' } });
            }
        }

        if (query) {
            if (digitsOnly(query)) {
                searchConditions.push({ rollNum: Number(query) });
            }
            if (safeQuery) {
                searchConditions.push(
                    { admissionNo: { $regex: safeQuery, $options: 'i' } },
                    { name: { $regex: safeQuery, $options: 'i' } },
                    { parentName: { $regex: safeQuery, $options: 'i' } }
                );
            }
        }

        if (searchConditions.length === 0) {
            return res.status(400).send({ message: 'Please provide a search query (rollNum, admissionNo, or general query)' });
        }

        searchQuery.$or = searchConditions;

        const students = await Student.find(searchQuery)
            .populate('school', 'schoolName')
            .populate('sclassName', 'sclassName')
            .select('-password');

        if (students.length === 0) {
            return res.send({ message: 'No students found matching the search criteria', results: [] });
        }

        students.forEach(reconcileAmounts);

        res.send({
            message: `Found ${students.length} student(s)`,
            count: students.length,
            results: students
        });
    } catch (error) {
        res.status(500).json(error);
    }
};

const searchChequePayment = async (req, res) => {
    try {
        const { schoolId } = req.params;
        const chequeNumber = String(req.query.chequeNumber || req.query.query || '').trim();

        if (!(await verifySchoolId(req, res, schoolId))) return;
        if (!chequeNumber) {
            return res.status(400).send({ message: 'Please provide a cheque number' });
        }

        const safeChequeNumber = sanitizeSearchTerm(chequeNumber);
        if (!safeChequeNumber) {
            return res.status(400).send({ message: 'Please provide a cheque number' });
        }

        const students = await Student.find({
            school: schoolId,
            paymentHistory: {
                $elemMatch: {
                    chequeNumber: { $regex: safeChequeNumber, $options: 'i' },
                    paymentMethod: 'Cheque',
                },
            },
        }).populate('sclassName', 'sclassName').select('name admissionNo sclassName paymentHistory');

        const results = students.flatMap((student) =>
            (student.paymentHistory || [])
                .filter((payment) => payment.paymentMethod === 'Cheque' && String(payment.chequeNumber || '').toLowerCase().includes(chequeNumber.toLowerCase()))
                .map((payment) => ({
                    studentId: student._id,
                    studentName: student.name,
                    admissionNo: student.admissionNo,
                    className: student.sclassName?.sclassName || '',
                    amount: payment.amount,
                    chequeNumber: payment.chequeNumber,
                    receiptNumber: payment.receiptNumber,
                    date: payment.date,
                    status: payment.status,
                    paymentNote: payment.paymentNote,
                }))
        );

        res.send({ message: `Found ${results.length} cheque payment(s)`, count: results.length, results });
    } catch (error) {
        res.status(500).json(error);
    }
};

module.exports = {
    studentRegister,
    studentLogIn,
    getStudents,
    getStudentDetail,
    deleteStudents,
    deleteStudent,
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
    cleanupTempStudent,
    getAcademicReport,
    searchStudent,
    searchChequePayment,
    importStudents,
    generateUniqueStudentEmail,
    generateAdmissionNumber,
};
