
/**
 * Tenant (school) isolation tests.
 *
 * These cover the previously broken cross-school guards: an authenticated user
 * of school A must not be able to read or write records of school B, while
 * SuperAdmin and same-school access keep working exactly as before.
 */

const SCHOOL_A = '64b7f9c2f1a2b3c4d5e6f701';
const SCHOOL_B = '64b7f9c2f1a2b3c4d5e6f702';
const ADMIN_A = '64b7f9c2f1a2b3c4d5e6f703';
const SUPER_ADMIN = '64b7f9c2f1a2b3c4d5e6f704';
const TEACHER_A = '64b7f9c2f1a2b3c4d5e6f705';

const mockAdminFindById = jest.fn();
const mockTeacherFindById = jest.fn();
const mockStudentFindById = jest.fn();
const mockParentFindById = jest.fn();
const mockSchoolFindOne = jest.fn();

jest.mock('../models/adminSchema.js', () => ({
    findById: (...args) => mockAdminFindById(...args),
}));
jest.mock('../models/teacherSchema.js', () => ({
    findById: (...args) => mockTeacherFindById(...args),
}));
jest.mock('../models/studentSchema.js', () => ({
    findById: (...args) => mockStudentFindById(...args),
}));
jest.mock('../models/parentSchema.js', () => ({
    findById: (...args) => mockParentFindById(...args),
}));
jest.mock('../models/schoolSchema.js', () => ({
    findOne: (...args) => mockSchoolFindOne(...args),
    findById: jest.fn(),
}));
jest.mock('../models/subscriptionSchema.js', () => ({
    findOne: jest.fn(() => ({ sort: jest.fn().mockResolvedValue(null) })),
    findById: jest.fn(() => ({ sort: jest.fn().mockResolvedValue(null) })),
}));

const {
    verifyEntityBelongsToAdminSchool,
    verifySchoolId,
    getRequestUser,
} = require('../middleware/schoolAccess');

const mockSelectChain = (value) => ({ select: jest.fn().mockResolvedValue(value) });

const buildRes = () => {
    const res = {
        statusCode: null,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        send(payload) {
            this.body = payload;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        },
    };
    return res;
};

const buildReq = (adminId) => ({
    get: (header) => (header === 'x-admin-id' ? adminId : undefined),
    body: {},
    query: {},
    params: {},
});

const mockSchoolAdmin = () => {
    mockAdminFindById.mockReturnValue(mockSelectChain({
        _id: ADMIN_A,
        role: 'Admin',
        school: SCHOOL_A,
    }));
    // No subscription configured -> school stays active
    mockSchoolFindOne.mockReturnValue(mockSelectChain(null));
};

describe('schoolAccess tenant isolation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('denies cross-school access to an entity owned by another school', async () => {
        mockSchoolAdmin();
        const res = buildRes();

        const allowed = await verifyEntityBelongsToAdminSchool(
            buildReq(ADMIN_A),
            res,
            { _id: 'student-1', school: SCHOOL_B }
        );

        expect(allowed).toBe(false);
        expect(res.statusCode).toBe(403);
        expect(res.body.message).toMatch(/another school/i);
    });

    test('allows access to an entity of the same school', async () => {
        mockSchoolAdmin();
        const res = buildRes();

        const allowed = await verifyEntityBelongsToAdminSchool(
            buildReq(ADMIN_A),
            res,
            { _id: 'student-1', school: SCHOOL_A }
        );

        expect(allowed).toBe(true);
        expect(res.statusCode).toBeNull();
    });

    test('SuperAdmin keeps global access', async () => {
        mockAdminFindById.mockReturnValue(mockSelectChain({
            _id: SUPER_ADMIN,
            role: 'SuperAdmin',
            school: null,
        }));
        const res = buildRes();

        const allowed = await verifyEntityBelongsToAdminSchool(
            buildReq(SUPER_ADMIN),
            res,
            { _id: 'student-1', school: SCHOOL_B }
        );

        expect(allowed).toBe(true);
    });

    test('teachers may only touch entities of their own school', async () => {
        // No admin record for this id -> the request is resolved as a teacher.
        mockAdminFindById.mockReturnValue(mockSelectChain(null));
        mockTeacherFindById.mockReturnValue(mockSelectChain({ _id: TEACHER_A, school: SCHOOL_A }));
        mockSchoolFindOne.mockReturnValue(mockSelectChain(null));

        const ownSchool = buildRes();
        expect(await verifyEntityBelongsToAdminSchool(buildReq(TEACHER_A), ownSchool, { school: SCHOOL_A })).toBe(true);

        const otherSchool = buildRes();
        expect(await verifyEntityBelongsToAdminSchool(buildReq(TEACHER_A), otherSchool, { school: SCHOOL_B })).toBe(false);
        expect(otherSchool.statusCode).toBe(403);
    });

    test('verifySchoolId rejects requesting another school id', async () => {
        mockSchoolAdmin();

        const denied = buildRes();
        expect(await verifySchoolId(buildReq(ADMIN_A), denied, SCHOOL_B)).toBe(false);
        expect(denied.statusCode).toBe(403);

        const allowed = buildRes();
        expect(await verifySchoolId(buildReq(ADMIN_A), allowed, SCHOOL_A)).toBe(true);
    });

    test('verifySchoolId ignores the stringified object placeholder used by legacy clients', async () => {
        mockSchoolAdmin();
        const res = buildRes();
        expect(await verifySchoolId(buildReq(ADMIN_A), res, '[object Object]')).toBe(true);
    });

    test('unauthenticated requests are rejected with 401', async () => {
        const res = buildRes();
        const allowed = await verifyEntityBelongsToAdminSchool(buildReq(null), res, { school: SCHOOL_A });
        expect(allowed).toBe(false);
        expect(res.statusCode).toBe(401);
    });

    test('suspended school subscriptions still block access', async () => {
        mockAdminFindById.mockReturnValue(mockSelectChain({
            _id: ADMIN_A,
            role: 'Admin',
            school: SCHOOL_A,
        }));
        mockSchoolFindOne.mockReturnValue(mockSelectChain({
            _id: SCHOOL_A,
            status: 'Suspended',
            statusChangeReason: 'Subscription expired.',
        }));

        const res = buildRes();
        const allowed = await verifySchoolId(buildReq(ADMIN_A), res, SCHOOL_A);

        expect(allowed).toBe(false);
        expect(res.statusCode).toBe(403);
    });

    test('getRequestUser resolves the school of the requesting admin', async () => {
        mockSchoolAdmin();
        const requestUser = await getRequestUser(buildReq(ADMIN_A));
        expect(requestUser).toEqual(expect.objectContaining({ type: 'admin', schoolId: SCHOOL_A }));
    });
});
