
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Grid, Box, Typography, Paper, Checkbox, FormControlLabel, TextField, CssBaseline, IconButton, InputAdornment, CircularProgress, Backdrop, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import bgpic from "../assets/designlogin.jpg"
import { LightPurpleButton } from '../components/buttonStyles';
import styled from 'styled-components';
import { loginUser, verifyTwoFactorCode, sendTwoFactorCode } from '../redux/userRelated/userHandle';
import { clearTwoFactorState } from '../redux/userRelated/userSlice';
import Popup from '../components/Popup';

const defaultTheme = createTheme();

const LoginPage = ({ role }) => {

    const dispatch = useDispatch()
    const navigate = useNavigate()

    const { status, currentUser, response, error, currentRole, twoFactorRequired, twoFactorMethods, selected2faMethod, twoFactorUserId } = useSelector(state => state.user);;

    const [toggle, setToggle] = useState(false)
    const [guestLoader, setGuestLoader] = useState(false)
    const [loader, setLoader] = useState(false)
    const [showPopup, setShowPopup] = useState(false);
    const [message, setMessage] = useState("");
    const [showPasswordChangeDialog, setShowPasswordChangeDialog] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [changePasswordLoader, setChangePasswordLoader] = useState(false);
    const [showTwoFactorDialog, setShowTwoFactorDialog] = useState(false);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [twoFactorError, setTwoFactorError] = useState('');
    const [twoFactorLoader, setTwoFactorLoader] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState(null);

    const [emailError, setEmailError] = useState(false);
    const [passwordError, setPasswordError] = useState(false);
    const [admissionNumberError, setAdmissionNumberError] = useState(false);
    const [studentNameError, setStudentNameError] = useState(false);

    const handleSubmit = (event) => {
        event.preventDefault();

        if (role === "Student") {
            const email = event.target.email?.value;
            const admissionNo = event.target.admissionNumber?.value;
            const studentName = event.target.studentName?.value;
            const password = event.target.password.value;

            if (!email && !admissionNo) {
                setMessage('Please enter your student email or admission number');
                setShowPopup(true);
                return;
            }
            if (!studentName) {
                setStudentNameError(true);
                return;
            }
            if (!password) {
                setPasswordError(true);
                return;
            }

            const fields = { email: email?.trim().toLowerCase(), admissionNo, studentName, password };
            setLoader(true);
            dispatch(loginUser(fields, role));
        }

        else {
            const email = event.target.email.value;
            const password = event.target.password.value;

            if (!email || !password) {
                if (!email) setEmailError(true);
                if (!password) setPasswordError(true);
                return;
            }

            const fields = { email, password };
            setLoader(true);
            dispatch(loginUser(fields, role));
        }
    };

    const handleTwoFactorSubmit = async (event) => {
        event.preventDefault();
        if (!twoFactorCode) {
            setTwoFactorError('Verification code is required');
            return;
        }
        setTwoFactorLoader(true);
        setTwoFactorError('');
        try {
            await dispatch(verifyTwoFactorCode(twoFactorUserId, selected2faMethod || 'email', twoFactorCode));
        } finally {
            setTwoFactorLoader(false);
        }
    };

    const handleTwoFactorClose = () => {
        setShowTwoFactorDialog(false);
        setTwoFactorCode('');
        setTwoFactorError('');
        dispatch(clearTwoFactorState());
    };

    const handleMethodChange = async (event) => {
        const method = event.target.value;
        setSelectedMethod(method);
        if (method && twoFactorUserId) {
            setResendLoading(true);
            try {
                await dispatch(sendTwoFactorCode(twoFactorUserId, method));
                setMessage(`Verification code resent via ${method}.`);
                setShowPopup(true);
            } catch (error) {
                setMessage(error.response?.data?.message || error.message || 'Failed to resend code');
                setShowPopup(true);
            } finally {
                setResendLoading(false);
            }
        }
    };

    const handleResendCode = async () => {
        if (!selectedMethod || !twoFactorUserId) return;
        setResendLoading(true);
        try {
            await dispatch(sendTwoFactorCode(twoFactorUserId, selectedMethod));
            setMessage(`Verification code resent via ${selectedMethod}.`);
            setShowPopup(true);
        } catch (error) {
            setMessage(error.response?.data?.message || error.message || 'Failed to resend code');
            setShowPopup(true);
        } finally {
            setResendLoading(false);
        }
    };

    const handleInputChange = (event) => {
        const { name } = event.target;
        if (name === 'email') setEmailError(false);
        if (name === 'password') setPasswordError(false);
        if (name === 'admissionNumber') setAdmissionNumberError(false);
        if (name === 'studentName') setStudentNameError(false);
    };

    const getPortalPath = (userRole) => {
        if (userRole === 'SuperAdmin' || userRole === 'Admin') return '/Admin/dashboard';
        if (userRole === 'Teacher') return '/Teacher/dashboard';
        if (userRole === 'Student') return '/Student/dashboard';
        if (userRole === 'Accountant') return '/Accountant';
        if (userRole === 'HR') return '/HR';
        return '/';
    };

    const hasAcceptedLegalDocuments = (user) => {
        const userId = user?._id || user?.id;
        if (!userId) return false;
        try {
            return Boolean(localStorage.getItem(`edutechh-legal-accepted:${userId}`));
        } catch {
            return false;
        }
    };

    const guestModeHandler = () => {
        const password = "zxc"

        if (role === "Admin") {
            const email = "yogendra@12"
            const fields = { email, password }
            setGuestLoader(true)
            dispatch(loginUser(fields, role))
        }
        else if (role === "Student") {
            const admissionNo = "1"
            const studentName = "Dipesh Awasthi"
            const fields = { admissionNo, studentName, password }
            setGuestLoader(true)
            dispatch(loginUser(fields, role))
        }
        else if (role === "Teacher") {
            const email = "tony@12"
            const fields = { email, password }
            setGuestLoader(true)
            dispatch(loginUser(fields, role))
        }
        else if (role === "SuperAdmin") {
            const email = "yogendra@12"
            const fields = { email, password }
            setGuestLoader(true)
            dispatch(loginUser(fields, "SuperAdmin"))
        }
    }

    useEffect(() => {
        if (twoFactorRequired && selected2faMethod) {
            setSelectedMethod(selected2faMethod);
        }
    }, [twoFactorRequired, selected2faMethod]);

    useEffect(() => {
        const targetRole = currentRole || role;
        if (status === 'success') {
            const user = currentUser || JSON.parse(localStorage.getItem('user') || 'null');
            if (targetRole === 'Student' && user?.forcePasswordChange) {
                setShowPasswordChangeDialog(true);
                setLoader(false);
                setGuestLoader(false);
                return;
            }
            const path = getPortalPath(targetRole);
            navigate(hasAcceptedLegalDocuments(user) ? path : '/acceptance', {
                state: { returnTo: path },
            });
        }
        else if (status === 'twoFactorRequired') {
            setMessage(response || 'Two-factor authentication is required.');
            setShowPopup(true);
            setShowTwoFactorDialog(true);
            setLoader(false);
            setGuestLoader(false);
        }
        else if (status === 'failed') {
            setMessage(response || 'Login failed');
            setShowPopup(true);
            setLoader(false);
            setGuestLoader(false);
        }
        else if (status === 'error') {
            setMessage(error || 'Network Error');
            setShowPopup(true);
            setLoader(false);
            setGuestLoader(false);
        }
    }, [status, currentRole, role, navigate, error, response, twoFactorRequired]);

    const handlePasswordChangeSubmit = async (event) => {
        event.preventDefault();
        if (!newPassword || newPassword.length < 6) {
            setMessage('New password must be at least 6 characters');
            setShowPopup(true);
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setMessage('Passwords do not match');
            setShowPopup(true);
            return;
        }

        setChangePasswordLoader(true);
        try {
            const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';
            const response = await fetch(`${API_BASE_URL}/Student/ChangePassword`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: currentUser?._id || JSON.parse(localStorage.getItem('user') || 'null')?._id,
                    currentPassword,
                    newPassword,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to change password');
            }
            setShowPasswordChangeDialog(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
            setMessage('Password updated successfully. You can now continue to your portal.');
            setShowPopup(true);
            navigate('/Student/dashboard');
        } catch (error) {
            setMessage(error.message || 'Failed to change password');
            setShowPopup(true);
        } finally {
            setChangePasswordLoader(false);
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
                            {role} Login
                        </Typography>
                        <Typography variant="h7">
                            Welcome back! Please enter your details
                        </Typography>
                        <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 2 }}>
                            {role === "Student" ? (
                                <>
                                    <TextField
                                        margin="normal"
                                        fullWidth
                                        id="email"
                                        label="Enter your student email"
                                        name="email"
                                        autoComplete="email"
                                        type="email"
                                        error={emailError}
                                        helperText={emailError && 'Email is required'}
                                        onChange={handleInputChange}
                                    />
                                    <Typography variant="body2" sx={{ mt: 1, mb: 2, color: '#555' }}>
                                        Or use Admission Number and Name to login.
                                    </Typography>
                                    <TextField
                                        margin="normal"
                                        fullWidth
                                        id="admissionNumber"
                                        label="Admission Number"
                                        name="admissionNumber"
                                        autoComplete="off"
                                        type="text"
                                        error={admissionNumberError}
                                        helperText={admissionNumberError && 'Admission Number is required'}
                                        onChange={handleInputChange}
                                    />
                                    <TextField
                                        margin="normal"
                                        required
                                        fullWidth
                                        id="studentName"
                                        label="Student Name"
                                        name="studentName"
                                        autoComplete="name"
                                        error={studentNameError}
                                        helperText={studentNameError && 'Name is required'}
                                        onChange={handleInputChange}
                                    />
                                </>
                            ) : (
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
                                    onChange={handleInputChange}
                                />
                            )}
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="password"
                                label="Password"
                                type={toggle ? 'text' : 'password'}
                                id="password"
                                autoComplete="current-password"
                                error={passwordError}
                                helperText={passwordError && 'Password is required'}
                                onChange={handleInputChange}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setToggle(!toggle)}>
                                                {toggle ? (
                                                    <Visibility />
                                                ) : (
                                                    <VisibilityOff />
                                                )}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <Grid container sx={{ display: "flex", justifyContent: "space-between" }}>
                                <FormControlLabel
                                    control={<Checkbox value="remember" color="primary" />}
                                    label="Remember me"
                                />
                                <StyledAnchor href="#" onClick={(e) => {
                                    e.preventDefault();
                                    navigate(`/${role}/forgot-password`);
                                }}>
                                    Forgot password?
                                </StyledAnchor>
                            </Grid>
                            <LightPurpleButton
                                type="submit"
                                fullWidth
                                variant="contained"
                                sx={{ mt: 3 }}
                            >
                                {loader ?
                                    <CircularProgress size={24} color="inherit" />
                                    : "Login"}
                            </LightPurpleButton>
                            <Button
                                fullWidth
                                onClick={guestModeHandler}
                                variant="outlined"
                                sx={{ mt: 2, mb: 3, color: "#7f56da", borderColor: "#7f56da" }}
                            >
                                Login as Guest
                            </Button>
                            {(role === "Admin" || role === "SuperAdmin") &&
                                <Grid container>
                                    <Grid>
                                        Don't have an account?
                                    </Grid>
                                    <Grid item sx={{ ml: 2 }}>
                                        <StyledLink to={role === 'SuperAdmin' ? '/SuperAdminregister' : '/Adminregister'}>
                                            Sign up
                                        </StyledLink>
                                    </Grid>
                                </Grid>
                            }
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
            <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
                open={guestLoader}
            >
                <CircularProgress color="primary" />
                Please Wait
            </Backdrop>
            <Dialog open={showPasswordChangeDialog} onClose={() => setShowPasswordChangeDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Set a new password</DialogTitle>
                <DialogContent>
                    <Box component="form" onSubmit={handlePasswordChangeSubmit} sx={{ mt: 1 }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Current password"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="New password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Confirm new password"
                            type="password"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                        />
                        <DialogActions sx={{ px: 0, pt: 2 }}>
                            <Button onClick={() => setShowPasswordChangeDialog(false)}>Cancel</Button>
                            <LightPurpleButton type="submit" variant="contained" disabled={changePasswordLoader}>
                                {changePasswordLoader ? <CircularProgress size={24} color="inherit" /> : 'Update Password'}
                            </LightPurpleButton>
                        </DialogActions>
                    </Box>
                </DialogContent>
            </Dialog>
            <Dialog open={showTwoFactorDialog} onClose={handleTwoFactorClose} maxWidth="sm" fullWidth>
                <DialogTitle>Two-factor authentication required</DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>
                        {`Enter the verification code sent via ${selectedMethod || selected2faMethod || 'your configured method'}.`}
                    </Typography>
                    {twoFactorMethods?.length > 1 && (
                        <TextField
                            margin="normal"
                            fullWidth
                            select
                            label="Verification method"
                            value={selectedMethod || selected2faMethod || ''}
                            onChange={handleMethodChange}
                            SelectProps={{ native: true }}
                        >
                            <option value="" disabled>Select a method</option>
                            {twoFactorMethods.map((method) => (
                                <option key={method} value={method}>
                                    {method === 'authenticator_app' ? 'Authenticator App' : method === 'backup_codes' ? 'Backup Code' : method}
                                </option>
                            ))}
                        </TextField>
                    )}
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        label="Verification Code"
                        type="text"
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value)}
                        error={Boolean(twoFactorError)}
                        helperText={twoFactorError}
                    />
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                        {response}
                    </Typography>
                    <Button
                        size="small"
                        onClick={handleResendCode}
                        disabled={!selectedMethod || resendLoading}
                        sx={{ mt: 1 }}
                    >
                        {resendLoading ? 'Resending...' : 'Resend code'}
                    </Button>
                </DialogContent>
                <DialogActions sx={{ px: 0, pt: 2 }}>
                    <Button onClick={handleTwoFactorClose}>Cancel</Button>
                    <LightPurpleButton onClick={handleTwoFactorSubmit} variant="contained" disabled={twoFactorLoader}>
                        {twoFactorLoader ? <CircularProgress size={24} color="inherit" /> : 'Verify'}
                    </LightPurpleButton>
                </DialogActions>
            </Dialog>
            <Popup message={message} setShowPopup={setShowPopup} showPopup={showPopup} />
        </ThemeProvider>
    );
}

export default LoginPage

const StyledLink = styled(Link)`
    margin-top: 9px;
    text-decoration: none;
    color: #7f56da;
`;

const StyledAnchor = styled.a`
    margin-top: 9px;
    text-decoration: none;
    color: #7f56da;
    cursor: pointer;
`;
