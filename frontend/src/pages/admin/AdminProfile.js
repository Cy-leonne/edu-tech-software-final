// import React, { useState } from 'react';
// import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material'
// import { useDispatch, useSelector } from 'react-redux';
// import { deleteUser, updateUser } from '../../redux/userRelated/userHandle';
// import { useNavigate } from 'react-router-dom'
// import { authLogout } from '../../redux/userRelated/userSlice';
// import { Button, Collapse } from '@mui/material';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Button, TextField, Typography, Box, Alert } from '@mui/material';

const AdminProfile = () => {
    const { currentUser } = useSelector((state) => state.user);
    const [schoolProfile, setSchoolProfile] = useState({
        description: '',
        address: '',
        phone: '',
        email: '',
        website: ''
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

    useEffect(() => {
        if (currentUser?.settings?.schoolProfile) {
            setSchoolProfile(currentUser.settings.schoolProfile);
        }
    }, [currentUser]);

    const canUpdate = currentUser?.permissions?.updateSchoolProfile !== false;

    const saveProfile = async () => {
        try {
            if (!currentUser?._id) return;
            setSaving(true);
            setError('');
            setMessage('');
            const updatedSettings = {
                ...currentUser.settings,
                schoolProfile
            };
            const response = await axios.put(`${API_BASE_URL}/Admin/Settings/${currentUser._id}`, {
                settings: updatedSettings
            });
            setMessage(response.data.message || 'Profile saved successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save profile');
        } finally {
            setSaving(false);
        }
    };
    // const { currentUser, response, error } = useSelector((state) => state.user);
    // const address = "Admin"

    // if (response) { console.log(response) }
    // else if (error) { console.log(error) }

    // const [name, setName] = useState(currentUser.name);
    // const [email, setEmail] = useState(currentUser.email);
    // const [password, setPassword] = useState("");
    // const [schoolName, setSchoolName] = useState(currentUser.schoolName);

    // const fields = password === "" ? { name, email, schoolName } : { name, email, password, schoolName }

    // const submitHandler = (event) => {
    //     event.preventDefault()
    //     dispatch(updateUser(fields, currentUser._id, address))
    // }

    // const deleteHandler = () => {
    //     try {
    //         dispatch(deleteUser(currentUser._id, "Students"));
    //         dispatch(deleteUser(currentUser._id, address));
    //         dispatch(authLogout());
    //         navigate('/');
    //     } catch (error) {
    //         console.error(error);
    //     }
    // }

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
            <Typography variant="h5" gutterBottom>
                School Profile Information
            </Typography>
            {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Typography>Name: {currentUser?.name}</Typography>
            <Typography>Email: {currentUser?.email}</Typography>
            <Typography>School: {currentUser?.schoolName}</Typography>
            <Box sx={{ mt: 3, display: 'grid', gap: 2 }}>
                <TextField
                    label="School Address"
                    value={schoolProfile.address}
                    onChange={(event) => setSchoolProfile({ ...schoolProfile, address: event.target.value })}
                    fullWidth
                    disabled={!canUpdate}
                />
                <TextField
                    label="School Phone"
                    value={schoolProfile.phone}
                    onChange={(event) => setSchoolProfile({ ...schoolProfile, phone: event.target.value })}
                    fullWidth
                    disabled={!canUpdate}
                />
                <TextField
                    label="School Email"
                    value={schoolProfile.email}
                    onChange={(event) => setSchoolProfile({ ...schoolProfile, email: event.target.value })}
                    fullWidth
                    disabled={!canUpdate}
                />
                <TextField
                    label="School Website"
                    value={schoolProfile.website}
                    onChange={(event) => setSchoolProfile({ ...schoolProfile, website: event.target.value })}
                    fullWidth
                    disabled={!canUpdate}
                />
                <TextField
                    label="School Description"
                    value={schoolProfile.description}
                    onChange={(event) => setSchoolProfile({ ...schoolProfile, description: event.target.value })}
                    fullWidth
                    multiline
                    rows={4}
                    disabled={!canUpdate}
                />
                <Button
                    variant="contained"
                    onClick={saveProfile}
                    disabled={!canUpdate || saving}
                >
                    Save School Profile
                </Button>
                {!canUpdate && (
                    <Alert severity="info">You do not have permission to update school profile settings.</Alert>
                )}
            </Box>
        </Box>
    )
}

export default AdminProfile

// const styles = {
//     attendanceButton: {
//         backgroundColor: "#270843",
//         "&:hover": {
//             backgroundColor: "#3f1068",
//         }
//     }
// }