
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Container, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, CircularProgress } from '@mui/material';
import { ArrowBack, PrintOutlined } from '@mui/icons-material';
import { buildPrintBrandingHtml, printBrandingStyles } from '../../utils/printBranding';

const PaymentHistory = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [student, setStudent] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = localStorage.getItem('currentUser') || localStorage.getItem('user');
        const role = localStorage.getItem('currentRole') || (user ? JSON.parse(user).role : null);

        if (!user || role !== 'Parent') {
            navigate('/Parent/login', { replace: true });
            return;
        }

        const userData = JSON.parse(user);
        setCurrentUser(userData);

        if (location.state?.student) {
            setStudent(location.state.student);
        } else {
            setStudent(userData.student);
        }

        setLoading(false);
    }, [navigate, location]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
    }

    if (!student) {
        return <Box sx={{ p: 3, color: 'error.main' }}>Unable to load payment history</Box>;
    }

    const paymentHistory = student.paymentHistory || [];

    return (
        <Box sx={{ backgroundColor: '#f5f5f5', minHeight: '100vh', py: 4, '@media print': { backgroundColor: '#fff', py: 0 } }}>
            <style>{`@media print { .payment-history-actions { display: none !important; } .payment-history-branding { display: block !important; } } ${printBrandingStyles}`}</style>
            <Container maxWidth="lg">
                <Box className="payment-history-actions">
                    <Button
                        startIcon={<ArrowBack />}
                        sx={{ mb: 2, color: '#7f56da' }}
                        onClick={() => navigate('/Parent/dashboard')}
                    >
                        Back to Dashboard
                    </Button>
                </Box>

                <Paper sx={{ p: 3 }}>
                    <Box className="payment-history-branding" sx={{ display: 'none' }} dangerouslySetInnerHTML={{ __html: buildPrintBrandingHtml(currentUser) }} />
                    <Box className="payment-history-actions" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                            Payment History - {student.name}
                        </Typography>
                        <Button
                            startIcon={<PrintOutlined />}
                            variant="outlined"
                            onClick={handlePrint}
                        >
                            Download PDF
                        </Button>
                    </Box>

                    {/* Summary */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
                        <Box sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                            <Typography variant="caption" color="textSecondary">Total Fees</Typography>
                            <Typography variant="h6" sx={{ color: '#7f56da' }}>KES {student.totalFees}</Typography>
                        </Box>
                        <Box sx={{ p: 2, backgroundColor: '#e8f5e9', borderRadius: 1 }}>
                            <Typography variant="caption" color="textSecondary">Amount Paid</Typography>
                            <Typography variant="h6" sx={{ color: '#4caf50' }}>KES {student.amountPaid}</Typography>
                        </Box>
                        <Box sx={{ p: 2, backgroundColor: '#fff3e0', borderRadius: 1 }}>
                            <Typography variant="caption" color="textSecondary">Outstanding</Typography>
                            <Typography variant="h6" sx={{ color: '#ff9800' }}>KES {student.balance}</Typography>
                        </Box>
                        <Box sx={{ p: 2, backgroundColor: '#f3e5f5', borderRadius: 1 }}>
                            <Typography variant="caption" color="textSecondary">Status</Typography>
                            <Typography variant="h6" sx={{ color: '#9c27b0' }}>{student.paymentStatus}</Typography>
                        </Box>
                    </Box>

                    {/* Payment Table */}
                    {paymentHistory.length > 0 ? (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                        <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Receipt Number</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Method</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Transaction ID</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Balance After</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paymentHistory.map((payment, index) => (
                                        <TableRow key={index} sx={{ '&:hover': { backgroundColor: '#f9f9f9' } }}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{new Date(payment.date).toLocaleDateString()} {payment.date && new Date(payment.date).toLocaleTimeString()}</TableCell>
                                            <TableCell>{payment.receiptNumber}</TableCell>
                                            <TableCell align="right">KES {payment.amount}</TableCell>
                                            <TableCell>{payment.paymentMethod}</TableCell>
                                            <TableCell>{payment.transactionId || 'N/A'}</TableCell>
                                            <TableCell>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color: payment.status === 'Completed' ? '#4caf50' : payment.status === 'Verified' ? '#2196f3' : '#ff9800',
                                                        fontWeight: 'bold',
                                                        backgroundColor: payment.status === 'Completed' ? '#e8f5e9' : payment.status === 'Verified' ? '#e3f2fd' : '#fff3e0',
                                                        px: 1,
                                                        py: 0.5,
                                                        borderRadius: 1,
                                                        display: 'inline-block'
                                                    }}
                                                >
                                                    {payment.status}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">KES {payment.balanceAfter}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Box sx={{ p: 3, textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: 1 }}>
                            <Typography color="textSecondary">
                                No payment records found for this student.
                            </Typography>
                        </Box>
                    )}

                    {/* Student Info */}
                    <Box sx={{ mt: 4, p: 2, backgroundColor: '#e3f2fd', borderRadius: 1 }}>
                        <Typography variant="caption" color="textSecondary">
                            <strong>Student Details:</strong> {student.name} (Admission: {student.admissionNo}, Roll No: {student.rollNum})
                        </Typography>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
};

export default PaymentHistory;
