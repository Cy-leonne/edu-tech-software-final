
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    loading: false,
    error: null,
    successMessage: null,
    systemSettings: null,
    securitySettings: null,
    reportSettings: null,
    backupStats: null,
};

const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {
        request: (state) => {
            state.loading = true;
            state.error = null;
            state.successMessage = null;
        },
        failure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
            state.successMessage = null;
        },
        setSystemSettings: (state, action) => {
            state.loading = false;
            state.systemSettings = action.payload;
            state.error = null;
        },
        setSecuritySettings: (state, action) => {
            state.loading = false;
            state.securitySettings = action.payload;
            state.error = null;
        },
        setReportSettings: (state, action) => {
            state.loading = false;
            state.reportSettings = action.payload;
            state.error = null;
        },
        setBackupStats: (state, action) => {
            state.loading = false;
            state.backupStats = action.payload;
            state.error = null;
        },
        setSuccess: (state, action) => {
            state.loading = false;
            state.successMessage = action.payload;
            state.error = null;
        },
        clearSettingsState: (state) => {
            state.loading = false;
            state.error = null;
            state.successMessage = null;
        },
    },
});

export const {
    request,
    failure,
    setSystemSettings,
    setSecuritySettings,
    setReportSettings,
    setBackupStats,
    setSuccess,
    clearSettingsState,
} = settingsSlice.actions;

export const settingsReducer = settingsSlice.reducer;
