import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Box, Typography, Paper, TextField, CssBaseline, CircularProgress, Grid } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
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

const ForgotPasswordPage = ({ role = 'Admin' }) => {
    const navigate = useNavigate();

    const getLoginPath = (currentRole) => {
        if (currentRole === 'Admin') return '/Adminlogin';
        if (currentRole === 'SuperAdmin') return '/SuperAdminlogin';
        if (currentRole === 'Student') return '/Studentlogin';
        if (currentRole === 'Teacher') return '/Teacherlogin';
        return '/';
    };
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState(false);
    const [loader, setLoader] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!email) {
            setEmailError(true);
            return;
        }

        setLoader(true);
        try {
            const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';
            const endpointRole = role === 'SuperAdmin' ? 'SuperAdmin' : role === 'Student' ? 'Student' : role === 'Teacher' ? 'Teacher' : 'Admin';
            const response = await axios.post(`${API_BASE_URL}/${endpointRole}/RequestPasswordReset`, {
                email
            });

            setMessage(response.data.message || 'Password reset link sent successfully. Please check your email.');
            setIsSuccess(true);
            setShowPopup(true);
            setEmail('');
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to send reset link. Please try again.';
            setMessage(errorMessage);
            setIsSuccess(false);
            setShowPopup(true);
        } finally {
            setLoader(false);
        }
    };

    const handleInputChange = (event) => {
        const { name } = event.target;
        if (name === 'email') {
            setEmailError(false);
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
                            Forgot Password
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2, textAlign: 'center', color: '#666' }}>
                            Enter your email address and we'll send you a link to reset your password.
                        </Typography>

                        <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 2, width: '100%' }}>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="email"
                                label="Enter your email"
                                name="email"
                                autoComplete="email"
                                autoFocus
                                error={emailError}
                                helperText={emailError && 'Email is required'}
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    handleInputChange(e);
                                }}
                            />

                            <LightPurpleButton
                                type="submit"
                                fullWidth
                                variant="contained"
                                sx={{ mt: 3 }}
                                disabled={loader}
                            >
                                {loader ? (
                                    <CircularProgress size={24} color="inherit" />
                                ) : (
                                    'Send Reset Link'
                                )}
                            </LightPurpleButton>

                            <Box sx={{ mt: 3, textAlign: 'center' }}>
                                <Typography variant="body2">
                                    Remember your password?{' '}
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

export default ForgotPasswordPage;