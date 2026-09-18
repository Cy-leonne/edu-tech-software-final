import { API_BASE_URL } from '../../../utils/apiConfig';

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CircularProgress, Button, TextField, Box, Typography } from '@mui/material';
import Popup from '../../../components/Popup';


const AddHR = () => {
    const navigate = useNavigate();
    const { currentUser } = useSelector((state) => state.user);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loader, setLoader] = useState(false);
    const [message, setMessage] = useState('');
    const [showPopup, setShowPopup] = useState(false);

    const submitHandler = async (event) => {
        event.preventDefault();
        setLoader(true);
        setShowPopup(false);

        try {
            const headers = {
                'Content-Type': 'application/json'
            };
            let storedUser = null;
            if (typeof window !== 'undefined') {
                try {
                    const rawStoredUser = localStorage.getItem('user') || localStorage.getItem('currentUser') || '{}';
                    storedUser = JSON.parse(rawStoredUser);
                } catch (error) {
                    storedUser = null;
                }
            }
            const adminId = currentUser?._id || currentUser?.id || storedUser?._id || storedUser?.id || storedUser?.adminId || storedUser?.userId || null;
            if (adminId) {
                headers['x-admin-id'] = adminId;
            }
            const payload = { name, email, password };
            if (adminId) {
                payload.adminID = adminId;
            }
            const result = await axios.post(
                `${API_BASE_URL}/Admin/HR/Register`,
                payload,
                { headers }
            );

            const successMessage = result.data?.message || 'HR account created successfully.';
            setMessage(successMessage);
            setShowPopup(true);
        } catch (error) {
            const payload = error.response?.data;
            const errorMessage = payload?.message || (Array.isArray(payload?.errors) ? payload.errors.join('; ') : error.message || 'Registration failed');
            setMessage(errorMessage);
            setShowPopup(true);
        } finally {
            setLoader(false);
        }
    };

    return (
        <Box sx={{ p: 3, maxWidth: 560, mx: 'auto' }}>
            <Typography variant="h5" gutterBottom>
                Register HR Staff
            </Typography>
            <Box component="form" onSubmit={submitHandler} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                    label="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                <TextField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <TextField
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    helperText="At least 6 characters and one number"
                    required
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                    <Button variant="outlined" onClick={() => navigate('/Admin/hrs')}>
                        Back to HR Staff
                    </Button>
                    <Button type="submit" variant="contained" disabled={loader}>
                        {loader ? <CircularProgress size={24} color="inherit" /> : 'Register HR Staff'}
                    </Button>
                </Box>
            </Box>
            <Popup message={message} setShowPopup={setShowPopup} showPopup={showPopup} />
        </Box>
    );
};

export default AddHR;
