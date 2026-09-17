import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    status: 'idle',
    userDetails: [],
    tempDetails: [],
    loading: false,
    currentUser: JSON.parse(localStorage.getItem('user')) || null,
    currentRole: (JSON.parse(localStorage.getItem('user')) || {}).role || null,
    twoFactorRequired: false,
    twoFactorMethods: [],
    selected2faMethod: null,
    twoFactorUserId: null,
    error: null,
    response: null,
    darkMode: true
};

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        authRequest: (state) => {
            state.status = 'loading';
            state.twoFactorRequired = false;
            state.twoFactorMethods = [];
            state.selected2faMethod = null;
            state.twoFactorUserId = null;
        },
        authTwoFactorPending: (state, action) => {
            state.status = 'twoFactorRequired';
            state.twoFactorRequired = true;
            state.twoFactorMethods = action.payload.methods || [];
            state.selected2faMethod = action.payload.selectedMethod || null;
            state.twoFactorUserId = action.payload.userId || null;
            state.response = action.payload.message || 'Two-factor authentication required';
            state.error = null;
        },
        clearTwoFactorState: (state) => {
            state.twoFactorRequired = false;
            state.twoFactorMethods = [];
            state.selected2faMethod = null;
            state.twoFactorUserId = null;
        },
        underControl: (state) => {
            state.status = 'idle';
            state.response = null;
        },
        stuffAdded: (state, action) => {
            state.status = 'added';
            state.error = null;
            if (action.payload && action.payload.student) {
                const student = action.payload.student;
                state.tempDetails = student;
                const parts = ['Student registered successfully.'];
                if (student.admissionNo) parts.push(`Admission No: ${student.admissionNo}`);
                if (student.email) parts.push(`Email: ${student.email}`);
                if (action.payload.defaultPassword) parts.push(`Password: ${action.payload.defaultPassword}`);
                state.response = parts.join(' ');
            } else {
                state.tempDetails = action.payload;
                state.response = null;
            }
        },
        authSuccess: (state, action) => {
            state.status = 'success';
            const payload = action.payload || {};
            const schoolValue = payload?.school?._id || payload?.schoolId || payload?.school || null;
            const schoolId = schoolValue && typeof schoolValue === 'object'
                ? schoolValue._id || schoolValue.id
                : schoolValue;
            const currentUser = {
                ...payload,
                schoolId: schoolId ? String(schoolId) : null,
            };
            state.currentUser = currentUser;
            state.currentRole = payload.role;
            state.twoFactorRequired = false;
            state.twoFactorMethods = [];
            state.selected2faMethod = null;
            state.twoFactorUserId = null;
            localStorage.setItem('user', JSON.stringify(currentUser));
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            localStorage.setItem('currentRole', payload.role);
            state.response = null;
            state.error = null;
        },
        authFailed: (state, action) => {
            state.status = 'failed';
            state.response = action.payload;
            state.twoFactorRequired = false;
            state.twoFactorMethods = [];
            state.selected2faMethod = null;
            state.twoFactorUserId = null;
        },
        pendingApproval: (state, action) => {
            state.status = 'pendingApproval';
            state.response = action.payload;
            state.error = null;
        },
        authError: (state, action) => {
            state.status = 'error';
            state.error = action.payload;
        },
        authLogout: (state) => {
            localStorage.removeItem('user');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('currentRole');
            state.currentUser = null;
            state.status = 'idle';
            state.error = null;
            state.currentRole = null;
            state.twoFactorRequired = false;
            state.twoFactorMethods = [];
            state.selected2faMethod = null;
            state.twoFactorUserId = null;
        },

        doneSuccess: (state, action) => {
            state.userDetails = action.payload;
            state.loading = false;
            state.error = null;
            state.response = null;
        },
        getDeleteSuccess: (state) => {
            state.loading = false;
            state.error = null;
            state.response = null;
        },

        getRequest: (state) => {
            state.loading = true;
        },
        getFailed: (state, action) => {
            state.response = action.payload;
            state.loading = false;
            state.error = null;
        },
        getError: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        toggleDarkMode: (state) => {
            state.darkMode = !state.darkMode;
        }
    },
});

export const {
    authRequest,
    authTwoFactorPending,
    clearTwoFactorState,
    underControl,
    stuffAdded,
    authSuccess,
    authFailed,
    pendingApproval,
    authError,
    authLogout,
    doneSuccess,
    getDeleteSuccess,
    getRequest,
    getFailed,
    getError,
    toggleDarkMode
} = userSlice.actions;

export const userReducer = userSlice.reducer;