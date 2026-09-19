
// Rate Limiting Middleware
// Prevents brute force attacks, API abuse, and spam

const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// General API rate limiter: 100 requests per 15 minutes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    keyGenerator: (req, res) => {
        return ipKeyGenerator(req);
    },
    skip: (req, res) => {
        // Skip rate limiting for health checks
        return req.path === '/health';
    }
});

// Strict rate limiter for login: 5 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per IP
    message: 'Too many login attempts. Please try again after 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
    keyGenerator: (req, res) => {
        return (req.body.email || req.body.emailOrPhone || '') + ipKeyGenerator(req);
    },
    handler: (req, res) => {
        res.status(429).json({
            message: 'Too many login attempts. Please wait 15 minutes before trying again.',
            captchaRequired: true
        });
    }
});

// Very strict limiter for password reset: 3 attempts per 60 minutes
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 60 minutes
    max: 3, // 3 attempts per hour
    message: 'Too many password reset attempts. Please try again after 1 hour.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => {
        return (req.body.email || '') + ipKeyGenerator(req);
    }
});

// Email verification limiter: 10 attempts per 60 minutes
const emailVerificationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 60 minutes
    max: 10,
    message: 'Too many email verification attempts. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => {
        return (req.body.email || '') + ipKeyGenerator(req);
    }
});

// Student registration limiter: 5 registrations per 24 hours per IP
const studentRegistrationLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 5,
    message: 'Too many student registrations. Maximum 5 per 24 hours from this IP.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => {
        return ipKeyGenerator(req);
    }
});

// Admin teacher registration limiter: 100 per 24 hours (for bulk adding teachers)
const adminTeacherRegistrationLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 100,
    message: 'Too many teacher registrations. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => {
        return ipKeyGenerator(req);
    }
});

// File upload limiter: 10 uploads per 5 minutes
const fileUploadLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10,
    message: 'Too many file uploads. Please wait before uploading more files.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => {
        return ipKeyGenerator(req);
    }
});

// API export limiter: 10 exports per 60 minutes (prevents data scraping)
const exportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 60 minutes
    max: 10,
    message: 'Too many exports. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => {
        return ipKeyGenerator(req);
    }
});

module.exports = {
    apiLimiter,
    loginLimiter,
    passwordResetLimiter,
    emailVerificationLimiter,
    studentRegistrationLimiter,
    adminTeacherRegistrationLimiter,
    fileUploadLimiter,
    exportLimiter
};
