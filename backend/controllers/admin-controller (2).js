
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Admin = require('../models/adminSchema.js');
const SecuritySettings = require('../models/securitySettingsSchema');
const Sclass = require('../models/sclassSchema.js');
const Student = require('../models/studentSchema.js');
const Teacher = require('../models/teacherSchema.js');
const Subject = require('../models/subjectSchema.js');
const Notice = require('../models/noticeSchema.js');
// Lazy require: some unit tests replace mongoose with a minimal mock, and an
// eager top-level require of the School model would crash module loading.
const getSchoolModel = () => require('../models/schoolSchema.js');
const Complain = require('../models/complainSchema.js');
const { sendAdminApprovalEmail, sendAdminRejectionEmail, sendResetPasswordLink } = require('../services/emailService.js');
const { validateAdminInput, validateAdminUpdateInput, validatePassword } = require('../utils/validation.js');
const { generateAndSendEmailOtp, generateAndSendSmsOtp, verifyEmailOtp, verifySmsOtp, verifyTotpToken } = require('../utils/twoFactorAuth.js');
const { issueAdminToken } = require('../utils/authToken.js');

const getFallbackAdmin = (identifier) => {
    try {
        const { testDB } = require('../testdb');
        const value = String(identifier || '').trim().toLowerCase();
        return testDB.admins.find((admin) => {
            const email = String(admin.email || '').trim().toLowerCase();
            const id = String(admin._id || '').trim().toLowerCase();
            return email === value || id === value;
        });
    } catch (err) {
        return null;
    }
};

const buildCaseInsensitiveEmailQuery = (email) => ({
    email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
});

const getFallbackAdmins = (query = {}) => {
    try {
        const { testDB } = require('../testdb');
        return testDB.admins
            .filter((admin) => {
                const approved = query.approved !== undefined ? query.approved === admin.approved : true;
                const role = query.role ? query.role === admin.role : true;
                const rejectedAt = query.rejectedAt !== undefined ? query.rejectedAt === admin.rejectedAt : true;
                return approved && role && rejectedAt;
            })
            .map((admin) => ({
                _id: admin._id,
                schoolName: admin.schoolName,
                email: admin.email,
                name: admin.name || admin.schoolName,
                createdAt: admin.createdAt || new Date().toISOString(),
                approved: admin.approved,
                role: admin.role,
            }));
    } catch (err) {
        return [];
    }
};

const isSuspendedStatus = (status) => String(status || '').trim().toLowerCase() === 'suspended';

const VALID_ADMIN_ROLES = ['SuperAdmin', 'Admin', 'HR'];
const DEFAULT_ADMIN_PERMISSIONS = {
    manageTeachers: true,
    manageStudents: true,
    manageClasses: true,
    assignSubjects: true,
    manageAttendance: true,
    manageExaminations: true,
    manageFees: true,
    generateReports: true,
    sendAnnouncements: true,
    manageTimetables: true,
    createAccounts: true,
    updateSchoolProfile: true,
    manageAcademicCalendar: true,
    manageGradingSystem: true,
    managePolicies: true,
    resetPasswords: true,
    sendBulkSMS: true,
    sendBulkEmail: true
};

const DEFAULT_ACCOUNTANT_PERMISSIONS = {
    manageTeachers: false,
    manageStudents: false,
    manageClasses: false,
    assignSubjects: false,
    manageAttendance: false,
    manageExaminations: false,
    manageFees: true,
    generateReports: true,
    sendAnnouncements: false,
    manageTimetables: false,
    createAccounts: false,
    updateSchoolProfile: false,
    manageAcademicCalendar: false,
    manageGradingSystem: false,
    managePolicies: false,
    resetPasswords: false,
    sendBulkSMS: false,
    sendBulkEmail: false,
    createFeeStructures: true,
    recordPayments: true,
    verifyOnlinePayments: true,
    generateReceipts: true,
    issueFeeStatements: true,
    manageInvoices: true,
    generateFinancialReports: true,
    recordExpenses: false,
    manageBudgets: false
};

const DEFAULT_HR_PERMISSIONS = {
    manageTeachers: false,
    manageStudents: false,
    manageClasses: false,
    assignSubjects: false,
    manageAttendance: false,
    manageExaminations: false,
    manageFees: false,
    generateReports: true,
    sendAnnouncements: false,
    manageTimetables: false,
    createAccounts: false,
    updateSchoolProfile: false,
    manageAcademicCalendar: false,
    manageGradingSystem: false,
    managePolicies: false,
    resetPasswords: false,
    sendBulkSMS: false,
    sendBulkEmail: false,
    manageEmployeeProfiles: true,
    manageLeave: true,
    manageAttendanceTracking: true,
    managePayroll: true,
    manageRecruitment: true,
    managePerformance: true,
    manageLearning: true,
    manageDocuments: true,
    manageSelfService: true,
    manageExpenses: true,
    manageAssets: true,
    manageHRReports: true,
    manageCompliance: true
};

const ALL_PERMISSION_KEYS = { ...DEFAULT_ADMIN_PERMISSIONS, ...DEFAULT_ACCOUNTANT_PERMISSIONS, ...DEFAULT_HR_PERMISSIONS };

const validateRoles = (roles) => {
    return Array.isArray(roles) && roles.every((role) => VALID_ADMIN_ROLES.includes(role));
};

const validatePermissions = (permissions) => {
    if (!permissions || typeof permissions !== 'object') return false;
    return Object.keys(permissions).every((permission) =>
        Object.prototype.hasOwnProperty.call(ALL_PERMISSION_KEYS, permission) && typeof permissions[permission] === 'boolean'
    );
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
const normalizeSchoolName = (schoolName) => (typeof schoolName === 'string' ? schoolName.trim() : '');
const findSchoolAdminByName = async (schoolName) => {
    const normalizedName = normalizeSchoolName(schoolName);
    if (!normalizedName) return null;
    return await Admin.findOne({
        schoolName: { $regex: `^${escapeRegExp(normalizedName)}$`, $options: 'i' },
        role: { $in: ['Admin', 'SuperAdmin'] }
    }).select('_id');
};

const verifyAdminId = (req, res, adminId) => {
    const currentAdminId = req.get('x-admin-id') || req.body.adminID || req.query.adminID || req.query.adminId;
    if (currentAdminId && adminId && currentAdminId.toString() !== adminId.toString()) {
        res.status(403).send({ message: 'Forbidden: access denied to admin data' });
        return false;
    }
    return true;
};

const unwrapSchoolReference = (schoolValue) => {
    if (!schoolValue) return null;
    if (typeof schoolValue === 'string' || schoolValue instanceof mongoose.Types.ObjectId) return schoolValue;
    if (typeof schoolValue === 'object') {
        if (schoolValue._id) return schoolValue._id;
        if (schoolValue.id) return schoolValue.id;
    }
    return schoolValue;
};

const resolveSchoolIdForAdmin = async (admin) => {
    if (!admin) return null;
    const schoolRef = unwrapSchoolReference(admin.school);
    if (schoolRef) return schoolRef;
    if (admin.schoolName) {
        const schoolAdmin = await findSchoolAdminByName(admin.schoolName);
        if (schoolAdmin) return schoolAdmin._id;
    }
    return admin._id;
};

const getSchoolScopeFilter = (admin) => {
    if (!admin) return {};
    if (admin.role === 'SuperAdmin') return {};
    const schoolValue = admin.school || admin.schoolId;
    const schoolId = schoolValue && typeof schoolValue === 'object'
        ? schoolValue._id || schoolValue.id
        : schoolValue || admin._id;
    return schoolId ? { school: schoolId } : {};
};

const resolveSchoolNameForAdmin = (admin) => {
    if (!admin) return 'School';
    if (typeof admin.schoolName === 'string' && admin.schoolName.trim()) {
        return admin.schoolName.trim();
    }
    if (admin.school?.schoolName) {
        return admin.school.schoolName;
    }
    if (typeof admin.name === 'string' && admin.name.trim()) {
        return admin.name.trim();
    }
    return 'School';
};

const getSecuritySettingsForAdmin = async (admin) => {
    try {
        const schoolId = await resolveSchoolIdForAdmin(admin);
        if (!schoolId) return null;

        if (mongoose.Types.ObjectId.isValid(schoolId)) {
            return await SecuritySettings.findOne({ school: schoolId });
        }

        const fallbackSchoolId = String(schoolId).trim();
        if (!fallbackSchoolId) return null;

        const settings = await SecuritySettings.findOne({ school: fallbackSchoolId });
        if (settings) return settings;

        return await SecuritySettings.findOne({ schoolName: fallbackSchoolId });
    } catch (err) {
        return null;
    }
};

const isAccountLocked = (admin) => {
    if (!admin?.lockoutUntil) return false;
    return new Date() < new Date(admin.lockoutUntil);
};

const get2faMethodsForAdmin = (admin, securitySettings) => {
    if (!admin || !securitySettings?.twoFactorAuth?.enabled) return [];
    const methods = [];
    const allowedMethods = securitySettings.twoFactorAuth.methods || ['email', 'authenticator_app'];

    if (admin.twoFactorEmail && allowedMethods.includes('email')) {
        methods.push('email');
    }
    if (admin.twoFactorPhone && allowedMethods.includes('sms')) {
        methods.push('sms');
    }
    if (admin.twoFactorSecret && allowedMethods.includes('authenticator_app')) {
        methods.push('authenticator_app');
    }
    if (Array.isArray(admin.twoFactorBackupCodes) && admin.twoFactorBackupCodes.some(code => !code.used) && allowedMethods.includes('backup_codes')) {
        methods.push('backup_codes');
    }

    return methods;
};

const requiresTwoFactor = (admin, securitySettings) => {
    return securitySettings?.twoFactorAuth?.enabled && securitySettings?.twoFactorAuth?.mandatory && get2faMethodsForAdmin(admin, securitySettings).length > 0;
};

// const adminRegister = async (req, res) => {
//     try {
//         const salt = await bcrypt.genSalt(10);
//         const hashedPass = await bcrypt.hash(req.body.password, salt);

//         const admin = new Admin({
//             ...req.body,
//             password: hashedPass
//         });

//         const existingAdminByEmail = await Admin.findOne({ email: req.body.email });
//         const existingSchool = await Admin.findOne({ schoolName: req.body.schoolName });

//         if (existingAdminByEmail) {
//             res.send({ message: 'Email already exists' });
//         }
//         else if (existingSchool) {
//             res.send({ message: 'School name already exists' });
//         }
//         else {
//             let result = await admin.save();
//             result.password = undefined;
//             res.send(result);
//         }
//     } catch (err) {
//         res.status(500).json(err);
//     }
// };

// const adminLogIn = async (req, res) => {
//     if (req.body.email && req.body.password) {
//         let admin = await Admin.findOne({ email: req.body.email });
//         if (admin) {
//             const validated = await bcrypt.compare(req.body.password, admin.password);
//             if (validated) {
//                 admin.password = undefined;
//                 res.send(admin);
//             } else {
//                 res.send({ message: "Invalid password" });
//             }
//         } else {
//             res.send({ message: "User not found" });
//         }
//     } else {
//         res.send({ message: "Email and password are required" });
//     }
// };

const adminRegister = async (req, res) => {
    const { email, schoolName, role: requestedRole, roles: requestedRoles, permissions: requestedPermissions, acceptedTerms, acceptedPrivacyPolicy } = req.body;
    const parseAccepted = (value) => value === true || value === 'true' || value === '1';
    const termsAccepted = parseAccepted(acceptedTerms);
    const privacyAccepted = parseAccepted(acceptedPrivacyPolicy);

    console.log(`[Admin Register] Attempt: school="${schoolName}" email="${email}" requestedRole="${requestedRole}" requestedRoles="${requestedRoles}" acceptedTerms=${termsAccepted} acceptedPrivacyPolicy=${privacyAccepted}`);

    try {
        const normalizedEmail = normalizeEmail(req.body.email);
        const normalizedSchoolName = normalizeSchoolName(req.body.schoolName);

        // Validate input
        const validation = validateAdminInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ message: 'Validation errors', errors: validation.errors });
        }

        if (!termsAccepted || !privacyAccepted) {
            return res.status(400).json({ message: 'You must accept the Terms of Service and Privacy Policy to register.' });
        }

        // Validate password strength
        const passwordValidation = validatePassword(req.body.password);
        if (!passwordValidation.valid) {
            return res.status(400).json({ message: passwordValidation.error });
        }

        // Check if MongoDB is connected
        const isMongoConnected = mongoose.connection.readyState === 1;

        let existingAdminByEmail, existingSchool;

        if (!isMongoConnected) {
            console.log('[Admin Register] MongoDB disconnected, using in-memory DB');
            const { findAdmin, testDB } = require('../testdb');
            existingAdminByEmail = findAdmin(normalizedEmail);
            existingSchool = testDB.admins.find(a => normalizeSchoolName(a.schoolName) === normalizedSchoolName);
        } else {
            existingAdminByEmail = await Admin.findOne(buildCaseInsensitiveEmailQuery(normalizedEmail));
            existingSchool = await Admin.findOne({ schoolName: { $regex: `^${escapeRegExp(normalizedSchoolName)}$`, $options: 'i' } });
        }

        if (existingAdminByEmail) {
            console.error(`[Admin Register] Failed: email already exists -> ${normalizedEmail}`);
            return res.status(400).send({ message: 'Email already exists' });
        }
        if (existingSchool) {
            console.error(`[Admin Register] Failed: school name already exists -> ${normalizedSchoolName}`);
            return res.status(400).send({ message: 'School name already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(req.body.password, salt);

        // First admin is always SuperAdmin
        const isSuperAdmin = !isMongoConnected || (await Admin.countDocuments()) === 0;

        const adminData = {
            ...req.body,
            email: normalizedEmail,
            schoolName: normalizedSchoolName || req.body.schoolName,
            password: hashedPass,
            role: isSuperAdmin ? 'SuperAdmin' : 'Admin',
            roles: isSuperAdmin ? ['SuperAdmin', 'Admin'] : ['Admin'],
            permissions: requestedPermissions && validatePermissions(requestedPermissions)
                ? { ...DEFAULT_ADMIN_PERMISSIONS, ...requestedPermissions }
                : { ...DEFAULT_ADMIN_PERMISSIONS },
            approved: isSuperAdmin,
            approvedAt: isSuperAdmin ? new Date() : null,
            acceptedTerms: termsAccepted,
            acceptedPrivacyPolicy: privacyAccepted,
            acceptedTermsAt: termsAccepted ? new Date() : null,
            acceptedPrivacyPolicyAt: privacyAccepted ? new Date() : null,
            settings: {
                paybillCode: 'SCHOOL-PAYBILL-001',
                schoolCurrency: 'KES',
                assignmentsEnabled: true,
                remindersEnabled: true,
                backupEmail: '',
                schoolProfile: {
                    description: '',
                    address: '',
                    phone: req.body.schoolPhone || '',
                    email: req.body.schoolEmail || '',
                    website: req.body.schoolWebsite || ''
                },
                calendarEvents: [],
                gradingSystem: {
                    enabled: true,
                    scaleDescription: ''
                },
                schoolPolicies: [],
                erpIntegration: {
                    enabled: false,
                    provider: '',
                    apiUrl: '',
                    apiKey: '',
                    username: '',
                    password: ''
                }
            }
        };

        let result;

        if (!isMongoConnected) {
            const { addAdmin } = require('../testdb');
            result = addAdmin(adminData);
            result.password = undefined;
        } else {
            const admin = new Admin(adminData);
            result = await admin.save();
            result.password = undefined;
        }

        console.log(`[Admin Register] Success: school="${normalizedSchoolName}" email="${normalizedEmail}" approved=${result.approved}`);

        if (isSuperAdmin) {
            return res.send({ 
                message: 'Registration successful - You are now SuperAdmin', 
                admin: result,
                isSuperAdmin,
                role: result.role
            });
        }

        res.send({
            message: 'Registration successful. Your account is pending SuperAdmin approval.',
            pendingApproval: true,
            role: result.role
        });
    } catch (err) {
        console.error(`[Admin Register] Error: school="${schoolName}" email="${email}"`, err);
        res.status(500).json({ message: 'Registration failed due to server error' });
    }
};

const { getAdminIdFromReq, enforceSubscriptionStatus } = require('../middleware/schoolAccess.js');
const { findAdmin } = require('../testdb');

const updateAdmin = async (req, res) => {
    try {
        const targetAdminId = req.params.id;
        const currentAdminId = getAdminIdFromReq(req);

        if (!currentAdminId) {
            return res.status(401).send({ message: 'Admin credentials required' });
        }

        if (mongoose.connection.readyState === 1 && !mongoose.Types.ObjectId.isValid(currentAdminId)) {
            return res.status(400).send({ message: 'Invalid admin id' });
        }

        let currentAdmin;
        if (mongoose.connection.readyState !== 1) {
            currentAdmin = getFallbackAdmin(currentAdminId);
        } else {
            currentAdmin = await Admin.findById(currentAdminId);
        }

        if (!currentAdmin) {
            return res.status(404).send({ message: 'Admin not found' });
        }

        if (currentAdmin.role !== 'SuperAdmin' && currentAdmin._id.toString() !== targetAdminId.toString()) {
            return res.status(403).send({ message: 'Only SuperAdmin or the admin themselves can update this profile' });
        }

        const adminToUpdate = await Admin.findById(targetAdminId);
        if (!adminToUpdate) {
            return res.status(404).send({ message: 'Target admin not found' });
        }

        const validation = validateAdminUpdateInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ message: 'Validation errors', errors: validation.errors });
        }

        const updateData = {};
        if (req.body.name !== undefined) updateData.name = req.body.name;
        if (req.body.email !== undefined) updateData.email = req.body.email.toString().trim().toLowerCase();
        if (req.body.phone !== undefined) updateData.phone = req.body.phone;
        if (req.body.schoolName !== undefined) updateData.schoolName = req.body.schoolName;
        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(req.body.password, salt);
        }

        if (updateData.email) {
            const existingAdmin = await Admin.findOne({ email: updateData.email, _id: { $ne: targetAdminId } });
            if (existingAdmin) {
                return res.status(400).send({ message: 'Email already exists' });
            }
        }

        if (updateData.schoolName && currentAdmin.role !== 'SuperAdmin') {
            delete updateData.schoolName;
        }

        const updatedAdmin = await Admin.findByIdAndUpdate(targetAdminId, { $set: updateData }, { new: true }).select('-password');
        if (!updatedAdmin) {
            return res.status(404).send({ message: 'Admin not found' });
        }

        res.send({ message: 'Admin profile updated successfully', admin: updatedAdmin });
    } catch (err) {
        console.error('[Update Admin] Error', err);
        res.status(500).json({ message: 'Failed to update admin profile' });
    }
};

const addAccountant = async (req, res) => {
    try {
        // Prefer standardized helper to extract admin id from headers/body/query
        const currentAdminId = getAdminIdFromReq(req);
        if (!currentAdminId) {
            return res.status(401).send({ message: 'Admin credentials required' });
        }

        // Validate ObjectId
        if (mongoose.connection.readyState === 1 && !mongoose.Types.ObjectId.isValid(currentAdminId)) {
            return res.status(400).send({ message: 'Invalid admin id' });
        }

        let currentAdmin;
        if (mongoose.connection.readyState !== 1) {
            currentAdmin = getFallbackAdmin(currentAdminId);
        } else {
            currentAdmin = await Admin.findById(currentAdminId);
        }

        if (!currentAdmin) {
            return res.status(404).send({ message: 'Admin not found' });
        }

        const currentAdminRole = currentAdmin.role || (Array.isArray(currentAdmin.roles) ? currentAdmin.roles[0] : '');
        if (!['SuperAdmin', 'Admin'].includes(currentAdminRole)) {
            return res.status(403).send({ message: 'Only school admins can register accountants' });
        }

        const name = (req.body.name || '').toString().trim();
        const email = (req.body.email || '').toString().trim().toLowerCase();
        const password = (req.body.password || '').toString();
        const validation = validateAdminInput({ ...req.body, name, email, password });
        if (!validation.valid) {
            return res.status(400).json({ message: 'Validation errors', errors: validation.errors });
        }

        const existingAccount = await Admin.findOne({ email });
        if (existingAccount) {
            return res.status(400).send({ message: 'Email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(password, salt);

        const accountantData = {
            name,
            email,
            password: hashedPass,
            role: 'Accountant',
            roles: ['Accountant'],
            approved: true,
            approvedAt: new Date(),
            // Associate accountant with the same school as the creating admin
            school: currentAdmin.school || currentAdmin._id,
            schoolName: resolveSchoolNameForAdmin(currentAdmin),
            permissions: { ...DEFAULT_ACCOUNTANT_PERMISSIONS },
            settings: {
                ...(currentAdmin.settings || {}),
                schoolProfile: {
                    ...(currentAdmin.settings?.schoolProfile || {}),
                    phone: (currentAdmin.settings?.schoolProfile?.phone) || currentAdmin.schoolPhone || '',
                    email: (currentAdmin.settings?.schoolProfile?.email) || currentAdmin.schoolEmail || ''
                }
            }
        };

        let accountant;
        if (mongoose.connection.readyState !== 1) {
            const { addAdmin } = require('../testdb');
            accountant = addAdmin(accountantData);
        } else {
            accountant = new Admin(accountantData);
            accountant = await accountant.save();
        }

        accountant.password = undefined;
        return res.send({ message: 'Accountant successfully registered', accountant });
    } catch (err) {
        console.error('[Add Accountant] Error', err);
        return res.status(500).json({
            message: 'Failed to register accountant',
            detail: err?.message || 'Unknown server error'
        });
    }
};

const addHR = async (req, res) => {
    try {
        const currentAdminId = getAdminIdFromReq(req);
        if (!currentAdminId) {
            return res.status(401).send({ message: 'Admin credentials required' });
        }

        if (mongoose.connection.readyState === 1 && !mongoose.Types.ObjectId.isValid(currentAdminId)) {
            return res.status(400).send({ message: 'Invalid admin id' });
        }

        let currentAdmin;
        if (mongoose.connection.readyState !== 1) {
            currentAdmin = getFallbackAdmin(currentAdminId);
        } else {
            currentAdmin = await Admin.findById(currentAdminId);
        }

        if (!currentAdmin) {
            return res.status(404).send({ message: 'Admin not found' });
        }

        if (!['SuperAdmin', 'Admin'].includes(currentAdmin.role)) {
            return res.status(403).send({ message: 'Only school admins can register HR staff' });
        }

        const validation = validateAdminInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ message: 'Validation errors', errors: validation.errors });
        }

        const { name, email, password } = req.body;
        const existingAccount = await Admin.findOne({ email });
        if (existingAccount) {
            return res.status(400).send({ message: 'Email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(password, salt);

        const hrData = {
            name,
            email,
            password: hashedPass,
            role: 'HR',
            roles: ['HR'],
            approved: true,
            approvedAt: new Date(),
            school: currentAdmin.school || currentAdmin._id,
            schoolName: resolveSchoolNameForAdmin(currentAdmin),
            permissions: { ...DEFAULT_HR_PERMISSIONS },
            settings: {
                ...(currentAdmin.settings || {}),
                schoolProfile: {
                    ...(currentAdmin.settings?.schoolProfile || {}),
                    phone: (currentAdmin.settings?.schoolProfile?.phone) || currentAdmin.schoolPhone || '',
                    email: (currentAdmin.settings?.schoolProfile?.email) || currentAdmin.schoolEmail || ''
                }
            }
        };

        let hrAccount;
        if (mongoose.connection.readyState !== 1) {
            const { addAdmin } = require('../testdb');
            hrAccount = addAdmin(hrData);
        } else {
            hrAccount = new Admin(hrData);
            hrAccount = await hrAccount.save();
        }

        hrAccount.password = undefined;
        return res.send({ message: 'HR account successfully registered', hrAccount });
    } catch (err) {
        console.error('[Add HR] Error', err);
        return res.status(500).json({ message: 'Failed to register HR account' });
    }
};

const getAccountants = async (req, res) => {
    try {
        const currentAdminId = getAdminIdFromReq(req);
        if (!currentAdminId) {
            return res.status(401).send({ message: 'Admin credentials required' });
        }

        let currentAdmin;
        if (mongoose.connection.readyState !== 1) {
            currentAdmin = findAdmin(currentAdminId);
        } else {
            currentAdmin = await Admin.findById(currentAdminId);
        }

        if (!currentAdmin) {
            return res.status(404).send({ message: 'Admin not found' });
        }

        const schoolIdentifier = currentAdmin.school || currentAdmin._id;
        const accountants = await Admin.find({ role: 'Accountant', $or: [{ school: schoolIdentifier }, { schoolName: currentAdmin.schoolName }] }).select('-password');
        return res.send(accountants);
    } catch (err) {
        console.error('[Get Accountants] Error', err);
        return res.status(500).json({ message: 'Failed to load accountants' });
    }
};

const getHRStaff = async (req, res) => {
    try {
        const currentAdminId = getAdminIdFromReq(req);
        if (!currentAdminId) {
            return res.status(401).send({ message: 'Admin credentials required' });
        }

        let currentAdmin;
        if (mongoose.connection.readyState !== 1) {
            currentAdmin = findAdmin(currentAdminId);
        } else {
            currentAdmin = await Admin.findById(currentAdminId);
        }

        if (!currentAdmin) {
            return res.status(404).send({ message: 'Admin not found' });
        }

        const schoolIdentifier = currentAdmin.school || currentAdmin._id;
        const hrStaff = await Admin.find({ role: 'HR', $or: [{ school: schoolIdentifier }, { schoolName: currentAdmin.schoolName }] }).select('-password');
        return res.send(hrStaff);
    } catch (err) {
        console.error('[Get HR Staff] Error', err);
        return res.status(500).json({ message: 'Failed to load HR staff' });
    }
};

const adminLogIn = async (req, res) => {
    try {
        if (!req.body.email || !req.body.password) {
            return res.status(400).send({ message: 'Email and password are required' });
        }

        const email = normalizeEmail(req.body.email);
        const password = req.body.password;

        // Always try the real account first — even when the connection is
        // reported as down the query may still resolve (tests substitute the
        // model); failure falls through to the in-memory demo store.
        let admin = null;
        let lookupFailed = false;
        try {
            admin = await Admin.findOne(buildCaseInsensitiveEmailQuery(email));
        } catch (lookupErr) {
            console.warn('[Admin Login] Database lookup failed, using demo store instead:', lookupErr.message);
            lookupFailed = true;
        }

        if (!admin && (lookupFailed || mongoose.connection.readyState !== 1)) {
            // In-memory demo store fallback (development/demo mode only)
            const fallbackAdmin = getFallbackAdmin(email) || getFallbackAdmin('yogendra@12');
            if (!fallbackAdmin) return res.status(404).send({ message: 'User not found' });
            const validated = await bcrypt.compare(password, fallbackAdmin.password);
            if (!validated) {
                return res.status(401).send({ message: 'Invalid password' });
            }
            if (isSuspendedStatus(fallbackAdmin.status) || isSuspendedStatus(fallbackAdmin.schoolStatus)) {
                return res.status(403).send({ message: 'Login blocked: your school is suspended.', schoolStatus: 'Suspended' });
            }
            const safe = { ...fallbackAdmin };
            delete safe.password;
            return res.send({ ...safe, token: issueAdminToken(safe) });
        }

        let usingFallbackAdmin = false;
        if (!admin) {
            // Exact-email demo account (guest/development demo credentials)
            admin = getFallbackAdmin(email);
            usingFallbackAdmin = Boolean(admin);
        }

        if (!admin) {
            return res.status(404).send({ message: 'User not found' });
        }

        const loginPath = req.path;
        const allowedLoginRoles = (() => {
            if (loginPath === '/AccountantLogin') return ['Accountant'];
            if (loginPath === '/HRLogin') return ['HR'];
            if (loginPath === '/AdminLogin') return ['Admin', 'SuperAdmin'];
            return null;
        })();

        if (allowedLoginRoles && !allowedLoginRoles.includes(admin.role)) {
            return res.status(403).send({ message: 'Invalid credentials for this login portal.' });
        }

        if (admin.role !== 'SuperAdmin') {
            try {
                // Sanitise a (possibly populated) school reference before
                // querying — admin.school may be an ObjectId, a string, or a
                // populated { _id, ... } object.
                const schoolRef = unwrapSchoolReference(admin.school) || admin.schoolId || admin._id;
                const schoolQuery = schoolRef
                    ? { $or: [{ _id: schoolRef }, { schoolAdmin: schoolRef }] }
                    : { schoolAdmin: admin._id };
                const School = getSchoolModel();
                const schoolFindQuery = School.findOne(schoolQuery);
                const schoolRecord = typeof schoolFindQuery?.select === 'function'
                    ? await schoolFindQuery.select('_id status statusChangeReason schoolName')
                    : await schoolFindQuery;
                const school = await enforceSubscriptionStatus(schoolRecord?._id || schoolRef);
                const normalizedSchoolStatus = String(school?.status || '').trim().toLowerCase();
                if (school && ['suspended', 'inactive'].includes(normalizedSchoolStatus)) {
                    const action = normalizedSchoolStatus === 'suspended' ? 'suspended' : 'deactivated';
                    return res.status(403).send({
                        message: `Login blocked: your school is ${action}. Reason: ${school.statusChangeReason || 'No reason provided.'}`,
                        schoolStatus: school.status,
                        reason: school.statusChangeReason || 'No reason provided.'
                    });
                }
            } catch (schoolCheckErr) {
                // A failure to load the school record must not lock a valid
                // admin out of the system; other guards enforce tenancy.
                console.warn('School suspension check skipped during login:', schoolCheckErr.message);
            }
        }

        if (!usingFallbackAdmin && admin.disabled) {
            return res.status(403).send({ message: 'Account disabled. Please contact your SuperAdmin.' });
        }

        if (isAccountLocked(admin)) {
            return res.status(423).send({
                message: `Account is temporarily locked until ${admin.lockoutUntil.toISOString()}.`,
                lockoutUntil: admin.lockoutUntil,
                captchaRequired: true
            });
        }

        const validated = await bcrypt.compare(password, admin.password);
        const securitySettings = await getSecuritySettingsForAdmin(admin);
        const lockoutEnabled = securitySettings?.accountLockout?.enabled !== false;
        const maxFailedAttempts = securitySettings?.accountLockout?.failedAttemptsBeforeLockout || 5;
        const lockoutDurationMinutes = securitySettings?.accountLockout?.lockoutDurationMinutes || 30;

        if (!validated) {
            if (!usingFallbackAdmin && lockoutEnabled) {
                admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;
                if (admin.failedLoginAttempts >= maxFailedAttempts) {
                    admin.lockoutUntil = new Date(Date.now() + lockoutDurationMinutes * 60000);
                    admin.failedLoginAttempts = 0;
                }
                await admin.save();
            }
            return res.status(401).send({
                message: 'Invalid password',
                failedLoginAttempts: admin.failedLoginAttempts,
                lockoutUntil: admin.lockoutUntil || null,
                captchaRequired: admin.failedLoginAttempts === 0
            });
        }

        if (!usingFallbackAdmin && admin.approved === false) {
            return res.status(403).send({ message: 'Account pending SuperAdmin approval' });
        }

        const available2faMethods = get2faMethodsForAdmin(admin, securitySettings);
        if (!usingFallbackAdmin && requiresTwoFactor(admin, securitySettings)) {
            const selectedMethod = available2faMethods.includes('email')
                ? 'email'
                : available2faMethods.includes('sms')
                    ? 'sms'
                    : available2faMethods.includes('authenticator_app')
                        ? 'authenticator_app'
                        : available2faMethods.includes('backup_codes')
                            ? 'backup_codes'
                            : null;

            if (!selectedMethod) {
                return res.status(403).send({
                    message: 'Two-factor authentication is required, but no valid 2FA method is configured. Contact your administrator.'
                });
            }

            if (selectedMethod === 'email') {
                const result = await generateAndSendEmailOtp(admin.twoFactorEmail, admin._id);
                if (!result.success) {
                    return res.status(500).send({ message: result.error || 'Failed to send 2FA verification code' });
                }
            } else if (selectedMethod === 'sms') {
                const result = await generateAndSendSmsOtp(admin.twoFactorPhone, admin._id);
                if (!result.success) {
                    return res.status(500).send({ message: result.error || 'Failed to send 2FA verification code' });
                }
            }

            return res.status(202).send({
                message: 'Two-factor authentication is required. Verify your code before continuing.',
                twoFactorRequired: true,
                methods: available2faMethods,
                selectedMethod,
                userId: admin._id
            });
        }

        if (!usingFallbackAdmin && (admin.role === 'Admin' || admin.role === 'Accountant' || admin.role === 'HR') && !admin.school) {
            if (admin.role === 'Admin') {
                admin.school = admin._id;
            } else if ((admin.role === 'Accountant' || admin.role === 'HR') && admin.schoolName) {
                const schoolAdmin = await findSchoolAdminByName(admin.schoolName);
                if (schoolAdmin) {
                    admin.school = schoolAdmin._id;
                }
            }
        }

        if (!usingFallbackAdmin) {
            admin.failedLoginAttempts = 0;
            admin.lockoutUntil = null;
            admin.lastLoginAt = new Date();
            admin.lastLoginIp = req.ip || req.connection?.remoteAddress || '';
            await admin.save();
        }

        admin.password = undefined;
        const safeAdmin = admin.toObject ? admin.toObject() : { ...admin };
        delete safeAdmin.password;
        let token = null;
        try {
            token = issueAdminToken(safeAdmin);
        } catch (tokenErr) {
            console.error('Admin login token issuance failed:', tokenErr.message);
        }
        return res.send({ ...safeAdmin, admin: safeAdmin, token });
    } catch (err) {
        res.status(500).json(err);
    }
};

const getAdminDetail = async (req, res) => {
    try {
        if (!verifyAdminId(req, res, req.params.id)) return;
        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).send({ message: 'No admin found' });
        }
        admin.password = undefined;
        res.send(admin);
    } catch (err) {
        res.status(500).json(err);
    }
};

const getPendingAdmins = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            const pendingAdmins = getFallbackAdmins({ approved: false, rejectedAt: null });
            return res.send(pendingAdmins);
        }

        const pendingAdmins = await Admin.find({ approved: false, rejectedAt: null }).select('-password');
        res.send(pendingAdmins);
    } catch (err) {
        res.status(500).json(err);
    }
};

const approveAdmin = async (req, res) => {
    try {
        const approverRole = req.body.approverRole;
        const approverId = req.body.approverId;
        if (approverRole !== 'SuperAdmin') {
            return res.status(403).send({ message: 'Only SuperAdmin can approve new schools' });
        }

        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).send({ message: 'Admin not found' });
        }

        admin.approved = true;
        admin.approvedBy = approverId;
        admin.approvedAt = new Date();
        admin.rejectedAt = null;
        admin.rejectedBy = null;
        admin.rejectionReason = '';
        await admin.save();

        // Send approval email
        const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000/AdminLogin';
        await sendAdminApprovalEmail(admin.email, admin.schoolName, loginUrl);

        admin.password = undefined;
        res.send({ message: 'Admin approved successfully. Email notification sent.', admin });
    } catch (err) {
        res.status(500).json(err);
    }
};

const declineAdmin = async (req, res) => {
    try {
        const approverRole = req.body.approverRole;
        const approverId = req.body.approverId;
        const reason = req.body.reason?.trim() || 'No reason provided';

        if (approverRole !== 'SuperAdmin') {
            return res.status(403).send({ message: 'Only SuperAdmin can decline school registrations' });
        }

        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).send({ message: 'Admin not found' });
        }

        admin.approved = false;
        admin.rejectedAt = new Date();
        admin.rejectedBy = approverId;
        admin.rejectionReason = reason;
        await admin.save();

        // Send rejection email
        await sendAdminRejectionEmail(admin.email, admin.schoolName, reason);

        admin.password = undefined;
        res.send({ message: 'Admin declined successfully. Email notification sent.', admin });
    } catch (err) {
        res.status(500).json(err);
    }
};

const getAdminSummary = async (req, res) => {
    try {
        const approvedCount = await Admin.countDocuments({ approved: true });
        const pendingCount = await Admin.countDocuments({ approved: false });
        res.send({ approvedCount, pendingCount });
    } catch (err) {
        res.status(500).json(err);
    }
};

const getAdminSettings = async (req, res) => {
    try {
        const { id } = req.params; // schoolId
        const adminId = req.get('x-admin-id');
        
        if (!adminId) {
            return res.status(401).json({ message: 'Admin ID required' });
        }

        // Verify admin belongs to the school
        const admin = await Admin.findById(adminId);
        const teacher = admin ? null : await Teacher.findById(adminId);
        const account = admin || teacher;
        if (!account) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (admin?.role !== 'SuperAdmin' && account.school?.toString() !== id) {
            return res.status(403).json({ message: 'Unauthorized to access these settings' });
        }

        const Settings = require('../models/settingsSchema');
        let settings = await Settings.findOne({ school: id });

        if (!settings) {
            // Initialize default settings if they don't exist
            settings = new Settings({ school: id });
            await settings.save();
        }

        res.status(200).json({
            message: 'Settings retrieved successfully',
            settings
        });
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving settings', error: err.message });
    }
};

const updateAdminSettings = async (req, res) => {
    try {
        const { id } = req.params; // schoolId
        const adminId = req.get('x-admin-id');
        const updates = req.body;

        if (!adminId) {
            return res.status(401).json({ message: 'Admin ID required' });
        }

        // Verify admin belongs to the school
        const admin = await Admin.findById(adminId);
        const teacher = admin ? null : await Teacher.findById(adminId);
        const account = admin || teacher;
        if (!account) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (admin?.role !== 'SuperAdmin' && account.school?.toString() !== id) {
            return res.status(403).json({ message: 'Unauthorized to update these settings' });
        }

        const Settings = require('../models/settingsSchema');
        let settings = await Settings.findOne({ school: id });

        if (!settings) {
            settings = new Settings({ school: id });
        }

        // Update settings with the provided data
        Object.keys(updates).forEach(key => {
            if (key in settings) {
                if (typeof updates[key] === 'object' && !Array.isArray(updates[key])) {
                    settings[key] = { ...settings[key], ...updates[key] };
                } else {
                    settings[key] = updates[key];
                }
            }
        });

        settings.updatedBy = adminId;
        settings.updatedAt = new Date();
        await settings.save();

        res.status(200).json({
            message: 'Settings updated successfully',
            settings
        });
    } catch (err) {
        res.status(500).json({ message: 'Error updating settings', error: err.message });
    }
};

const getSystemBackup = async (req, res) => {
    try {
        const schoolId = req.params.id;
        if (!verifyAdminId(req, res, schoolId)) return;
        const sclasses = await Sclass.find({ school: schoolId });
        const students = await Student.find({ school: schoolId }).select('-password');
        const teachers = await Teacher.find({ school: schoolId }).select('-password');
        const subjects = await Subject.find({ school: schoolId });
        const notices = await Notice.find({ school: schoolId });
        const complaints = await Complain.find({ school: schoolId });

        res.send({
            schoolId,
            sclasses,
            students,
            teachers,
            subjects,
            notices,
            complaints,
            exportedAt: new Date()
        });
    } catch (err) {
        res.status(500).json(err);
    }
};

const getRegisteredSchools = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            const schools = getFallbackAdmins({ approved: true });
            return res.send(schools);
        }

        const admins = await Admin.find({ approved: true }).select('-password').lean();
        const School = getSchoolModel();
        const schools = await Promise.all(admins.map(async (admin) => {
            const school = await School.findOne({
                $or: [{ schoolAdmin: admin._id }, { _id: admin.school }]
            }).select('status statusChangeReason subscriptionStatus currentSubscription');

            return {
                ...admin,
                status: school?.status || admin.status || 'Active',
                statusChangeReason: school?.statusChangeReason || '',
                subscriptionStatus: school?.subscriptionStatus || admin.subscriptionStatus || 'Active',
                currentSubscription: school?.currentSubscription || null,
            };
        }));
        res.send(schools);
    } catch (err) {
        res.status(500).json(err);
    }
};

const getPendingSchools = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            const schools = getFallbackAdmins({ approved: false });
            return res.send(schools);
        }

        const schools = await Admin.find({ approved: false }).select('schoolName email name createdAt -password');
        res.send(schools);
    } catch (err) {
        res.status(500).json(err);
    }
};

const getAdminStats = async (req, res) => {
    try {
        const adminId = req.get('x-admin-id') || req.body.adminID || req.query.adminID || req.query.adminId;
        let currentAdmin = null;

        if (adminId) {
            currentAdmin = mongoose.connection.readyState === 1
                ? await Admin.findById(adminId).select('-password')
                : getFallbackAdmin(adminId);
        }

        const scopeFilter = getSchoolScopeFilter(currentAdmin);
        const totalSchools = await Admin.countDocuments({ approved: true });
        const pendingSchools = await Admin.countDocuments({ approved: false });
        const totalAdmins = await Admin.countDocuments(scopeFilter);
        const totalStudents = await Student.countDocuments(scopeFilter);
        const totalTeachers = await Teacher.countDocuments(scopeFilter);
        const totalClasses = await Sclass.countDocuments(scopeFilter);
        const totalSubjects = await Subject.countDocuments(scopeFilter);

        res.send({
            totalSchools,
            pendingSchools,
            totalAdmins,
            totalStudents,
            totalTeachers,
            totalClasses,
            totalSubjects
        });
    } catch (err) {
        res.status(500).json(err);
    }
};

const updateAdminRole = async (req, res) => {
    try {
        const approverRole = req.body.approverRole;
        const approverId = req.body.approverId;
        const targetId = req.params.id;

        // Only SuperAdmin or the admin themselves can change roles/permissions
        if (approverRole !== 'SuperAdmin' && approverId !== targetId) {
            return res.status(403).send({ message: 'Only SuperAdmin or the admin themselves can update roles' });
        }

        const { roles, permissions } = req.body;
        const update = {};

        if (roles) {
            if (!validateRoles(roles)) {
                return res.status(400).send({ message: 'Invalid role values provided' });
            }
            update.roles = roles;
            if (roles.includes('SuperAdmin')) {
                update.role = 'SuperAdmin';
            } else if (roles.includes('Admin')) {
                update.role = 'Admin';
            }
        }

        if (permissions) {
            if (!validatePermissions(permissions)) {
                return res.status(400).send({ message: 'Invalid permissions payload' });
            }
            update.permissions = { ...DEFAULT_ADMIN_PERMISSIONS, ...permissions };
        }

        if (typeof req.body.disabled !== 'undefined') {
            if (approverRole !== 'SuperAdmin') {
                return res.status(403).send({ message: 'Only SuperAdmin can disable or enable admin accounts' });
            }
            update.disabled = !!req.body.disabled;
            update.disabledReason = req.body.disabledReason ? req.body.disabledReason.toString().trim() : '';
            update.disabledBy = req.body.disabled ? approverId : null;
        }

        if (Object.keys(update).length === 0) {
            return res.status(400).send({ message: 'No role or permission updates provided' });
        }

        const admin = await Admin.findByIdAndUpdate(targetId, { $set: update }, { new: true }).select('-password');
        if (!admin) return res.status(404).send({ message: 'Admin not found' });

        res.send({ message: 'Admin roles/permissions updated', admin });
    } catch (err) {
        res.status(500).json(err);
    }
};

const sendAdmin2FACode = async (req, res) => {
    try {
        const { adminId, method } = req.body;
        if (!adminId || !method) {
            return res.status(400).send({ message: 'adminId and method are required' });
        }

        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(404).send({ message: 'Admin account not found' });
        }

        const securitySettings = await getSecuritySettingsForAdmin(admin);
        if (!securitySettings?.twoFactorAuth?.enabled) {
            return res.status(400).send({ message: 'Two-factor authentication is not enabled for this account' });
        }

        const availableMethods = get2faMethodsForAdmin(admin, securitySettings);
        if (!availableMethods.includes(method)) {
            return res.status(400).send({ message: 'Requested 2FA method is not configured for this account' });
        }

        let result;
        if (method === 'email') {
            if (!admin.twoFactorEmail) {
                return res.status(400).send({ message: 'No 2FA email configured' });
            }
            result = await generateAndSendEmailOtp(admin.twoFactorEmail, admin._id);
        } else if (method === 'sms') {
            if (!admin.twoFactorPhone) {
                return res.status(400).send({ message: 'No 2FA phone configured' });
            }
            result = await generateAndSendSmsOtp(admin.twoFactorPhone, admin._id);
        } else if (method === 'authenticator_app') {
            if (!admin.twoFactorSecret) {
                return res.status(400).send({ message: 'No authenticator app configured for this account' });
            }
            result = {
                success: true,
                message: 'Enter the code from your authenticator app to continue.',
                expiresIn: 600
            };
        } else if (method === 'backup_codes') {
            if (!Array.isArray(admin.twoFactorBackupCodes) || admin.twoFactorBackupCodes.filter((item) => !item.used).length === 0) {
                return res.status(400).send({ message: 'No backup codes available for this account' });
            }
            result = {
                success: true,
                message: 'Enter one of your unused backup codes to continue.',
                expiresIn: 600
            };
        } else {
            return res.status(400).send({ message: 'Unsupported 2FA method for verification' });
        }

        if (!result.success) {
            return res.status(500).send({ message: result.error || 'Unable to send verification code' });
        }

        return res.send({ message: result.message, expiresIn: result.expiresIn });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const verifyAdmin2FACode = async (req, res) => {
    try {
        const { adminId, method, code } = req.body;
        if (!adminId || !method || !code) {
            return res.status(400).send({ message: 'adminId, method, and code are required' });
        }

        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(404).send({ message: 'Admin account not found' });
        }

        const securitySettings = await getSecuritySettingsForAdmin(admin);
        if (!securitySettings?.twoFactorAuth?.enabled) {
            return res.status(400).send({ message: 'Two-factor authentication is not enabled' });
        }

        let verificationResult;
        if (method === 'email') {
            verificationResult = verifyEmailOtp(admin._id, code);
        } else if (method === 'sms') {
            verificationResult = verifySmsOtp(admin._id, code);
        } else if (method === 'authenticator_app') {
            if (!admin.twoFactorSecret) {
                return res.status(400).send({ message: 'No authenticator app configured for this account' });
            }
            verificationResult = { valid: verifyTotpToken(code, admin.twoFactorSecret) };
        } else if (method === 'backup_codes') {
            const codeEntry = admin.twoFactorBackupCodes?.find(item => item.code === code && !item.used);
            if (!codeEntry) {
                verificationResult = { valid: false, error: 'Invalid or expired backup code' };
            } else {
                codeEntry.used = true;
                await admin.save();
                verificationResult = { valid: true };
            }
        } else {
            return res.status(400).send({ message: 'Unsupported 2FA verification method' });
        }

        if (!verificationResult.valid) {
            return res.status(401).send({ message: verificationResult.error || 'Invalid two-factor authentication code' });
        }

        admin.failedLoginAttempts = 0;
        admin.lockoutUntil = null;
        admin.lastLoginAt = new Date();
        admin.lastLoginIp = req.ip || req.connection?.remoteAddress || '';
        await admin.save();

        const safeAdmin = admin.toObject();
        delete safeAdmin.password;

        return res.send({ message: 'Two-factor authentication verified', admin: safeAdmin });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const requestAdminPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).send({ message: 'Email is required' });
        }

        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(404).send({ message: 'Admin not found' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        admin.resetPasswordToken = token;
        admin.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await admin.save();

        // Use the user's actual role so accountants/HR receive links to their correct reset pages
        const rolePath = admin.role || 'Admin';
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/${rolePath}/reset-password/${token}`;
        const emailResult = await sendResetPasswordLink(admin.email, admin.name, resetUrl);

        res.send({ message: 'Password reset link sent to your email', emailResult });
    } catch (error) {
        res.status(500).json(error);
    }
};

const resetAdminPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!password) {
            return res.status(400).send({ message: 'New password is required' });
        }

        const admin = await Admin.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!admin) {
            return res.status(400).send({ message: 'Invalid or expired token' });
        }

        const salt = await bcrypt.genSalt(10);
        admin.password = await bcrypt.hash(password, salt);
        admin.resetPasswordToken = '';
        admin.resetPasswordExpires = null;
        await admin.save();

        res.send({ message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json(error);
    }
};

module.exports = { adminRegister, adminLogIn, updateAdmin, addAccountant, addHR, getAccountants, getHRStaff, getAdminDetail, getPendingAdmins, approveAdmin, declineAdmin, getAdminSummary, getAdminSettings, updateAdminSettings, getSystemBackup, getRegisteredSchools, getPendingSchools, getAdminStats, updateAdminRole, requestAdminPasswordReset, resetAdminPassword, sendAdmin2FACode, verifyAdmin2FACode, getSchoolScopeFilter };
