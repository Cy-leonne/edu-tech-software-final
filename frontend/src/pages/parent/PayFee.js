import { API_BASE_URL } from '../../utils/apiConfig';

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Container, Paper, TextField, Button, Typography, Grid, Card, CardContent, CircularProgress, Alert, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, RadioGroup, FormControlLabel, Radio } from '@mui/material';
import { ArrowBack, Check, Warning, Phone } from '@mui/icons-material';
import axios from 'axios';


const PayFee = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const resolveStudentId = (studentRecord) => {
        if (!studentRecord) return null;
        return studentRecord.id || studentRecord._id || studentRecord.studentId || null;
    };
    const [student, setStudent] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [paymentInProgress, setPaymentInProgress] = useState(false);

    // Form states
    const [tabValue, setTabValue] = useState(0); // 0 = STK Push, 1 = Manual
    const [amount, setAmount] = useState('');
    const [phoneNumber, setPhoneNumber] = useState(''); // Parent enters the M-Pesa number to bill
    const [paymentMethod, setPaymentMethod] = useState('Mpesa');
    const [transactionId, setTransactionId] = useState('');

    // STK Push states
    const [checkoutRequestId, setCheckoutRequestId] = useState(null);
    const [stkDialogOpen, setStkDialogOpen] = useState(false);
    const [stkMessage, setStkMessage] = useState('');
    const pollIntervalRef = useRef(null);

    useEffect(() => {
        const user = localStorage.getItem('currentUser') || localStorage.getItem('user');
        const role = localStorage.getItem('currentRole') || (user ? JSON.parse(user).role : null);

        if (!user || role !== 'Parent') {
            navigate('/Parent/login', { replace: true });
            return;
        }

        const userData = JSON.parse(user);
        setCurrentUser(userData);

        // Get student from location state
        if (location.state?.student) {
            setStudent(location.state.student);
        } else {
            setStudent(userData.student);
        }
    }, [navigate, location]);

    // Cleanup polling when component unmounts
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    // Handle STK Push Initiation
    const handleStkPush = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        const studentId = resolveStudentId(student);
        if (!studentId) {
            setError('Student information is missing. Please return to the dashboard and try again.');
            return;
        }

        if (!amount || Number(amount) <= 0) {
            setError('Please enter a valid payment amount');
            return;
        }

        if (!phoneNumber || phoneNumber.length < 9) {
            setError('Please enter a valid phone number');
            return;
        }

        setLoading(true);
        setStkMessage('Initiating payment...');
        setStkDialogOpen(true);

        try {
            const response = await axios.post(
                `${API_BASE_URL}/Parent/PayFeeStk/${studentId}`,
                {
                    amount: Number(amount),
                    phoneNumber: phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber,
                    parentEmail: currentUser.email,
                }
            );

            if (response.data.checkoutRequestId) {
                setCheckoutRequestId(response.data.checkoutRequestId);
                setStkMessage('✓ Payment prompt sent to ' + phoneNumber + '\n\nEnter your M-Pesa PIN on your phone to complete payment.\n\nWaiting for confirmation...');
                setPaymentInProgress(true);

                // Start polling for payment status
                pollForPaymentStatus(response.data.checkoutRequestId);
            }
        } catch (err) {
            setStkMessage('');
            setError(err.response?.data?.message || 'Failed to initiate payment. Please try again.');
            setLoading(false);
            setStkDialogOpen(false);
        }
    };

    // Poll for STK Push Status
    const pollForPaymentStatus = (checkoutRequestId) => {
        let pollCount = 0;
        const maxPolls = 30; // Poll for up to 30 seconds (every 1 second)

        pollIntervalRef.current = setInterval(async () => {
            pollCount++;

            try {
                const response = await axios.post(
                    `${API_BASE_URL}/Parent/CheckStkStatus`,
                    {
                        checkoutRequestId,
                        studentId: resolveStudentId(student),
                        parentEmail: currentUser?.email,
                    }
                );

                if (response.data.paymentStatus === 'Completed') {
                    clearInterval(pollIntervalRef.current);
                    
                    setStkMessage('✓ Payment successful!\n\nReceipt: ' + response.data.receiptNumber + '\nAmount: KES ' + amount + '\n\nRedirecting...');
                    setSuccess(true);
                    setPaymentInProgress(false);
                    setLoading(false);

                    // Update localStorage
                    const updatedUser = { ...currentUser };
                    updatedUser.student = {
                        ...student,
                        amountPaid: response.data.amountPaid,
                        balance: response.data.balance,
                        paymentStatus: response.data.paymentStatus,
                    };
                    localStorage.setItem('currentUser', JSON.stringify(updatedUser));

                    // Redirect after 3 seconds
                    setTimeout(() => {
                        navigate('/Parent/dashboard', { replace: true });
                    }, 3000);
                } else if (response.data.paymentStatus === 'Cancelled') {
                    clearInterval(pollIntervalRef.current);
                    setStkMessage('');
                    setError('Payment cancelled by user. Please try again.');
                    setPaymentInProgress(false);
                    setLoading(false);
                    setStkDialogOpen(false);
                }
            } catch (err) {
                // Continue polling if error
                if (pollCount >= maxPolls) {
                    clearInterval(pollIntervalRef.current);
                    setStkMessage('');
                    setError('Payment verification timeout. Please check your phone for a confirmation message.');
                    setPaymentInProgress(false);
                    setLoading(false);
                    setStkDialogOpen(false);
                }
            }
        }, 1000);
    };

    // Handle Manual Payment
    const handleManualPayment = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        const studentId = resolveStudentId(student);
        if (!studentId) {
            setError('Student information is missing. Please return to the dashboard and try again.');
            return;
        }

        if (!amount || Number(amount) <= 0) {
            setError('Please enter a valid payment amount');
            return;
        }

        if (paymentMethod !== 'Cash' && !transactionId) {
            setError('Please enter a transaction ID for this payment method');
            return;
        }

        setLoading(true);

        try {
            const response = await axios.put(
                `${API_BASE_URL}/Parent/PayFee/${studentId}`,
                {
                    amount: Number(amount),
                    paymentMethod,
                    transactionId,
                    parentEmail: currentUser.email,
                }
            );

            if (response.data) {
                setSuccess(true);
                setAmount('');
                setTransactionId('');
                
                // Update localStorage
                const updatedUser = { ...currentUser };
                updatedUser.student = {
                    ...student,
                    totalFees: response.data.totalFees ?? student.totalFees,
                    amountPaid: response.data.amountPaid,
                    balance: response.data.balance,
                    paymentStatus: response.data.paymentStatus,
                };
                localStorage.setItem('currentUser', JSON.stringify(updatedUser));

                // Redirect after 2 seconds
                setTimeout(() => {
                    navigate('/Parent/dashboard', { replace: true });
                }, 2000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Payment processing failed. Please try again.');
            setLoading(false);
        }
    };

    if (!student || !currentUser) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ backgroundColor: '#f5f5f5', minHeight: '100vh', py: 4 }}>
            <Container maxWidth="sm">
                <Button
                    startIcon={<ArrowBack />}
                    sx={{ mb: 2, color: '#7f56da' }}
                    onClick={() => navigate('/Parent/dashboard')}
                >
                    Back to Dashboard
                </Button>

                <Paper sx={{ p: 3 }}>
                    <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
                        Pay School Fees
                    </Typography>

                    {success && (
                        <Alert
                            severity="success"
                            icon={<Check />}
                            sx={{ mb: 2 }}
                        >
                            Payment recorded successfully! Redirecting...
                        </Alert>
                    )}

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {/* Student Summary */}
                    <Card sx={{ mb: 3, backgroundColor: '#f9f9f9' }}>
                        <CardContent>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="textSecondary">Student Name</Typography>
                                    <Typography variant="body2">{student.name}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="textSecondary">Admission No</Typography>
                                    <Typography variant="body2">{student.admissionNo}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="textSecondary">Total Fees</Typography>
                                    <Typography variant="h6" sx={{ color: '#7f56da' }}>KES {student.totalFees}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="textSecondary">Outstanding</Typography>
                                    <Typography variant="h6" sx={{ color: '#ff9800' }}>KES {student.balance}</Typography>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* Payment Method Tabs */}
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                            <Tab label="Quick Pay (STK Push)" icon={<Phone />} iconPosition="start" />
                            <Tab label="Manual Entry" />
                        </Tabs>
                    </Box>

                    {/* STK Push Payment Tab */}
                    {tabValue === 0 && (
                        <Box component="form" onSubmit={handleStkPush}>
                            <TextField
                                fullWidth
                                label="Amount to Pay (KES)"
                                type="number"
                                inputProps={{ step: "0.01", min: "0" }}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                margin="normal"
                                placeholder="0.00"
                                helperText={`Maximum: KES ${student.balance}`}
                            />

                            <TextField
                                fullWidth
                                label="Phone Number"
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                margin="normal"
                                placeholder="254712345678 or 0712345678"
                                helperText="Enter M-Pesa registered phone number (starts with 254 or 07)"
                            />

                            <Box sx={{ mt: 2, p: 2, backgroundColor: '#e8f5e9', borderRadius: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                    How it works:
                                </Typography>
                                <Typography variant="caption" display="block">
                                    1. Enter the amount and phone number
                                </Typography>
                                <Typography variant="caption" display="block">
                                    2. Click "Send Payment Prompt"
                                </Typography>
                                <Typography variant="caption" display="block">
                                    3. A popup will appear on your phone
                                </Typography>
                                <Typography variant="caption" display="block">
                                    4. Enter your M-Pesa PIN to complete payment
                                </Typography>
                            </Box>

                            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    onClick={() => navigate('/Parent/dashboard')}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    fullWidth
                                    startIcon={<Phone />}
                                    sx={{ backgroundColor: '#4caf50' }}
                                    disabled={loading || !amount || !phoneNumber || Number(amount) <= 0}
                                >
                                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Payment Prompt'}
                                </Button>
                            </Box>
                        </Box>
                    )}

                    {/* Manual Payment Tab */}
                    {tabValue === 1 && (
                        <Box component="form" onSubmit={handleManualPayment}>
                            <TextField
                                fullWidth
                                label="Amount to Pay (KES)"
                                type="number"
                                inputProps={{ step: "0.01", min: "0" }}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                margin="normal"
                                placeholder="0.00"
                                helperText={`Maximum: KES ${student.balance}`}
                            />

                            <TextField
                                fullWidth
                                select
                                label="Payment Method"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                margin="normal"
                                SelectProps={{
                                    native: true,
                                }}
                            >
                                <option value="Mpesa">M-Pesa Paybill</option>
                                <option value="Paybill">Paybill Direct</option>
                                <option value="Card">Card Payment</option>
                                <option value="BankTransfer">Bank Transfer</option>
                                <option value="Cash">Cash (with receipt)</option>
                            </TextField>

                            {paymentMethod !== 'Cash' && (
                                <TextField
                                    fullWidth
                                    label="Transaction ID / Reference"
                                    value={transactionId}
                                    onChange={(e) => setTransactionId(e.target.value)}
                                    margin="normal"
                                    placeholder="e.g., MRA123456"
                                    helperText="Enter the transaction reference from your payment provider"
                                />
                            )}

                            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    onClick={() => navigate('/Parent/dashboard')}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    fullWidth
                                    sx={{ backgroundColor: '#4caf50' }}
                                    disabled={loading || !amount || Number(amount) <= 0}
                                >
                                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Record Payment'}
                                </Button>
                            </Box>
                        </Box>
                    )}

                    {/* Info Box */}
                    <Box sx={{ mt: 3, p: 2, backgroundColor: '#e3f2fd', borderRadius: 1 }}>
                        <Typography variant="caption" color="textSecondary">
                            <strong>Payment Methods Supported:</strong>
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            <strong>STK Push (Quick Pay):</strong> Instant M-Pesa payment via phone PIN prompt
                        </Typography>
                        <Typography variant="caption" display="block">
                            <strong>Manual Entry:</strong> Record payments made via Paybill, Bank Transfer, or Cash
                        </Typography>
                    </Box>
                </Paper>

                {/* STK Push Dialog */}
                <Dialog open={stkDialogOpen} onClose={() => !paymentInProgress && setStkDialogOpen(false)}>
                    <DialogTitle>M-Pesa Payment</DialogTitle>
                    <DialogContent>
                        <Box sx={{ py: 2, minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                            {loading ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                    <CircularProgress />
                                    <Typography variant="body2">{stkMessage}</Typography>
                                </Box>
                            ) : (
                                <Typography variant="body2" whiteSpace="pre-line">{stkMessage}</Typography>
                            )}
                        </Box>
                    </DialogContent>
                    {!paymentInProgress && (
                        <DialogActions>
                            <Button onClick={() => setStkDialogOpen(false)} color="primary">
                                Close
                            </Button>
                        </DialogActions>
                    )}
                </Dialog>
            </Container>
        </Box>
    );
};

export default PayFee;
