// Two-Factor Authentication (2FA) Utility
// Supports TOTP (Time-based One-Time Password) and SMS-based 2FA

const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { sendSMS } = require('../services/smsService');
const { sendEmail } = require('../services/emailService');

// Store 2FA attempts (in production, use database)
const twoFactorStore = new Map();

// ============================================
// TOTP-based 2FA (Google Authenticator style)
// ============================================

/**
 * Generate TOTP secret for a user
 * @param {string} userEmail - User's email address
 * @param {string} appName - Application name (default: "School Management System")
 * @returns {Promise<object>} Secret, QR code, and backup codes
 */
const generateTotpSecret = async (userEmail, appName = 'School Management System') => {
    try {
        // Generate secret
        const secret = speakeasy.generateSecret({
            name: `${appName} (${userEmail})`,
            issuer: appName,
            length: 32
        });

        // Generate QR code
        const qrCode = await QRCode.toDataURL(secret.otpauth_url);

        // Generate backup codes (10 codes, 8 characters each)
        const backupCodes = [];
        for (let i = 0; i < 10; i++) {
            backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
        }

        return {
            secret: secret.base32,
            qrCode, // Data URL for displaying QR code
            backupCodes,
            manual: secret.otpauth_url
        };
    } catch (error) {
        console.error('[2FA] TOTP generation error:', error);
        throw error;
    }
};

/**
 * Verify TOTP token
 * @param {string} token - 6-digit code from authenticator app
 * @param {string} secret - User's TOTP secret
 * @returns {boolean} Whether token is valid
 */
const verifyTotpToken = (token, secret) => {
    try {
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 2 // Allow 2 time windows (current ±2 * 30 seconds)
        });

        return verified;
    } catch (error) {
        console.error('[2FA] TOTP verification error:', error);
        return false;
    }
};

// ============================================
// SMS-based 2FA
// ============================================

/**
 * Generate and send SMS OTP
 * @param {string} phoneNumber - User's phone number
 * @param {string} userId - User ID for tracking attempts
 * @returns {Promise<object>} OTP code and attempt tracking
 */
const generateAndSendSmsOtp = async (phoneNumber, userId) => {
    try {
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Send SMS
        const smsResult = await sendSMS(
            phoneNumber,
            `Your ${process.env.SYSTEM_NAME || 'School Management'} verification code is: ${otp}. Valid for 10 minutes.`
        );

        if (!smsResult.success) {
            throw new Error('Failed to send OTP via SMS');
        }

        // Store OTP with expiration (10 minutes)
        const expiresAt = Date.now() + (10 * 60 * 1000);
        const attemptKey = `otp-${userId}`;

        twoFactorStore.set(attemptKey, {
            otp,
            phoneNumber,
            createdAt: Date.now(),
            expiresAt,
            attempts: 0,
            maxAttempts: 3
        });

        return {
            success: true,
            message: 'OTP sent to your phone',
            expiresIn: 600 // seconds
        };
    } catch (error) {
        console.error('[2FA] SMS OTP generation error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Verify SMS OTP
 * @param {string} userId - User ID
 * @param {string} otp - OTP code to verify
 * @returns {Promise<object>} Verification result
 */
const verifySmsOtp = (userId, otp) => {
    const attemptKey = `otp-${userId}`;
    const storedOtp = twoFactorStore.get(attemptKey);

    if (!storedOtp) {
        return {
            valid: false,
            error: 'OTP not found or expired'
        };
    }

    // Check if expired
    if (Date.now() > storedOtp.expiresAt) {
        twoFactorStore.delete(attemptKey);
        return {
            valid: false,
            error: 'OTP has expired'
        };
    }

    // Check if max attempts exceeded
    if (storedOtp.attempts >= storedOtp.maxAttempts) {
        twoFactorStore.delete(attemptKey);
        return {
            valid: false,
            error: 'Too many failed attempts. Request a new OTP.'
        };
    }

    // Verify OTP
    if (otp !== storedOtp.otp) {
        storedOtp.attempts++;
        return {
            valid: false,
            error: `Invalid OTP. ${storedOtp.maxAttempts - storedOtp.attempts} attempts remaining`
        };
    }

    // OTP is valid, remove it
    twoFactorStore.delete(attemptKey);

    return {
        valid: true,
        message: 'OTP verified successfully'
    };
};

// ============================================
// Email-based 2FA
// ============================================

/**
 * Generate and send email verification code
 * @param {string} email - User's email address
 * @param {string} userId - User ID
 * @returns {Promise<object>} Email code and tracking
 */
const generateAndSendEmailOtp = async (email, userId) => {
    try {
        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Send email
        const emailResult = await sendEmail(
            email,
            'Two-Factor Authentication Code',
            `
            <h2>Verification Code</h2>
            <p>Your ${process.env.SYSTEM_NAME || 'School Management'} verification code is:</p>
            <h1 style="letter-spacing: 5px; font-family: monospace; color: #333;">${code}</h1>
            <p>This code is valid for 10 minutes.</p>
            <p>If you did not request this code, please ignore this email.</p>
            `
        );

        if (!emailResult.success) {
            throw new Error('Failed to send verification code via email');
        }

        // Store code with expiration
        const expiresAt = Date.now() + (10 * 60 * 1000);
        const attemptKey = `email-otp-${userId}`;

        twoFactorStore.set(attemptKey, {
            code,
            email,
            createdAt: Date.now(),
            expiresAt,
            attempts: 0,
            maxAttempts: 3
        });

        return {
            success: true,
            message: 'Verification code sent to your email',
            expiresIn: 600
        };
    } catch (error) {
        console.error('[2FA] Email OTP generation error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Verify email verification code
 * @param {string} userId - User ID
 * @param {string} code - Code to verify
 * @returns {object} Verification result
 */
const verifyEmailOtp = (userId, code) => {
    const attemptKey = `email-otp-${userId}`;
    const storedCode = twoFactorStore.get(attemptKey);

    if (!storedCode) {
        return {
            valid: false,
            error: 'Verification code not found or expired'
        };
    }

    // Check if expired
    if (Date.now() > storedCode.expiresAt) {
        twoFactorStore.delete(attemptKey);
        return {
            valid: false,
            error: 'Verification code has expired'
        };
    }

    // Check if max attempts exceeded
    if (storedCode.attempts >= storedCode.maxAttempts) {
        twoFactorStore.delete(attemptKey);
        return {
            valid: false,
            error: 'Too many failed attempts. Request a new code.'
        };
    }

    // Verify code
    if (code !== storedCode.code) {
        storedCode.attempts++;
        return {
            valid: false,
            error: `Invalid code. ${storedCode.maxAttempts - storedCode.attempts} attempts remaining`
        };
    }

    // Code is valid, remove it
    twoFactorStore.delete(attemptKey);

    return {
        valid: true,
        message: 'Email verification successful'
    };
};

// ============================================
// 2FA Setup and Management
// ============================================

/**
 * Check if 2FA is enabled for user
 * @param {object} user - User document
 * @returns {object} 2FA status
 */
const get2faStatus = (user) => {
    return {
        totpEnabled: !!user.twoFactorSecret,
        smsEnabled: !!user.twoFactorPhone,
        emailEnabled: !!user.twoFactorEmail,
        backupCodesRemaining: user.twoFactorBackupCodes ? user.twoFactorBackupCodes.filter(code => !code.used).length : 0
    };
};

/**
 * Disable 2FA for user
 * @param {object} user - User document
 * @returns {object} Updated user
 */
const disable2fa = (user) => {
    user.twoFactorSecret = null;
    user.twoFactorPhone = null;
    user.twoFactorEmail = null;
    user.twoFactorBackupCodes = null;
    return user;
};

// Clean up expired OTPs periodically
// `unref()` keeps this housekeeping timer from holding the event loop open
// (which would otherwise keep test runs and graceful shutdowns hanging).
const otpCleanupTimer = setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, data] of twoFactorStore.entries()) {
        if (now > data.expiresAt) {
            twoFactorStore.delete(key);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        console.log(`[2FA] Cleaned up ${cleaned} expired OTPs`);
    }
}, 5 * 60 * 1000); // Every 5 minutes
if (typeof otpCleanupTimer.unref === 'function') otpCleanupTimer.unref();

module.exports = {
    // TOTP
    generateTotpSecret,
    verifyTotpToken,
    // SMS OTP
    generateAndSendSmsOtp,
    verifySmsOtp,
    // Email OTP
    generateAndSendEmailOtp,
    verifyEmailOtp,
    // Management
    get2faStatus,
    disable2fa
};