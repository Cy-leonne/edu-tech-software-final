const axios = require('axios');

jest.mock('axios');

const emailService = require('../services/emailService');

describe('emailService – SendGrid integration', () => {
  const originalEnv = { ...process.env };
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.env = { ...originalEnv };
  });

  test('selects SendGrid when a valid API key is configured', () => {
    process.env.EMAIL_PROVIDER = 'sendgrid';
    process.env.SENDGRID_API_KEY = 'SG.real-looking-key';
    process.env.EMAIL_FROM = 'no-reply@school.test';

    expect(emailService.isSendGridConfigured()).toBe(true);
    expect(emailService.resolveProvider()).toBe('sendgrid');
  });

  test('ignores placeholder credentials and falls back to demo mode', () => {
    process.env.EMAIL_PROVIDER = 'sendgrid';
    process.env.SENDGRID_API_KEY = 'SG.your-sendgrid-api-key';
    process.env.EMAIL_FROM = 'your-email@example.com';
    delete process.env.EMAIL_HOST;

    expect(emailService.isSendGridConfigured()).toBe(false);
    expect(emailService.resolveProvider()).toBe('demo');
  });

  test('posts a well formed v3 mail/send payload and returns the message id', async () => {
    process.env.EMAIL_PROVIDER = 'sendgrid';
    process.env.SENDGRID_API_KEY = 'SG.real-looking-key';
    process.env.EMAIL_FROM = 'no-reply@school.test';
    process.env.EMAIL_FROM_NAME = 'School Management System';

    axios.post.mockResolvedValue({ status: 202, headers: { 'x-message-id': 'msg-123' } });

    const result = await emailService.sendEmail('parent@school.test', 'Subject line', '<p>Body</p>');

    expect(axios.post).toHaveBeenCalledTimes(1);
    const [url, payload, config] = axios.post.mock.calls[0];
    expect(url).toContain('sendgrid.com');
    expect(config.headers.Authorization).toBe('Bearer SG.real-looking-key');
    expect(payload.personalizations[0].to[0].email).toBe('parent@school.test');
    expect(payload.from.email).toBe('no-reply@school.test');
    expect(payload.subject).toBe('Subject line');
    expect(payload.content[0]).toEqual({ type: 'text/html', value: '<p>Body</p>' });

    expect(result).toEqual({ success: true, provider: 'sendgrid', messageId: 'msg-123' });
  });

  test('supports SendGrid sandbox mode and custom API base url', async () => {
    process.env.EMAIL_PROVIDER = 'sendgrid';
    process.env.SENDGRID_API_KEY = 'SG.real-looking-key';
    process.env.EMAIL_FROM = 'no-reply@school.test';
    process.env.SENDGRID_SANDBOX_MODE = 'true';
    process.env.SENDGRID_API_BASE_URL = 'https://api.eu.sendgrid.com/v3/mail/send';

    axios.post.mockResolvedValue({ status: 202, headers: {} });

    await emailService.sendEmail('parent@school.test', 'Subject', '<p>Body</p>');

    const [url, payload] = axios.post.mock.calls[0];
    expect(url).toBe('https://api.eu.sendgrid.com/v3/mail/send');
    expect(payload.mail_settings.sandbox_mode.enable).toBe(true);
  });

  test('rejects invalid recipient addresses without calling the provider', async () => {
    process.env.EMAIL_PROVIDER = 'sendgrid';
    process.env.SENDGRID_API_KEY = 'SG.real-looking-key';
    process.env.EMAIL_FROM = 'no-reply@school.test';

    const result = await emailService.sendEmail('not-an-email', 'Subject', '<p>Body</p>');

    expect(axios.post).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });

  test('provider errors are reported without leaking provider internals', async () => {
    process.env.EMAIL_PROVIDER = 'sendgrid';
    process.env.SENDGRID_API_KEY = 'SG.real-looking-key';
    process.env.EMAIL_FROM = 'no-reply@school.test';

    axios.post.mockRejectedValue(new Error('Request failed with status code 401 for url https://api.sendgrid.com/v3/mail/send'));

    const result = await emailService.sendEmail('parent@school.test', 'Subject', '<p>Body</p>');

    expect(result).toEqual({ success: false, error: 'Email delivery failed' });
  });

  test('escapes user controlled values in HTML emails', async () => {
    process.env.EMAIL_PROVIDER = 'sendgrid';
    process.env.SENDGRID_API_KEY = 'SG.real-looking-key';
    process.env.EMAIL_FROM = 'no-reply@school.test';
    axios.post.mockResolvedValue({ status: 202, headers: {} });

    await emailService.sendAdminRejectionEmail(
      'admin@school.test',
      '<img src=x onerror=alert(1)>',
      '<script>alert("x")</script>'
    );

    const payload = axios.post.mock.calls[0][1];
    const html = payload.content[0].value;
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
  });

  test('demo mode never writes reset tokens to the log', async () => {
    process.env.EMAIL_PROVIDER = 'demo';
    const rawToken = 'f'.repeat(64);

    const result = await emailService.sendResetPasswordLink(
      'parent@school.test',
      'Parent',
      `https://school.test/Student/reset-password/${rawToken}`
    );

    expect(result.provider).toBe('demo');
    const logged = consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(logged).not.toContain(rawToken);
  });
});
