/**
 * Central helpers for environment dependent security switches.
 *
 * These helpers intentionally FAIL CLOSED: anything that weakens security
 * (in-memory demo data, unauthenticated test payment endpoints, ...) is only
 * available when it is explicitly enabled AND the process is not running in
 * production.
 */

const isProduction = () => String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';

const isTruthy = (value) => ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());

/**
 * In-memory demo database fallback (backend/testdb.js) contains well known
 * demo credentials. It must never be usable in production.
 */
const testDatabaseFallbackEnabled = () => !isProduction() && isTruthy(process.env.ENABLE_TEST_DB_FALLBACK);

/**
 * Test-only payment helpers (mock STK initiation, manual payment webhook
 * simulation, ...) must never be reachable in production.
 */
const testPaymentEndpointsEnabled = () => !isProduction() && !isTruthy(process.env.DISABLE_TEST_PAYMENT_ENDPOINTS);

/**
 * Developer email diagnostics endpoint (POST /Test/SendResetEmail).
 */
const testEmailEndpointEnabled = () => !isProduction() && isTruthy(process.env.ENABLE_TEST_EMAIL_ENDPOINT);

/** True when the Express app is being exercised by the automated test suite. */
const isTest = () => ['test', 'jest'].includes(String(process.env.NODE_ENV || '').trim().toLowerCase());

/** Redacts credentials that may be embedded in a connection string. */
const redactConnectionString = (value) => {
    const raw = String(value || '');
    if (!raw) return '';
    return raw.replace(/\/\/([^:@/]+):([^@/]+)@/, '//$1:****@');
};

module.exports = {
    isProduction,
    isTruthy,
    isTest,
    testDatabaseFallbackEnabled,
    testPaymentEndpointsEnabled,
    testEmailEndpointEnabled,
    redactConnectionString,
};
