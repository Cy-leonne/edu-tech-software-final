
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
    Alert,
    CircularProgress,
    Grid,
    Tabs,
    Tab,
    Chip,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import PersonIcon from '@mui/icons-material/Person';
import ClassIcon from '@mui/icons-material/Class';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const SuperAdminDashboard = () => {
    const { currentUser, currentRole } = useSelector((state) => state.user);
    const [stats, setStats] = useState(null);
    const [registeredSchools, setRegisteredSchools] = useState([]);
    const [pendingSchools, setPendingSchools] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [tabValue, setTabValue] = useState(0);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [statusAction, setStatusAction] = useState(null); // 'suspend', 'activate', 'deactivate'
    const [statusSchoolId, setStatusSchoolId] = useState(null);
    const [statusReason, setStatusReason] = useState('');

    const getAdminId = () => {
        if (currentUser?._id) return currentUser._id;
        if (currentUser?.id) return currentUser.id;

        if (typeof window !== 'undefined') {
            const stored = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}');
            return stored?._id || stored?.id || null;
        }
        return null;
    };

    const fetchStats = async () => {
        try {
            const adminId = getAdminId();
            const headers = adminId ? { 'x-admin-id': adminId } : {};
            const response = await axios.get(`${API_BASE_URL}/Admin/Stats`, { headers });
            setStats(response.data);
        } catch (err) {
            console.error('Failed to fetch stats', err);
        }
    };

    const fetchRegisteredSchools = async () => {
        try {
            const adminId = getAdminId();
            const headers = adminId ? { 'x-admin-id': adminId } : {};
            const response = await axios.get(`${API_BASE_URL}/Admin/RegisteredSchools`, { headers });
            setRegisteredSchools(response.data || []);
        } catch (err) {
            console.error('Failed to fetch registered schools', err);
            setError('Failed to load registered schools');
        }
    };

    const fetchPendingSchools = async () => {
        try {
            const adminId = getAdminId();
            const headers = adminId ? { 'x-admin-id': adminId } : {};
            const response = await axios.get(`${API_BASE_URL}/Admin/PendingSchools`, { headers });
            setPendingSchools(response.data || []);
        } catch (err) {
            console.error('Failed to fetch pending schools', err);
            setError('Failed to load pending schools');
        }
    };

    useEffect(() => {
        if (currentRole === 'SuperAdmin') {
            setLoading(true);
            Promise.all([fetchStats(), fetchRegisteredSchools(), fetchPendingSchools()])
                .finally(() => setLoading(false));
        }
    }, [currentRole]);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const handleStatusActionOpen = (schoolId, action) => {
        setStatusSchoolId(schoolId);
        setStatusAction(action);
        setStatusReason('');
        setStatusDialogOpen(true);
    };

    const handleStatusActionConfirm = async () => {
        if (!statusSchoolId || !statusAction) return;

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const endpoint = `/SuperAdmin/School/${statusSchoolId}/${statusAction === 'suspend' ? 'Suspend' : statusAction === 'activate' ? 'Activate' : 'Deactivate'}`;
            const currentAdminId = currentUser?._id || currentUser?.id || null;
            const headers = currentAdminId ? { 'x-admin-id': currentAdminId } : {};

            await axios.post(`${API_BASE_URL}${endpoint}`, {
                reason: statusReason.trim() || 'No reason provided'
            }, { headers });
            setSuccess(`School ${statusAction}ed successfully. Email notification sent.`);
            setStatusDialogOpen(false);
            await fetchRegisteredSchools();
            await fetchStats();
        } catch (err) {
            setError(err.response?.data?.message || `Failed to ${statusAction} school`);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusActionCancel = () => {
        setStatusDialogOpen(false);
        setStatusAction(null);
        setStatusSchoolId(null);
        setStatusReason('');
    };

    if (currentRole !== 'SuperAdmin') {
        return (
            <Box sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom>
                    Access Denied
                </Typography>
                <Typography>
                    Only SuperAdmin can access this dashboard.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
                🔐 SuperAdmin Dashboard
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            {/* Statistics Cards */}
            {stats && (
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={2.4}>
                        <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#4CAF50', color: 'white' }}>
                            <SchoolIcon sx={{ fontSize: 32, mb: 1 }} />
                            <Typography variant="h6">{stats.totalSchools}</Typography>
                            <Typography variant="caption">Registered Schools</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2.4}>
                        <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#FF9800', color: 'white' }}>
                            <PendingActionsIcon sx={{ fontSize: 32, mb: 1 }} />
                            <Typography variant="h6">{stats.pendingSchools}</Typography>
                            <Typography variant="caption">Pending Schools</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2.4}>
                        <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#2196F3', color: 'white' }}>
                            <PersonIcon sx={{ fontSize: 32, mb: 1 }} />
                            <Typography variant="h6">{stats.totalStudents}</Typography>
                            <Typography variant="caption">Total Students</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2.4}>
                        <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#9C27B0', color: 'white' }}>
                            <PersonIcon sx={{ fontSize: 32, mb: 1 }} />
                            <Typography variant="h6">{stats.totalTeachers}</Typography>
                            <Typography variant="caption">Total Teachers</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2.4}>
                        <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#F44336', color: 'white' }}>
                            <ClassIcon sx={{ fontSize: 32, mb: 1 }} />
                            <Typography variant="h6">{stats.totalClasses}</Typography>
                            <Typography variant="caption">Total Classes</Typography>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* Tabs for Different Views */}
            <Paper sx={{ mb: 3 }}>
                <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label={`Registered Schools (${registeredSchools.length})`} />
                    <Tab label={`Pending Schools (${pendingSchools.length})`} />
                </Tabs>

                {/* Registered Schools Tab */}
                {tabValue === 0 && (
                    <Box sx={{ p: 2 }}>
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                <CircularProgress />
                            </Box>
                        ) : registeredSchools.length > 0 ? (
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
                                            <TableCell><strong>Approved Date</strong></TableCell>
                                            <TableCell><strong>Address</strong></TableCell>
                                            <TableCell><strong>Website</strong></TableCell>
                                            <TableCell><strong>Actions</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {registeredSchools.map((school) => (
                                            <TableRow key={school._id} hover>
                                                <TableCell>{school.schoolName}</TableCell>
                                                <TableCell>{school.email}</TableCell>
                                                <TableCell>{school.settings?.schoolProfile?.email || '—'}</TableCell>
                                                <TableCell>{school.name || '—'}</TableCell>
                                                <TableCell>{school.settings?.schoolProfile?.phone || '—'}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={school.role}
                                                        color={school.role === 'SuperAdmin' ? 'error' : 'primary'}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>{school.approvedAt ? new Date(school.approvedAt).toLocaleDateString() : '—'}</TableCell>
                                                <TableCell>{school.settings?.schoolProfile?.address || '—'}</TableCell>
                                                <TableCell sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                    {(() => {
                                                        const normalizedStatus = String(school.status || '').trim().toLowerCase();
                                                        const canActivate = ['suspended', 'inactive'].includes(normalizedStatus);
                                                        const canSuspend = normalizedStatus === 'active';
                                                        const canDeactivate = normalizedStatus === 'active';

                                                        return <>
                                                    {canSuspend && (
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            color="warning"
                                                            onClick={() => handleStatusActionOpen(school._id, 'suspend')}
                                                        >
                                                            Suspend
                                                        </Button>
                                                    )}
                                                    {canActivate && (
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            color="success"
                                                            onClick={() => handleStatusActionOpen(school._id, 'activate')}
                                                        >
                                                            Activate
                                                        </Button>
                                                    )}
                                                    {canDeactivate && (
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            color="error"
                                                            onClick={() => handleStatusActionOpen(school._id, 'deactivate')}
                                                        >
                                                            Deactivate
                                                        </Button>
                                                    )}
                                                        </>;
                                                    })()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Typography sx={{ py: 4, textAlign: 'center' }}>
                                No registered schools yet.
                            </Typography>
                        )}
                    </Box>
                )}

                {/* Pending Schools Tab */}
                {tabValue === 1 && (
                    <Box sx={{ p: 2 }}>
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                <CircularProgress />
                            </Box>
                        ) : pendingSchools.length > 0 ? (
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                            <TableCell><strong>School Name</strong></TableCell>
                                            <TableCell><strong>Contact Name</strong></TableCell>
                                            <TableCell><strong>Email</strong></TableCell>
                                            <TableCell><strong>Registration Date</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {pendingSchools.map((school) => (
                                            <TableRow key={school._id} hover>
                                                <TableCell>{school.schoolName}</TableCell>
                                                <TableCell>{school.name || '—'}</TableCell>
                                                <TableCell>{school.email}</TableCell>
                                                <TableCell>
                                                    {school.createdAt ? new Date(school.createdAt).toLocaleDateString() : '—'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Typography sx={{ py: 4, textAlign: 'center' }}>
                                No pending schools.
                            </Typography>
                        )}
                    </Box>
                )}
            </Paper>

            {/* School Status Action Dialog */}
            <Dialog open={statusDialogOpen} onClose={handleStatusActionCancel} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {statusAction === 'suspend' && 'Suspend School'}
                    {statusAction === 'activate' && 'Activate School'}
                    {statusAction === 'deactivate' && 'Deactivate School'}
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label={`Reason for ${statusAction === 'suspend' ? 'suspending' : statusAction === 'activate' ? 'activating' : 'deactivating'}`}
                        value={statusReason}
                        onChange={(e) => setStatusReason(e.target.value)}
                        placeholder={`Enter reason for ${statusAction}ing the school...`}
                        variant="outlined"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleStatusActionCancel}>Cancel</Button>
                    <Button
                        onClick={handleStatusActionConfirm}
                        variant="contained"
                        color={statusAction === 'deactivate' ? 'error' : 'warning'}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : (
                            statusAction === 'suspend' ? 'Suspend' : 
                            statusAction === 'activate' ? 'Activate' : 
                            'Deactivate'
                        )}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SuperAdminDashboard;
