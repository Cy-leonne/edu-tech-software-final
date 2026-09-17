/**
 * M-Pesa callback reconciliation tests.
 *
 * Focus areas: replay/idempotency, spoofed (unverified) callbacks, amount
 * manipulation, unknown checkout references and state transitions.
 */

const mockStudentFindOne = jest.fn();
const mockFindPaymentHistoryRecord = jest.fn();
const mockLogAuditAction = jest.fn();
const mockTeacherFindOne = jest.fn();

jest.mock('../models/parentSchema', () => ({}));
jest.mock('../models/settingsSchema', () => ({}));
jest.mock('../models/adminSchema', () => ({ findById: jest.fn() }));
jest.mock('../models/studentSchema', () => ({
    findOne: (...args) => mockStudentFindOne(...args),
    findById: jest.fn(),
}));
jest.mock('../models/teacherSchema', () => ({
    findOne: (...args) => mockTeacherFindOne(...args),
}));
jest.mock('../middleware/schoolAccess', () => ({
    getAdminIdFromReq: jest.fn(),
    verifyEntityBelongsToAdminSchool: jest.fn(),
}));
jest.mock('../utils/auditLogger', () => ({
    logAuditAction: (...args) => mockLogAuditAction(...args),
}));
jest.mock('../services/mpesaService', () => ({
    initiateStkPush: jest.fn(),
    queryStkPushStatus: jest.fn(),
    validateCallback: (...args) => mockFindPaymentHistoryRecord(...args),
}));

const { mpesaCallback } = require('../controllers/parent-controller');

const buildStudent = (paymentOverrides = {}) => {
    const payment = {
        amount: 5000,
        status: 'Pending',
        checkoutRequestId: 'ws_CO_123',
        receiptNumber: 'STK-ADM1-1',
        feePeriodKey: 'initial',
        balanceAfter: 0,
        ...paymentOverrides,
    };
    const student = {
        _id: 'student-1',
        name: 'Test Student',
        school: 'school-1',
        totalFees: 20000,
        amountPaid: 0,
        balance: 20000,
        feePeriodKey: 'initial',
        paymentHistory: [payment],
        save: jest.fn().mockResolvedValue(true),
    };
    return { student, payment };
};

const buildReq = (overrides = {}) => ({
    body: {
        Result: {
            ResultCode: 0,
            CheckoutRequestID: 'ws_CO_123',
            CallbackMetadata: { Item: [{ Name: 'Amount', Value: 5000 }, { Name: 'MpesaReceiptNumber', Value: 'QK123' }] },
        },
    },
    get: () => undefined,
    headers: {},
    ip: '10.0.0.1',
    connection: { remoteAddress: '10.0.0.1' },
    ...overrides,
});

const buildRes = () => ({
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    send(payload) { this.body = payload; return this; },
    json(payload) { this.body = payload; return this; },
});

describe('mpesaCallback', () => {
    let warnSpy;
    let errorSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});
        // Default: callback verification succeeds.
        mockFindPaymentHistoryRecord.mockReturnValue({ valid: true, method: 'shared-secret' });
        mockTeacherFindOne.mockResolvedValue(null);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('rejects callbacks that fail authentication', async () => {
        mockFindPaymentHistoryRecord.mockReturnValue({ valid: false, reason: 'invalid-signature' });
        const res = buildRes();

        await mpesaCallback(buildReq(), res);

        expect(res.statusCode).toBe(401);
        expect(mockStudentFindOne).not.toHaveBeenCalled();
    });

    test('marks a pending payment as completed and reconciles the balance', async () => {
        const { student, payment } = buildStudent();
        mockStudentFindOne.mockResolvedValue(student);
        const res = buildRes();

        await mpesaCallback(buildReq(), res);

        expect(payment.status).toBe('Completed');
        expect(payment.mpesaReceiptNumber).toBe('QK123');
        expect(student.amountPaid).toBe(5000);
        expect(student.balance).toBe(15000);
        expect(student.save).toHaveBeenCalled();
        expect(res.body).toEqual({ message: 'OK' });
    });

    test('replayed callbacks never double credit the student', async () => {
        const { student } = buildStudent({ status: 'Completed' });
        mockStudentFindOne.mockResolvedValue(student);
        const res = buildRes();

        await mpesaCallback(buildReq(), res);

        expect(student.save).not.toHaveBeenCalled();
        expect(student.amountPaid).toBe(0);
        expect(res.body).toEqual({ message: 'OK' });
    });

    test('rejects a callback whose amount does not match the requested amount', async () => {
        const { student, payment } = buildStudent();
        mockStudentFindOne.mockResolvedValue(student);
        const req = buildReq();
        req.body.Result.CallbackMetadata.Item[0].Value = 1; // attemped amount manipulation

        const res = buildRes();
        await mpesaCallback(req, res);

        expect(payment.status).toBe('Failed');
        expect(student.amountPaid).toBe(0);
        expect(student.balance).toBe(20000);
        expect(mockLogAuditAction).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'PAYMENT_AMOUNT_MISMATCH' })
        );
        expect(warnSpy).toHaveBeenCalled();
    });

    test('records a cancellation when the payer cancels in the STK prompt', async () => {
        const { student, payment } = buildStudent();
        mockStudentFindOne.mockResolvedValue(student);
        const req = buildReq();
        req.body.Result = { ResultCode: 1032, CheckoutRequestID: 'ws_CO_123', ResultDesc: 'Request cancelled by user' };

        const res = buildRes();
        await mpesaCallback(req, res);

        expect(payment.status).toBe('Cancelled');
        expect(student.amountPaid).toBe(0);
    });

    test('acknowledges (without state change) callbacks for unknown checkout ids', async () => {
        mockStudentFindOne.mockResolvedValue(null);
        mockTeacherFindOne.mockResolvedValue(null);
        const res = buildRes();

        await mpesaCallback(buildReq(), res);

        expect(res.body).toEqual({ message: 'OK' });
        expect(res.statusCode).toBeNull();
    });

    test('requires Result data and rejects malformed payloads', async () => {
        const res = buildRes();
        await mpesaCallback(buildReq({ body: {} }), res);
        expect(res.statusCode).toBe(400);
    });

    test('a failed callback never downgrades a completed payment', async () => {
        const { student, payment } = buildStudent({ status: 'Verified' });
        mockStudentFindOne.mockResolvedValue(student);
        const req = buildReq();
        req.body.Result = { ResultCode: 1032, CheckoutRequestID: 'ws_CO_123', ResultDesc: 'cancelled' };

        const res = buildRes();
        await mpesaCallback(req, res);

        expect(payment.status).toBe('Verified');
        expect(student.save).not.toHaveBeenCalled();
    });
});
