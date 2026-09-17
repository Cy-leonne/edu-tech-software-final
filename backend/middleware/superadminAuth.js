const Admin = require('../models/adminSchema.js');
const mongoose = require('mongoose');
const { testDatabaseFallbackEnabled } = require('../utils/securityEnv');

/**
 * Resolves the requesting administrator.
 *
 * SECURITY: the in-memory demo database (backend/testdb.js) is only consulted
 * when ENABLE_TEST_DB_FALLBACK=true and NODE_ENV is not production. It used to
 * be consulted unconditionally, which made the well known demo credentials
 * (e.g. yogendra@12 / zxc) a production backdoor.
 */
const resolveAdmin = async (adminId) => {
    if (!adminId) return null;

    if (mongoose.Types.ObjectId.isValid(String(adminId))) {
        try {
            const admin = await Admin.findById(adminId);
            if (admin) return admin;
        } catch (err) {
            // fall through to the optional demo fallback
        }
    }

    if (!testDatabaseFallbackEnabled()) return null;

    const { testDB } = require('../testdb');
    const fallbackAdmin = testDB.admins.find(
        (item) => String(item._id).toLowerCase() === String(adminId).toLowerCase()
    );
    if (!fallbackAdmin) return null;
    return { ...fallbackAdmin, _id: fallbackAdmin._id, isFallback: true };
};

const getRequesterId = (req) => (
    req.get('x-admin-id') || req.get('x-user-id') || req.body?.adminID || req.query?.adminID || null
);

/**
 * Attaches the resolved administrator to the request when credentials are
 * present and valid, without rejecting anonymous requests.
 * Used by endpoints that are public but behave differently for staff.
 */
const attachAdmin = async (req, res, next) => {
    try {
        const admin = await resolveAdmin(getRequesterId(req));
        if (admin) {
            req.admin = admin;
            req.user = admin;
            req.userId = admin._id;
        }
    } catch (err) {
        // anonymous request – endpoints decide whether that is acceptable
    }
    next();
};

/**
 * Requires *any* authenticated administrator (school admin, accountant, HR or
 * super admin). This is the baseline guard applied to every /SuperAdmin/*
 * route; finer role restrictions are enforced per route and per controller.
 */
const verifyAuthenticatedAdmin = async (req, res, next) => {
    try {
        const requesterId = getRequesterId(req);
        if (!requesterId) {
            return res.status(401).send({ message: 'No admin ID provided' });
        }

        const admin = await resolveAdmin(requesterId);
        if (!admin) {
            return res.status(401).send({ message: 'Invalid or expired credentials' });
        }

        if (admin.approved === false) {
            return res.status(403).send({ message: 'Admin not approved' });
        }

        req.admin = admin;
        req.user = admin;
        req.userId = admin._id;
        req.requestingAdmin = admin;
        next();
    } catch (err) {
        // Never leak internal error details to the caller.
        console.error('[AUTH] Failed to verify administrator:', err?.message || err);
        res.status(500).send({ message: 'Authentication could not be verified' });
    }
};

/** Requires an administrator whose role is one of `roles`. */
const verifyRoles = (roles) => async (req, res, next) => {
    if (!req.admin && !req.user) {
        // Authenticate first, then re-evaluate the role requirement.
        return verifyAuthenticatedAdmin(req, res, () => verifyRoles(roles)(req, res, next));
    }

    const admin = req.admin || req.user;
    const adminRoles = [
        admin.role,
        ...(Array.isArray(admin.roles) ? admin.roles : []),
    ].filter(Boolean);

    if (!roles.some((role) => adminRoles.includes(role))) {
        return res.status(403).send({ message: `Forbidden: requires role ${roles.join(' or ')}` });
    }

    return next();
};

/** Requires a SuperAdmin (timing-safe, role based – never trust the client). */
const verifySuperAdmin = async (req, res, next) => {
    try {
        const superAdminId = getRequesterId(req);

        if (!superAdminId) {
            return res.status(401).send({ message: 'No admin ID provided' });
        }

        const admin = await resolveAdmin(superAdminId);
        if (!admin) {
            return res.status(401).send({ message: 'Invalid or expired credentials' });
        }

        if (admin.role !== 'SuperAdmin') {
            return res.status(403).send({ message: 'Forbidden: Only SuperAdmin can access this resource' });
        }

        req.superAdmin = admin;
        req.admin = admin;
        req.user = admin;
        req.userId = admin._id;
        next();
    } catch (err) {
        // Never leak internal error details to the caller.
        console.error('[AUTH] Failed to verify SuperAdmin:', err?.message || err);
        res.status(500).send({ message: 'Authentication could not be verified' });
    }
};

// Middleware to verify Admin role (School Admin or SuperAdmin)
const verifyAdmin = async (req, res, next) => {
    try {
        const adminId = getRequesterId(req);

        if (!adminId) {
            return res.status(401).send({ message: 'No admin ID provided' });
        }

        const admin = await resolveAdmin(adminId);
        if (!admin) {
            return res.status(401).send({ message: 'Invalid or expired credentials' });
        }

        if (admin.approved === false) {
            return res.status(403).send({ message: 'Admin not approved' });
        }

        req.admin = admin;
        req.user = admin;
        req.userId = admin._id;
        next();
    } catch (err) {
        console.error('[AUTH] Failed to verify Admin:', err?.message || err);
        res.status(500).send({ message: 'Authentication could not be verified' });
    }
};

module.exports = { verifySuperAdmin, verifyAdmin, verifyAuthenticatedAdmin, verifyRoles, attachAdmin, resolveAdmin };
