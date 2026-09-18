import { API_BASE_URL } from '../../utils/apiConfig';

import axios from 'axios';
import {
    authRequest,
    authTwoFactorPending,
    authSuccess,
    authFailed,
    pendingApproval,
    authError,
    authLogout,
    doneSuccess,
    getDeleteSuccess,
    getRequest,
    getError,
    stuffAdded,
} from './userSlice';


const getErrorMessage = (error) => {
    if (!error) return 'Unknown error';
    if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        return error.response.data.errors.join('; ') || error.response.data.message || 'Validation errors';
    }
    if (error.response?.data?.message) return error.response.data.message;
    if (error.response?.data) {
        if (typeof error.response.data === 'string') return error.response.data;
        const serialized = JSON.stringify(error.response.data);
        return serialized && serialized !== '{}' ? serialized : 'Login failed. Please try again.';
    }
    if (error.message) return error.message;
    return 'Network Error';
};

export const loginUser = (fields, role) => async (dispatch) => {
    dispatch(authRequest());

    const loginRole = role === 'SuperAdmin' ? 'Admin' : role;
    const url = `${API_BASE_URL}/${loginRole}Login`;

    try {
        const result = await axios.post(url, fields, {
            headers: { 'Content-Type': 'application/json' },
        });

        if (result.status === 202 && result.data.twoFactorRequired) {
            dispatch(authTwoFactorPending({
                methods: result.data.methods || [],
                selectedMethod: result.data.selectedMethod || null,
                userId: result.data.userId || null,
                message: result.data.message || 'Two-factor authentication is required.'
            }));
            return;
        }

        if (result.status >= 200 && result.status < 300) {
            const authenticatedUser = result.data.admin || result.data;
            const userData = {
                ...authenticatedUser,
                token: result.data.token,
                role: authenticatedUser.role || role,
            };
            dispatch(authSuccess(userData));
        } else {
            dispatch(authFailed(result.data.message || 'Login failed'));
        }
    } catch (error) {
        dispatch(authError(getErrorMessage(error)));
    }
};

export const verifyTwoFactorCode = (adminId, method, code) => async (dispatch) => {
    dispatch(authRequest());

    try {
        const result = await axios.post(`${API_BASE_URL}/Admin/2FA/Verify`, { adminId, method, code }, {
            headers: { 'Content-Type': 'application/json' },
        });

        if (result.status >= 200 && result.status < 300) {
            dispatch(authSuccess(result.data.admin));
        } else {
            dispatch(authFailed(result.data.message || '2FA verification failed'));
        }
    } catch (error) {
        dispatch(authError(getErrorMessage(error)));
    }
};

export const sendTwoFactorCode = (adminId, method) => async () => {
    const response = await axios.post(`${API_BASE_URL}/Admin/2FA/SendCode`, { adminId, method }, {
        headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
};

export const registerUser = (fields, role) => async (dispatch, getState) => {
    dispatch(authRequest());

    try {
        const state = getState();
        const currentUser = state?.user?.currentUser;
        const adminId = currentUser?._id;

        const headers = {
            'Content-Type': 'application/json'
        };

        if (adminId) {
            headers['x-admin-id'] = adminId;
        }

        const result = await axios.post(`${API_BASE_URL}/${role}Reg`, fields, { headers });

        if (result.data.admin && result.data.isSuperAdmin) {
            dispatch(authSuccess(result.data.admin));
        }
        else if (result.data.admin) {
            dispatch(pendingApproval(result.data.message));
        }
        else if (result.data.pendingApproval) {
            dispatch(pendingApproval(result.data.message));
        }
        else if (result.data.schoolName) {
            dispatch(authSuccess(result.data));
        }
        else if (result.data.student) {
            dispatch(stuffAdded({ student: result.data.student, defaultPassword: result.data.defaultPassword }));
        }
        else if (result.data.role === 'Student' || result.data.role === 'Teacher') {
            dispatch(stuffAdded(result.data));
        }
        else {
            dispatch(authFailed(result.data.message || 'Registration failed'));
        }
    } catch (error) {
        dispatch(authError(getErrorMessage(error)));
    }
};

export const logoutUser = () => (dispatch) => {
    dispatch(authLogout());
};

export const getUserDetails = (id, address) => async (dispatch, getState) => {
    dispatch(getRequest());

    try {
        const stateUser = getState()?.user?.currentUser;
        const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('currentUser') || 'null') : null;
        const fallbackUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
        const currentUser = stateUser || storedUser || fallbackUser || {};
        const requesterId = currentUser?._id || currentUser?.id || null;
        const headers = { 'Content-Type': 'application/json' };

        if (requesterId) {
            headers['x-admin-id'] = requesterId;
        }

        const result = await axios.get(`${API_BASE_URL}/${address}/${id}`, { headers });
        if (result.data) {
            dispatch(doneSuccess(result.data));
        }
    } catch (error) {
        dispatch(getError(getErrorMessage(error)));
    }
}

// export const deleteUser = (id, address) => async (dispatch) => {
//     dispatch(getRequest());

//     try {
//         const result = await axios.delete(`${API_BASE_URL}/${address}/${id}`);
//         if (result.data.message) {
//             dispatch(getFailed(result.data.message));
//         } else {
//             dispatch(getDeleteSuccess());
//         }
//     } catch (error) {
//         dispatch(getError(error));
//     }
// }


export const deleteUser = (id, address) => async (dispatch, getState) => {
    dispatch(getRequest());

    try {
        const state = getState();
        const stateUser = state?.user?.currentUser;
        const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || 'null') : null;
        const currentUser = stateUser || storedUser || {};
        const adminId = currentUser?._id || currentUser?.id || null;
        const headers = { 'Content-Type': 'application/json' };
        if (adminId) headers['x-admin-id'] = adminId;

        const result = await axios.delete(`${API_BASE_URL}/${address}/${id}`, { headers });
        dispatch(getDeleteSuccess());
        return result.data;
    } catch (error) {
        dispatch(getError(getErrorMessage(error)));
        throw error;
    }
}

export const updateUser = (fields, id, address) => async (dispatch, getState) => {
    dispatch(getRequest());

    try {
        const state = getState();
        const stateUser = state?.user?.currentUser;
        const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || 'null') : null;
        const currentUser = stateUser || storedUser || {};
        const adminId = currentUser?._id || currentUser?.id || null;

        const headers = { 'Content-Type': 'application/json' };
        if (adminId) {
            headers['x-admin-id'] = adminId;
        }

        const result = await axios.put(`${API_BASE_URL}/${address}/${id}`, fields, { headers });
        if (result.data.schoolName) {
            dispatch(authSuccess(result.data));
        }
        else {
            dispatch(doneSuccess(result.data));
        }
        return result.data;
    } catch (error) {
        dispatch(getError(error));
        throw error;
    }
}

export const addStuff = (fields, address) => async (dispatch) => {
    dispatch(authRequest());

    try {
        const result = await axios.post(`${API_BASE_URL}/${address}Create`, fields, {
            headers: { 'Content-Type': 'application/json' },
        });

        if (result.data.message) {
            dispatch(authFailed(result.data.message));
        } else {
            dispatch(stuffAdded(result.data));
        }
    } catch (error) {
        dispatch(authError(error));
    }
};
