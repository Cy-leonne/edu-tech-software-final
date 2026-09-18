import { API_BASE_URL } from '../../utils/apiConfig';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import {
    Box,
    Typography,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Alert,
    CircularProgress,
    Grid,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
} from '@mui/material';
import { Visibility, FileDownload, Payments as PaymentsIcon } from '@mui/icons-material';


const EmployeePayrollInfo = () => {
    const { currentUser, currentRole } = useSelector((state) => state.user);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [payDialogOpen, setPayDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [paymentReference, setPaymentReference] = useState('');
    const [paymentNote, setPaymentNote] = useState('');
    const [processingPayment, setProcessingPayment] = useState(false);
    const [paymentMessage, setPaymentMessage] = useState('');

    const canProcessPayments = ['Admin', 'SuperAdmin', 'Accountant'].includes(currentRole || currentUser?.role);

    const getCurrentUserFromStorage = () => {
        if (typeof window === 'undefined') return currentUser || {};
        try {
            return JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || 'null') || currentUser || {};
        } catch (err) {
            return currentUser || {};
        }
    };

    const normalizeIdValue = (value) => {
        if (!value) return '';
        if (typeof value === 'string') return value;
        if (typeof value === 'object') {
            return value._id || value.id || value.schoolId || value.toString?.() || '';
        }
        return '';
    };

    const activeUser = getCurrentUserFromStorage();
    const schoolId = (
        normalizeIdValue(activeUser?.school) ||
        normalizeIdValue(activeUser?.schoolId) ||
        normalizeIdValue(currentUser?.school) ||
        normalizeIdValue(currentUser?.schoolId) ||
        ''
    );

    const headers = {
        'Content-Type': 'application/json',
        'x-admin-id': activeUser?._id || activeUser?.id || currentUser?._id || currentUser?.id || '',
    };

    const normalizePaymentHistory = (employee) => {
        const history = Array.isArray(employee?.paymentHistory) ? employee.paymentHistory : [];

        return history.map((entry) => ({
            ...entry,
            amount: entry.amount ?? entry.grossAmount ?? entry.netAmount ?? 0,
            date: entry.date ?? entry.paymentDate ?? entry.createdAt ?? new Date(),
            status: entry.status === 'Processed' || entry.status === 'Paid' || entry.approvalStatus === 'Approved'
                ? 'Paid'
                : entry.status || 'Pending',
            reference: entry.reference || entry.referenceNumber || '',
        }));
    };

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            setError('');
            
            const response = await axios.get(`${API_BASE_URL}/Employee/GetAll`, {
                params: { school: schoolId },
                headers,
            });

            const employeesFromApi = (response.data?.employees || []).map((employee) => {
                const paymentHistory = normalizePaymentHistory(employee);
                return {
                    ...employee,
                    type: employee.department || 'Staff',
                    grossSalary: employee.salary?.baseSalary || 0,
                    paymentHistory,
                    lastPayment: paymentHistory[paymentHistory.length - 1] || null,
                    displayName: getDisplayName(employee),
                };
            });

            setEmployees(employeesFromApi);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch employee data');
            console.error('Error fetching employees:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (schoolId) {
            fetchEmployees();
        }
    }, [schoolId]);

    const getDisplayName = (emp) => {
        if (!emp) return 'N/A';
        const name = emp.name || emp.fullName || emp.firstName || emp.first_name || '';
        if (name && !name.startsWith('enc:')) return name;
        if (emp.email) {
            const local = emp.email.split('@')[0];
            if (local) return local.charAt(0).toUpperCase() + local.slice(1);
        }
        return 'N/A';
    };

    const handleViewDetails = (employee) => {
        setSelectedEmployee(employee);
        setDetailsDialogOpen(true);
    };

    const openPayDialog = (employee) => {
        setSelectedEmployee(employee);
        setPaymentAmount('');
        setPaymentMethod('Cash');
        setPaymentReference('');
        setPaymentNote('');
        setPaymentMessage('');
        setPayDialogOpen(true);
    };

    const handlePayEmployee = async () => {
        if (!selectedEmployee) return;

        const amount = Number(paymentAmount);
        if (!amount || amount <= 0) {
            setPaymentMessage('Please enter a valid payment amount.');
            return;
        }

        try {
            setProcessingPayment(true);
            const response = await axios.post(
                `${API_BASE_URL}/Employee/${selectedEmployee._id}/Pay`,
                {
                    amount,
                    paymentMethod,
                    reference: paymentReference,
                    note: paymentNote,
                },
                { headers }
            );

            setPaymentMessage(response?.data?.message || 'Staff payment recorded successfully.');
            setPayDialogOpen(false);
            await fetchEmployees();
        } catch (err) {
            setPaymentMessage(err.response?.data?.message || 'Failed to record staff payment.');
        } finally {
            setProcessingPayment(false);
        }
    };

    const filteredEmployees = employees.filter((emp) =>
        getDisplayName(emp).toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const employeeColumns = [
        { id: 'name', label: 'Staff Name', minWidth: 180 },
        { id: 'email', label: 'Email', minWidth: 200 },
        { id: 'type', label: 'Position', minWidth: 120 },
        { id: 'salary', label: 'Gross Salary (KES)', minWidth: 130 },
        { id: 'lastPayment', label: 'Last Payment', minWidth: 150 },
        { id: 'paymentStatus', label: 'Payment Status', minWidth: 120 },
        { id: 'actions', label: 'Actions', minWidth: 150 },
    ];

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
                Employee Payroll Information
            </Typography>

            {!canProcessPayments && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    You have view-only access. Accountant and Admin staff can process staff payments; HR manages salary setup.
                </Alert>
            )}

            {paymentMessage && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {paymentMessage}
                </Alert>
            )}

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f9f9f9' }}>
                <TextField
                    placeholder="Search by name or email..."
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ mb: 2 }}
                />
                <Typography variant="body2" color="text.secondary">
                    Total Employees: {filteredEmployees.length}
                </Typography>
            </Paper>

            {filteredEmployees.length === 0 ? (
                <Alert severity="info">No employees found matching your search.</Alert>
            ) : (
                <TableContainer component={Paper} sx={{ mt: 2 }}>
                    <Table>
                        <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Staff Name</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Position</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Gross Salary (KES)</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Last Payment</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Payment Status</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredEmployees.map((employee) => (
                                <TableRow key={employee._id} hover>
                                    <TableCell>{getDisplayName(employee)}</TableCell>
                                    <TableCell>{employee.email || 'N/A'}</TableCell>
                                    <TableCell>{employee.type}</TableCell>
                                    <TableCell>
                                        {employee.grossSalary
                                            ? `KES ${employee.grossSalary.toLocaleString()}`
                                            : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        {employee.lastPayment
                                            ? `KES ${Number(employee.lastPayment.amount || 0).toLocaleString()} on ${new Date(
                                                employee.lastPayment.date
                                            ).toLocaleDateString()}`
                                            : 'No payments'}
                                    </TableCell>
                                    <TableCell>
                                        {employee.lastPayment?.status === 'Paid' ? (
                                            <Chip label="Paid" color="success" size="small" />
                                        ) : employee.lastPayment?.status === 'Pending' ? (
                                            <Chip label="Pending" color="warning" size="small" />
                                        ) : (
                                            <Chip label="No Payment" variant="outlined" size="small" />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={1}>
                                            <Button
                                                size="small"
                                                startIcon={<Visibility />}
                                                onClick={() => handleViewDetails(employee)}
                                                variant="outlined"
                                            >
                                                View
                                            </Button>
                                            {canProcessPayments && (
                                                <Button
                                                    size="small"
                                                    startIcon={<PaymentsIcon />}
                                                    onClick={() => openPayDialog(employee)}
                                                    variant="contained"
                                                    color="primary"
                                                >
                                                    Pay
                                                </Button>
                                            )}
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Employee Details Dialog */}
            <Dialog open={payDialogOpen} onClose={() => setPayDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Record Staff Payment</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    {selectedEmployee && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                {getDisplayName(selectedEmployee)}
                            </Typography>
                            <TextField
                                label="Amount (KES)"
                                type="number"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                fullWidth
                            />
                            <TextField
                                label="Payment Method"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                fullWidth
                            />
                            <TextField
                                label="Reference"
                                value={paymentReference}
                                onChange={(e) => setPaymentReference(e.target.value)}
                                fullWidth
                            />
                            <TextField
                                label="Note"
                                value={paymentNote}
                                onChange={(e) => setPaymentNote(e.target.value)}
                                multiline
                                rows={3}
                                fullWidth
                            />
                            {paymentMessage && <Alert severity="info">{paymentMessage}</Alert>}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPayDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handlePayEmployee} variant="contained" disabled={processingPayment}>
                        {processingPayment ? 'Processing...' : 'Record Payment'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Employee Payroll Details</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    {selectedEmployee && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Paper sx={{ p: 2, backgroundColor: '#f9f9f9' }}>
                                <Typography variant="h6">{getDisplayName(selectedEmployee)}</Typography>
                                <Typography color="text.secondary">{selectedEmployee.email}</Typography>
                                <Typography color="text.secondary">{selectedEmployee.type}</Typography>
                            </Paper>

                            <Paper sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                    Payroll Information
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Typography color="text.secondary" variant="body2">
                                            Gross Salary
                                        </Typography>
                                        <Typography variant="h6">
                                            {selectedEmployee.grossSalary
                                                ? `KES ${selectedEmployee.grossSalary.toLocaleString()}`
                                                : 'N/A'}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography color="text.secondary" variant="body2">
                                            Payment Status
                                        </Typography>
                                        <Typography variant="h6">
                                            {selectedEmployee.lastPayment?.status || 'No Payment'}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Paper>

                            {selectedEmployee.paymentHistory && selectedEmployee.paymentHistory.length > 0 && (
                                <Paper sx={{ p: 2 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                        Recent Payment History
                                    </Typography>
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {selectedEmployee.paymentHistory
                                                    .slice(-5)
                                                    .reverse()
                                                    .map((payment, idx) => (
                                                        <TableRow key={idx}>
                                                            <TableCell>
                                                                {new Date(payment.date || payment.paymentDate || payment.createdAt).toLocaleDateString()}
                                                            </TableCell>
                                                            <TableCell>
                                                                KES {Number(payment.amount || payment.grossAmount || payment.netAmount || 0).toLocaleString()}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    label={payment.status === 'Paid' ? 'Paid' : payment.status || 'Pending'}
                                                                    size="small"
                                                                    color={
                                                                        payment.status === 'Paid'
                                                                            ? 'success'
                                                                            : 'warning'
                                                                    }
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Paper>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EmployeePayrollInfo;
