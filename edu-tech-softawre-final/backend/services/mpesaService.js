
const axios = require('axios');

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
            resultDescription: response.data.ResultDescription
        };
    } catch (error) {
        console.error('STK Query Error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

// Validate M-Pesa Callback Signature
const validateCallback = (body, signature) => {
    // In production, verify the signature from Safaricom
    // For now, accept all callbacks
    return true;
};

module.exports = {
    initiateStkPush,
    queryStkPushStatus,
    validateCallback,
    generateTimestamp,
    generatePassword
};
