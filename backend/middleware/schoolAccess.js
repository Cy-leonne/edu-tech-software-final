
const mongoose = require('mongoose');
const Admin = require('../models/adminSchema.js');
const Teacher = require('../models/teacherSchema.js');
const Student = require('../models/studentSchema.js');
const Parent = require('../models/parentSchema.js');
const School = require('../models/schoolSchema.js');
const Subscription = require('../models/subscriptionSchema.js');

const getAdminIdFromReq = (req) => {
    let requestId = req.get('x-admin-id') || req.get('x-user-id') ||
        req.body.adminID || req.body.userID || req.body.userId ||
        req.query.adminID || req.query.userID || req.query.userId ||
        req.query.adminId || req.query.userId || req.params.adminId;
    if (!requestId) return null;
    // Normalize and trim; reject empty strings
    requestId = requestId.toString().trim();
    if (!requestId) return null;
    return requestId;
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeSchoolName = (schoolName) => (typeof schoolName === 'string' ? schoolName.trim() : '');
const findSchoolAdminByName = async (schoolName) => {
    const normalizedName = normalizeSchoolName(schoolName);
    if (!normalizedName) return null;
    return await Admin.findOne({
        schoolName: { $regex: `^${escapeRegExp(normalizedName)}$`, $options: 'i' },
        role: { $in: ['Admin', 'SuperAdmin'] }
    }).select('_id');
};

const isSuperAdmin = (admin) => {
    return admin && (admin.role === 'SuperAdmin' || (Array.isArray(admin.roles) && admin.roles.includes('SuperAdmin')));
};

const getAdminSchoolId = (admin) => {
    if (!admin) return null;
    if (admin.school) {
        const schoolRef = admin.school && typeof admin.school === 'object' ? (admin.school._id || admin.school.id || admin.school) : admin.school;
        return schoolRef ? schoolRef.toString() : null;
    }
    if (admin.schoolId) return admin.schoolId.toString();
    return admin._id ? admin._id.toString() : null;
};

const resolveEntitySchoolId = (entity, schoolField = 'school') => {
    if (!entity || entity[schoolField] == null) return null;
    const schoolValue = entity[schoolField];
    if (typeof schoolValue === 'string') return schoolValue;
    if (schoolValue instanceof mongoose.Types.ObjectId) return schoolValue.toString();
    if (schoolValue._id) return schoolValue._id.toString();
    if (typeof schoolValue.toString === 'function') return schoolValue.toString();
    return null;
};

const enforceSubscriptionStatus = async (schoolId) => {
    if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) return null;

    const school = await School.findOne({
        $or: [{ _id: schoolId }, { schoolAdmin: schoolId }]
    }).select('_id schoolName status subscriptionStatus currentSubscription statusChangeReason');

    if (!school) return null;

    const subscription = school.currentSubscription
        ? await Subscription.findById(school.currentSubscription)
        : await Subscription.findOne({ school: school._id }).sort({ endDate: -1 });
    if (!subscription) return school;

    const now = new Date();
    const expired = subscription.endDate && new Date(subscription.endDate) <= now;
    const overdue = subscription.paymentStatus === 'Overdue' ||
        (subscription.nextPaymentDate && new Date(subscription.nextPaymentDate) <= now && subscription.paymentStatus !== 'Paid');
    const cancelled = ['Cancelled', 'Suspended'].includes(subscription.status);

    if (expired || overdue || cancelled) {
        const subscriptionStatus = cancelled ? subscription.status : 'Expired';
        const reason = expired
            ? 'Subscription expired.'
            : overdue
                ? 'Subscription payment is overdue.'
                : `Subscription is ${subscription.status.toLowerCase()}.`;

        if (subscription.status !== subscriptionStatus) {
            subscription.status = subscriptionStatus;
            await subscription.save();
        }

        if (school.status !== 'Suspended' || school.subscriptionStatus !== subscriptionStatus || school.statusChangeReason !== reason) {
            school.status = 'Suspended';
            school.subscriptionStatus = subscriptionStatus;
            school.statusChangedAt = now;
            school.statusChangeReason = reason;
            await school.save();
        }
    }

    return school;
};

const getRequestUser = async (req) => {
    const userId = getAdminIdFromReq(req);
    if (!userId) return null;

    // Validate ObjectId before querying to avoid Cast errors
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;

    const admin = await Admin.findById(userId).select('role roles school schoolId schoolName');
    if (admin) {
        let schoolId = getAdminSchoolId(admin);
        if (!schoolId && ['Accountant', 'HR'].includes(admin.role) && admin.schoolName) {
            const schoolAdmin = await findSchoolAdminByName(admin.schoolName);
            if (schoolAdmin) {
                schoolId = schoolAdmin._id.toString();
            }
        }
        const school = admin.role === 'SuperAdmin' ? null : await enforceSubscriptionStatus(schoolId);
        return { type: 'admin', user: admin, schoolId, school };
    }

    const teacher = await Teacher.findById(userId).select('school');
    if (teacher) {
        const schoolId = resolveEntitySchoolId(teacher, 'school');
        return { type: 'teacher', user: teacher, schoolId, school: await enforceSubscriptionStatus(schoolId) };
    }

    const student = await Student.findById(userId).select('school');
    if (student) {
        return { type: 'student', user: student, schoolId: resolveEntitySchoolId(student, 'school') };
    }

    const parent = await Parent.findById(userId).select('school');
    if (parent) {
        return { type: 'parent', user: parent, schoolId: resolveEntitySchoolId(parent, 'school') };
    }

    return null;
};

/**
 * Shared guard for school scoped resources.
 *
 * NOTE (security fix): the previous implementation returned `true` in the
 * cross-school branches, which meant every authenticated user could read and
 * write records belonging to other schools (IDOR / broken tenant isolation).
 * The guard now denies cross-school access while keeping the existing
 * behaviour for the legitimate cases:
 *   - SuperAdmin keeps global access
 *   - school admins keep full access to their own school
 *   - HR / Accountant / Teacher / Student / Parent keep access to their school
 *   - records whose school cannot be resolved are treated as before
 */
const denyCrossSchool = (res) => {
    res.status(403).send({ message: 'Access denied: this record belongs to another school.' });
    return false;
};

const verifySchoolId = async (req, res, schoolId) => {
    const requestUser = await getRequestUser(req);
    if (!requestUser) {
        res.status(401).send({ message: 'Credentials are required' });
        return false;
    }

    if (requestUser.type === 'admin' && isSuperAdmin(requestUser.user)) {
        return true;
    }

    const school = requestUser.school || await enforceSubscriptionStatus(requestUser.schoolId);
    if (school?.status === 'Suspended') {
        res.status(403).send({ message: `Access blocked: ${school.statusChangeReason || 'school subscription is not active.'}`, schoolStatus: 'Suspended' });
        return false;
    }

    const requestedSchoolId = schoolId && schoolId !== '[object Object]' ? String(schoolId) : null;
    const requesterSchoolId = requestUser.schoolId ? String(requestUser.schoolId) : null;

    if (requestedSchoolId && requesterSchoolId && requestedSchoolId !== requesterSchoolId) {
        return denyCrossSchool(res);
    }

    return true;
};

const verifyEntityBelongsToAdminSchool = async (req, res, entity, schoolField = 'school') => {
    if (!entity) {
        res.status(404).send({ message: 'Entity not found' });
        return false;
    }

    const requestUser = await getRequestUser(req);
    if (!requestUser) {
        res.status(401).send({ message: 'Credentials are required' });
        return false;
    }

    if (requestUser.type === 'admin' && isSuperAdmin(requestUser.user)) {
        return true;
    }

    const school = requestUser.school || await enforceSubscriptionStatus(requestUser.schoolId);
    if (school?.status === 'Suspended') {
        res.status(403).send({ message: `Access blocked: ${school.statusChangeReason || 'school subscription is not active.'}`, schoolStatus: 'Suspended' });
        return false;
    }

    const entitySchoolId = resolveEntitySchoolId(entity, schoolField);
    const requesterSchoolId = requestUser.schoolId ? String(requestUser.schoolId) : null;

    // A school administrator is always allowed to manage entities of their own
    // school; anything that resolves to a different school is rejected.
    if (entitySchoolId && requesterSchoolId && String(entitySchoolId) !== requesterSchoolId) {
        return denyCrossSchool(res);
    }

    return true;
};

module.exports = {
    getAdminIdFromReq,
    enforceSubscriptionStatus,
    getRequestUser,
    verifySchoolId,
    verifyEntityBelongsToAdminSchool,
    isSuperAdmin,
    getAdminSchoolId,
    resolveEntitySchoolId,
};
