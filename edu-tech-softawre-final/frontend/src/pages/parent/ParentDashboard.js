
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Grid, Paper, Typography, Button, Card, CardContent, LinearProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, FormHelperText } from '@mui/material';
import { AttachMoney, History, Payment, Refresh } from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const ParentDashboard = () => {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [studentInfo, setStudentInfo] = useState(null);
    const [children, setChildren] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [openPayDialog, setOpenPayDialog] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Paybill');
    const [transactionId, setTransactionId] = useState('');
    const [payError, setPayError] = useState('');
    const [payLoading, setPayLoading] = useState(false);
    const [paySuccess, setPaySuccess] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const refreshStudentInfo = async (studentId, email) => {
        if (!studentId || !email) return;

        try {
            setRefreshing(true);
            const response = await axios.get(
                `${API_BASE_URL}/Parent/StudentFees/${studentId}`,
                { params: { parentEmail: email } }
            );

            if (response.data) {
                const normalizedStudent = {
                    ...response.data,
                    totalFees: response.data.totalFees ?? 0,
                    amountPaid: response.data.amountPaid ?? 0,
                    balance: response.data.balance ?? (response.data.totalFees ?? 0),
                    paymentStatus: response.data.paymentStatus || 'Pending',
                };
                setStudentInfo(normalizedStudent);
                const updatedUser = { ...currentUser, student: normalizedStudent };
                localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                setCurrentUser(updatedUser);
            }
        } catch (err) {
            console.error('Failed to refresh selected student fee info', err);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        // Get user from localStorage
        const user = localStorage.getItem('currentUser') || localStorage.getItem('user');
        const role = localStorage.getItem('currentRole') || (user ? JSON.parse(user).role : null);

        if (!user || role !== 'Parent') {
            navigate('/Parent/login', { replace: true });
            return;
        }

        const userData = JSON.parse(user);
        setCurrentUser(userData);
        setStudentInfo(userData.student);
        setSelectedStudentId(userData.student?.id || null);

        const fetchChildren = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/Parent/Students/${encodeURIComponent(userData.email)}`);
                const studentList = response.data?.value ?? response.data;
                if (studentList && Array.isArray(studentList)) {
                    const normalizedChildren = studentList.map((child) => ({
                        ...child,
                        totalFees: child.totalFees ?? 0,
                        amountPaid: child.amountPaid ?? 0,
                        balance: child.balance ?? (child.totalFees ?? 0),
                        paymentStatus: child.paymentStatus || 'Pending',
                    }));
                    setChildren(normalizedChildren);
                    const initialChild = normalizedChildren.find((child) => child.id === userData.student?.id) || normalizedChildren[0];
                    if (initialChild) {
                        setSelectedStudentId(initialChild.id);
                        setStudentInfo(initialChild);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch parent children', err);
            } finally {
                setLoading(false);
            }
        };

        fetchChildren();
    }, [navigate]);

    useEffect(() => {
        if (currentUser?.email && selectedStudentId && !refreshing) {
            refreshStudentInfo(selectedStudentId, currentUser.email);
        }
    }, [selectedStudentId, currentUser?.email]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentRole');
        navigate('/Parent/login', { replace: true });
    };

    const handleRefreshPortal = () => {
        refreshStudentInfo(selectedStudentId, currentUser?.email);
    };

    const resolveStudentId = (studentRecord) => {
        if (!studentRecord) return null;
        return studentRecord.id || studentRecord._id || studentRecord.studentId || null;
    };

    const handlePayFee = () => {
        navigate('/Parent/pay-fee', { state: { student: studentInfo } });
    };

    const handleClosePayDialog = () => {
        setOpenPayDialog(false);
        setPaymentAmount('');
        setTransactionId('');
        setPayError('');
        setPaySuccess(false);
    };

    const handleProcessPayment = async () => {
        setPayError('');
        setPaySuccess(false);

        const studentId = resolveStudentId(studentInfo);
        if (!studentId) {
            setPayError('Student information is missing. Please refresh the page and try again.');
            return;
        }

        if (!paymentAmount || Number(paymentAmount) <= 0) {
            setPayError('Please enter a valid payment amount');
            return;
        }

        if (paymentMethod !== 'Cash' && !transactionId) {
            setPayError('Please enter a transaction ID or reference for this payment method');
            return;
        }

        setPayLoading(true);

        try {
            const response = await axios.put(
                `${API_BASE_URL}/Parent/PayFee/${studentId}`,
                {
                    amount: Number(paymentAmount),
                    paymentMethod,
                    transactionId,
                    parentEmail: currentUser.email,
                }
            );

            if (response.data) {
                setPaySuccess(true);
                setPaymentAmount('');
                setTransactionId('');

                const updatedUser = { ...currentUser };
                updatedUser.student = {
                    ...studentInfo,
                    amountPaid: response.data.amountPaid,
                    balance: response.data.balance,
                    paymentStatus: response.data.paymentStatus,
                };
                localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                setCurrentUser(updatedUser);
                setStudentInfo(updatedUser.student);

                setTimeout(() => {
                    handleClosePayDialog();
                }, 1500);
            }
        } catch (err) {
            setPayError(err.response?.data?.message || 'Payment processing failed. Please try again.');
        } finally {
            setPayLoading(false);
        }
    };

    const handlePaymentHistory = () => {
        navigate('/Parent/payment-history', { state: { student: studentInfo } });
    };

    const handleStudentChange = (id) => {
        const selectedChild = children.find((child) => child.id === id);
        if (selectedChild) {
            setSelectedStudentId(id);
            setStudentInfo(selectedChild);
        }
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
    }

    if (!currentUser || !studentInfo) {
        return <Box sx={{ p: 3, color: 'error.main' }}>Unable to load parent information</Box>;
    }

    const feeDataAvailable = Number(studentInfo.totalFees || 0) > 0 || Number(studentInfo.amountPaid || 0) > 0 || Number(studentInfo.balance || 0) > 0;
    const paymentPercentage = feeDataAvailable && studentInfo.totalFees > 0 ? (studentInfo.amountPaid / studentInfo.totalFees) * 100 : 0;
    const isFullyPaid = feeDataAvailable ? studentInfo.balance === 0 : false;
    const statusColor = isFullyPaid ? 'success.main' : feeDataAvailable && studentInfo.balance < studentInfo.totalFees / 2 ? 'warning.main' : 'error.main';
    const statusText = feeDataAvailable ? (isFullyPaid ? '✓ Fully Paid' : `Outstanding: KES ${studentInfo.balance}`) : 'Fee details pending';

    return (
        <Box sx={{ backgroundColor: '#f5f5f5', minHeight: '100vh', pb: 4 }}>
            {/* Header */}
            <Box sx={{ backgroundColor: '#7f56da', color: 'white', p: 3, mb: 3 }}>
                <Container maxWidth="lg">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Parent Portal</Typography>
                            <Typography variant="body2">Welcome, {currentUser.name}</Typography>
                        </Box>
                        <Button variant="outlined" sx={{ color: 'white', borderColor: 'white' }} onClick={handleLogout}>
                            Logout
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<Refresh />}
                            sx={{ color: 'white', borderColor: 'white', ml: 1 }}
                            onClick={handleRefreshPortal}
                            disabled={refreshing || !selectedStudentId || !currentUser?.email}
                        >
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </Button>
                    </Box>
                </Container>
            </Box>

            <Container maxWidth="lg">
                {/* Student Info Card */}
                <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Student Information
                                </Typography>
                                {children.length > 1 && (
                                    <FormControl fullWidth sx={{ mb: 2 }}>
                                        <InputLabel id="student-select-label">Select Child</InputLabel>
                                        <Select
                                            labelId="student-select-label"
                                            value={selectedStudentId || ''}
                                            label="Select Child"
                                            onChange={(e) => handleStudentChange(e.target.value)}
                                        >
                                            {children.map((child) => (
                                                <MenuItem key={child.id} value={child.id}>
                                                    {child.name} ({child.admissionNo})
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                )}
                                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                                    {studentInfo.name}
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Typography variant="body2" color="textSecondary">Admission No</Typography>
                                        <Typography>{studentInfo.admissionNo}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="body2" color="textSecondary">Roll No</Typography>
                                        <Typography>{studentInfo.rollNum}</Typography>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Payment Status Card */}
                    <Grid item xs={12} md={6}>
                        <Card sx={{ backgroundColor: isFullyPaid ? '#f1f8f4' : '#fff3e0' }}>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Payment Status
                                </Typography>
                                <Typography variant="h6" sx={{ color: statusColor, fontWeight: 'bold', mb: 1 }}>
                                    {statusText}
                                </Typography>
                                <LinearProgress variant="determinate" value={Math.min(paymentPercentage, 100)} sx={{ mb: 1 }} />
                                <Typography variant="caption" color="textSecondary">
                                    {paymentPercentage.toFixed(1)}% paid
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Fee Summary */}
                <Box sx={{ mb: 3 }}>
                    <Paper sx={{ p: 3, backgroundColor: '#edf7ed', border: '1px solid #c8e6c9' }}>
                        <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>Need to pay fees?</Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>Use the button below to pay via Paybill, Pochi, M-Pesa, card, bank transfer, or cash.</Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<Payment />}
                                onClick={handlePayFee}
                                disabled={isFullyPaid}
                            >
                                {isFullyPaid ? 'Fees Settled' : 'Pay School Fees'}
                            </Button>
                            <Button
                                variant="outlined"
                                color="primary"
                                onClick={() => refreshStudentInfo(selectedStudentId, currentUser?.email)}
                                disabled={refreshing || !selectedStudentId || !currentUser?.email}
                            >
                                {refreshing ? 'Refreshing...' : 'Refresh Fee Info'}
                            </Button>
                        </Box>
                    </Paper>
                </Box>

                <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                            <AttachMoney sx={{ fontSize: 40, color: '#7f56da', mb: 1 }} />
                            <Typography color="textSecondary" variant="caption">Total Fees</Typography>
                            <Typography variant="h6">KES {studentInfo.totalFees}</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#e8f5e9' }}>
                            <Payment sx={{ fontSize: 40, color: '#4caf50', mb: 1 }} />
                            <Typography color="textSecondary" variant="caption">Amount Paid</Typography>
                            <Typography variant="h6" sx={{ color: '#4caf50' }}>KES {studentInfo.amountPaid}</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#fff3e0' }}>
                            <AttachMoney sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
                            <Typography color="textSecondary" variant="caption">Balance</Typography>
                            <Typography variant="h6" sx={{ color: '#ff9800' }}>KES {studentInfo.balance}</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#f3e5f5' }}>
                            <History sx={{ fontSize: 40, color: '#9c27b0', mb: 1 }} />
                            <Typography color="textSecondary" variant="caption">Status</Typography>
                            <Typography variant="h6" sx={{ color: '#9c27b0' }}>{studentInfo.paymentStatus}</Typography>
                        </Paper>
                    </Grid>
                </Grid>

                {/* Action Buttons */}
                <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Button
                        variant="contained"
                        sx={{ backgroundColor: '#4caf50', '&:hover': { backgroundColor: '#43a047' } }}
                        startIcon={<Payment />}
                        onClick={handlePayFee}
                        disabled={isFullyPaid}
                    >
                        {isFullyPaid ? 'Fees Settled' : 'Pay Fee'}
                    </Button>

                    <Button
                        variant="outlined"
                        sx={{ color: '#7f56da', borderColor: '#7f56da' }}
                        startIcon={<History />}
                        onClick={handlePaymentHistory}
                    >
                        View Payment History
                    </Button>
                    <Button
                        variant="outlined"
                        sx={{ color: '#1976d2', borderColor: '#1976d2' }}
                        onClick={() => navigate('/Parent/timetable')}
                    >
                        View Timetable
                    </Button>
                </Box>

                <Dialog open={openPayDialog} onClose={handleClosePayDialog} fullWidth maxWidth="sm">
                    <DialogTitle>Pay School Fees</DialogTitle>
                    <DialogContent>
                        {paySuccess && (
                            <Box sx={{ mb: 2, p: 2, backgroundColor: '#e8f5e9', borderRadius: 1, color: '#2e7d32' }}>
                                Payment recorded successfully.
                            </Box>
                        )}
                        {payError && (
                            <Box sx={{ mb: 2, p: 2, backgroundColor: '#ffebee', borderRadius: 1, color: '#c62828' }}>
                                {payError}
                            </Box>
                        )}
                        <Typography variant="subtitle2" sx={{ mb: 2 }}>
                            Choose a payment method and enter the amount to pay.
                        </Typography>
                        <FormControl fullWidth margin="normal">
                            <TextField
                                fullWidth
                                label="Amount to Pay (KES)"
                                type="number"
                                inputProps={{ step: '0.01', min: '0' }}
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                helperText={`Outstanding balance: KES ${studentInfo.balance}`}
                            />
                        </FormControl>
                        <FormControl fullWidth margin="normal">
                            <InputLabel id="payment-method-label">Payment Method</InputLabel>
                            <Select
                                labelId="payment-method-label"
                                value={paymentMethod}
                                label="Payment Method"
                                onChange={(e) => setPaymentMethod(e.target.value)}
                            >
                                <MenuItem value="Paybill">Paybill</MenuItem>
                                <MenuItem value="Mpesa">M-Pesa</MenuItem>
                                <MenuItem value="Pochi">Pochi</MenuItem>
                                <MenuItem value="Card">Card</MenuItem>
                                <MenuItem value="BankTransfer">Bank Transfer</MenuItem>
                                <MenuItem value="Cash">Cash</MenuItem>
                            </Select>
                            <FormHelperText>Pick the payment channel you used.</FormHelperText>
                        </FormControl>
                        {paymentMethod !== 'Cash' && (
                            <TextField
                                fullWidth
                                label="Transaction ID / Reference"
                                value={transactionId}
                                onChange={(e) => setTransactionId(e.target.value)}
                                margin="normal"
                                placeholder="Enter your transaction reference"
                            />
                        )}
                        <Box sx={{ mt: 2, backgroundColor: '#f3f3f3', borderRadius: 1, p: 2 }}>
                            <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>
                                If you are paying via Paybill, use the school Paybill and enter the M-Pesa reference here.
                                For Pochi, Card, bank transfer, or cash, enter the payment reference or receipt number.
                            </Typography>
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button onClick={handleClosePayDialog} disabled={payLoading}>Cancel</Button>
                        <Button
                            onClick={handleProcessPayment}
                            variant="contained"
                            disabled={payLoading || isFullyPaid}
                        >
                            {payLoading ? 'Processing...' : 'Submit Payment'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Payment History Preview */}
                {studentInfo.paymentHistory && studentInfo.paymentHistory.length > 0 && (
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Recent Payments</Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                        <TableCell>Date</TableCell>
                                        <TableCell align="right">Amount</TableCell>
                                        <TableCell>Method</TableCell>
                                        <TableCell>Receipt</TableCell>
                                        <TableCell>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {studentInfo.paymentHistory.slice(-5).map((payment, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                                            <TableCell align="right">KES {payment.amount}</TableCell>
                                            <TableCell>{payment.paymentMethod}</TableCell>
                                            <TableCell>{payment.receiptNumber}</TableCell>
                                            <TableCell>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color: payment.status === 'Completed' ? '#4caf50' : '#ff9800',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    {payment.status}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                )}
            </Container>
        </Box>
    );
};

export default ParentDashboard;
