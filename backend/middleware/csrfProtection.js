
// CSRF Protection Middleware
// Prevents Cross-Site Request Forgery attacks

const crypto = require('crypto');

// Store active CSRF tokens (in production, use Redis or database)
const csrfTokenStore = new Map();

// Generate a new CSRF token
const generateCsrfToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Create CSRF token for a session
const createCsrfToken = (req) => {
    const sessionId = req.sessionID || req.headers['x-session-id'] || `session-${crypto.randomBytes(16).toString('hex')}`;
    const token = generateCsrfToken();
    
    // Store token with expiration (1 hour)
    csrfTokenStore.set(token, {
        sessionId,
        createdAt: Date.now(),
        expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour
    });
    
    return token;
};

// Verify CSRF token
const verifyCsrfToken = (req) => {
    // Token can come from header or body
    const token = req.headers['x-csrf-token'] || req.body._csrf;
    
    if (!token) {
        return { valid: false, error: 'CSRF token missing' };
    }
    
    const tokenData = csrfTokenStore.get(token);
    
    if (!tokenData) {
        return { valid: false, error: 'Invalid CSRF token' };
    }
    
    // Check if token has expired
    if (Date.now() > tokenData.expiresAt) {
        csrfTokenStore.delete(token);
        return { valid: false, error: 'CSRF token expired' };
    }
    
    // Verify session matches
    const sessionId = req.sessionID || req.headers['x-session-id'];
    if (sessionId && tokenData.sessionId !== sessionId) {
        return { valid: false, error: 'CSRF token session mismatch' };
    }
    
    // Token is valid, remove it (one-time use)
    csrfTokenStore.delete(token);
    
    return { valid: true };
};

// CSRF protection middleware
const csrfProtection = (req, res, next) => {
    // Skip CSRF check for GET, HEAD, OPTIONS requests (safe methods)
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }
    
    // Skip CSRF check for health and webhook endpoints
    const skipPaths = ['/health', '/payment/webhook', '/Payment/MpesaCallback'];
    if (skipPaths.some(path => req.path.includes(path))) {
        return next();
    }
    
    const verification = verifyCsrfToken(req);
    
    if (!verification.valid) {
        return res.status(403).json({ 
            message: 'CSRF validation failed', 
            error: verification.error 
        });
    }
    
    next();
};

// Middleware to provide CSRF token to frontend
const provideCsrfToken = (req, res, next) => {
    // Generate token for GET requests
    if (req.method === 'GET') {
        const token = createCsrfToken(req);
        // Set as response header
        res.setHeader('X-CSRF-Token', token);
        // Also attach to request for easy access
        req.csrfToken = token;
    }
    next();
};

// Clean up expired tokens periodically (runs every 30 minutes)
const cleanupExpiredTokens = () => {
    const timer = setInterval(() => {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [token, data] of csrfTokenStore.entries()) {
            if (now > data.expiresAt) {
                csrfTokenStore.delete(token);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`[CSRF] Cleaned up ${cleaned} expired tokens`);
        }
    }, 30 * 60 * 1000); // 30 minutes
    // Do not hold the event loop open with housekeeping timers.
    if (typeof timer.unref === 'function') timer.unref();
    return timer;
};

// Start cleanup on module load
cleanupExpiredTokens();

module.exports = {
    generateCsrfToken,
    createCsrfToken,
    verifyCsrfToken,
    csrfProtection,
    provideCsrfToken
};
