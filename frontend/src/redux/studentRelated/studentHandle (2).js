
import axios from 'axios';
import {
    getRequest,
    getSuccess,
    getFailed,
    getError,
    stuffDone
} from './studentSlice';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

export const getAllStudents = (schoolId, requesterId = schoolId) => async (dispatch) => {
    dispatch(getRequest());

    try {
        const result = await axios.get(`${API_BASE_URL}/Students/${schoolId}`, {
            headers: { 'x-admin-id': requesterId }
        });
        if (result.data.message) {
            dispatch(getFailed(result.data.message));
        } else {
            dispatch(getSuccess(result.data));
        }
    } catch (error) {
        dispatch(getError(error));
    }
}

export const searchStudents = (schoolId, query, requesterId) => async (dispatch) => {
    dispatch(getRequest());

    try {
        const result = await axios.get(`${API_BASE_URL}/Student/Search/${schoolId}`, {
            headers: { 'x-admin-id': requesterId || schoolId },
            params: { query }
        });

        if (result.data.results) {
            dispatch(getSuccess(result.data.results));
        } else if (result.data.message && Array.isArray(result.data.results)) {
            dispatch(getSuccess(result.data.results));
        } else if (result.data.message) {
            dispatch(getFailed(result.data.message));
        } else {
            dispatch(getSuccess([]));
        }

        return result.data;
    } catch (error) {
        dispatch(getError(error));
        throw error;
    }
}

export const resetStudentPasswordByAdmin = (studentId, newPassword) => async (dispatch) => {
    dispatch(getRequest());
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
        const adminId = currentUser?._id || currentUser?.id || null;
        const headers = { 'Content-Type': 'application/json' };
        if (adminId) headers['x-admin-id'] = adminId;

        const result = await axios.post(`${API_BASE_URL}/Student/${studentId}/ResetByAdmin`, { newPassword }, { headers });
        dispatch(stuffDone());
        return result.data;
    } catch (error) {
        dispatch(getError(error));
        throw error;
    }
}

export const updateStudentFields = (id, fields, address) => async (dispatch) => {
    dispatch(getRequest());

    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
        const userId = currentUser?._id || currentUser?.id || null;
        const headers = { 'Content-Type': 'application/json' };
        if (userId) {
            headers['x-admin-id'] = userId;
            headers['x-user-id'] = userId;
        }

        const result = await axios.put(`${API_BASE_URL}/${address}/${id}`, fields, { headers });
        if (result.data.message) {
            dispatch(getFailed(result.data.message));
        } else {
            dispatch(stuffDone());
        }
        return result.data;
    } catch (error) {
        dispatch(getError(error.response?.data?.message || error.message || 'Request failed'));
    }
}

export const payStudentFee = (id, paymentFields) => async (dispatch) => {
    dispatch(getRequest());

    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
        const adminId = currentUser?._id || currentUser?.id || null;
        const headers = { 'Content-Type': 'application/json' };
        if (adminId) headers['x-admin-id'] = adminId;

        const result = await axios.put(`${API_BASE_URL}/StudentPayment/${id}`, paymentFields, { headers });
        if (result.data.message) {
            dispatch(getFailed(result.data.message));
        } else {
            dispatch(stuffDone());
        }
        return result.data;
    } catch (error) {
        dispatch(getError(error));
        throw error;
    }
}

export const removeStuff = (id, address) => async (dispatch) => {
    dispatch(getRequest());

    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
        const adminId = currentUser?._id || currentUser?.id || null;
        const headers = {};
        if (adminId) headers['x-admin-id'] = adminId;

        const result = await axios.put(`${API_BASE_URL}/${address}/${id}`, {}, { headers });
        if (result.data.message) {
            dispatch(getFailed(result.data.message));
        } else {
            dispatch(stuffDone());
        }
    } catch (error) {
        dispatch(getError(error));
    }
}
