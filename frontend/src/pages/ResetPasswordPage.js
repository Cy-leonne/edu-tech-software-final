import { API_BASE_URL } from '../utils/apiConfig';

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Typography, Paper, TextField, CssBaseline, CircularProgress, Grid, InputAdornment, IconButton } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import bgpic from "../assets/designlogin.jpg"
import { LightPurpleButton } from '../components/buttonStyles';
import styled from 'styled-components';
import Popup from '../components/Popup';
import axios from 'axios';

const defaultTheme = createTheme();

const StyledAnchor = styled.a`
    color: #2c2143;
    text-decoration: underline;
    cursor: pointer;
    font-weight: 500;
    &:hover {
        color: #1a1a2e;
    }
`;

const ResetPasswordPage = ({ role = 'Admin' }) => {
    const navigate = useNavigate();

    const getLoginPath = (currentRole) => {
        if (currentRole === 'Admin') return '/Adminlogin';
        if (currentRole === 'SuperAdmin') return '/SuperAdminlogin';
        if (currentRole === 'Student') return '/Studentlogin';
        if (currentRole === 'Teacher') return '/Teacherlogin';
        return '/';
    };
    const { token } = useParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');
    const [loader, setLoader] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            setMessage('Invalid or missing reset token');
            setIsSuccess(false);
            setShowPopup(true);
        }
    }, [token]);

    const validatePasswords = () => {
        let isValid = true;
        setPasswordError('');
        setConfirmPasswordError('');

        if (!password) {
            setPasswordError('Password is required');
            isValid = false;
        } else if (password.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            isValid = false;
        }

        if (!confirmPassword) {
            setConfirmPasswordError('Please confirm your password');
            isValid = false;
        } else if (password !== confirmPassword) {
            setConfirmPasswordError('Passwords do not match');
            isValid = false;
        }

        return isValid;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!validatePasswords()) {
            return;
        }

        setLoader(true);
        try {
            const endpointRole = role === 'SuperAdmin' ? 'SuperAdmin' : role === 'Student' ? 'Student' : role === 'Teacher' ? 'Teacher' : 'Admin';
            const response = await axios.post(`${API_BASE_URL}/${endpointRole}/ResetPassword/${token}`, {
                password
            });

            setMessage(response.data.message || 'Password reset successfully. Redirecting to login...');
            setIsSuccess(true);
            setShowPopup(true);
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to reset password. Please try again.';
            setMessage(errorMessage);
            setIsSuccess(false);
            setShowPopup(true);
        } finally {
            setLoader(false);
        }
    };

    const handlePopupClose = () => {
        setShowPopup(false);
        if (isSuccess) {
            navigate(getLoginPath(role));
        }
    };

    return (
        <ThemeProvider theme={defaultTheme}>
            <Grid container component="main" sx={{ height: '100vh' }}>
                <CssBaseline />
                <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
                    <Box
                        sx={{
                            my: 8,
                            mx: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}
                    >
                        <Typography variant="h4" sx={{ mb: 2, color: role === 'SuperAdmin' ? '#b71c1c' : '#2c2143' }}>
                            Reset Password
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2, textAlign: 'center', color: '#666' }}>
                            Enter your new password below
                        </Typography>

                        <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 2, width: '100%' }}>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="password"
                                label="New Password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                autoFocus
                                error={!!passwordError}
                                helperText={passwordError}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setPasswordError('');
                                }}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => setShowPassword(!showPassword)}
                                                edge="end"
                                            >
                                                {showPassword ? <Visibility /> : <VisibilityOff />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="confirmPassword"
                                label="Confirm Password"
                                name="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                error={!!confirmPasswordError}
                                helperText={confirmPasswordError}
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    setConfirmPasswordError('');
                                }}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                edge="end"
                                            >
                                                {showConfirmPassword ? <Visibility /> : <VisibilityOff />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <LightPurpleButton
                                type="submit"
                                fullWidth
                                variant="contained"
                                sx={{ mt: 3 }}
                                disabled={loader || !token}
                            >
                                {loader ? (
                                    <CircularProgress size={24} color="inherit" />
                                ) : (
                                    'Reset Password'
                                )}
                            </LightPurpleButton>

                            <Box sx={{ mt: 3, textAlign: 'center' }}>
                                <Typography variant="body2">
                                    <StyledAnchor onClick={() => navigate(getLoginPath(role))}>
                                        Back to Login
                                    </StyledAnchor>
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </Grid>
                <Grid
                    item
                    xs={false}
                    sm={4}
                    md={7}
                    sx={{
                        backgroundImage: `url(${bgpic})`,
                        backgroundRepeat: 'no-repeat',
                        backgroundColor: (t) =>
                            t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />
            </Grid>
            <Popup 
                message={message} 
                setShowPopup={setShowPopup} 
                showPopup={showPopup}
                onClose={handlePopupClose}
            />
        </ThemeProvider>
    );
};

export default ResetPasswordPage;
