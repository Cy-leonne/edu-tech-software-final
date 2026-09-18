import { API_BASE_URL } from '../../utils/apiConfig';

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
    Grid,
    Tabs,
    Tab,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
} from '@mui/material';


const AdminApprovePage = () => {
    const { currentUser, currentRole } = useSelector((state) => state.user);
    const [pendingAdmins, setPendingAdmins] = useState([]);
    const [registeredSchools, setRegisteredSchools] = useState([]);
    const [summary, setSummary] = useState({ approvedCount: 0, pendingCount: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [tabValue, setTabValue] = useState(0);
    const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
    const [declineAdminId, setDeclineAdminId] = useState(null);
    const [declineReason, setDeclineReason] = useState('');

    const fetchPendingAdmins = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/Admin/Pending`);
            setPendingAdmins(response.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch pending admins');
        }
    };

    const fetchRegisteredSchools = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/Admin/RegisteredSchools`);
            setRegisteredSchools(response.data || []);
        } catch (err) {
            console.error('Failed to fetch registered schools', err);
        }
    };

    const fetchSummary = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/Admin/Summary`);
            setSummary(response.data);
        } catch (err) {
            console.error('Failed to fetch summary', err);
        }
    };

    useEffect(() => {
        if (currentRole === 'SuperAdmin') {
            setLoading(true);
            Promise.all([fetchPendingAdmins(), fetchRegisteredSchools(), fetchSummary()])
                .finally(() => setLoading(false));
        }
    }, [currentRole]);

    const handleApprove = async (adminId) => {
        if (!currentUser || currentRole !== 'SuperAdmin') {
            setError('Only SuperAdmin may approve admins.');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await axios.put(
                `${API_BASE_URL}/Admin/Approve/${adminId}`,
                {
                    approverRole: 'SuperAdmin',
                    approverId: currentUser._id,
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                }
            );
            setSuccess('Admin approved successfully. Email notification sent.');
            await fetchPendingAdmins();
            await fetchRegisteredSchools();
            await fetchSummary();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to approve admin');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const handleDeclineOpen = (adminId) => {
        setDeclineAdminId(adminId);
        setDeclineReason('');
        setDeclineDialogOpen(true);
    };

    const handleDeclineConfirm = async () => {
        if (!currentUser || currentRole !== 'SuperAdmin') {
            setError('Only SuperAdmin may decline admins.');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await axios.put(
                `${API_BASE_URL}/Admin/Decline/${declineAdminId}`,
                {
                    approverRole: 'SuperAdmin',
                    approverId: currentUser._id,
                    reason: declineReason.trim() || 'No reason provided',
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                }
            );
            setSuccess('Admin declined successfully. Email notification sent.');
            setDeclineDialogOpen(false);
            await fetchPendingAdmins();
            await fetchRegisteredSchools();
            await fetchSummary();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to decline admin');
        } finally {
            setLoading(false);
        }
    };

    const handleDeclineCancel = () => {
        setDeclineDialogOpen(false);
        setDeclineAdminId(null);
        setDeclineReason('');
    };

    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom>
                Admin Approvals & School Management
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                <Paper sx={{ flex: 1, minWidth: 220, p: 2, backgroundColor: '#4CAF50', color: 'white' }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Registered Schools
                    </Typography>
                    <Typography variant="h4">{summary.approvedCount}</Typography>
                </Paper>
                <Paper sx={{ flex: 1, minWidth: 220, p: 2, backgroundColor: '#FF9800', color: 'white' }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Pending Registrations
                    </Typography>
                    <Typography variant="h4">{summary.pendingCount}</Typography>
                </Paper>
            </Box>

            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper sx={{ mb: 3 }}>
                <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label={`Pending Approvals (${pendingAdmins.length})`} />
                    <Tab label={`Registered Schools (${registeredSchools.length})`} />
                </Tabs>

                {/* Pending Approvals Tab */}
                {tabValue === 0 && (
                    <Box sx={{ p: 2 }}>
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                            <TableCell><strong>School Name</strong></TableCell>
                                            <TableCell><strong>Email</strong></TableCell>
                                            <TableCell><strong>Contact Name</strong></TableCell>
                                            <TableCell><strong>Phone</strong></TableCell>
                                            <TableCell align="right"><strong>Action</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {pendingAdmins.length > 0 ? (
                                            pendingAdmins.map((admin) => (
                                                <TableRow key={admin._id} hover>
                                                    <TableCell>{admin.schoolName || '—'}</TableCell>
                                                    <TableCell>{admin.email || '—'}</TableCell>
                                                    <TableCell>{admin.name || '—'}</TableCell>
                                                    <TableCell>{admin.phone || '—'}</TableCell>
                                                    <TableCell align="right">
                                                        <Button
                                                            variant="contained"
                                                            color="success"
                                                            size="small"
                                                            onClick={() => handleApprove(admin._id)}
                                                            disabled={loading}
                                                        >
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            variant="outlined"
                                                            color="error"
                                                            size="small"
                                                            sx={{ ml: 1 }}
                                                            onClick={() => handleDeclineOpen(admin._id)}
                                                            disabled={loading}
                                                        >
                                                            Decline
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center">
                                                    No pending admins at this time.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>
                )}

                {/* Registered Schools Tab */}
                {tabValue === 1 && (
                    <Box sx={{ p: 2 }}>
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                            <TableCell><strong>School Name</strong></TableCell>
                                            <TableCell><strong>Admin Email</strong></TableCell>
                                            <TableCell><strong>School Email</strong></TableCell>
                                            <TableCell><strong>Contact Name</strong></TableCell>
                                            <TableCell><strong>Phone</strong></TableCell>
                                            <TableCell><strong>Role</strong></TableCell>
                                            <TableCell><strong>Approval Date</strong></TableCell>
                                            <TableCell><strong>Address</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {registeredSchools.length > 0 ? (
                                            registeredSchools.map((school) => (
                                                <TableRow key={school._id} hover>
                                                    <TableCell>{school.schoolName || '—'}</TableCell>
                                                    <TableCell>{school.email || '—'}</TableCell>
                                                    <TableCell>{school.settings?.schoolProfile?.email || '—'}</TableCell>
                                                    <TableCell>{school.name || '—'}</TableCell>
                                                    <TableCell>{school.settings?.schoolProfile?.phone || '—'}</TableCell>
                                                    <TableCell>
                                                        <span style={{
                                                            padding: '4px 8px',
                                                            backgroundColor: school.role === 'SuperAdmin' ? '#f44336' : '#2196F3',
                                                            color: 'white',
                                                            borderRadius: '4px',
                                                            fontSize: '0.85rem'
                                                        }}>
                                                            {school.role}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {school.approvedAt ? new Date(school.approvedAt).toLocaleDateString() : '—'}
                                                    </TableCell>
                                                    <TableCell>{school.settings?.schoolProfile?.address || '—'}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={9} align="center">
                                                    No registered schools.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>
                )}
            </Paper>

            {/* Decline Dialog */}
            <Dialog open={declineDialogOpen} onClose={handleDeclineCancel} maxWidth="sm" fullWidth>
                <DialogTitle>Decline School Registration</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Reason for Decline"
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                        placeholder="Enter reason for declining this registration..."
                        variant="outlined"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeclineCancel}>Cancel</Button>
                    <Button
                        onClick={handleDeclineConfirm}
                        variant="contained"
                        color="error"
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Decline'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AdminApprovePage;
