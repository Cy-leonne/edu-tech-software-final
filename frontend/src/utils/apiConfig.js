
/**
 * Resolves the backend API base URL.
 *
 * - In production builds REACT_APP_BASE_URL is inlined at build time and used
 *   as-is (e.g. https://api.your-domain.com).
 * - In development, or when the app is served from a host that proxies the API
 *   (see src/setupProxy.js), calls are made to the current origin so the dev
 *   server can forward them to the backend. This keeps cookies/CORS simple and
 *   works in hosted previews.
 *
 * Existing files that read `process.env.REACT_APP_BASE_URL || 'http://localhost:5000'`
 * continue to work in local development because the fallback points to the
 * local backend.
 */

export const DEFAULT_DEV_API_ORIGIN = 'http://localhost:5000';

const isLocalHostname = (hostname) => hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

export const resolveApiBaseUrl = () => {
    const configured = process.env.REACT_APP_BASE_URL;
    if (configured) return configured.replace(/\/$/, '');

    if (typeof window === 'undefined') return DEFAULT_DEV_API_ORIGIN;

    const { hostname, origin } = window.location;

    // Local dev: the CRA dev server proxies API calls, so the origin works.
    if (isLocalHostname(hostname)) {
        return origin;
    }

    // Hosted deployments (including previews) serve the API under the same
    // origin or through a proxy declared in setupProxy.
    return origin;
};

export const API_BASE_URL = resolveApiBaseUrl();

export default API_BASE_URL;
