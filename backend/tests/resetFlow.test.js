
const request = require('supertest');
const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Integration tests for the password reset flow (Admin / Accountant / HR).
 *
 * Requires a MongoDB instance. Enable with:
 *   RUN_MONGO_TESTS=true MONGO_TEST_URL=mongodb://127.0.0.1:27017/sms_test npm test
 *
 * The email service is mocked so the reset link (and therefore the raw token)
 * can be captured: with hashed token storage the database only ever contains the
 * SHA-256 hash, never the raw token.
 */

const describeWithMongo = process.env.RUN_MONGO_TESTS === 'true' ? describe : describe.skip;

const capturedResetLinks = [];

jest.mock('../services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true, provider: 'test' }),
  sendResetPasswordLink: jest.fn(async (email, name, resetUrl) => {
    capturedResetLinks.push({ email, resetUrl });
    return { success: true, provider: 'test' };
  }),
  sendAdminApprovalEmail: jest.fn(),
  sendAdminRejectionEmail: jest.fn(),
  sendSchoolStatusChangeEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendPasswordChangedEmail: jest.fn(),
}));

const app = require('../index');
const Admin = require('../models/adminSchema');

const extractToken = (resetUrl) => String(resetUrl).split('/').pop();
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

describeWithMongo('Password reset integration', () => {
  let server;

  beforeAll(async () => {
    const mongoUrl = process.env.MONGO_TEST_URL || 'mongodb://127.0.0.1:27017/sms_test';
    await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 5000 });
    server = app.listen(process.env.TEST_PORT || 5500);
  }, 30000);

  afterAll(async () => {
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.disconnect();
    if (server && server.close) server.close();
  });

  beforeEach(() => {
    capturedResetLinks.length = 0;
  });

  const runResetFlow = async ({ email, name, role, requestPath, resetPathPrefix }) => {
    const account = new Admin({
      name,
      email,
      password: 'Password1',
      role,
      roles: [role],
      approved: true,
    });
    await account.save();

    const requestRes = await request(server)
      .post(requestPath)
      .send({ email })
      .expect(200);

    // Generic message: works for existing accounts...
    expect(requestRes.body.message).toMatch(/password reset link has been sent/i);
    // ...and the delivery result is not disclosed.
    expect(requestRes.body.emailResult).toBeUndefined();

    const stored = await Admin.findOne({ email }).lean();
    expect(stored.resetPasswordToken).toBeTruthy();
    expect(stored.resetPasswordExpires).toBeInstanceOf(Date);

    const link = capturedResetLinks.find((entry) => entry.email === email);
    expect(link).toBeTruthy();
    const token = extractToken(link.resetUrl);

    // The database stores only the hash of the token, and the hash matches.
    expect(stored.resetPasswordToken).toBe(sha256(token));
    expect(stored.resetPasswordToken).not.toBe(token);
    expect(link.resetUrl.includes(`/${resetPathPrefix}/reset-password/`)).toBe(true);

    const resetRes = await request(server)
      .post(`${resetPathPrefix === 'Accountant' ? '/Accountant/ResetPassword' : resetPathPrefix === 'HR' ? '/HR/ResetPassword' : '/Admin/ResetPassword'}/${token}`)
      .send({ password: 'NewPass123' })
      .expect(200);

    expect(resetRes.body.message).toMatch(/Password reset successfully/i);

    const after = await Admin.findOne({ email });
    expect(after.resetPasswordToken).toBe('');
    expect(after.resetPasswordExpires).toBeNull();

    // Token is single use: replaying it must fail.
    await request(server)
      .post(`${resetPathPrefix === 'Accountant' ? '/Accountant/ResetPassword' : resetPathPrefix === 'HR' ? '/HR/ResetPassword' : '/Admin/ResetPassword'}/${token}`)
      .send({ password: 'AnotherPass123' })
      .expect(400);

    return { token };
  };

  test('Accountant password reset flow', async () => {
    await runResetFlow({
      email: 'acct1@test.local',
      name: 'Acct One',
      role: 'Accountant',
      requestPath: '/Accountant/RequestPasswordReset',
      resetPathPrefix: 'Accountant',
    });
  });

  test('HR password reset flow', async () => {
    await runResetFlow({
      email: 'hr1@test.local',
      name: 'HR One',
      role: 'HR',
      requestPath: '/HR/RequestPasswordReset',
      resetPathPrefix: 'HR',
    });
  });

  test('unknown accounts receive the same generic response (no enumeration)', async () => {
    const response = await request(server)
      .post('/Admin/RequestPasswordReset')
      .send({ email: 'does-not-exist@test.local' })
      .expect(200);

    expect(response.body.message).toMatch(/password reset link has been sent/i);
  });

  test('expired tokens are rejected', async () => {
    const email = 'expired@test.local';
    await new Admin({
      name: 'Expired Admin',
      email,
      password: 'Password1',
      role: 'Admin',
      roles: ['Admin'],
      approved: true,
    }).save();

    const expiredToken = crypto.randomBytes(32).toString('hex');
    await Admin.updateOne({ email }, {
      resetPasswordToken: sha256(expiredToken),
      resetPasswordExpires: new Date(Date.now() - 1000),
    });

    const response = await request(server)
      .post(`/Admin/ResetPassword/${expiredToken}`)
      .send({ password: 'NewPass123' })
      .expect(400);

    expect(response.body.message).toMatch(/Invalid or expired token/i);
  });

  test('weak passwords are rejected by the reset endpoint', async () => {
    const email = 'weakpass@test.local';
    await new Admin({
      name: 'Weak Admin',
      email,
      password: 'Password1',
      role: 'Admin',
      roles: ['Admin'],
      approved: true,
    }).save();

    await request(server)
      .post('/Admin/RequestPasswordReset')
      .send({ email })
      .expect(200);

    const link = capturedResetLinks.find((entry) => entry.email === email);
    const token = extractToken(link.resetUrl);

    const response = await request(server)
      .post(`/Admin/ResetPassword/${token}`)
      .send({ password: 'abc' })
      .expect(400);

    expect(response.body.message).toMatch(/password/i);
  });
});
