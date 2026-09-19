
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index'); // Express app entrypoint (assumes backend/index.js or backend/index exports app)
const Admin = require('../models/adminSchema');

/**
 * Integration tests for password reset flow
 * - Creates temporary Accountant and HR accounts
 * - Calls RequestPasswordReset endpoint
 * - Confirms token saved to DB
 * - Calls ResetPassword endpoint with token
 * - Confirms password changed
 *
 * NOTE: these tests require a test MongoDB instance and an Express app exported from backend/index.js
 */

describe('Password reset integration', () => {
  let server;
  beforeAll(async () => {
    // Connect to test DB
    const mongoUrl = process.env.MONGO_TEST_URL || 'mongodb://127.0.0.1:27017/sms_test';
    await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
    server = app.listen(process.env.TEST_PORT || 5500);
  }, 20000);

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
    if (server && server.close) server.close();
  });

  test('Accountant password reset flow', async () => {
    // create accountant
    const acc = new Admin({ name: 'Acct One', email: 'acct1@test.local', password: 'Password1', role: 'Accountant', roles: ['Accountant'], approved: true });
    await acc.save();

    // request reset
    const reqRes = await request(server)
      .post('/Accountant/RequestPasswordReset')
      .send({ email: 'acct1@test.local' })
      .expect(200);

    expect(reqRes.body.message).toMatch(/Password reset link sent/i);

    const updated = await Admin.findOne({ email: 'acct1@test.local' }).lean();
    expect(updated.resetPasswordToken).toBeTruthy();

    // reset password
    const token = updated.resetPasswordToken;
    const newPass = 'NewPass123';

    const resetRes = await request(server)
      .post(`/Accountant/ResetPassword/${token}`)
      .send({ password: newPass })
      .expect(200);

    expect(resetRes.body.message).toMatch(/Password reset successfully/i);

    const after = await Admin.findOne({ email: 'acct1@test.local' });
    // password should be hashed and not equal to plaintext
    expect(after.password).not.toBe(newPass);
  }, 20000);

  test('HR password reset flow', async () => {
    const hr = new Admin({ name: 'HR One', email: 'hr1@test.local', password: 'Password1', role: 'HR', roles: ['HR'], approved: true });
    await hr.save();

    const reqRes = await request(server)
      .post('/HR/RequestPasswordReset')
      .send({ email: 'hr1@test.local' })
      .expect(200);

    expect(reqRes.body.message).toMatch(/Password reset link sent/i);

    const updated = await Admin.findOne({ email: 'hr1@test.local' }).lean();
    expect(updated.resetPasswordToken).toBeTruthy();

    const token = updated.resetPasswordToken;
    const newPass = 'HrNewPass1';

    const resetRes = await request(server)
      .post(`/HR/ResetPassword/${token}`)
      .send({ password: newPass })
      .expect(200);

    expect(resetRes.body.message).toMatch(/Password reset successfully/i);

    const after = await Admin.findOne({ email: 'hr1@test.local' });
    expect(after.password).not.toBe(newPass);
  }, 20000);
});
