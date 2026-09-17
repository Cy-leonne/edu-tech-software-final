import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * Client side role gate for dashboard routes.
 *
 * SECURITY NOTE: this is a UX/route guard only. The real security boundary is
 * the API, which authorises every request server side. This component simply
 * prevents an unauthenticated visitor (or a user of another role) from being
 * shown an empty dashboard shell when they open a URL such as /admin directly.
 */
const RequireRole = ({ roles = [], loginPath = '/', children }) => {
    const location = useLocation();
    const { currentRole, currentUser } = useSelector((state) => state.user);

    const storedRole = (() => {
        try {
            const stored = JSON.parse(localStorage.getItem('user')) || {};
            return stored.role || null;
        } catch (error) {
            return null;
        }
    })();

    const effectiveRole = currentRole || storedRole;
    const isAuthenticated = Boolean(currentUser || storedRole);

    if (!isAuthenticated || !effectiveRole) {
        return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
    }

    const normalizedRole = String(effectiveRole);
    const allowed = roles.some((role) =>
        normalizedRole === role ||
        (role === 'Teacher' && normalizedRole.includes('Teacher'))
    );

    if (!allowed) {
        return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
    }

    return children;
};

export default RequireRole;
