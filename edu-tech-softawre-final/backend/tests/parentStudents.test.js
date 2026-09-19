
const mockStudentFind = jest.fn();

jest.mock('../models/parentSchema', () => ({}));
jest.mock('../models/studentSchema', () => ({
  find: mockStudentFind,
}));
jest.mock('../middleware/schoolAccess', () => ({
  verifyEntityBelongsToAdminSchool: jest.fn(),
}));
jest.mock('../services/mpesaService', () => ({
  initiateStkPush: jest.fn(),
  queryStkPushStatus: jest.fn(),
}));

const { getParentStudents } = require('../controllers/parent-controller');

describe('getParentStudents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns children with an id field for the portal UI', async () => {
    const student = {
      _id: 'student-1',
      name: 'Amina',
      admissionNo: 'ADM-001',
    };
    mockStudentFind.mockReturnValue({
      select: jest.fn().mockResolvedValue([student]),
    });

    const req = { params: { parentEmail: 'parent@example.com' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    };

    await getParentStudents(req, res);

    expect(res.send).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'student-1' })
      ])
    );
  });
});
