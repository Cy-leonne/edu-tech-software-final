
const { escapeRegExp, sanitizeSearchTerm, exactMatchRegex, MAX_SEARCH_LENGTH } = require('../utils/searchUtils');

describe('search input sanitisation', () => {
    test('escapes every regular expression meta character', () => {
        const escaped = escapeRegExp('a.*+?^${}()|[]\\b');
        expect(escaped).toBe('a\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\b');
        // The escaped value is a valid, literal-only pattern.
        expect(() => new RegExp(escaped)).not.toThrow();
    });

    test('sanitizeSearchTerm trims, limits length and escapes', () => {
        expect(sanitizeSearchTerm('  Amina  ')).toBe('Amina');
        expect(sanitizeSearchTerm('')).toBe('');
        expect(sanitizeSearchTerm(null)).toBe('');

        const long = 'a'.repeat(MAX_SEARCH_LENGTH + 50);
        expect(sanitizeSearchTerm(long)).toHaveLength(MAX_SEARCH_LENGTH);
    });

    test('sanitizeSearchTerm neutralises catastrophic backtracking input', () => {
        const pattern = '(a+)+$'.repeat(10);
        const safe = sanitizeSearchTerm(pattern);
        // Meta characters are escaped (present, but only as literals).
        expect(safe).toContain('\\(');
        expect(() => new RegExp(safe)).not.toThrow();
        // ...and the escaped pattern now matches the literal text only.
        expect(new RegExp(safe).test(pattern)).toBe(true);
    });

    test('exactMatchRegex builds a case-insensitive exact matcher', () => {
        const regex = exactMatchRegex('Admin@Example.com');
        expect(regex.test('admin@example.com')).toBe(true);
        expect(regex.test('admin@example.com.evil')).toBe(false);
        expect(regex.test('xadmin@example.com')).toBe(false);
    });
});
