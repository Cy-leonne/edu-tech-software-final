const crypto = require('crypto');

const { validateCallback } = require('../services/mpesaService');

const buildRequest = ({ headers = {}, rawBody = '', query = {}, ip = '10.0.0.1' } = {}) => ({
  headers,
  rawBody,
  query,
  ip,
  connection: { remoteAddress: ip },
});

describe('M-Pesa callback authentication', () => {
  const originalEnv = { ...process.env };
  let warnSpy;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.MPESA_CALLBACK_SECRET;
    delete process.env.MPESA_CALLBACK_IPS;
    delete process.env.MPESA_CALLBACK_REQUIRE_VERIFICATION;
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    process.env = { ...originalEnv };
  });

  test('accepts a matching shared secret header', () => {
    process.env.MPESA_CALLBACK_SECRET = 'callback-secret';
    const result = validateCallback({}, '', buildRequest({ headers: { 'x-mpesa-callback-secret': 'callback-secret' } }));
    expect(result.valid).toBe(true);
    expect(result.method).toBe('shared-secret');
  });

  test('rejects a wrong shared secret', () => {
    process.env.MPESA_CALLBACK_SECRET = 'callback-secret';
    const result = validateCallback({}, '', buildRequest({ headers: { 'x-mpesa-callback-secret': 'guess' } }));
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('invalid-signature');
  });

  test('accepts a valid HMAC-SHA256 body signature', () => {
    process.env.MPESA_CALLBACK_SECRET = 'callback-secret';
    const rawBody = JSON.stringify({ Result: { ResultCode: 0, CheckoutRequestID: 'ws_CO_1' } });
    const signature = crypto.createHmac('sha256', 'callback-secret').update(rawBody).digest('hex');

    const result = validateCallback(
      JSON.parse(rawBody),
      signature,
      buildRequest({ rawBody, headers: { 'x-mpesa-signature': signature } })
    );

    expect(result.valid).toBe(true);
    expect(result.method).toBe('hmac-signature');
  });

  test('rejects a tampered body whose signature no longer matches', () => {
    process.env.MPESA_CALLBACK_SECRET = 'callback-secret';
    const originalBody = JSON.stringify({ Result: { ResultCode: 0 } });
    const signature = crypto.createHmac('sha256', 'callback-secret').update(originalBody).digest('hex');
    const tamperedBody = JSON.stringify({ Result: { ResultCode: 0, Amount: 999999 } });

    const result = validateCallback(
      JSON.parse(tamperedBody),
      signature,
      buildRequest({ rawBody: tamperedBody, headers: { 'x-mpesa-signature': signature } })
    );

    expect(result.valid).toBe(false);
  });

  test('enforces the IP allow-list when configured', () => {
    process.env.MPESA_CALLBACK_IPS = '196.201.214.200,196.201.214.206';

    expect(validateCallback({}, '', buildRequest({ ip: '196.201.214.200' })).valid).toBe(true);
    expect(validateCallback({}, '', buildRequest({ ip: '203.0.113.9' })).valid).toBe(false);
  });

  test('fails closed when verification is required but nothing is configured', () => {
    process.env.MPESA_CALLBACK_REQUIRE_VERIFICATION = 'true';
    const result = validateCallback({}, '', buildRequest());
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('verification-required');
  });

  test('unverified callbacks are accepted only with an explicit warning (compat mode)', () => {
    const result = validateCallback({}, '', buildRequest());
    expect(result.valid).toBe(true);
    expect(result.method).toBe('unverified');
    expect(warnSpy).toHaveBeenCalled();
  });
});
