
/**
 * Development proxy (used automatically by `react-scripts start`).
 *
 * API requests are forwarded to the backend so that the SPA and the API share a
 * single origin during development and in hosted previews (no CORS round trip,
 * no hard-coded localhost URL in the browser).
 *
 * Only API traffic is proxied:
 *   - ordinary page loads (Accept: text/html) are served by the dev server so
 *     deep links such as /admin or /Parent/login resolve to the SPA,
 *   - the dev server's own assets (bundle, css, images, favicon, manifest,
 *     HMR socket) are never proxied,
 *   - anything with a file extension is treated as a static asset.
 *
 * The proxy is invoked explicitly (instead of relying on the
 * http-proxy-middleware `bypass` option) because `bypass` support differs
 * between library versions; `next()` guarantees the request continues into the
 * dev-server pipeline.
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

const BACKEND_TARGET = process.env.REACT_APP_PROXY_TARGET || 'http://127.0.0.1:5000';

const STATIC_PREFIXES = ['/static', '/sockjs-node', '/ws', '/__webpack'];
const STATIC_PATHS = new Set([
    '/favicon.ico',
    '/manifest.json',
    '/robots.txt',
    '/logo192.png',
    '/logo512.png',
    '/service-worker.js',
    '/asset-manifest.json',
]);

/** Paths that must be served by the dev server rather than the backend. */
const isDevServerRequest = (pathname, req) => {
    if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
    if (STATIC_PATHS.has(pathname)) return true;

    // A dot in the last segment means a file (bundle.js, logo.svg, ...).
    const lastSegment = pathname.split('/').pop() || '';
    if (lastSegment.includes('.')) return true;

    // Browser navigations (deep links, refreshes) belong to the SPA router.
    const accept = String((req.headers && req.headers.accept) || '');
    return accept.includes('text/html');
};

module.exports = function (app) {
    const apiProxy = createProxyMiddleware({
        target: BACKEND_TARGET,
        changeOrigin: true,
        ws: false,
        logLevel: 'warn',
    });

    app.use((req, res, next) => {
        const pathname = String(req.url || '/').split('?')[0];

        if (isDevServerRequest(pathname, req)) {
            return next();
        }

        return apiProxy(req, res, next);
    });
};
