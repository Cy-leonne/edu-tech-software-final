import axios from 'axios';
import {
    getRequest,
    getSuccess,
    getFailed,
    getError,
    postDone,
    doneSuccess
} from './teacherSlice';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

export const getAllTeachers = (id, email) => async (dispatch) => {
    dispatch(getRequest());

    try {
        let url = `${API_BASE_URL}/Teachers/${id}`;
        if (email) {
            const encodedEmail = encodeURIComponent(email.trim());
            url += `?email=${encodedEmail}`;
        }
        const headers = { 'x-admin-id': id };
        const result = await axios.get(url, { headers });
        if (result.data.message) {
            dispatch(getFailed(result.data.message));
        } else {
            dispatch(getSuccess(result.data));
        }
    } catch (error) {
        dispatch(getError(error));
    }
}

export const getTeacherDetails = (id) => async (dispatch) => {
    dispatch(getRequest());

    try {
        const result = await axios.get(`${API_BASE_URL}/Teacher/${id}`);
        if (result.data) {
            dispatch(doneSuccess(result.data));
        }
    } catch (error) {
        dispatch(getError(error));
    }
}

export const updateTeachSubject = (teacherId, teachSubject, teachSubjects = []) => async (dispatch) => {
    dispatch(getRequest());

    try {
        const payload = {
            teacherId,
            teachSubject,
            teachSubjects: Array.isArray(teachSubjects) ? teachSubjects : [teachSubject].filter(Boolean)
        };

        await axios.put(`${process.env.REACT_APP_BASE_URL}/TeacherSubject`, payload, {
            headers: { 'Content-Type': 'application/json' },
        });
        dispatch(postDone());
    } catch (error) {
        dispatch(getError(error));
    }
}

export const updateTeacherDetails = (teacherId, updateData) => async (dispatch) => {
    dispatch(getRequest());

    try {
        const result = await axios.put(`${process.env.REACT_APP_BASE_URL}/Teacher/${teacherId}`, updateData, {
            headers: { 'Content-Type': 'application/json' },
        });
        dispatch(doneSuccess(result.data));
        return result.data;
    } catch (error) {
        dispatch(getError(error));
        throw error;
    }
}

export const updateTeacherRole = (teacherId, role) => async (dispatch) => {
    dispatch(getRequest());

    try {
        const result = await axios.put(`${process.env.REACT_APP_BASE_URL}/TeacherRole`, { teacherId, role }, {
            headers: { 'Content-Type': 'application/json' },
        });
        dispatch(doneSuccess(result.data));
    } catch (error) {
        dispatch(getError(error));
    }
}

export const resetTeacherPasswordByAdmin = (teacherId, newPassword) => async (dispatch) => {
    dispatch(getRequest());
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
        const adminId = currentUser?._id || currentUser?.id || null;
        const headers = { 'Content-Type': 'application/json' };
        if (adminId) headers['x-admin-id'] = adminId;

        const result = await axios.post(`${process.env.REACT_APP_BASE_URL}/Teacher/${teacherId}/ResetByAdmin`, { newPassword }, { headers });
        dispatch(doneSuccess(result.data));
        return result.data;
    } catch (error) {
        dispatch(getError(error));
        throw error;
    }
}