const crypto = require('crypto');

const {
  GENERIC_RESET_REQUEST_MESSAGE,
  buildResetUrl,
  clearResetToken,
  createResetToken,
  findUserByResetToken,
  getResetTokenTtlMinutes,
  hashResetToken,
  maskResetLinks,
  maskToken,
  safeCompare,
  validateNewPassword,
} = require('../utils/passwordReset');

describe('passwordReset utilities', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('creates a high-entropy token and stores only its SHA-256 hash', () => {
    const { token, hashedToken, expiresAt } = createResetToken();

    expect(token).toHaveLength(64);
    expect(hashedToken).toBe(crypto.createHash('sha256').update(token).digest('hex'));
    expect(hashedToken).not.toBe(token);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  test('two reset tokens are never identical', () => {
    const first = createResetToken();
    const second = createResetToken();
    expect(first.token).not.toBe(second.token);
    expect(first.hashedToken).not.toBe(second.hashedToken);
  });

  test('token lifetime is configurable and bounded', () => {
    process.env.PASSWORD_RESET_TTL_MINUTES = '15';
    expect(getResetTokenTtlMinutes()).toBe(15);

    process.env.PASSWORD_RESET_TTL_MINUTES = '99999';
    expect(getResetTokenTtlMinutes()).toBe(1440);

    delete process.env.PASSWORD_RESET_TTL_MINUTES;
    expect(getResetTokenTtlMinutes()).toBe(60);
  });

  test('findUserByResetToken looks up the hash, requires an unexpired token', async () => {
    const { token, hashedToken, expiresAt } = createResetToken();
    const Model = {
      findOne: jest.fn().mockResolvedValue({ _id: 'user-1' }),
    };

    await findUserByResetToken(Model, token);

    expect(Model.findOne).toHaveBeenCalledWith({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: expect.any(Date) },
    });
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  test('findUserByResetToken rejects missing/short tokens without querying', async () => {
    const Model = { findOne: jest.fn() };

    await expect(findUserByResetToken(Model, '')).resolves.toBeNull();
    await expect(findUserByResetToken(Model, 'too-short')).resolves.toBeNull();
    expect(Model.findOne).not.toHaveBeenCalled();
  });

  test('clearResetToken removes the token so it cannot be replayed', () => {
    const user = { resetPasswordToken: 'abc', resetPasswordExpires: new Date() };
    clearResetToken(user);
    expect(user.resetPasswordToken).toBe('');
    expect(user.resetPasswordExpires).toBeNull();
  });

  test('buildResetUrl uses the configured origin and encodes the token', () => {
    process.env.FRONTEND_URL = 'https://edutechnologies.co.ke/';
    const url = buildResetUrl('Student', 'tok en/with?chars');
    expect(url.startsWith('https://edutechnologies.co.ke/Student/reset-password/')).toBe(true);
    expect(url).not.toContain('tok en/with?chars');
  });

  test('buildResetUrl never follows an untrusted/unsupported base url (no open redirect)', () => {
    process.env.FRONTEND_URL = 'javascript:alert(1)';
    expect(buildResetUrl('Admin', 'x'.repeat(64)).startsWith('http://localhost:3000/Admin/reset-password/')).toBe(true);

    process.env.FRONTEND_URL = 'http://a.example.com,http://b.example.com';
    expect(buildResetUrl('Admin', 'y'.repeat(64)).startsWith('http://a.example.com/')).toBe(true);
  });

  test('buildResetUrl falls back to a safe role segment', () => {
    process.env.FRONTEND_URL = 'https://school.example.com';
    expect(buildResetUrl('../../etc/passwd', 'z'.repeat(64))).toContain('/Admin/reset-password/');
  });

  test('password policy is enforced for new passwords', () => {
    expect(validateNewPassword('short').valid).toBe(false);
    expect(validateNewPassword('passwordwithoutnumber').valid).toBe(false);
    expect(validateNewPassword('Password1').valid).toBe(true);
  });

  test('secret comparison is timing safe and length aware', () => {
    expect(safeCompare('secret-value', 'secret-value')).toBe(true);
    expect(safeCompare('secret-value', 'secret-valuf')).toBe(false);
    expect(safeCompare('', '')).toBe(false);
  });

  test('masking helpers never expose full tokens', () => {
    const token = 'a'.repeat(64);
    expect(maskToken(token)).not.toContain(token);
    const masked = maskResetLinks(`<a href="https://x.test/Admin/reset-password/${token}">reset</a>`);
    expect(masked).not.toContain(token);
    expect(masked).toContain('reset-password/');
  });

  test('the generic response does not disclose account existence', () => {
    expect(GENERIC_RESET_REQUEST_MESSAGE).toMatch(/if an account exists/i);
  });
});
