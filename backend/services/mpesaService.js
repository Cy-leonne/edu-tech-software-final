const axios = require('axios');
const crypto = require('crypto');
const { safeCompare, isTruthy } = (() => {
    const helpers = require('../utils/passwordReset');
    const env = require('../utils/securityEnv');
    return { safeCompare: helpers.safeCompare, isTruthy: env.isTruthy };
})();

// M-Pesa API Configuration
const MPESA_BASE_URL = process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke';
const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || '';
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || '';
const BUSINESS_SHORTCODE = process.env.MPESA_BUSINESS_SHORTCODE || '174379';
const PASSKEY = process.env.MPESA_PASSKEY || '';
const CALLBACK_URL = process.env.MPESA_CALLBACK_URL || 'http://localhost:5000/Payment/MpesaCallback';

// Get access token from M-Pesa
const getConfig = (config = {}) => {
    const environment = config.environment || process.env.MPESA_ENVIRONMENT || 'sandbox';
    return {
        baseUrl: config.baseUrl || (environment === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke'),
        consumerKey: config.consumerKey || CONSUMER_KEY,
        consumerSecret: config.consumerSecret || CONSUMER_SECRET,
        businessShortCode: config.businessShortCode || BUSINESS_SHORTCODE,
        passkey: config.passkey || PASSKEY,
        callbackUrl: config.callbackUrl || CALLBACK_URL,
    };
};

const getAccessToken = async (config = {}) => {
    try {
        const mpesa = getConfig(config);
        if (!mpesa.consumerKey || !mpesa.consumerSecret) {
            throw new Error('M-Pesa consumer key and consumer secret are required');
        }
        const auth = Buffer.from(`${mpesa.consumerKey}:${mpesa.consumerSecret}`).toString('base64');
        const response = await axios.get(
            `${mpesa.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
            {
                headers: {
                    Authorization: `Basic ${auth}`
                }
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error('Error getting M-Pesa access token:', error.message);
        throw new Error('Failed to get M-Pesa access token');
    }
};

// Generate timestamp in format: YYYYMMDDHHmmss
const generateTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

// Generate password (Base64 encoded: BUSINESSSHORTCODE + PASSKEY + TIMESTAMP)
const generatePassword = (timestamp, config = {}) => {
    const mpesa = getConfig(config);
    const passwordString = `${mpesa.businessShortCode}${mpesa.passkey}${timestamp}`;
    return Buffer.from(passwordString).toString('base64');
};

// Initiate STK Push
const initiateStkPush = async (phoneNumber, amount, accountReference, transactionDesc, config = {}) => {
    try {
        const mpesa = getConfig(config);
        if (!mpesa.businessShortCode || !mpesa.passkey) {
            throw new Error('M-Pesa business short code and passkey are required');
        }
        // Validate phone number format (254xxxxxxxxx)
        const formattedPhone = phoneNumber.startsWith('254')
            ? phoneNumber
            : phoneNumber.startsWith('07') || phoneNumber.startsWith('01')
            ? `254${phoneNumber.substring(1)}`
            : `254${phoneNumber}`;

        const timestamp = generateTimestamp();
        const password = generatePassword(timestamp, mpesa);

        const accessToken = await getAccessToken(mpesa);

        const payload = {
            BusinessShortCode: mpesa.businessShortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.ceil(amount),
            PartyA: formattedPhone,
            PartyB: mpesa.businessShortCode,
            PhoneNumber: formattedPhone,
            CallBackURL: mpesa.callbackUrl,
            AccountReference: accountReference || 'FeePayment',
            TransactionDesc: transactionDesc || 'School Fee Payment'
        };

        const response = await axios.post(
            `${mpesa.baseUrl}/mpesa/stkpush/v1/processrequest`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            requestId: response.data.RequestID,
            responseCode: response.data.ResponseCode,
            responseDescription: response.data.ResponseDescription,
            checkoutRequestId: response.data.CheckoutRequestID
        };
    } catch (error) {
        console.error('STK Push Error:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.errorMessage || error.message
        };
    }
};

// Query STK Push Status
const queryStkPushStatus = async (checkoutRequestId, config = {}) => {
    try {
        const mpesa = getConfig(config);
        const timestamp = generateTimestamp();
        const password = generatePassword(timestamp, mpesa);
        const accessToken = await getAccessToken(mpesa);

        const payload = {
            BusinessShortCode: mpesa.businessShortCode,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestId
        };

        const response = await axios.post(
            `${mpesa.baseUrl}/mpesa/stkpushquery/v1/query`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            responseCode: response.data.ResponseCode,
            responseDescription: response.data.ResponseDescription,
            resultCode: response.data.ResultCode,
            resultDescription: response.data.ResultDescription,
            // Provider confirmed transaction details (present on success).
            amount: response.data.Amount,
            receiptNumber: response.data.MpesaReceiptNumber,
            transactionDate: response.data.TransactionDate,
            phoneNumber: response.data.PhoneNumber
        };
    } catch (error) {
        console.error('STK Query Error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Validates an M-Pesa callback before it is allowed to change payment state.
 *
 * The callback endpoint is a public endpoint, so it must never be trusted just
 * because the JSON payload looks like an M-Pesa result. Verification options
 * (configured through environment variables, see .env.example):
 *
 *   MPESA_CALLBACK_SECRET  – shared secret. When set, the callback must present
 *                            it either as the `x-mpesa-callback-secret` header,
 *                            as `?secret=` query parameter, or as an
 *                            HMAC-SHA256 signature of the raw body in
 *                            `x-mpesa-signature` (hex or base64).
 *   MPESA_CALLBACK_IPS     – comma separated allow-list of source IPs
 *                            (Safaricom publishes its callback egress IPs).
 *
 * When neither is configured the callback is still accepted (so that an
 * existing deployment is not broken by this change) but a warning is logged on
 * every unverified callback. Configure at least one option in production.
 */
const validateCallback = (body, signature, req = null) => {
    const secret = process.env.MPESA_CALLBACK_SECRET;
    const allowedIps = String(process.env.MPESA_CALLBACK_IPS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    const requireVerification = isTruthy(process.env.MPESA_CALLBACK_REQUIRE_VERIFICATION);

    const request = req || {};
    const headers = request.headers || {};
    const headerSecret = headers['x-mpesa-callback-secret'];
    const querySecret = request.query?.secret;
    const signatureHeader = signature || headers['x-mpesa-signature'] || '';
    const rawBody = request.rawBody || '';
    const sourceIp = String(
        (headers['x-forwarded-for'] || '').split(',')[0].trim() ||
        request.ip ||
        request.connection?.remoteAddress ||
        ''
    ).replace(/^::ffff:/, '');

    const providedSecret = headerSecret || querySecret;

    if (secret) {
        if (providedSecret && safeCompare(providedSecret, secret)) {
            return { valid: true, method: 'shared-secret' };
        }
        if (signatureHeader && rawBody) {
            const expectedHex = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
            const expectedBase64 = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
            if (safeCompare(String(signatureHeader).toLowerCase(), expectedHex) ||
                safeCompare(String(signatureHeader), expectedBase64)) {
                return { valid: true, method: 'hmac-signature' };
            }
        }
        console.warn('[MPESA CALLBACK] Rejected callback with invalid verification secret/signature');
        return { valid: false, reason: 'invalid-signature' };
    }

    if (allowedIps.length > 0) {
        if (allowedIps.includes(sourceIp)) {
            return { valid: true, method: 'ip-allowlist' };
        }
        console.warn('[MPESA CALLBACK] Rejected callback from non allow-listed IP');
        return { valid: false, reason: 'ip-not-allowed' };
    }

    if (requireVerification) {
        console.warn('[MPESA CALLBACK] Rejected unverified callback (MPESA_CALLBACK_REQUIRE_VERIFICATION=true)');
        return { valid: false, reason: 'verification-required' };
    }

    console.warn(
        '[MPESA CALLBACK] WARNING: callbacks are not cryptographically verified. ' +
        'Set MPESA_CALLBACK_SECRET or MPESA_CALLBACK_IPS in the backend environment.'
    );
    return { valid: true, method: 'unverified' };
};

module.exports = {
    initiateStkPush,
    queryStkPushStatus,
    validateCallback,
    generateTimestamp,
    generatePassword,
};