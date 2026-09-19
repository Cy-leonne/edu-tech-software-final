
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const Admin = require('../models/adminSchema.js');
const School = require('../models/schoolSchema.js');
const Subscription = require('../models/subscriptionSchema.js');
const AcademicYear = require('../models/academicYearSchema.js');
const SystemLog = require('../models/systemLogSchema.js');
const Student = require('../models/studentSchema.js');
const Backup = require('../models/backupSchema.js');
const BackupLogs = require('../models/backupLogsSchema.js');
const AuditLogs = require('../models/auditLogsSchema.js');
const { sendAdminApprovalEmail, sendSchoolStatusChangeEmail, sendPasswordResetEmail } = require('../services/emailService.js');
const { initializeSettings, initializeSecuritySettings } = require('./settings-controller.js');

// Utility function to log system actions
const logSystemAction = async (action, actor, actorRole, school, entityType, entityId, entityName, description, changes, status = 'Success', errorMessage = null, ipAddress = null) => {
    try {
        const log = new SystemLog({
            action,
            actor,
            actorRole,
            school,
            entityType,
            entityId,
            entityName,
            description,
            changes,
            status,
            errorMessage,
            ipAddress,
            timestamp: new Date()
        });
        await log.save();
    } catch (err) {
        console.error('Error logging system action:', err);
    }
};

const isSchoolAdminRecord = (admin) => {
    if (!admin || admin.role !== 'Admin') return false;
    const schoolName = (admin.schoolName || '').toString().trim();
    return schoolName.length > 0;
};

// ==================== SUPER ADMIN OPERATIONS ====================

const findOrCreateSchoolFromAdmin = async (schoolIdentifier) => {
    if (!schoolIdentifier) return null;

    const normalizedSchoolId = normalizeSchoolId(schoolIdentifier);
    if (normalizedSchoolId) {
        let school = await School.findById(normalizedSchoolId);
        if (school) return school;
    }

    const admin = await Admin.findOne({ _id: normalizedSchoolId || schoolIdentifier, role: 'Admin' });
    if (!admin) return null;

    let school = await School.findOne({ schoolAdmin: admin._id });
    if (school) return school;

    school = await School.create({
        schoolName: admin.schoolName || admin.name,
        email: admin.email,
        phone: admin.settings?.schoolProfile?.phone || 'Not provided',
        address: { street: admin.settings?.schoolProfile?.address || '' },
        schoolAdmin: admin._id,
        status: 'Active',
        createdBy: admin._id,
    });

    admin.school = school._id;
    await admin.save();
    return school;
};

// Get all schools with filtering and pagination
const getAllSchools = async (req, res) => {
    try {
        const { status, subscriptionStatus, page = 1, limit = 10, search } = req.query;
        const superAdminId = req.get('x-admin-id');

        // Verify Super Admin role
        const superAdmin = await Admin.findById(superAdminId);
        if (!superAdmin || superAdmin.role !== 'SuperAdmin') {
            return res.status(403).send({ message: 'Forbidden: Only Super Admin can access this' });
        }

        let filter = {};
        if (status) filter.status = status;
        if (subscriptionStatus) filter.subscriptionStatus = subscriptionStatus;
        if (search) {
            filter.$or = [
                { schoolName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;
        let schools = await School.find(filter)
            .populate('schoolAdmin', 'name email')
            .populate('currentSubscription', 'planName status startDate endDate nextPaymentDate paymentStatus billingCycle')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        let total = await School.countDocuments(filter);

        const realSchoolIds = new Set(schools.map((school) => String(school._id)));
        const schoolAdminRecords = await Admin.find({ role: 'Admin' })
            .select('_id name email schoolName settings approved school')
            .sort({ createdAt: -1 });

        const existingSchoolAdminIds = new Set((await School.find({}, 'schoolAdmin').lean()).map((school) => String(school.schoolAdmin)));
        const missingSchoolAdmins = schoolAdminRecords.filter((admin) => {
            if (!isSchoolAdminRecord(admin)) return false;
            const adminId = String(admin._id);
            const schoolRef = admin.school ? String(admin.school) : null;
            return !existingSchoolAdminIds.has(adminId) && !realSchoolIds.has(adminId) && (!schoolRef || !realSchoolIds.has(schoolRef));
        });

        if (missingSchoolAdmins.length > 0) {
            const fallbackSubscriptions = await Subscription.find({ school: { $in: missingSchoolAdmins.map((admin) => admin._id) } })
                .select('school planName status startDate endDate nextPaymentDate paymentStatus billingCycle')
                .lean();

            const fallbackSchools = missingSchoolAdmins.map((admin) => ({
                _id: admin._id,
                schoolName: admin.schoolName || admin.name,
                email: admin.email || admin.settings?.schoolProfile?.email,
                phone: admin.settings?.schoolProfile?.phone || '',
                status: admin.approved === false ? 'Pending' : 'Active',
                currentSubscription: fallbackSubscriptions.find((subscription) => String(subscription.school) === String(admin._id)) || null,
            }));

            schools = [...schools, ...fallbackSchools];
            total = schools.length;
        }

        res.status(200).json({
            message: 'Schools retrieved successfully',
            schools,
            pagination: {
                current: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        res.status(500).send({ message: 'Error retrieving schools', error: err.message });
    }
};

// Create a new school
const createSchool = async (req, res) => {
    try {
        const superAdminId = req.get('x-admin-id');
        const { schoolName, email, phone, address, schoolAdminId, metadata, paymentSettings } = req.body;

        // Verify Super Admin role
        const superAdmin = await Admin.findById(superAdminId);
        if (!superAdmin || superAdmin.role !== 'SuperAdmin') {
            return res.status(403).send({ message: 'Forbidden: Only Super Admin can create schools' });
        }

        // Verify school admin exists
        const schoolAdmin = await Admin.findById(schoolAdminId);
        if (!schoolAdmin || schoolAdmin.role !== 'Admin') {
            return res.status(400).send({ message: 'Invalid School Admin ID' });
        }

        // Check if school already exists
        const existingSchool = await School.findOne({ $or: [{ schoolName }, { email }] });
        if (existingSchool) {
            return res.status(400).send({ message: 'School with this name or email already exists' });
        }

        const school = new School({
            schoolName,
            email,
            phone,
            address,
            schoolAdmin: schoolAdminId,
            status: 'Active',
            metadata,
            paymentSettings,
            createdBy: superAdminId
        });

        await school.save();

        // Log action
        await logSystemAction('CREATE_SCHOOL', superAdminId, 'SuperAdmin', school._id, 'School', school._id, schoolName, `School created: ${schoolName}`, null, 'Success');

        // Initialize default settings and security settings for this school
        try {
            await initializeSettings(school._id);
            await initializeSecuritySettings(school._id);
        } catch (initErr) {
            console.error('Error initializing settings for new school:', initErr);
            // Continue without failing creation
        }

        res.status(201).json({ message: 'School created successfully', school });
    } catch (err) {
        res.status(500).send({ message: 'Error creating school', error: err.message });
    }
};

// Update school details
const updateSchool = async (req, res) => {
    try {
        const superAdminId = req.get('x-admin-id');
        const { schoolId } = req.params;
        const updateData = req.body;

        // Verify Super Admin role
        const superAdmin = await Admin.findById(superAdminId);
        if (!superAdmin || superAdmin.role !== 'SuperAdmin') {
            return res.status(403).send({ message: 'Forbidden: Only Super Admin can update schools' });
        }

        let school = await School.findById(schoolId);
        if (!school && mongoose.Types.ObjectId.isValid(schoolId)) {
            const schoolAdmin = await Admin.findOne({ _id: schoolId, role: 'Admin' });
            if (schoolAdmin) {
                school = await School.create({
                    schoolName: schoolAdmin.schoolName || schoolAdmin.name,
                    email: schoolAdmin.email,
                    phone: schoolAdmin.settings?.schoolProfile?.phone || 'Not provided',
                    address: { street: schoolAdmin.settings?.schoolProfile?.address || '' },
                    schoolAdmin: schoolAdmin._id,
                    status: 'Active',
                });
                schoolAdmin.school = school._id;
                await schoolAdmin.save();
            }
        }
        if (!school) {
            return res.status(404).send({ message: 'School not found' });
        }

        const before = { ...school.toObject() };
        
        Object.assign(school, updateData);
        school.updatedAt = new Date();
        await school.save();

        // Log action
        await logSystemAction('UPDATE_SCHOOL', superAdminId, 'SuperAdmin', schoolId, 'School', schoolId, school.schoolName, `School updated`, { before, after: school.toObject() }, 'Success');

        res.status(200).json({ message: 'School updated successfully', school });
    } catch (err) {
        res.status(500).send({ message: 'Error updating school', error: err.message });
    }
};

// Delete a school
const deleteSchool = async (req, res) => {
    try {
        const superAdminId = req.get('x-admin-id');
        const { schoolId } = req.params;

        // Verify Super Admin role
        const superAdmin = await Admin.findById(superAdminId);
        if (!superAdmin || superAdmin.role !== 'SuperAdmin') {
            return res.status(403).send({ message: 'Forbidden: Only Super Admin can delete schools' });
        }

        const school = await School.findByIdAndDelete(schoolId);
        if (!school) {
            return res.status(404).send({ message: 'School not found' });
        }

        // Log action
        await logSystemAction('DELETE_SCHOOL', superAdminId, 'SuperAdmin', schoolId, 'School', schoolId, school.schoolName, `School deleted: ${school.schoolName}`, { deleted: school }, 'Success');

        res.status(200).json({ message: 'School deleted successfully' });
    } catch (err) {
        res.status(500).send({ message: 'Error deleting school', error: err.message });
    }
};

// Suspend a school
const suspendSchool = async (req, res) => {
    try {
        const superAdminId = req.get('x-admin-id');
        const { schoolId } = req.params;
        const { reason } = req.body;

        // Verify Super Admin role
        const superAdmin = await Admin.findById(superAdminId);
        if (!superAdmin || superAdmin.role !== 'SuperAdmin') {
            return res.status(403).send({ message: 'Forbidden: Only Super Admin can suspend schools' });
        }

        const school = await findOrCreateSchoolFromAdmin(schoolId);
        if (!school) {
            return res.status(404).send({ message: 'School not found' });
        }

        school.status = 'Suspended';
        school.statusChangedAt = new Date();
        school.statusChangedBy = superAdminId;
        school.statusChangeReason = reason || 'No reason provided';
        await school.save();

        // Send notification email to school admin or school contact
        const schoolAdmin = await Admin.findById(school.schoolAdmin);
        const recipientEmail = schoolAdmin?.email || school.email;
        await sendSchoolStatusChangeEmail(recipientEmail, school.schoolName, 'Suspended', school.statusChangeReason);

        // Log action
        await logSystemAction('SUSPEND_SCHOOL', superAdminId, 'SuperAdmin', schoolId, 'School', schoolId, school.schoolName, `School suspended. Reason: ${school.statusChangeReason}`, null, 'Success');

        res.status(200).json({ message: 'School suspended successfully', school });
    } catch (err) {
        res.status(500).send({ message: 'Error suspending school', error: err.message });
    }
};

// Activate a suspended school
const activateSchool = async (req, res) => {
    try {
        const superAdminId = req.get('x-admin-id');
        const { schoolId } = req.params;
        const { reason } = req.body;

        // Verify Super Admin role
        const superAdmin = await Admin.findById(superAdminId);
        if (!superAdmin || superAdmin.role !== 'SuperAdmin') {
            return res.status(403).send({ message: 'Forbidden: Only Super Admin can activate schools' });
        }

        const school = await findOrCreateSchoolFromAdmin(schoolId);
        if (!school) {
            return res.status(404).send({ message: 'School not found' });
        }

        school.status = 'Active';
        school.statusChangedAt = new Date();
        school.statusChangedBy = superAdminId;
        school.statusChangeReason = reason || 'No reason provided';
        await school.save();

        // Send notification email to school admin or school contact
        const schoolAdmin = await Admin.findById(school.schoolAdmin);
        const recipientEmail = schoolAdmin?.email || school.email;
        await sendSchoolStatusChangeEmail(recipientEmail, school.schoolName, 'Active', school.statusChangeReason);

        // Log action
        await logSystemAction('ACTIVATE_SCHOOL', superAdminId, 'SuperAdmin', schoolId, 'School', schoolId, school.schoolName, `School activated. Reason: ${school.statusChangeReason}`, null, 'Success');

        res.status(200).json({ message: 'School activated successfully', school });
    } catch (err) {
        res.status(500).send({ message: 'Error activating school', error: err.message });
    }
};

// Deactivate a school
const deactivateSchool = async (req, res) => {
    try {
        const superAdminId = req.get('x-admin-id');
        const { schoolId } = req.params;
        const { reason } = req.body;

        const superAdmin = await Admin.findById(superAdminId);
        if (!superAdmin || superAdmin.role !== 'SuperAdmin') {
            return res.status(403).send({ message: 'Forbidden: Only Super Admin can deactivate schools' });
        }

        const school = await findOrCreateSchoolFromAdmin(schoolId);
        if (!school) {
            return res.status(404).send({ message: 'School not found' });
        }

        school.status = 'Inactive';
        school.statusChangedAt = new Date();
        school.statusChangedBy = superAdminId;
        school.statusChangeReason = reason || 'No reason provided';
        await school.save();

        const schoolAdmin = await Admin.findById(school.schoolAdmin);
        const recipientEmail = schoolAdmin?.email || school.email;
        await sendSchoolStatusChangeEmail(recipientEmail, school.schoolName, 'Inactive', school.statusChangeReason);

        await logSystemAction('DEACTIVATE_SCHOOL', superAdminId, 'SuperAdmin', schoolId, 'School', schoolId, school.schoolName, `School deactivated. Reason: ${school.statusChangeReason}`, null, 'Success');

        res.status(200).json({ message: 'School deactivated successfully', school });
    } catch (err) {
        res.status(500).send({ message: 'Error deactivating school', error: err.message });
    }
};

// ==================== SCHOOL ADMIN REGISTRATION ====================

// Register new School Admin
const registerSchoolAdmin = async (req, res) => {
    try {
        const superAdminId = req.get('x-admin-id');
        const { name, email, password, schoolName } = req.body;

        // Verify Super Admin role
        const superAdmin = await Admin.findById(superAdminId);
        if (!superAdmin || superAdmin.role !== 'SuperAdmin') {
            return res.status(403).send({ message: 'Forbidden: Only Super Admin can register school admins' });
        }

        // Check if admin exists
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).send({ message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new admin
        const admin = new Admin({
            name,
            email,
            password: hashedPassword,
            schoolName,
            role: 'Admin',
            approved: true, // Super Admin auto-approves
            approvedBy: superAdminId,
            approvedAt: new Date()
        });

        await admin.save();

        // Log action
        await logSystemAction('CREATE_ADMIN', superAdminId, 'SuperAdmin', null, 'Admin', admin._id, email, `School Admin registered: ${email}`, null, 'Success');

        // Send welcome email
        try {
            await sendAdminApprovalEmail(email, name, schoolName);
        } catch (emailErr) {
            console.error('Error sending email:', emailErr);
        }

        res.status(201).json({ message: 'School Admin registered successfully', admin: { _id: admin._id, name: admin.name, email: admin.email, schoolName: admin.schoolName } });
    } catch (err) {
        res.status(500).send({ message: 'Error registering school admin', error: err.message });
    }
};

// ==================== SUBSCRIPTION MANAGEMENT ====================

const normalizeSchoolId = (rawSchoolId) => {
    if (!rawSchoolId) return null;
    if (typeof rawSchoolId === 'string' || typeof rawSchoolId === 'number') return String(rawSchoolId);
    if (rawSchoolId instanceof mongoose.Types.ObjectId) return rawSchoolId.toString();
    if (typeof rawSchoolId === 'object') {
        if (rawSchoolId.$oid) return String(rawSchoolId.$oid);
        if (rawSchoolId._id) return String(rawSchoolId._id);
        if (rawSchoolId.id) return String(rawSchoolId.id);
        if (typeof rawSchoolId.toString === 'function' && rawSchoolId.toString() !== '[object Object]') {
            return String(rawSchoolId.toString());
        }
    }
    return null;
};

// Create subscription
const createSubscription = async (req, res) => {
    try {
        const superAdminId = req.get('x-admin-id');
        const { schoolId: rawSchoolId, planName, planPrice, billingCycle, startDate, endDate, features, maxStudents, maxTeachers } = req.body;
        const schoolId = normalizeSchoolId(rawSchoolId);

        if (!schoolId) {
            return res.status(400).send({ message: 'School is required to create a subscription' });
        }

        // Verify Super Admin role
        const superAdmin = await Admin.findById(superAdminId);
        if (!superAdmin || superAdmin.role !== 'SuperAdmin') {
            return res.status(403).send({ message: 'Forbidden: Only Super Admin can manage subscriptions' });
        }

        const school = await findOrCreateSchoolFromAdmin(schoolId);
        if (!school) {
            return res.status(404).send({ message: 'School not found' });
        }

        const subscription = new Subscription({
            school: schoolId,
            planName,
            planPrice,
            billingCycle,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            nextPaymentDate: new Date(endDate),
            features,
            maxStudents,
            maxTeachers,
            status: 'Active',
            createdBy: superAdminId
        });

        await subscription.save();

        // Update school subscription
        school.currentSubscription = subscription._id;
        school.subscriptionStatus = 'Active';
        await school.save();

        // Log action
        await logSystemAction('CREATE_SUBSCRIPTION', superAdminId, 'SuperAdmin', schoolId, 'Subscription', subscription._id, planName, `Subscription created for ${school.schoolName}`, null, 'Success');

        res.status(201).json({ message: 'Subscription created successfully', subscription });
    } catch (err) {
        res.status(500).send({ message: 'Error creating subscription', error: err.message });
    }
};

// Update subscription
const updateSubscription = async (req, res) => {
    try {
        const superAdminId = req.get('x-admin-id');
        const { subscriptionId } = req.params;
        const updateData = req.body;

        // Verify Super Admin role
        const superAdmin = await Admin.findById(superAdminId);
        if (!superAdmin || superAdmin.role !== 'SuperAdmin') {
            return res.status(403).send({ message: 'Forbidden: Only Super Admin can update subscriptions' });
        }

        const subscription = await Subscription.findByIdAndUpdate(subscriptionId, { ...updateData, updatedAt: new Date() }, { new: true });
        if (!subscription) {
            return res.status(404).send({ message: 'Subscription not found' });
        }

        // Log action
        await logSystemAction('UPDATE_SUBSCRIPTION', superAdminId, 'SuperAdmin', subscription.school, 'Subscription', subscriptionId, subscription.planName, `Subscription updated`, null, 'Success');

        res.status(200).json({ message: 'Subscription updated successfully', subscription });
    } catch (err) {
        res.status(500).send({ message: 'Error updating subscription', error: err.message });
    }
};

// Cancel subscription
const cancelSubscription = async (req, res) => {
    try {
        const superAdminId = req.get('x-admin-id');
        const { subscriptionId } = req.params;
        const { reason } = req.body;

        // Verify Super Admin role
        const superAdmin = await Admin.findById(superAdminId);
        if (!superAdmin || superAdmin.role !== 'SuperAdmin') {
            return res.status(403).send({ message: 'Forbidden: Only Super Admin can cancel subscriptions' });
        }

        const subscription = await Subscription.findById(subscriptionId);
        if (!subscription) {
            return res.status(404).send({ message: 'Subscription not found' });
        }

        subscription.status = 'Cancelled';
        subscription.updatedAt = new Date();
        await subscription.save();

        // Update school subscription status
        await School.findByIdAndUpdate(subscription.school, { subscriptionStatus: 'Cancelled' });

        // Log action
        await logSystemAction('CANCEL_SUBSCRIPTION', superAdminId, 'SuperAdmin', subscription.school, 'Subscription', subscriptionId, subscription.planName, `Subscription cancelled. Reason: ${reason || 'No reason provided'}`, null, 'Success');

        res.status(200).json({ message: 'Subscription cancelled successfully', subscription });
    } catch (err) {
        res.status(500).send({ message: 'Error cancelling subscription', error: err.message });
    }
};

// Get subscription for a school
const getSchoolSubscription = async (req, res) => {
    try {
        const { schoolId: rawSchoolId } = req.params;
        const schoolId = normalizeSchoolId(rawSchoolId);

        if (!schoolId) {
            return res.status(400).send({ message: 'School ID is required' });
        }

        const subscription = await Subscription.findOne({ school: schoolId }).populate('school', 'schoolName email');
        if (!subscription) {
            return res.status(404).send({ message: 'Subscription not found' });
        }

        res.status(200).json({ message: 'Subscription retrieved successfully', subscription });
    } catch (err) {
        res.status(500).send({ message: 'Error retrieving subscription', error: err.message });
    }
};

// ==================== ACADEMIC YEAR MANAGEMENT ====================

// Create academic year template
const createAcademicYear = async (req, res) => {
    try {
        const superAdminId = req.get('x-admin-id');
        const { yearName, startDate, endDate, terms, examSchedule, feesSchedule, holidays } = req.body;

        // Verify Super Admin role
        const superAdmin = await Admin.findById(superAdminId);
        if (!superAdmin || superAdmin.role !== 'SuperAdmin') {
            return res.status(403).send({ message: 'Forbidden: Only Super Admin can create academic years' });
        }

        const academicYear = new AcademicYear({
            yearName,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            terms,
            examSchedule,
            feesSchedule,
            holidays,
            template: true,
            createdBy: superAdminId
        });

        await academicYear.save();

        // Log action
        await logSystemAction('ACADEMIC_YEAR_CREATED', superAdminId, 'SuperAdmin', null, 'AcademicYear', academicYear._id, yearName, `Academic year created: ${yearName}`, null, 'Success');

        res.status(201).json({ message: 'Academic year created successfully', academicYear });
    } catch (err) {
        res.status(500).send({ message: 'Error creating academic year', error: err.message });
    }
};

// Get all academic years
const getAcademicYears = async (req, res) => {
    try {
        const academicYears = await AcademicYear.find()
            .populate('createdBy', 'name email')
            .sort({ startDate: -1 });

        res.status(200).json({ message: 'Academic years retrieved successfully', academicYears });
    } catch (err) {
        res.status(500).send({ message: 'Error retrieving academic years', error: err.message });
    }
};

// Update academic year
const updateAcademicYear = async (req, res) => {
    try {
        const superAdminId = req.get('x-admin-id');
        const { academicYearId } = req.params;
        const updateData = req.body;

        // Verify Super Admin role
        const superAdmin = await Admin.findById(superAdminId);
        if (!superAdmin || superAdmin.role !== 'SuperAdmin') {
            return res.status(403).send({ message: 'Forbidden: Only Super Admin can update academic years' });
        }

        const academicYear = await AcademicYear.findByIdAndUpdate(academicYearId, updateData, { new: true });
        if (!academicYear) {
            return res.status(404).send({ message: 'Academic year not found' });
        }

        // Log action
        await logSystemAction('ACADEMIC_YEAR_UPDATED', superAdminId, 'SuperAdmin', null, 'AcademicYear', academicYearId, academicYear.yearName, `Academic year updated`, null, 'Success');

        res.status(200).json({ message: 'Academic year updated successfully', academicYear });
    } catch (err) {
        res.status(500).send({ message: 'Error updating academic year', error: err.message });
    }
};

// ==================== SYSTEM LOGS & MONITORING ====================

// Get system logs with filtering
const getSystemLogs = async (req, res) => {
    try {
        const superAdminId = req.get('x-admin-id');
        const { action, school, page = 1, limit = 20, startDate, endDate } = req.query;
        let filter = {};

        let requester = null;
        try {
            requester = await Admin.findById(superAdminId);
        } catch (err) {
            requester = null;
        }

        if (!requester) {
            const { testDB } = require('../testdb');
            requester = testDB.admins.find((item) => String(item._id).toLowerCase() === String(superAdminId || '').toLowerCase()) || null;
        }

        if (!requester || !['Admin', 'SuperAdmin'].includes(requester.role)) {
            return res.status(403).json({ message: 'Forbidden: only SuperAdmin or school Admin can view system logs' });
        }

        if (requester.role !== 'SuperAdmin') {
            const requesterSchool = requester.school
                ? (typeof requester.school === 'object' ? (requester.school._id || requester.school.id || requester.school.toString()) : String(requester.school))
                : requester.schoolId
                    ? String(requester.schoolId)
                    : null;

            if (school && requesterSchool !== String(school)) {
                return res.status(403).json({ message: 'Forbidden: school Admin can only view their school logs' });
            }
            if (!school && requesterSchool) {
                filter = { school: requesterSchool };
            }
        }

        if (action) filter.action = action;
        if (school) filter.school = school;

        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) filter.timestamp.$gte = new Date(startDate);
            if (endDate) filter.timestamp.$lte = new Date(endDate);
        }

        const skip = (page - 1) * limit;
        const isMongoConnected = mongoose.connection.readyState === 1;

        let logs = [];
        let total = 0;

        if (isMongoConnected) {
            const [systemLogs, auditLogs] = await Promise.all([
                SystemLog.find(filter)
                .populate('actor', 'name email')
                .populate('school', 'schoolName')
                .sort({ timestamp: -1 })
                .limit(parseInt(limit)),
                AuditLogs.find({
                    ...(filter.school ? { school: filter.school } : {}),
                    ...(filter.action && ['CREATE', 'UPDATE', 'DELETE'].includes(filter.action) ? { action: filter.action } : {}),
                    ...(filter.timestamp ? { timestamp: filter.timestamp } : {}),
                })
                    .populate('user', 'name email')
                    .populate('school', 'schoolName')
                    .sort({ timestamp: -1 })
                    .limit(parseInt(limit))
                    .lean(),
            ]);

            const normalizedAuditLogs = auditLogs.map((auditLog) => ({
                _id: auditLog._id,
                action: auditLog.action,
                actor: auditLog.user || { name: auditLog.userName || 'System' },
                actorRole: auditLog.userRole,
                school: auditLog.school,
                entityType: auditLog.entityType,
                entityId: auditLog.entityId,
                entityName: auditLog.entityName,
                description: auditLog.resultMessage || `${auditLog.action} ${auditLog.entityName || auditLog.entityType}`,
                changes: { before: auditLog.changesBefore, after: auditLog.changesAfter },
                status: auditLog.status === 'failure' ? 'Failed' : auditLog.status === 'warning' ? 'Pending' : 'Success',
                errorMessage: auditLog.errorMessage,
                ipAddress: auditLog.ipAddress,
                timestamp: auditLog.timestamp,
            }));

            logs = [...systemLogs, ...normalizedAuditLogs]
                .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp))
                .slice(skip, skip + parseInt(limit));

            total = await SystemLog.countDocuments(filter) + await AuditLogs.countDocuments({
                ...(filter.school ? { school: filter.school } : {}),
                ...(filter.action && ['CREATE', 'UPDATE', 'DELETE'].includes(filter.action) ? { action: filter.action } : {}),
                ...(filter.timestamp ? { timestamp: filter.timestamp } : {}),
            });
        } else {
            logs = [{
                _id: 'fallback-system-log',
                action: 'SYSTEM_STATUS',
                actor: { name: requester.name || requester.email || 'System', email: requester.email || 'system@local' },
                actorRole: requester.role,
                school: school || null,
                description: 'System logs are currently unavailable because the database connection is offline.',
                status: 'Pending',
                timestamp: new Date(),
            }];
            total = 1;
        }

        if (!logs || logs.length === 0) {
            logs = [{
                _id: 'fallback-system-log-empty',
                action: 'SYSTEM_STATUS',
                actor: { name: requester.name || requester.email || 'System', email: requester.email || 'system@local' },
                actorRole: requester.role,
                school: school || null,
                description: 'No system logs have been recorded yet. The backend is running normally.',
                status: 'Pending',
                timestamp: new Date(),
            }];
            total = 1;
        }

        res.status(200).json({
            message: 'System logs retrieved successfully',
            logs,
            pagination: {
                current: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        const fallbackLog = [{
            _id: 'fallback-system-log-error',
            action: 'SYSTEM_STATUS',
            actor: { name: 'System', email: 'system@local' },
            actorRole: 'Admin',
            school: null,
            description: 'System logs are currently unavailable. The backend is running, but the database connection could not be reached.',
            status: 'Pending',
            timestamp: new Date(),
        }];

        res.status(200).json({
            message: 'System logs retrieved successfully',
            logs: fallbackLog,
            pagination: {
                current: 1,
                limit: 20,
                total: 1,
                pages: 1
            }
        });
    }
};

// Get system usage statistics
const getSystemStats = async (req, res) => {
    try {
        const adminId = req.get('x-admin-id');
        const requestedSchoolId = req.query.schoolId || req.query.school || null;

        const requester = await Admin.findById(adminId);
        if (!requester) {
            return res.status(403).send({ message: 'Forbidden: only authorized admins can view monitoring stats' });
        }

        const isSuperAdmin = requester.role === 'SuperAdmin';
        const normalizeSchoolRef = (value) => {
            if (!value) return null;
            if (typeof value === 'object') return value._id ? String(value._id) : (value.id ? String(value.id) : null);
            return String(value);
        };

        const effectiveSchoolId = !isSuperAdmin
            ? (normalizeSchoolRef(requester.school) || normalizeSchoolRef(requester.schoolId) || normalizeSchoolRef(requester._id))
            : requestedSchoolId ? String(requestedSchoolId) : null;

        if (!isSuperAdmin && !effectiveSchoolId) {
            return res.status(403).send({ message: 'Forbidden: school admin has no school assigned' });
        }

        if (!isSuperAdmin && requestedSchoolId && effectiveSchoolId !== String(requestedSchoolId)) {
            return res.status(403).send({ message: 'Forbidden: school admins can only review their own school monitoring data' });
        }

        const schoolFilter = isSuperAdmin ? {} : { school: effectiveSchoolId };
        const schoolQuery = isSuperAdmin ? {} : { _id: effectiveSchoolId };

        const [schoolSummary, adminCount, activeSubscriptionCount, totalSubscriptionCount, revenueData, systemLogCount, backupCount] = await Promise.all([
            isSuperAdmin
                ? School.find({}).select('_id status schoolName').lean()
                : School.find(schoolQuery).select('_id status schoolName').lean(),
            isSuperAdmin
                ? Admin.countDocuments()
                : Admin.countDocuments({ $or: [{ school: effectiveSchoolId }, { schoolName: (await School.findById(effectiveSchoolId).select('schoolName'))?.schoolName || '' }] }),
            isSuperAdmin ? Subscription.countDocuments({ status: 'Active' }) : Subscription.countDocuments({ status: 'Active', school: effectiveSchoolId }),
            isSuperAdmin ? Subscription.countDocuments() : Subscription.countDocuments({ school: effectiveSchoolId }),
            isSuperAdmin
                ? Subscription.aggregate([
                    { $match: { status: 'Paid' } },
                    { $group: { _id: '$planName', total: { $sum: '$planPrice' } } }
                ])
                : Subscription.aggregate([
                    { $match: { status: 'Paid', school: effectiveSchoolId } },
                    { $group: { _id: '$planName', total: { $sum: '$planPrice' } } }
                ]),
            SystemLog.countDocuments(schoolFilter),
            BackupLogs.countDocuments(schoolFilter)
        ]);

        const stats = isSuperAdmin
            ? {
                totalSchools: schoolSummary.length,
                activeSchools: schoolSummary.filter((school) => String(school.status).toLowerCase() === 'active').length,
                suspendedSchools: schoolSummary.filter((school) => String(school.status).toLowerCase() === 'suspended').length,
                totalAdmins: adminCount,
                activeSubscriptions: activeSubscriptionCount,
                totalSubscriptions: totalSubscriptionCount,
                revenueData,
                systemLogs: systemLogCount,
                backups: backupCount
            }
            : {
                schoolName: schoolSummary[0]?.schoolName || '',
                schoolStatus: schoolSummary[0]?.status || '',
                totalAdmins: adminCount,
                systemLogs: systemLogCount,
                backups: backupCount,
                activeSubscriptions: activeSubscriptionCount,
                totalSubscriptions: totalSubscriptionCount,
            };

        res.status(200).json({ message: 'System stats retrieved successfully', stats });
    } catch (err) {
        res.status(500).send({ message: 'Error retrieving system stats', error: err.message });
    }
};

// ==================== ADMIN MANAGEMENT ====================

// Get all school admins
const getAllAdmins = async (req, res) => {
    try {
        const superAdminId = req.get('x-admin-id');
        const { page = 1, limit = 10, approved, search } = req.query;

        // Verify Super Admin role
        const superAdmin = await Admin.findById(superAdminId);
        if (!superAdmin || superAdmin.role !== 'SuperAdmin') {
            return res.status(403).send({ message: 'Forbidden: Only Super Admin can view all admins' });
        }

        let filter = { role: 'Admin' };
        if (approved !== undefined) filter.approved = approved === 'true';
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { schoolName: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;
        const admins = await Admin.find(filter)
            .select('-password')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Admin.countDocuments(filter);

        res.status(200).json({
            message: 'Admins retrieved successfully',
            admins,
            pagination: {
                current: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        res.status(500).send({ message: 'Error retrieving admins', error: err.message });
    }
};

// Reset School Admin password
const resetSchoolAdminPassword = async (req, res) => {
    try {
        const superAdminId = req.get('x-admin-id');
        const { adminId } = req.params;
        const { newPassword } = req.body;

        // Verify Super Admin role
        const superAdmin = await Admin.findById(superAdminId);
        if (!superAdmin || superAdmin.role !== 'SuperAdmin') {
            return res.status(403).send({ message: 'Forbidden: Only Super Admin can reset passwords' });
        }

        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(404).send({ message: 'Admin not found' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        admin.password = hashedPassword;
        await admin.save();

        // Log action
        await logSystemAction('RESET_PASSWORD', superAdminId, 'SuperAdmin', null, 'Admin', adminId, admin.email, `Password reset for admin: ${admin.email}`, null, 'Success');

        // Send email notification
        try {
            await sendPasswordResetEmail(admin.email, admin.name, newPassword);
        } catch (emailErr) {
            console.error('Error sending email:', emailErr);
        }

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (err) {
        res.status(500).send({ message: 'Error resetting password', error: err.message });
    }
};

// Delete School Admin
const deleteSchoolAdmin = async (req, res) => {
    try {
        const superAdminId = req.get('x-admin-id');
        const { adminId } = req.params;

        // Verify Super Admin role
        const superAdmin = await Admin.findById(superAdminId);
        if (!superAdmin || superAdmin.role !== 'SuperAdmin') {
            return res.status(403).send({ message: 'Forbidden: Only Super Admin can delete admins' });
        }

        const admin = await Admin.findByIdAndDelete(adminId);
        if (!admin) {
            return res.status(404).send({ message: 'Admin not found' });
        }

        // Log action
        await logSystemAction('DELETE_ADMIN', superAdminId, 'SuperAdmin', null, 'Admin', adminId, admin.email, `Admin deleted: ${admin.email}`, null, 'Success');

        res.status(200).json({ message: 'Admin deleted successfully' });
    } catch (err) {
        res.status(500).send({ message: 'Error deleting admin', error: err.message });
    }
};

// ==================== BACKUP MANAGEMENT ====================

// Create backup
const createBackup = async (req, res) => {
    try {
        const superAdminId = req.get('x-admin-id');
        const { backupName, backupType, schoolId, backupLocation, cloudProvider, encryptionStatus } = req.body;

        // Verify Super Admin role
        const superAdmin = await Admin.findById(superAdminId);
        if (!superAdmin || superAdmin.role !== 'SuperAdmin') {
            return res.status(403).send({ message: 'Forbidden: Only Super Admin can create backups' });
        }

        // Normalize values to match Backup schema enums
        const normalizedBackupType = (backupType || '').toString().toLowerCase();
        let backupTypeForModel = 'Full';
        if (normalizedBackupType === 'full' || normalizedBackupType === 'manual') backupTypeForModel = 'Full';
        else if (normalizedBackupType === 'incremental') backupTypeForModel = 'Incremental';
        else if (normalizedBackupType === 'differential') backupTypeForModel = 'Differential';
        else if (normalizedBackupType === 'schoolspecific' || normalizedBackupType === 'schoolSpecific') backupTypeForModel = 'SchoolSpecific';

        const normalizedLocation = (backupLocation || '').toString().toLowerCase();
        let backupLocationForModel = 'Local';
        if (normalizedLocation === 'local') backupLocationForModel = 'Local';
        else if (normalizedLocation === 'cloud' || normalizedLocation.startsWith('cloud')) backupLocationForModel = 'Cloud';
        else if (normalizedLocation === 'external' || normalizedLocation === 'external_drive') backupLocationForModel = 'External';

        const backup = new Backup({
            backupName,
            backupType: backupTypeForModel,
            school: schoolId || null,
            backupLocation: backupLocationForModel,
            cloudProvider,
            status: 'Running',
            startTime: new Date(),
            backupPath: `/backups/${backupName}_${Date.now()}`,
            backupSize: 0,
            encryptionStatus,
            createdBy: superAdminId
        });

        await backup.save();

        // Log action
        await logSystemAction('BACKUP_CREATED', superAdminId, 'SuperAdmin', schoolId || null, 'Backup', backup._id, backupName, `Backup created: ${backupName}`, null, 'Success');

        res.status(201).json({ message: 'Backup created successfully', backup });
    } catch (err) {
        res.status(500).send({ message: 'Error creating backup', error: err.message });
    }
};

// Get all backups
const getAllBackups = async (req, res) => {
    try {
        const superAdminId = req.get('x-admin-id');
        const { page = 1, limit = 10, status, school } = req.query;

        // Verify Super Admin role
        const superAdmin = await Admin.findById(superAdminId);
        if (!superAdmin || superAdmin.role !== 'SuperAdmin') {
            return res.status(403).send({ message: 'Forbidden: Only Super Admin can view backups' });
        }

        let filter = {};
        if (status) filter.status = status;
        if (school) filter.school = school;

        const skip = (page - 1) * limit;
        const backups = await Backup.find(filter)
            .populate('createdBy', 'name email')
            .populate('school', 'schoolName')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Backup.countDocuments(filter);

        res.status(200).json({
            message: 'Backups retrieved successfully',
            backups,
            pagination: {
                current: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        res.status(500).send({ message: 'Error retrieving backups', error: err.message });
    }
};

// Verify backup
const verifyBackup = async (req, res) => {
    try {
        const superAdminId = req.get('x-admin-id');
        const { backupId } = req.params;

        // Verify Super Admin role
        const superAdmin = await Admin.findById(superAdminId);
        if (!superAdmin || superAdmin.role !== 'SuperAdmin') {
            return res.status(403).send({ message: 'Forbidden: Only Super Admin can verify backups' });
        }

        const backup = await Backup.findById(backupId);
        if (!backup) {
            return res.status(404).send({ message: 'Backup not found' });
        }

        backup.verificationStatus = 'Verified';
        backup.verifiedAt = new Date();
        backup.verifiedBy = superAdminId;
        backup.status = 'Verified';
        await backup.save();

        // Log action
        await logSystemAction('BACKUP_CREATED', superAdminId, 'SuperAdmin', backup.school, 'Backup', backupId, backup.backupName, `Backup verified: ${backup.backupName}`, null, 'Success');

        res.status(200).json({ message: 'Backup verified successfully', backup });
    } catch (err) {
        res.status(500).send({ message: 'Error verifying backup', error: err.message });
    }
};

// Generate system report
const generateReport = async (req, res) => {
    try {
        const superAdminId = req.get('x-admin-id');
        const { reportType, startDate, endDate, schoolId } = req.body;

        // Verify Super Admin or Admin with report permission
        const superAdmin = await Admin.findById(superAdminId);
        const canGenerateReports = superAdmin && (superAdmin.role === 'SuperAdmin' || superAdmin.permissions?.generateReports);
        if (!canGenerateReports) {
            return res.status(403).send({ message: 'Forbidden: Only Super Admin or Admin with report permission can generate reports' });
        }

        let reportData = {};

        if (reportType === 'schools') {
            reportData = await School.find()
                .populate('schoolAdmin', 'name email')
                .populate('currentSubscription', 'planName status');
        } else if (reportType === 'subscriptions') {
            reportData = await Subscription.find()
                .populate('school', 'schoolName')
                .populate('createdBy', 'name email');
        } else if (reportType === 'revenue') {
            reportData = await Subscription.aggregate([
                { $match: { status: { $in: ['Active', 'Paid'] }, createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } } },
                { $group: { _id: '$planName', totalRevenue: { $sum: '$planPrice' }, count: { $sum: 1 } } }
            ]);
        } else if (reportType === 'academic') {
            // Academic report: average marks per subject and per student within date range or school
            const matchSchool = schoolId ? { school: School.exists ? schoolId : schoolId } : {};
            // Fetch students for the school
            const students = schoolId ? await Student.find({ school: schoolId }).populate('examResult.subName', 'subName') : await Student.find().populate('examResult.subName', 'subName');

            // Build subject stats
            const subjectStats = {};
            students.forEach(s => {
                (s.examResult || []).forEach(er => {
                    const subj = (er.subName && er.subName.subName) ? er.subName.subName : (er.subName || 'Unknown');
                    if (!subjectStats[subj]) subjectStats[subj] = { totalMarks: 0, count: 0 };
                    subjectStats[subj].totalMarks += (er.marksObtained || 0);
                    subjectStats[subj].count += 1;
                });
            });

            const subjects = Object.keys(subjectStats).map(k => ({ subject: k, averageMark: subjectStats[k].count ? (subjectStats[k].totalMarks / subjectStats[k].count) : 0, records: subjectStats[k].count }));

            // Student averages
            const studentAverages = students.map(s => {
                const ers = s.examResult || [];
                const total = ers.reduce((sum, e) => sum + (e.marksObtained || 0), 0);
                return { studentId: s._id, name: s.name, average: ers.length ? (total / ers.length) : 0, exams: ers.length };
            });

            reportData = { subjects, studentAverages };
        } else if (reportType === 'systemLogs') {
            reportData = await SystemLog.find({ timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) } })
                .populate('actor', 'name email')
                .populate('school', 'schoolName')
                .sort({ timestamp: -1 });
        } else if (reportType === 'financial') {
            // Financial report: totals for student fees and payments
            const match = {};
            if (schoolId) match.school = mongoose.Types.ObjectId(schoolId);

            // Aggregate student financials
            const students = schoolId ? await Student.find({ school: schoolId }) : await Student.find();
            const totalFees = students.reduce((sum, s) => sum + (s.totalFees || 0), 0);
            const totalPaid = students.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
            const outstanding = totalFees - totalPaid;

            // Payments by method
            const paymentMethodMap = {};
            students.forEach(s => {
                (s.paymentHistory || []).forEach(p => {
                    const method = p.paymentMethod || 'Unknown';
                    paymentMethodMap[method] = paymentMethodMap[method] || { count: 0, total: 0 };
                    paymentMethodMap[method].count += 1;
                    paymentMethodMap[method].total += (p.amount || 0);
                });
            });

            const paymentsByMethod = Object.keys(paymentMethodMap).map(k => ({ method: k, count: paymentMethodMap[k].count, total: paymentMethodMap[k].total }));

            reportData = { totalFees, totalPaid, outstanding, paymentsByMethod, studentCount: students.length };
        }

        res.status(200).json({ message: 'Report generated successfully', reportType, reportData });
    } catch (err) {
        res.status(500).send({ message: 'Error generating report', error: err.message });
    }
};

module.exports = {
    // School Management
    getAllSchools,
    createSchool,
    updateSchool,
    deleteSchool,
    suspendSchool,
    activateSchool,
    deactivateSchool,

    // Admin Management
    registerSchoolAdmin,
    getAllAdmins,
    resetSchoolAdminPassword,
    deleteSchoolAdmin,

    // Subscription Management
    createSubscription,
    updateSubscription,
    cancelSubscription,
    getSchoolSubscription,

    // Academic Year Management
    createAcademicYear,
    getAcademicYears,
    updateAcademicYear,

    // System Monitoring & Logs
    getSystemLogs,
    getSystemStats,

    // Backup Management
    createBackup,
    getAllBackups,
    verifyBackup,

    // Reporting
    generateReport
};
