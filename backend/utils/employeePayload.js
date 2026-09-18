
const isEmptyValue = (value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (value instanceof Date) return false;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
};

const sanitizeEmployeePayload = (value) => {
    if (Array.isArray(value)) {
        return value
            .map((item) => sanitizeEmployeePayload(item))
            .filter((item) => !isEmptyValue(item));
    }

    if (value && typeof value === 'object') {
        const result = {};

        for (const [key, child] of Object.entries(value)) {
            const sanitizedChild = sanitizeEmployeePayload(child);
            if (!isEmptyValue(sanitizedChild)) {
                result[key] = sanitizedChild;
            }
        }

        return result;
    }

    return value;
};

module.exports = {
    sanitizeEmployeePayload,
};
