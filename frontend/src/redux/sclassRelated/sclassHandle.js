import axios from 'axios';
import {
    getRequest,
    getSuccess,
    getFailed,
    getError,
    getStudentsSuccess,
    detailsSuccess,
    getFailedTwo,
    getSubjectsSuccess,
    getSubDetailsSuccess,
    getSubDetailsRequest,
    operationSuccess
} from './sclassSlice';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

export const getAllSclasses = (id, address) => async (dispatch) => {
    dispatch(getRequest());

    try {
        const result = await axios.get(`${API_BASE_URL}/${address}List/${id}`, {
            headers: { 'x-admin-id': id }
        });
        if (result.data.message) {
            dispatch(getFailedTwo(result.data.message));
        } else {
            dispatch(getSuccess(result.data));
        }
    } catch (error) {
        dispatch(getError(error));
    }
}

export const getClassStudents = (id) => async (dispatch, getState) => {
    dispatch(getRequest());

    try {
        const stateUser = getState()?.user?.currentUser;
        const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('currentUser') || 'null') : null;
        const fallbackUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
        const currentUser = stateUser || storedUser || fallbackUser || {};
        const requesterId = currentUser?._id || currentUser?.id || null;
        const headers = requesterId ? { 'x-admin-id': requesterId } : {};

        const result = await axios.get(`${API_BASE_URL}/Sclass/Students/${id}`, { headers });
        if (result.data.message) {
            dispatch(getFailedTwo(result.data.message));
        } else {
            dispatch(getStudentsSuccess(result.data));
        }
    } catch (error) {
        dispatch(getError(error));
    }
}

export const getClassDetails = (id, address) => async (dispatch) => {
    dispatch(getRequest());

    try {
        const result = await axios.get(`${API_BASE_URL}/${address}/${id}`);
        if (result.data) {
            dispatch(detailsSuccess(result.data));
        }
    } catch (error) {
        dispatch(getError(error));
    }
}

export const getSubjectList = (id, address) => async (dispatch, getState) => {
    dispatch(getRequest());

    try {
        const stateUser = getState()?.user?.currentUser;
        const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('currentUser') || 'null') : null;
        const fallbackUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
        const currentUser = stateUser || storedUser || fallbackUser || {};
        const requesterId = currentUser?._id || currentUser?.id || null;
        const schoolId = currentUser?.school?._id || currentUser?.school || currentUser?.schoolId || null;
        const headers = requesterId ? { 'x-admin-id': requesterId } : (schoolId ? { 'x-admin-id': schoolId } : {});

        const result = await axios.get(`${API_BASE_URL}/${address}/${id}`, { headers });
        if (result.data.message) {
            dispatch(getFailed(result.data.message));
        } else {
            dispatch(getSubjectsSuccess(result.data));
        }
    } catch (error) {
        dispatch(getError(error));
    }
}

export const getTeacherFreeClassSubjects = (id) => async (dispatch) => {
    dispatch(getRequest());

    try {
        const result = await axios.get(`${API_BASE_URL}/FreeSubjectList/${id}`);
        if (result.data.message) {
            dispatch(getFailed(result.data.message));
        } else {
            dispatch(getSubjectsSuccess(result.data));
        }
    } catch (error) {
        dispatch(getError(error));
    }
}

export const getSubjectDetails = (id, address) => async (dispatch, getState) => {
    dispatch(getSubDetailsRequest());

    try {
        const stateUser = getState()?.user?.currentUser;
        const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('currentUser') || 'null') : null;
        const fallbackUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
        const currentUser = stateUser || storedUser || fallbackUser || {};
        const requesterId = currentUser?._id || currentUser?.id || null;
        const headers = requesterId ? { 'x-admin-id': requesterId } : {};

        const result = await axios.get(`${API_BASE_URL}/${address}/${id}`, { headers });
        if (result.data) {
            dispatch(getSubDetailsSuccess(result.data));
        }
    } catch (error) {
        dispatch(getError(error));
    }
}

export const promoteClassStudents = (sourceClassId, targetClassId, options = {}) => async (dispatch, getState) => {
    dispatch(getRequest());
    try {
        const stateUser = getState()?.user?.currentUser;
        const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('currentUser') || 'null') : null;
        const fallbackUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
        const currentUser = stateUser || storedUser || fallbackUser || {};
        const schoolId = currentUser?.school?._id || currentUser?.school || currentUser?.schoolId || null;
        const headers = schoolId ? { 'x-admin-id': schoolId } : {};

        const payload = { targetClassId, completedTerms: options.completedTerms };
        if (options.moveSubjects) payload.moveSubjects = true;
        if (options.updateRollNumbers) payload.updateRollNumbers = true;

        const result = await axios.put(`${API_BASE_URL}/Sclass/Promote/${sourceClassId}`, payload, { headers });
        dispatch(operationSuccess());
        return result.data;
    } catch (error) {
        dispatch(getError(error));
        throw error;
    }
}