
/**
 * Security tests for the administrative authentication middleware.
 *
 * These pin the fix for the previously unprotected supervisory surface:
 * every /SuperAdmin/* route is mounted behind `verifyAuthenticatedAdmin`, and
 * the SuperAdmin-only routes behind an additional role check.
 *
 * Covered behaviour:
 *   - missing credentials                -> 401
 *   - unknown / forged credentials       -> 401
 *   - unapproved admin                   -> 403
 *   - authenticated non-SuperAdmin role  -> 403 on SuperAdmin-only routes
 *   - allowed roles                      -> request reaches the controller
 *   - internal failures never leak error details to the caller
 */
const express = require('express');
const request = require('supertest');

const mockFindById = jest.fn();

jest.mock('../models/adminSchema.js', () => ({
    findById: mockFindById,
}));

// Keep the demo database out of the picture entirely for these tests.
jest.mock('../utils/securityEnv', () => ({
    testDatabaseFallbackEnabled: () => false,
}));

const {
    verifyAuthenticatedAdmin,
    verifySuperAdmin,
    verifyRoles,
} = require('../middleware/superadminAuth.js');

const buildApp = (middlewares) => {
    const app = express();
    app.use(express.json());
    app.get('/SuperAdmin/Protected', ...middlewares, (req, res) => {
        res.status(200).json({ ok: true, role: req.admin?.role });
    });
    return app;
};

const adminDoc = (overrides = {}) => ({
    _id: '507f1f77bcf86cd799439011',
    name: 'Admin User',
    role: 'Admin',
    approved: true,
    ...overrides,
});

describe('administrative route protection', () => {
    beforeEach(() => {
        mockFindById.mockReset();
    });

    test('rejects a request with no credentials', async () => {
        const app = buildApp([verifyAuthenticatedAdmin]);
        const response = await request(app).get('/SuperAdmin/Protected');
        expect(response.status).toBe(401);
        expect(mockFindById).not.toHaveBeenCalled();
    });

    test('rejects forged credentials that do not resolve to an admin', async () => {
        mockFindById.mockResolvedValue(null);
        const app = buildApp([verifyAuthenticatedAdmin]);
        const response = await request(app)
            .get('/SuperAdmin/Protected')
            .set('x-admin-id', '507f1f77bcf86cd799439012');
        expect(response.status).toBe(401);
        expect(response.body.message).toMatch(/invalid or expired credentials/i);
    });

    test('rejects an unapproved administrator', async () => {
        mockFindById.mockResolvedValue(adminDoc({ approved: false }));
        const app = buildApp([verifyAuthenticatedAdmin]);
        const response = await request(app)
            .get('/SuperAdmin/Protected')
            .set('x-admin-id', '507f1f77bcf86cd799439011');
        expect(response.status).toBe(403);
    });

    test('blocks a school admin from a SuperAdmin-only route', async () => {
        mockFindById.mockResolvedValue(adminDoc({ role: 'Admin' }));
        const app = buildApp([verifyAuthenticatedAdmin, verifySuperAdmin]);
        const response = await request(app)
            .get('/SuperAdmin/Protected')
            .set('x-admin-id', '507f1f77bcf86cd799439011');
        expect(response.status).toBe(403);
        expect(response.body.message).toMatch(/only superadmin/i);
    });

    test('allows a SuperAdmin through to the controller', async () => {
        mockFindById.mockResolvedValue(adminDoc({ role: 'SuperAdmin' }));
        const app = buildApp([verifyAuthenticatedAdmin, verifySuperAdmin]);
        const response = await request(app)
            .get('/SuperAdmin/Protected')
            .set('x-admin-id', '507f1f77bcf86cd799439011');
        expect(response.status).toBe(200);
        expect(response.body.role).toBe('SuperAdmin');
    });

    test('allows school admins on monitoring routes and blocks other roles', async () => {
        const app = buildApp([verifyAuthenticatedAdmin, verifyRoles(['Admin', 'SuperAdmin'])]);

        mockFindById.mockResolvedValue(adminDoc({ role: 'Admin' }));
        const allowed = await request(app)
            .get('/SuperAdmin/Protected')
            .set('x-admin-id', '507f1f77bcf86cd799439011');
        expect(allowed.status).toBe(200);

        mockFindById.mockResolvedValue(adminDoc({ role: 'Accountant' }));
        const denied = await request(app)
            .get('/SuperAdmin/Protected')
            .set('x-admin-id', '507f1f77bcf86cd799439011');
        expect(denied.status).toBe(403);
    });

    test('fails closed without leaking internal error details when the lookup fails', async () => {
        mockFindById.mockRejectedValue(new Error('connection string mongodb://user:pass@host/db refused'));
        const app = buildApp([verifyAuthenticatedAdmin]);
        const response = await request(app)
            .get('/SuperAdmin/Protected')
            .set('x-admin-id', '507f1f77bcf86cd799439011');

        // A failing database lookup must never authenticate the caller.
        expect(response.status).toBe(401);
        expect(JSON.stringify(response.body)).not.toMatch(/mongodb:\/\//);
        expect(JSON.stringify(response.body)).not.toMatch(/refused/);
    });
});
