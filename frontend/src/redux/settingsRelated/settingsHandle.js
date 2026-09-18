import { API_BASE_URL } from '../../utils/apiConfig';

import axios from 'axios';
import {
    request,
    failure,
    setSystemSettings,
    setSecuritySettings,
    setSuccess,
} from './settingsSlice';


const getCurrentUser = () => {
    try {
        return JSON.parse(localStorage.getItem('currentUser')) || {};
    } catch (error) {
        return {};
    }
};

const getAdminHeaders = () => {
    const currentUser = getCurrentUser();
    const adminId = currentUser?._id || currentUser?.id || null;
    const headers = { 'Content-Type': 'application/json' };
    if (adminId) {
        headers['x-admin-id'] = adminId;
    }
    return headers;
};

const getSchoolId = () => {
    const currentUser = getCurrentUser();
    return currentUser?.school?._id || currentUser?.school || null;
};

const getErrorMessage = (error) => {
    if (!error) return 'Unknown error';
    if (error.response?.data?.message) return error.response.data.message;
    if (error.response?.data) return typeof error.response?.data === 'string' ? error.response.data : JSON.stringify(error.response.data);
    if (error.message) return error.message;
    return 'Network Error';
};

export const fetchSystemSettings = () => async (dispatch) => {
    dispatch(request());
    const schoolId = getSchoolId();
    const headers = getAdminHeaders();

    if (!schoolId) {
        dispatch(failure('School information is missing')); 
        return;
    }

    try {
        const result = await axios.get(`${API_BASE_URL}/School/${schoolId}/SystemSettings`, { headers });
        dispatch(setSystemSettings(result.data.settings));
        return result.data.settings;
    } catch (error) {
        dispatch(failure(getErrorMessage(error)));
        throw error;
    }
};

export const saveSystemSettings = (updates) => async (dispatch) => {
    dispatch(request());
    const schoolId = getSchoolId();
    const headers = getAdminHeaders();

    if (!schoolId) {
        dispatch(failure('School information is missing'));
        return;
    }

    try {
        const result = await axios.put(`${API_BASE_URL}/School/${schoolId}/SystemSettings`, updates, { headers });
        dispatch(setSystemSettings(result.data.settings));
        dispatch(setSuccess('System settings saved successfully'));
        return result.data.settings;
    } catch (error) {
        dispatch(failure(getErrorMessage(error)));
        throw error;
    }
};

export const fetchSecuritySettings = () => async (dispatch) => {
    dispatch(request());
    const schoolId = getSchoolId();
    const headers = getAdminHeaders();

    if (!schoolId) {
        dispatch(failure('School information is missing')); 
        return;
    }

    try {
        const result = await axios.get(`${API_BASE_URL}/School/${schoolId}/SecuritySettings`, { headers });
        dispatch(setSecuritySettings(result.data.securitySettings));
        return result.data.securitySettings;
    } catch (error) {
        dispatch(failure(getErrorMessage(error)));
        throw error;
    }
};

export const saveSecuritySettings = (updates) => async (dispatch) => {
    dispatch(request());
    const schoolId = getSchoolId();
    const headers = getAdminHeaders();

    if (!schoolId) {
        dispatch(failure('School information is missing'));
        return;
    }

    try {
        const result = await axios.put(`${API_BASE_URL}/School/${schoolId}/SecuritySettings`, updates, { headers });
        dispatch(setSecuritySettings(result.data.securitySettings));
        dispatch(setSuccess('Security settings saved successfully'));
        return result.data.securitySettings;
    } catch (error) {
        dispatch(failure(getErrorMessage(error)));
        throw error;
    }
};
