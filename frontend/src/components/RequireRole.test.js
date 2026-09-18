
/**
 * Unit tests for the shared role gate used by the dashboard routes.
 *
 * SECURITY CONTEXT: RequireRole is a *routing* guard that keeps unauthenticated
 * visitors away from the dashboard shell (for example when someone opens
 * /admin directly). It is not the security boundary – every API call is
 * authorised server side – but a regression here would expose the admin UI
 * shell to anonymous visitors, so the behaviour is pinned by tests.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import RequireRole from './RequireRole';

const makeStore = (userState) => configureStore({
    reducer: {
        user: (state = userState) => state,
    },
});

const LoginProbe = () => {
    const location = useLocation();
    return <div data-testid="login-screen">login{location.pathname}</div>;
};

const renderWith = (userState, roles, storageUser) => {
    localStorage.clear();
    if (storageUser) {
        localStorage.setItem('user', JSON.stringify(storageUser));
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    act(() => {
        root.render(
            <Provider store={makeStore(userState)}>
                <MemoryRouter initialEntries={['/admin/dashboard']}>
                    <Routes>
                        <Route path="/choose" element={<LoginProbe />} />
                        <Route path="/admin/dashboard" element={
                            <RequireRole roles={roles} loginPath="/choose">
                                <div data-testid="protected-content">protected</div>
                            </RequireRole>
                        } />
                    </Routes>
                </MemoryRouter>
            </Provider>
        );
    });

    return container;
};

describe('RequireRole', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        localStorage.clear();
    });

    test('redirects anonymous visitors to the login path', () => {
        const container = renderWith({ currentRole: null, currentUser: null }, ['Admin'], null);
        expect(container.querySelector('[data-testid="login-screen"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="protected-content"]')).toBeNull();
    });

    test('redirects a user whose role is not allowed', () => {
        const container = renderWith(
            { currentRole: 'Student', currentUser: { _id: 's1', name: 'Student' } },
            ['Admin', 'SuperAdmin'],
            null
        );
        expect(container.querySelector('[data-testid="login-screen"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="protected-content"]')).toBeNull();
    });

    test('renders the protected content for an allowed role', () => {
        const container = renderWith(
            { currentRole: 'Admin', currentUser: { _id: 'a1', name: 'Admin' } },
            ['Admin', 'SuperAdmin'],
            null
        );
        expect(container.querySelector('[data-testid="protected-content"]')).not.toBeNull();
    });

    test('honours the role persisted in localStorage after a reload', () => {
        const container = renderWith(
            { currentRole: null, currentUser: null },
            ['Admin'],
            { _id: 'a2', name: 'Admin', role: 'Admin' }
        );
        expect(container.querySelector('[data-testid="protected-content"]')).not.toBeNull();
    });

    test('does not grant access to a role that merely contains an allowed role name', () => {
        const container = renderWith(
            { currentRole: 'TeacherAssistant', currentUser: { _id: 't1' } },
            ['Admin', 'SuperAdmin', 'Accountant', 'HR'],
            null
        );
        expect(container.querySelector('[data-testid="login-screen"]')).not.toBeNull();
    });
});
