import { API_BASE_URL } from '../../utils/apiConfig';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    TextField,
} from '@mui/material';
import CardMembershipOutlinedIcon from '@mui/icons-material/CardMembershipOutlined';
import AddIcon from '@mui/icons-material/Add';

const normalizeId = (value) => {
    if (!value) return '';
    if (typeof value === 'object') return String(value.$oid || value._id || '');
    return String(value);
};

const SchoolSubscriptionsPage = () => {
    const { currentUser } = useSelector((state) => state.user);
    const adminId = currentUser?._id || currentUser?.id;
    const [schools, setSchools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [form, setForm] = useState({
        schoolId: '',
        planName: 'Basic',
        billingCycle: 'Monthly',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });

    const plans = {
        Free: { price: 0, maxStudents: 50, maxTeachers: 5 },
        Basic: { price: 3000, maxStudents: 250, maxTeachers: 25 },
        Professional: { price: 7500, maxStudents: 750, maxTeachers: 75 },
        Enterprise: { price: 20000, maxStudents: 1000000, maxTeachers: 1000000 },
    };

    useEffect(() => {
        const loadSubscriptions = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/SuperAdmin/Schools?limit=1000`, {
                    headers: { 'x-admin-id': adminId },
                });
                setSchools(response.data?.schools || []);
            } catch (err) {
                setError(err.response?.data?.message || 'Unable to load school subscriptions.');
            } finally {
                setLoading(false);
            }
        };

        if (adminId) loadSubscriptions();
    }, [adminId]);

    const openCreateDialog = () => {
        setFormError('');
        const availableSchool = schools.find((school) => !school.currentSubscription) || schools[0];
        setForm((current) => ({ ...current, schoolId: normalizeId(availableSchool?._id) }));
        setDialogOpen(true);
    };

    const handleCreateSubscription = async () => {
        if (!form.schoolId || !form.startDate || !form.endDate) {
            setFormError('School, start date, and end date are required.');
            return;
        }
        if (new Date(form.endDate) <= new Date(form.startDate)) {
            setFormError('End date must be after the start date.');
            return;
        }

        setSaving(true);
        setFormError('');
        try {
            const selectedPlan = plans[form.planName];
            await axios.post(`${API_BASE_URL}/SuperAdmin/Subscription/Create`, {
                ...form,
                planPrice: selectedPlan.price,
                maxStudents: selectedPlan.maxStudents,
                maxTeachers: selectedPlan.maxTeachers,
                features: {},
            }, { headers: { 'x-admin-id': adminId } });

            const response = await axios.get(`${API_BASE_URL}/SuperAdmin/Schools?limit=1000`, {
                headers: { 'x-admin-id': adminId },
            });
            setSchools(response.data?.schools || []);
            setDialogOpen(false);
        } catch (err) {
            setFormError(err.response?.data?.message || 'Unable to create subscription.');
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (value) => value ? new Date(value).toLocaleDateString() : '—';

    if (loading) {
        return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ p: 3 }}>
            <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CardMembershipOutlinedIcon sx={{ color: '#7dd3fc' }} />
                        <Box>
                            <Typography variant="h5" fontWeight={700}>School Subscriptions</Typography>
                            <Typography variant="body2" sx={{ color: '#cbd5e1', mt: 0.5 }}>
                                Review plans, billing status, and renewal dates for every school.
                            </Typography>
                        </Box>
                    </Box>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog} sx={{ backgroundColor: '#38bdf8', color: '#082f49', '&:hover': { backgroundColor: '#7dd3fc' } }}>
                        Create Subscription
                    </Button>
                </Stack>
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                            <TableCell><strong>School</strong></TableCell>
                            <TableCell><strong>Contact</strong></TableCell>
                            <TableCell><strong>Plan</strong></TableCell>
                            <TableCell><strong>Subscription Status</strong></TableCell>
                            <TableCell><strong>School Status</strong></TableCell>
                            <TableCell><strong>Renewal</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {schools.length === 0 ? (
                            <TableRow><TableCell colSpan={6} align="center">No schools found.</TableCell></TableRow>
                        ) : schools.map((school) => {
                            const subscription = school.currentSubscription;
                            return (
                                <TableRow key={school._id} hover>
                                    <TableCell>
                                        <Typography fontWeight={700}>{school.schoolName}</Typography>
                                        <Typography variant="caption" color="text.secondary">{school._id}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{school.email || '—'}</Typography>
                                        <Typography variant="body2" color="text.secondary">{school.phone || '—'}</Typography>
                                    </TableCell>
                                    <TableCell>{subscription?.planName || 'No plan assigned'}</TableCell>
                                    <TableCell>
                                        <Chip label={subscription?.status || 'Missing'} color={subscription?.status === 'Active' ? 'success' : 'warning'} size="small" />
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={school.status || 'Unknown'} color={school.status === 'Active' ? 'success' : school.status === 'Suspended' ? 'error' : 'default'} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell>{formatDate(subscription?.nextPaymentDate || subscription?.endDate)}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Create School Subscription</DialogTitle>
                <DialogContent>
                    {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <FormControl fullWidth>
                            <InputLabel>School</InputLabel>
                            <Select value={form.schoolId} label="School" onChange={(event) => setForm({ ...form, schoolId: event.target.value })}>
                                {schools.length === 0 ? (
                                    <MenuItem disabled value="">No schools available</MenuItem>
                                ) : schools.map((school) => (
                                    <MenuItem key={String(school._id)} value={String(school._id)}>{school.schoolName || school.name || 'Unnamed school'}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Plan</InputLabel>
                            <Select value={form.planName} label="Plan" onChange={(event) => setForm({ ...form, planName: event.target.value })}>
                                {Object.keys(plans).map((plan) => <MenuItem key={plan} value={plan}>{plan} - {plans[plan].price.toLocaleString()} KES</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Billing Cycle</InputLabel>
                            <Select value={form.billingCycle} label="Billing Cycle" onChange={(event) => setForm({ ...form, billingCycle: event.target.value })}>
                                <MenuItem value="Monthly">Monthly</MenuItem>
                                <MenuItem value="Quarterly">Quarterly</MenuItem>
                                <MenuItem value="Annually">Annually</MenuItem>
                            </Select>
                        </FormControl>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField fullWidth type="date" label="Start date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} InputLabelProps={{ shrink: true }} />
                            <TextField fullWidth type="date" label="End date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} InputLabelProps={{ shrink: true }} />
                        </Stack>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreateSubscription} disabled={saving}>{saving ? 'Saving...' : 'Save Subscription'}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SchoolSubscriptionsPage;
