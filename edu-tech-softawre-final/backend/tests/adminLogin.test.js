
const mockAdminFindOne = jest.fn();
const mockAdminSave = jest.fn();
const mockBcryptCompare = jest.fn();

jest.mock('mongoose', () => {
  // Minimal mongoose mock that supports `new mongoose.Schema(...)` and `Schema.Types.ObjectId`
  function Schema(definition) {
    this.definition = definition;
  }
  Schema.Types = { ObjectId: function() {} };

  return {
    connection: { readyState: 1 },
    Schema,
  };
});

jest.mock('../models/adminSchema.js', () => ({
  findOne: mockAdminFindOne,
  countDocuments: jest.fn().mockResolvedValue(1),
}));

jest.mock('../models/securitySettingsSchema', () => ({
  findOne: jest.fn().mockResolvedValue(null),
}));

// Mock other model modules to avoid executing schema definitions during unit tests
jest.mock('../models/sclassSchema.js', () => ({}));
jest.mock('../models/studentSchema.js', () => ({}));
jest.mock('../models/teacherSchema.js', () => ({}));
jest.mock('../models/subjectSchema.js', () => ({}));
jest.mock('../models/noticeSchema.js', () => ({}));
jest.mock('../models/complainSchema.js', () => ({}));

jest.mock('../middleware/schoolAccess.js', () => ({
  getAdminIdFromReq: jest.fn(),
}));

jest.mock('../utils/twoFactorAuth.js', () => ({
  generateAndSendEmailOtp: jest.fn(),
  generateAndSendSmsOtp: jest.fn(),
  verifyEmailOtp: jest.fn(),
  verifySmsOtp: jest.fn(),
  verifyTotpToken: jest.fn(),
}));

jest.mock('../services/emailService.js', () => ({
  sendAdminApprovalEmail: jest.fn(),
  sendAdminRejectionEmail: jest.fn(),
  sendResetPasswordLink: jest.fn(),
}));

jest.mock('bcrypt', () => ({
  compare: mockBcryptCompare,
  hash: jest.fn(),
  genSalt: jest.fn(),
  // synchronous helpers used by testdb.js
  genSaltSync: jest.fn(() => 'testsalt'),
  hashSync: jest.fn(() => 'hashed-password-sync'),
}));

const { adminLogIn } = require('../controllers/admin-controller');

describe('adminLogIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBcryptCompare.mockResolvedValue(true);
  });

  test('logs in successfully when the email is stored with different casing', async () => {
    const adminDoc = {
      _id: 'admin-1',
      name: 'Admin User',
      email: 'Admin@Example.com',
      role: 'Admin',
      approved: true,
      password: 'hashed-password',
      save: mockAdminSave.mockResolvedValue(true),
      failedLoginAttempts: 0,
      lockoutUntil: null,
    };

    mockAdminFindOne.mockImplementation((query) => {
      if (query.email && query.email.$regex) {
        return Promise.resolve(adminDoc);
      }
      return Promise.resolve(null);
    });

    const req = {
      body: { email: 'admin@example.com', password: 'password' },
      path: '/AdminLogin',
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    };

    await adminLogIn(req, res);

    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'Admin@Example.com', role: 'Admin' })
    );
  });
});
