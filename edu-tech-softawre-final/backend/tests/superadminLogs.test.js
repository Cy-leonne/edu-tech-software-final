
const mockFindById = jest.fn();
const mockSystemLogFind = jest.fn();
const mockCountDocuments = jest.fn();

jest.mock('../models/adminSchema.js', () => ({
  findById: mockFindById,
}));

jest.mock('../models/systemLogSchema.js', () => ({
  find: mockSystemLogFind,
  countDocuments: mockCountDocuments,
}));

jest.mock('../models/schoolSchema.js', () => ({}));
jest.mock('../models/subscriptionSchema.js', () => ({}));
jest.mock('../models/academicYearSchema.js', () => ({}));
jest.mock('../models/studentSchema.js', () => ({}));
jest.mock('../models/backupSchema.js', () => ({}));
jest.mock('../services/emailService.js', () => ({
  sendAdminApprovalEmail: jest.fn(),
  sendSchoolStatusChangeEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));
jest.mock('../controllers/settings-controller.js', () => ({
  initializeSettings: jest.fn(),
  initializeSecuritySettings: jest.fn(),
}));

const { getSystemLogs } = require('../controllers/superadmin-controller.js');

describe('getSystemLogs access control', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('allows school admins to view system logs', async () => {
    mockFindById.mockResolvedValue({ _id: 'admin-1', role: 'Admin' });

    const chainableQuery = {
      populate: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([{ _id: 'log-1' }]),
    };
    mockSystemLogFind.mockReturnValue(chainableQuery);
    mockCountDocuments.mockResolvedValue(1);

    const req = {
      get: jest.fn().mockReturnValue('admin-1'),
      query: {},
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };

    await getSystemLogs(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'System logs retrieved successfully',
      logs: expect.any(Array),
    }));
  });

  test('returns fallback system logs when the database is unavailable', async () => {
    mockFindById.mockResolvedValue({ _id: 'admin-1', role: 'Admin' });
    mockSystemLogFind.mockImplementation(() => {
      throw new Error('Mongo not connected');
    });
    mockCountDocuments.mockImplementation(() => {
      throw new Error('Mongo not connected');
    });

    const req = {
      get: jest.fn().mockReturnValue('admin-1'),
      query: {},
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };

    await getSystemLogs(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'System logs retrieved successfully',
      logs: expect.any(Array),
    }));
  });
});
