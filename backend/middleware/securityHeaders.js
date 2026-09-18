
/**
 * Baseline HTTP security headers.
 *
 * The API only ever returns JSON (plus static uploaded assets), so a strict
 * Content-Security-Policy can be applied without affecting the SPA, which is
 * served from its own origin.
 */

const securityHeaders = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    res.setHeader(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
    );
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'none'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    );

    // Never cache authenticated API responses.
    if (req.path !== '/health' && !req.path.startsWith('/uploads')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }

    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    if (req.secure || forwardedProto === 'https') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
};

/**
 * Hardens static file responses for uploaded content (student photos,
 * branding, assignments, learning material).
 */
const uploadedFileHeaders = (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; script-src 'none'; sandbox"
    );
    const lower = String(filePath || '').toLowerCase();
    const inlineSafe = /\.(png|jpe?g|gif|webp|bmp|ico)$/.test(lower);
    if (!inlineSafe) {
        // Force download for documents/archives so they can never execute in
        // the context of the portal origin.
        res.setHeader('Content-Disposition', 'attachment');
    }
};

module.exports = { securityHeaders, uploadedFileHeaders };
