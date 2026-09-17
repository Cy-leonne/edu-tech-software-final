import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Alert,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
} from '@mui/material';
import { CheckCircle, Close } from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const SalaryApprovalsPage = () => {
    const { currentUser, currentRole } = useSelector((state) => state.user);
    const storedUser = typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || 'null')
        : null;
    const effectiveRole = currentRole || currentUser?.role || storedUser?.role;
    const [approvals, setApprovals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [selectedPaymentIndex, setSelectedPaymentIndex] = useState(null);
    const [approvalNotes, setApprovalNotes] = useState('');

    const schoolValue = currentUser?.school?._id || currentUser?.school || currentUser?.schoolId || currentUser?._id;
    const schoolId = schoolValue && typeof schoolValue === 'object'
        ? schoolValue._id || schoolValue.id || schoolValue.schoolId
        : schoolValue;

    // Fetch all teachers with pending salary payments
    const fetchTeachersWithPendingPayments = async () => {
        try {
            setLoading(true);
            const requestConfig = { headers: { 'x-admin-id': currentUser?._id } };
            const [teachersResponse, employeesResponse] = await Promise.all([
                axios.get(`${API_BASE_URL}/Teachers/${schoolId}`, requestConfig),
                axios.get(`${API_BASE_URL}/Employee/GetAll?school=${schoolId}`, requestConfig),
            ]);

            const teacherList = Array.isArray(teachersResponse.data)
                ? teachersResponse.data
                : teachersResponse.data?.teachers || [];
            const employeeList = Array.isArray(employeesResponse.data)
                ? employeesResponse.data
                : employeesResponse.data?.employees || [];
            const pending = [];

            teacherList.forEach((teacher) => {
                (teacher.salaryHistory || []).forEach((payment, index) => {
                    if (['pending', 'processed'].includes(String(payment.approvalStatus || payment.status || '').toLowerCase())) {
                        pending.push({ type: 'teacher', person: teacher, payment, index });
                    }
                });
            });

            employeeList.forEach((employee) => {
                (employee.paymentHistory || []).forEach((payment, index) => {
                    if (['pending', 'processed'].includes(String(payment.approvalStatus || payment.status || '').toLowerCase())) {
                        pending.push({ type: 'employee', person: employee, payment, index });
                    }
                });
            });

            setApprovals(pending);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch teachers');
            console.error('Error fetching teachers:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (schoolId && currentUser?._id) {
            fetchTeachersWithPendingPayments();
        }
    }, [currentUser?._id, schoolId]);

    const handleApproveClick = (approval) => {
        setSelectedTeacher(approval);
        setSelectedPaymentIndex(approval.index);
        setApprovalNotes('');
        setApprovalDialogOpen(true);
    };

    const handleApprovalConfirm = async () => {
        if (!selectedTeacher || selectedPaymentIndex === null) return;

        try {
            const isEmployee = selectedTeacher.type === 'employee';
            const person = selectedTeacher.person;
            const endpoint = isEmployee
                ? `${API_BASE_URL}/Employee/${person._id}/Payment/${selectedPaymentIndex}/Approve`
                : `${API_BASE_URL}/Teacher/${person._id}/SalaryPayment/${selectedPaymentIndex}/Approve`;
            await axios.put(
                endpoint,
                { 
                    approvedBy: currentUser?._id,
                    notes: approvalNotes 
                },
                { headers: { 'x-admin-id': currentUser?._id } }
            );

            setSuccess(`Salary payment approved for ${person.name || person.firstName || person.email}`);
            setApprovalDialogOpen(false);
            fetchTeachersWithPendingPayments();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to approve salary payment');
            console.error('Error approving payment:', err);
        }
    };

    const handleReject = async (approval) => {
        const reason = window.prompt('Reason for rejecting this payment:', 'Payment details are incorrect');
        if (!reason) return;
        const endpoint = approval.type === 'employee'
            ? `${API_BASE_URL}/Employee/${approval.person._id}/Payment/${approval.index}/Reject`
            : `${API_BASE_URL}/Teacher/${approval.person._id}/SalaryPayment/${approval.index}/Reject`;
        try {
            await axios.put(endpoint, { reason }, { headers: { 'x-admin-id': currentUser?._id } });
            setSuccess('Payment rejected. School funds were not debited.');
            await fetchTeachersWithPendingPayments();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reject salary payment');
        }
    };

    if (!['Admin', 'SuperAdmin'].includes(effectiveRole)) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="warning">You do not have permission to approve salary payments</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
                Salary Payment Approvals
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                </Box>
            ) : approvals.length === 0 ? (
                <Alert severity="info">No pending salary approvals at this time</Alert>
            ) : (
                <TableContainer component={Paper} sx={{ mt: 2 }}>
                    <Table>
                        <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Teacher Name</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Amount (KES)</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Payment Method</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Reference</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Date Submitted</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {approvals.map((approval) => (
                                    <TableRow key={`${approval.type}-${approval.person._id}-${approval.index}`} hover>
                                        <TableCell>{approval.person.name || `${approval.person.firstName || ''} ${approval.person.lastName || ''}`.trim() || approval.person.email}</TableCell>
                                        <TableCell>{(approval.payment.amount || approval.payment.netAmount || approval.payment.grossAmount)?.toFixed(2)}</TableCell>
                                        <TableCell>{approval.payment.method || approval.payment.paymentMethod}</TableCell>
                                        <TableCell>{approval.payment.reference || approval.payment.referenceNumber || 'N/A'}</TableCell>
                                        <TableCell>
                                            {new Date(approval.payment.date || approval.payment.paymentDate).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <Typography
                                                sx={{
                                                    color: 'orange',
                                                    fontWeight: 'bold',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                }}
                                            >
                                                {approval.type === 'employee' ? 'Employee' : 'Teacher'} Pending
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="contained"
                                                color="success"
                                                size="small"
                                                startIcon={<CheckCircle />}
                                                onClick={() => handleApproveClick(approval)}
                                                sx={{ mr: 1 }}
                                            >
                                                Approve
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                size="small"
                                                startIcon={<Close />}
                                                onClick={() => handleReject(approval)}
                                            >
                                                Reject
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Approval Dialog */}
            <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Approve Salary Payment</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    {selectedTeacher && selectedPaymentIndex !== null && (
                        <>
                            <Typography sx={{ mb: 2 }}>
                                <strong>{selectedTeacher.type === 'employee' ? 'Employee' : 'Teacher'}:</strong>{' '}
                                {selectedTeacher.person.name || `${selectedTeacher.person.firstName || ''} ${selectedTeacher.person.lastName || ''}`.trim() || selectedTeacher.person.email}
                            </Typography>
                            <Typography sx={{ mb: 2 }}>
                                <strong>Amount:</strong> KES {(selectedTeacher.payment.amount || selectedTeacher.payment.netAmount || selectedTeacher.payment.grossAmount)?.toFixed(2)}
                            </Typography>
                            <Typography sx={{ mb: 3 }}>
                                <strong>Reference:</strong> {selectedTeacher.payment.reference || selectedTeacher.payment.referenceNumber || 'N/A'}
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Approval Notes (Optional)"
                                value={approvalNotes}
                                onChange={(e) => setApprovalNotes(e.target.value)}
                                placeholder="Add any notes about this approval..."
                            />
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setApprovalDialogOpen(false)} color="inherit">
                        Cancel
                    </Button>
                    <Button onClick={handleApprovalConfirm} variant="contained" color="success">
                        Approve Payment
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SalaryApprovalsPage;