/**
 * Tests for the API base URL resolver.
 *
 * A wrong base URL silently breaks every screen (requests go to the wrong
 * origin), so the contract is pinned here:
 *   - an explicit REACT_APP_BASE_URL always wins (and trailing slashes are
 *     trimmed so request paths never contain `//`)
 *   - otherwise the current origin is used, which keeps hosted deployments,
 *     previews and the CRA dev proxy working without hardcoded localhost URLs
 */
import { resolveApiBaseUrl, DEFAULT_DEV_API_ORIGIN } from './apiConfig';

const ORIGINAL_ENV = { ...process.env };

describe('resolveApiBaseUrl', () => {
    afterEach(() => {
        process.env = { ...ORIGINAL_ENV };
    });

    test('prefers the configured REACT_APP_BASE_URL', () => {
        process.env.REACT_APP_BASE_URL = 'https://api.school.example';
        expect(resolveApiBaseUrl()).toBe('https://api.school.example');
    });

    test('trims a trailing slash from the configured value', () => {
        process.env.REACT_APP_BASE_URL = 'https://api.school.example/';
        expect(resolveApiBaseUrl()).toBe('https://api.school.example');
    });

    test('falls back to the current origin when nothing is configured', () => {
        delete process.env.REACT_APP_BASE_URL;
        expect(resolveApiBaseUrl()).toBe(window.location.origin);
    });

    test('exposes the local backend as the documented development default', () => {
        expect(DEFAULT_DEV_API_ORIGIN).toBe('http://localhost:5000');
    });
});
