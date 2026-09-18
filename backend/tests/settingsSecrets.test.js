/**
 * Tests for at-rest protection of per-school credential fields
 * (M-Pesa Daraja keys, SMS provider keys, email password, bank API keys).
 *
 * Contract:
 *  - secret fields are encrypted before persistence,
 *  - every response redacts them (never ships real credentials),
 *  - the redaction is reversible only with the application ENCRYPTION_KEY,
 *  - clients can never overwrite a stored secret with the redaction mask,
 *  - the '__CLEAR__' sentinel deletes a secret.
 */

const {
    CLEAR_SENTINEL,
    REDACTED_VALUE,
    encryptSettingsSecrets,
    redactSettingsSecrets,
    decryptSettingsSecrets,
    mergeSettingsUpdates,
    isRedacted,
} = require('../utils/settingsSecrets');

describe('settingsSecrets', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        process.env = { ...originalEnv, ENCRYPTION_KEY: 'unit-test-encryption-key-32-chars!' };
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    test('encrypts per-school M-Pesa credentials at rest', () => {
        const plain = {
            mpesaSettings: {
                enabled: true,
                consumerKey: 'CONSUMER_KEY_VALUE',
                consumerSecret: 'CONSUMER_SECRET_VALUE',
                passkey: 'PASSKEY_VALUE',
                businessShortCode: '174379',
            },
        };

        const encrypted = encryptSettingsSecrets(plain);

        expect(encrypted.mpesaSettings.consumerKey).not.toBe('CONSUMER_KEY_VALUE');
        expect(encrypted.mpesaSettings.consumerKey.startsWith('enc:')).toBe(true);
        expect(encrypted.mpesaSettings.consumerSecret.startsWith('enc:')).toBe(true);
        expect(encrypted.mpesaSettings.passkey.startsWith('enc:')).toBe(true);
        // non-secret fields are untouched
        expect(encrypted.mpesaSettings.businessShortCode).toBe('174379');
        expect(encrypted.mpesaSettings.enabled).toBe(true);
    });

    test('does not double-encrypt already encrypted values', () => {
        const once = encryptSettingsSecrets({
            mpesaSettings: { consumerKey: 'SECRET' },
        });
        const twice = encryptSettingsSecrets(once);
        expect(twice.mpesaSettings.consumerKey).toBe(once.mpesaSettings.consumerKey);
    });

    test('redaction removes real credentials from API responses', () => {
        const stored = encryptSettingsSecrets({
            mpesaSettings: { consumerKey: 'SECRET', consumerSecret: 'SECRET2', passkey: 'SECRET3', enabled: true },
            smsSettings: { apiKey: 'SMSKEY', apiSecret: 'SMSSECRET' },
            emailSettings: { emailPassword: 'MAILPASS' },
            bankIntegration: { clientSecret: 'CLIENT_SECRET' },
        });

        const response = redactSettingsSecrets(stored);

        expect(response.mpesaSettings.consumerKey).toBe(REDACTED_VALUE);
        expect(response.mpesaSettings.consumerSecret).toBe(REDACTED_VALUE);
        expect(response.mpesaSettings.passkey).toBe(REDACTED_VALUE);
        expect(response.mpesaSettings.enabled).toBe(true);
        expect(response.smsSettings.apiKey).toBe(REDACTED_VALUE);
        expect(response.emailSettings.emailPassword).toBe(REDACTED_VALUE);
        expect(response.bankIntegration.clientSecret).toBe(REDACTED_VALUE);

        expect(JSON.stringify(response)).not.toContain('SECRET');
        expect(JSON.stringify(response)).not.toContain('SMSKEY');
        expect(JSON.stringify(response)).not.toContain('MAILPASS');
    });

    test('decrypt round-trips the original credentials', () => {
        const plain = {
            mpesaSettings: { consumerKey: 'CK', consumerSecret: 'CS', passkey: 'PK' },
        };
        const stored = encryptSettingsSecrets(plain);
        const decrypted = decryptSettingsSecrets(stored);
        expect(decrypted.mpesaSettings.consumerKey).toBe('CK');
        expect(decrypted.mpesaSettings.consumerSecret).toBe('CS');
        expect(decrypted.mpesaSettings.passkey).toBe('PK');
    });

    test('tolerates legacy plaintext credentials (not encrypted)', () => {
        const legacy = { mpesaSettings: { consumerKey: 'PLAIN_KEY' } };
        const decrypted = decryptSettingsSecrets(legacy);
        expect(decrypted.mpesaSettings.consumerKey).toBe('PLAIN_KEY');
    });

    test('merge keeps stored secrets when the client echoes the redaction mask', () => {
        const existing = encryptSettingsSecrets({
            mpesaSettings: { consumerKey: 'REAL_KEY', enabled: true },
        });

        const merged = mergeSettingsUpdates(existing, {
            mpesaSettings: { consumerKey: REDACTED_VALUE, consumerSecret: '', passkey: '', enabled: true },
        });

        // The stored secret survives a round-trip save.
        expect(merged.mpesaSettings.consumerKey).toBe(existing.mpesaSettings.consumerKey);
        expect(decryptSettingsSecrets(merged).mpesaSettings.consumerKey).toBe('REAL_KEY');
    });

    test('merge updates a newly entered secret', () => {
        const existing = encryptSettingsSecrets({ mpesaSettings: { consumerKey: 'OLD' } });
        const merged = mergeSettingsUpdates(existing, {
            mpesaSettings: { consumerKey: 'NEW_KEY' },
        });
        expect(decryptSettingsSecrets(encryptSettingsSecrets(merged)).mpesaSettings.consumerKey).toBe('NEW_KEY');
    });

    test('__CLEAR__ sentinel removes a secret', () => {
        const existing = encryptSettingsSecrets({ mpesaSettings: { consumerKey: 'REAL' } });
        const merged = mergeSettingsUpdates(existing, { mpesaSettings: { consumerKey: CLEAR_SENTINEL } });
        const encrypted = encryptSettingsSecrets(merged);
        expect(encrypted.mpesaSettings.consumerKey).toBe('');
    });

    test('isRedacted detects the mask', () => {
        expect(isRedacted(REDACTED_VALUE)).toBe(true);
        expect(isRedacted('not-a-mask')).toBe(false);
    });
});
