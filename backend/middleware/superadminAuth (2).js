
const Admin = require('../models/adminSchema.js');
const { testDatabaseFallbackEnabled } = require('../utils/securityEnv');

// The in-memory demo database is only safe to consult in development/test
// environments; never in production.
const findFallbackAdmin = (adminId) => {
    if (!testDatabaseFallbackEnabled()) return null;
    try {
        const { testDB } = require('../testdb');
        const fallback = testDB.admins.find((item) => String(item._id).toLowerCase() === String(adminId).toLowerCase());
        return fallback ? { ...fallback, _id: fallback._id, isFallback: true } : null;
    } catch (err) {
        return null;
    }
};

const getRequestAdminId = (req) => req.get('x-admin-id') || req.get('x-user-id') || req.body.adminID || req.query.adminID;

// Baseline gate for every supervisory endpoint: the credential must belong to
// a real, approved admin account (any admin role). Role-specific restrictions
// are layered on top with verifySuperAdmin / verifyRoles.
const verifyAuthenticatedAdmin = async (req, res, next) => {
    try {
        const adminId = getRequestAdminId(req);

        if (!adminId) {
            return res.status(401).send({ message: 'No admin ID provided' });
        }

        let admin = null;
        try {
            admin = await Admin.findById(adminId);
        } catch (err) {
            console.error('Admin lookup failed while verifying supervisory access:', err.message);
            admin = null;
        }

        if (!admin) {
            admin = findFallbackAdmin(adminId);
        }

        if (!admin) {
            // Unknown or forged credential — fail closed with a generic message.
            return res.status(401).send({ message: 'Invalid or expired credentials' });
        }

        if (admin.approved === false) {
            return res.status(403).send({ message: 'Admin not approved' });
        }

        req.admin = admin;
        req.superAdmin = admin;
        req.user = admin;
        req.userId = admin._id;
        next();
    } catch (err) {
        console.error('Error verifying admin access:', err.message);
        return res.status(401).send({ message: 'Invalid or expired credentials' });
    }
};

// Restricts a route to a list of admin roles. Must run after
// verifyAuthenticatedAdmin (uses req.admin).
const verifyRoles = (roles = []) => {
    const allowed = Array.isArray(roles) ? roles : [roles];
    return (req, res, next) => {
        const admin = req.admin;
        if (!admin) {
            return res.status(401).send({ message: 'No admin ID provided' });
        }
        const role = admin.role;
        if (!allowed.includes(role)) {
            return res.status(403).send({ message: `Forbidden: Only ${allowed.join(' or ')} can access this resource` });
        }
        next();
    };
};

// Middleware to verify SuperAdmin role
const verifySuperAdmin = async (req, res, next) => {
    try {
        const superAdminId = req.get('x-admin-id') || req.body.adminID || req.query.adminID;
        
        if (!superAdminId) {
            return res.status(401).send({ message: 'No admin ID provided' });
        }

        let admin = null;
        try {
            admin = await Admin.findById(superAdminId);
        } catch (err) {
            admin = null;
        }

        if (!admin) {
            const fallbackAdmin = findFallbackAdmin(superAdminId);
            if (!fallbackAdmin) {
                return res.status(404).send({ message: 'Admin not found' });
            }
            admin = fallbackAdmin;
        }

        if (admin.role !== 'SuperAdmin') {
            return res.status(403).send({ message: 'Forbidden: Only SuperAdmin can access this resource' });
        }

        req.superAdmin = admin;
        req.user = admin;
        req.userId = admin._id;
        next();
    } catch (err) {
        res.status(500).send({ message: 'Error verifying SuperAdmin', error: err.message });
    }
};

// Middleware to verify Admin role (School Admin or SuperAdmin)
const verifyAdmin = async (req, res, next) => {
    try {
        const adminId = req.get('x-admin-id') || req.body.adminID || req.query.adminID;
        
        if (!adminId) {
            return res.status(401).send({ message: 'No admin ID provided' });
        }

        let admin = null;
        try {
            admin = await Admin.findById(adminId);
        } catch (err) {
            admin = null;
        }

        if (!admin) {
            const fallbackAdmin = findFallbackAdmin(adminId);
            if (!fallbackAdmin) {
                return res.status(404).send({ message: 'Admin not found' });
            }
            admin = fallbackAdmin;
        }

        if (admin.approved === false) {
            return res.status(403).send({ message: 'Admin not approved' });
        }

        req.admin = admin;
        req.user = admin;
        req.userId = admin._id;
        next();
    } catch (err) {
        res.status(500).send({ message: 'Error verifying Admin', error: err.message });
    }
};

module.exports = { verifySuperAdmin, verifyAdmin, verifyAuthenticatedAdmin, verifyRoles };
