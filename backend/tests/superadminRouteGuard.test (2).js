/**
 * Regression test: /SuperAdmin/* routes must run the role guard BEFORE the
 * controller. A previous ordering bug registered handlers ahead of
 * verifySuperAdmin, so the role check never executed and any authenticated
 * admin could invoke SuperAdmin-only endpoints.
 *
 * The controller module is mocked to a spy, and the REAL auth middleware is
 * used (with the Admin model stubbed), so the only thing under test is the
 * order in which Express invokes the middleware chain.
 */
const express = require('express');
const request = require('supertest');

const mockFindById = jest.fn();

jest.mock('../models/adminSchema.js', () => ({
    findById: mockFindById,
    findOne: jest.fn(),
    find: jest.fn(),
}));

// Stub the whole controller surface so loading the router needs no database.
const controllerSpies = {};
jest.mock('../controllers/superadmin-controller.js', () => {
    const names = [
        'getAllSchools', 'createSchool', 'updateSchool', 'deleteSchool',
        'suspendSchool', 'activateSchool', 'deactivateSchool',
        'registerSchoolAdmin', 'getAllAdmins', 'resetSchoolAdminPassword', 'deleteSchoolAdmin',
        'createSubscription', 'updateSubscription', 'cancelSubscription', 'getSchoolSubscription',
        'createAcademicYear', 'getAcademicYears', 'updateAcademicYear',
        'getSystemLogs', 'getSystemStats',
        'createBackup', 'getAllBackups', 'verifyBackup',
        'generateReport',
    ];
    const module = {};
    for (const name of names) {
        // Handlers respond 200 when they (incorrectly) run before the guard.
        module[name] = (req, res) => res.status(200).json({ handler: name });
    }
    return module;
});

// Keep the demo database fallback disabled for these tests.
jest.mock('../utils/securityEnv', () => ({
    testDatabaseFallbackEnabled: () => false,
}));

const adminDoc = (overrides = {}) => ({
    _id: '507f1f77bcf86cd799439011',
    name: 'Admin User',
    role: 'Admin',
    approved: true,
    ...overrides,
});

describe('SuperAdmin route guard ordering', () => {
    let router;

    beforeAll(() => {
        jest.resetModules();
        router = require('../routes/superadmin-route.js');
    });

    beforeEach(() => {
        mockFindById.mockReset();
    });

    const buildApp = () => {
        const app = express();
        app.use(express.json());
        app.use(router);
        return app;
    };

    test('non-SuperAdmin caller is rejected with 403 before any controller', async () => {
        mockFindById.mockResolvedValue(adminDoc({ role: 'Admin' }));

        const app = buildApp();
        const response = await request(app)
            .get('/SuperAdmin/Schools')
            .set('x-admin-id', '507f1f77bcf86cd799439011');

        // 403 means verifySuperAdmin ran first and blocked the request.
        expect(response.status).toBe(403);
        expect(response.body).not.toHaveProperty('handler');
    });

    test('request without credentials is rejected with 401', async () => {
        mockFindById.mockResolvedValue(null);

        const app = buildApp();
        const response = await request(app).get('/SuperAdmin/Schools');
        expect(response.status).toBe(401);
        expect(response.body).not.toHaveProperty('handler');
    });

    test('SuperAdmin caller passes the guard and reaches the handler', async () => {
        mockFindById.mockResolvedValue(adminDoc({ role: 'SuperAdmin' }));

        const app = buildApp();
        const response = await request(app)
            .get('/SuperAdmin/Schools')
            .set('x-admin-id', '507f1f77bcf86cd799439011');

        expect(response.status).toBe(200);
        expect(response.body.handler).toBe('getAllSchools');
    });

    test('monitoring routes allow school admins but still require authentication', async () => {
        // Unauthenticated -> 401 before handler.
        mockFindById.mockResolvedValue(null);
        const anon = await request(buildApp()).get('/SuperAdmin/SystemStats');
        expect(anon.status).toBe(401);

        // School admin -> allowed through to the handler.
        mockFindById.mockResolvedValue(adminDoc({ role: 'Admin' }));
        const allowed = await request(buildApp())
            .get('/SuperAdmin/SystemStats')
            .set('x-admin-id', '507f1f77bcf86cd799439011');
        expect(allowed.status).toBe(200);
        expect(allowed.body.handler).toBe('getSystemStats');
    });
});
