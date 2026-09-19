
/**
 * Helpers for safely embedding user supplied text into database queries.
 *
 * Searching previously passed raw user input into MongoDB `$regex` queries,
 * which allowed regular-expression injection (expensive/never matching
 * patterns, "ReDoS") and triggered database errors for malformed patterns such
 * as a lone `*` or `(`.
 */

const MAX_SEARCH_LENGTH = 100;

/** Escapes every regular-expression meta character in a value. */
const escapeRegExp = (value) => String(value === undefined || value === null ? '' : value)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Normalizes and escapes a search term so it can be used inside a `$regex`
 * query. Returns an empty string when there is nothing usable to search for.
 */
const sanitizeSearchTerm = (value, maxLength = MAX_SEARCH_LENGTH) => {
    const raw = String(value === undefined || value === null ? '' : value).trim();
    if (!raw) return '';
    return escapeRegExp(raw.slice(0, maxLength));
};

/** Builds a case-insensitive exact match regex for a single value. */
const exactMatchRegex = (value) => new RegExp(`^${escapeRegExp(String(value || '').trim())}$`, 'i');

module.exports = { escapeRegExp, sanitizeSearchTerm, exactMatchRegex, MAX_SEARCH_LENGTH };
