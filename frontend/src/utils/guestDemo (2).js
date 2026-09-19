
/**
 * Demo ("guest") login configuration.
 *
 * SECURITY: the demo accounts used to be hard-coded in the bundle
 * (yogendra@12 / zxc / ...), which shipped working credentials for the demo
 * dataset to every visitor of the production site. Demo mode is now:
 *
 *   1. disabled unless REACT_APP_ENABLE_GUEST_DEMO=true, and
 *   2. credential-free in the source: the demo credentials must be supplied
 *      through environment variables (never committed).
 *
 * The backend additionally refuses to use its in-memory demo database unless
 * ENABLE_TEST_DB_FALLBACK=true and NODE_ENV is not production, so enabling the
 * frontend flag alone cannot create a working backdoor.
 */

export const enableGuestDemo =
    String(process.env.REACT_APP_ENABLE_GUEST_DEMO || '').trim().toLowerCase() === 'true';

const read = (key) => {
    const value = process.env[key];
    return typeof value === 'string' && value.trim() ? value.trim() : '';
};

export const guestDemoCredentials = {
    Admin: {
        email: read('REACT_APP_GUEST_ADMIN_EMAIL'),
        password: read('REACT_APP_GUEST_ADMIN_PASSWORD'),
    },
    SuperAdmin: {
        email: read('REACT_APP_GUEST_SUPERADMIN_EMAIL'),
        password: read('REACT_APP_GUEST_SUPERADMIN_PASSWORD'),
    },
    Teacher: {
        email: read('REACT_APP_GUEST_TEACHER_EMAIL'),
        password: read('REACT_APP_GUEST_TEACHER_PASSWORD'),
    },
    Student: {
        admissionNo: read('REACT_APP_GUEST_STUDENT_ADMISSION_NO'),
        studentName: read('REACT_APP_GUEST_STUDENT_NAME'),
        password: read('REACT_APP_GUEST_STUDENT_PASSWORD'),
    },
};

/**
 * Returns the login payload for a demo role, or null when demo mode is not
 * enabled/configured on this deployment.
 */
export const getGuestDemoFields = (role) => {
    if (!enableGuestDemo) return null;

    const credentials = guestDemoCredentials[role];
    if (!credentials) return null;

    if (role === 'Student') {
        if (!credentials.admissionNo || !credentials.password) return null;
        return {
            admissionNo: credentials.admissionNo,
            studentName: credentials.studentName,
            password: credentials.password,
        };
    }

    if (!credentials.email || !credentials.password) return null;
    return { email: credentials.email, password: credentials.password };
};

export const GUEST_DEMO_UNAVAILABLE_MESSAGE =
    'Demo login is not enabled on this deployment. Please sign in with your own account.';

export default getGuestDemoFields;
