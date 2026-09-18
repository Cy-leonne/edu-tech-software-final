
const mongoose = require('mongoose');

const mockEmployeeFindById = jest.fn();
const mockSchoolFindById = jest.fn();

jest.mock('../models/employeeSchema', () => ({
  findById: mockEmployeeFindById,
}));

jest.mock('../models/schoolSchema', () => ({
  findById: mockSchoolFindById,
}));

jest.mock('../models/adminSchema', () => ({
  findById: jest.fn(),
}));

jest.mock('../utils/validation', () => ({
  validateEmployee: jest.fn(),
}));

jest.mock('../utils/auditLogger', () => ({
  logAuditAction: jest.fn(),
}));

jest.mock('../services/emailService', () => ({
  sendEmail: jest.fn(),
}));

jest.mock('../services/smsService', () => ({
  sendSMS: jest.fn(),
}));

jest.mock('../models/messageSchema', () => ({}));
jest.mock('../utils/employeePayload', () => ({
  sanitizeEmployeePayload: jest.fn((payload) => payload),
}));

const { approveEmployeePayment } = require('../controllers/employee-controller');

describe('approveEmployeePayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('debits the school account and credits the employee account when an admin approves the payment', async () => {
    const schoolId = new mongoose.Types.ObjectId().toString();
    const employee = {
      _id: 'emp-1',
      school: schoolId,
      accountBalance: 100,
      accountLedger: [],
      paymentHistory: [{
        grossAmount: 500,
        netAmount: 500,
        status: 'Processed',
        approvalStatus: 'Pending',
      }],
      save: jest.fn().mockResolvedValue(true),
    };

    const school = {
      _id: schoolId,
      accountBalance: 1000,
      accountLedger: [],
      save: jest.fn().mockResolvedValue(true),
    };

    school.select = jest.fn().mockResolvedValue(school);
    mockSchoolFindById.mockImplementation(() => school);
    mockEmployeeFindById.mockResolvedValue(employee);

    const req = {
      params: { id: 'emp-1', paymentIndex: '0' },
      body: { approvedBy: 'admin-1' },
      userId: 'admin-1',
      user: { role: 'Admin', name: 'Admin User' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };

    await approveEmployeePayment(req, res);

    expect(employee.paymentHistory[0].status).toBe('Paid');
    expect(employee.paymentHistory[0].approvalStatus).toBe('Approved');
    expect(employee.accountBalance).toBe(600);
    expect(school.accountBalance).toBe(500);
    expect(employee.accountLedger).toHaveLength(1);
    expect(school.accountLedger).toHaveLength(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
