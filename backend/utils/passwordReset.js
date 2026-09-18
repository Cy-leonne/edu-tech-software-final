
/**
 * Shared password-reset helpers.
 *
 * Security properties implemented here (used by Admin, SuperAdmin, Accountant,
 * HR, Student and Teacher reset flows):
 *  - cryptographically secure random tokens (crypto.randomBytes)
 *  - only a SHA-256 hash of the token is persisted, never the raw token
 *  - short lived tokens (default 60 minutes, configurable)
 *  - single use tokens (cleared as soon as they are consumed)
 *  - tokens are never logged in clear text
 *  - reset URLs are built from a validated, configured frontend origin only
 *    (no attacker controlled redirects / no open redirect)
 */

const crypto = require('crypto');
const { validatePassword } = require('./validation');

const DEFAULT_TTL_MINUTES = 60;
const MAX_TTL_MINUTES = 24 * 60;

const getResetTokenTtlMinutes = () => {
    const configured = Number(process.env.PASSWORD_RESET_TTL_MINUTES);
    if (!Number.isFinite(configured) || configured <= 0) return DEFAULT_TTL_MINUTES;
    return Math.min(Math.floor(configured), MAX_TTL_MINUTES);
};

/** Creates a new reset token and its storage representation. */
const createResetToken = () => {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = hashResetToken(token);
    const expiresAt = new Date(Date.now() + getResetTokenTtlMinutes() * 60 * 1000);
    return { token, hashedToken, expiresAt, ttlMinutes: getResetTokenTtlMinutes() };
};

/** Deterministic SHA-256 hash used to look the token up in the database. */
const hashResetToken = (token) => crypto.createHash('sha256').update(String(token || ''), 'utf8').digest('hex');

/** Timing safe comparison helper (used for webhook/callback secrets). */
const safeCompare = (a, b) => {
    const left = Buffer.from(String(a || ''), 'utf8');
    const right = Buffer.from(String(b || ''), 'utf8');
    if (left.length === 0 || left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
};

/** Finds a user by the raw token provided in the reset link. */
const findUserByResetToken = async (Model, rawToken) => {
    if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 32) return null;
    const hashedToken = hashResetToken(rawToken);
    return Model.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: new Date() },
    });
};

/** Clears the reset token so it can never be replayed. */
const clearResetToken = (user) => {
    if (!user) return;
    user.resetPasswordToken = '';
    user.resetPasswordExpires = null;
};

/**
 * Validates a new password using the application's existing password policy
 * (minimum 6 characters, at least one number). Never returns the password.
 */
const validateNewPassword = (password) => validatePassword(password);

const ALLOWED_RESET_ROLES = ['Admin', 'SuperAdmin', 'Accountant', 'HR', 'Student', 'Teacher', 'Employee'];

/**
 * Builds the reset URL from the configured frontend origin.
 * Only the first configured origin is used and only http/https URLs are
 * accepted, so an attacker controlled FRONTEND_URL cannot be smuggled in and
 * the user can never be redirected to an unexpected host.
 */
const buildResetUrl = (role, rawToken) => {
    const configured = String(process.env.FRONTEND_URL || 'http://localhost:3000')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

    let base = configured[0] || 'http://localhost:3000';
    try {
        const parsed = new URL(base);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('unsupported protocol');
        base = `${parsed.protocol}//${parsed.host}`;
    } catch (error) {
        base = 'http://localhost:3000';
    }

    const safeRole = ALLOWED_RESET_ROLES.includes(role) ? role : 'Admin';
    const safeToken = encodeURIComponent(String(rawToken || ''));
    return `${base}/${safeRole}/reset-password/${safeToken}`;
};

/** Masks a token so it can safely appear in logs / diagnostics. */
const maskToken = (token) => {
    const value = String(token || '');
    if (value.length <= 8) return '****';
    return `${value.slice(0, 4)}…${value.slice(-4)}`;
};

/** Masks reset links (and therefore tokens) inside arbitrary text. */
const maskResetLinks = (text) =>
    String(text || '').replace(/reset-password\/([A-Za-z0-9._~%-]+)/gi, (match, token) => `reset-password/${maskToken(token)}`);

/** Response returned for every forgot-password request (no user enumeration). */
const GENERIC_RESET_REQUEST_MESSAGE =
    'If an account exists for that email address, a password reset link has been sent.';

module.exports = {
    GENERIC_RESET_REQUEST_MESSAGE,
    ALLOWED_RESET_ROLES,
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
};
