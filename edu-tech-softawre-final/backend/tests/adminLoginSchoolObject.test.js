
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const mockAdminFindOne = jest.fn();
const mockSchoolFindOne = jest.fn();
const mockSecuritySettingsFindOne = jest.fn();

jest.mock('../models/adminSchema', () => ({
  findOne: mockAdminFindOne,
  findById: jest.fn(),
  find: jest.fn(),
}));

jest.mock('../models/schoolSchema', () => ({
  findOne: mockSchoolFindOne,
}));

jest.mock('../models/securitySettingsSchema', () => ({
  findOne: mockSecuritySettingsFindOne,
}));

jest.mock('../models/sclassSchema', () => ({}));
jest.mock('../models/studentSchema', () => ({}));
jest.mock('../models/teacherSchema', () => ({}));
jest.mock('../models/subjectSchema', () => ({}));
jest.mock('../models/noticeSchema', () => ({}));
jest.mock('../models/complainSchema', () => ({}));

jest.mock('../services/emailService', () => ({
  sendAdminApprovalEmail: jest.fn(),
  sendAdminRejectionEmail: jest.fn(),
  sendResetPasswordLink: jest.fn(),
}));

jest.mock('../utils/validation', () => ({
  validateAdminInput: jest.fn(),
  validateAdminUpdateInput: jest.fn(),
  validatePassword: jest.fn(),
}));

jest.mock('../utils/twoFactorAuth', () => ({
  generateAndSendEmailOtp: jest.fn(),
  generateAndSendSmsOtp: jest.fn(),
  verifyEmailOtp: jest.fn(),
  verifySmsOtp: jest.fn(),
  verifyTotpToken: jest.fn(),
}));

jest.mock('../utils/authToken', () => ({
  issueAdminToken: jest.fn(() => 'token'),
}));

const { adminLogIn } = require('../controllers/admin-controller');

describe('adminLogIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sanitizes a populated school object before checking school suspension status', async () => {
    const schoolId = new mongoose.Types.ObjectId().toString();
    const hashedPassword = await bcrypt.hash('Password123', 10);

    const admin = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Test Admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'Admin',
      approved: true,
      school: { _id: schoolId },
      schoolName: 'Test School',
      failedLoginAttempts: 0,
      lockoutUntil: null,
      disabled: false,
      save: jest.fn().mockResolvedValue(true),
      toObject: () => ({ ...admin, password: undefined }),
    };

    mockAdminFindOne.mockResolvedValue(admin);
    mockSecuritySettingsFindOne.mockResolvedValue({
      accountLockout: { enabled: false },
      twoFactorAuth: { enabled: false },
    });
    mockSchoolFindOne.mockResolvedValue({
      status: 'Suspended',
      statusChangeReason: 'Suspension for testing',
      schoolName: 'Test School',
    });

    const req = {
      body: { email: 'admin@example.com', password: 'Password123' },
      path: '/AdminLogin',
      ip: '127.0.0.1',
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    };

    await adminLogIn(req, res);

    expect(mockSchoolFindOne).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([
          expect.objectContaining({ _id: schoolId }),
          expect.objectContaining({ schoolAdmin: schoolId }),
        ]),
      })
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
