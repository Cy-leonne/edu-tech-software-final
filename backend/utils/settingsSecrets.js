/**
 * At-rest protection for per-school credential fields stored on the `settings`
 * document (M-Pesa Daraja keys, SMS provider keys, email provider passwords,
 * bank/API integration keys).
 *
 * - `encryptSettingsSecrets`  : called before persisting. Only non-empty values
 *   are encrypted (so a round-trip save of redacted responses never clobbers
 *   the existing secret). The literal sentinel `__CLEAR__` erases a secret.
 * - `redactSettingsSecrets`   : called before returning the settings document to
 *   an API consumer. Secret fields are replaced with `'••••••••'` (or removed),
 *   so real credentials never leave the server and never end up in logs.
 * - `decryptSettingsSecrets`  : called when the credentials are actually needed
 *   (i.e. when initiating an M-Pesa STK push). Values that are not encrypted
 *   (legacy plaintext in existing deployments) are returned unchanged, keeping
 *   previously stored credentials working after the upgrade.
 */

const { encryptText, decryptText, isEncrypted } = require('./encryption');

const CLEAR_SENTINEL = '__CLEAR__';
const REDACTED_VALUE = '••••••••';

/**
 * Map of section name -> credential field names. Keep in sync with
 * models/settingsSchema.js.
 */
const SECRET_FIELDS = {
    mpesaSettings: ['consumerKey', 'consumerSecret', 'passkey'],
    smsSettings: ['apiKey', 'apiSecret'],
    emailSettings: ['emailPassword', 'emailAPIKey'],
    bankIntegration: ['apiKey', 'clientId', 'clientSecret'],
};

const visitSecretFields = (settings, visitor) => {
    if (!settings || typeof settings !== 'object') return settings;
    const clone = { ...settings };
    for (const [section, fields] of Object.entries(SECRET_FIELDS)) {
        if (!clone[section] || typeof clone[section] !== 'object') continue;
        const sectionClone = { ...clone[section] };
        for (const field of fields) {
            const value = sectionClone[field];
            sectionClone[field] = visitor(sectionClone[field], section, field);
        }
        clone[section] = sectionClone;
    }
    return clone;
};

/** Encrypts secret values before they are persisted. */
const encryptSettingsSecrets = (settings) =>
    visitSecretFields(settings, (value) => {
        if (value === CLEAR_SENTINEL) return '';
        if (value === null || value === undefined) return value;
        if (typeof value !== 'string') return value;
        if (value === '' || value === REDACTED_VALUE) return value; // unchanged
        return encryptText(value);
    });

/** Masks secret values before the document is returned over the API. */
const redactSettingsSecrets = (settings) =>
    visitSecretFields(settings, (value) => {
        if (value === null || value === undefined || value === '') return value;
        return REDACTED_VALUE;
    });

/**
 * Returns a copy with secret fields decrypted (for provider integrations).
 * Values that are not encrypted are returned as-is (legacy plaintext).
 */
const decryptSettingsSecrets = (settings) =>
    visitSecretFields(settings, (value) => {
        if (value === null || value === undefined || value === '') return value;
        if (typeof value !== 'string') return value;
        return isEncrypted(value) ? decryptText(value) : value;
    });

/** True when a secret value is a redaction mask (i.e. unchanged by the client). */
const isRedacted = (value) => value === REDACTED_VALUE;

/**
 * Merges client settings updates into the existing settings object while
 * protecting secrets: when the client echoes back the redaction mask (or an
 * empty string) for a credential field, the existing stored value is kept so a
 * routine form save can never erase a secret the admin has not re-entered.
 *
 * @param {object} existing - current settings (plain object / document.toObject())
 * @param {object} updates  - incoming client payload
 * @returns {object} merged plain object
 */
const mergeSettingsUpdates = (existing, updates) => {
    const base = { ...(existing && typeof existing === 'object' ? existing : {}) };
    if (!updates || typeof updates !== 'object') return base;

    for (const [key, value] of Object.entries(updates)) {
        if (key === 'school' || key === '_id' || key === 'updatedAt' || key === 'createdAt' || key === 'updatedBy') continue;

        if (value && typeof value === 'object' && !Array.isArray(value)) {
            // Section object merge.
            const section = { ...(base[key] && typeof base[key] === 'object' ? base[key] : {}) };
            for (const [field, fieldValue] of Object.entries(value)) {
                section[field] = fieldValue;
            }
            base[key] = section;
        } else {
            base[key] = value;
        }
    }

    // Protect credential fields from redacted/empty overwrites.
    for (const [section, fields] of Object.entries(SECRET_FIELDS)) {
        if (!base[section] || typeof base[section] !== 'object') continue;
        for (const field of fields) {
            const incoming = updates?.[section]?.[field];
            if (incoming === undefined) continue;          // field not touched
            if (incoming === REDACTED_VALUE || incoming === '') {
                base[section][field] = existing?.[section]?.[field] ?? '';
            }
        }
    }

    return base;
};

module.exports = {
    CLEAR_SENTINEL,
    REDACTED_VALUE,
    SECRET_FIELDS,
    encryptSettingsSecrets,
    redactSettingsSecrets,
    decryptSettingsSecrets,
    mergeSettingsUpdates,
    isRedacted,
};
