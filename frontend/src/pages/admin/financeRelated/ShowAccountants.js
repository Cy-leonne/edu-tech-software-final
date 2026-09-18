import { API_BASE_URL } from '../../../utils/apiConfig';

import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button, Box, TextField, Typography, Stack, IconButton } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TableTemplate from '../../../components/TableTemplate';
import PageHeader from '../../../components/PageHeader';
import { ErrorState, TableLoadingState } from '../../../components/StateViews';

/**
 * Accountants (finance officers) list.
 *
 * Uses the shared paginated table so long lists no longer render as one endless
 * table on small screens. Search, data fetching and navigation are unchanged.
 */
const ShowAccountants = () => {
    const navigate = useNavigate();
    const { currentUser } = useSelector((state) => state.user);
    const [accountants, setAccountants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchEmail, setSearchEmail] = useState('');
    const adminBasePath = window.location.pathname.startsWith('/admin') ? '/admin' : '/Admin';

    const fetchAccountants = async () => {
        setLoading(true);
        setError(null);
        try {
            const headers = { 'Content-Type': 'application/json' };
            const adminId = currentUser?._id || currentUser?.id || null;
            if (adminId) {
                headers['x-admin-id'] = adminId;
            }
            const result = await axios.get(`${API_BASE_URL}/Admin/Accountants`, { headers });
            setAccountants(Array.isArray(result.data) ? result.data : []);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to load accountants');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccountants();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    const columns = [
        { id: 'name', label: 'Name', minWidth: 170 },
        { id: 'email', label: 'Email', minWidth: 210 },
        { id: 'role', label: 'Role', minWidth: 120 },
    ];

    const rows = useMemo(() => {
        const term = searchEmail.trim().toLowerCase();
        return (accountants || [])
            .filter((acc) => !term || String(acc.email || '').toLowerCase().includes(term))
            .map((acc) => ({
                id: acc._id || acc.id,
                name: acc.name || '—',
                email: acc.email || '—',
                role: acc.role || 'Accountant',
            }));
    }, [accountants, searchEmail]);

    const AccountantButtonHaver = ({ row }) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            <IconButton
                aria-label={`View ${row.name}`}
                onClick={() => navigate(`${adminBasePath}/accountants/${row.id}`)}
            >
                <VisibilityIcon color="primary" />
            </IconButton>
        </Stack>
    );

    return (
        <Box sx={{ width: '100%', minWidth: 0 }}>
            <PageHeader
                title="School Accountants"
                subtitle="Finance officers who can record payments, invoices and receipts."
                actions={
                    <Button variant="contained" onClick={() => navigate(`${adminBasePath}/accountants/add`)}>
                        Add Accountant
                    </Button>
                }
            />

            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                sx={{ mb: 2, alignItems: { xs: 'stretch', sm: 'center' } }}
            >
                <TextField
                    label="Search by email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    size="small"
                    sx={{ width: { xs: '100%', sm: 320 } }}
                />
                <Button variant="outlined" onClick={() => setSearchEmail('')}>Clear</Button>
            </Stack>

            {loading ? (
                <TableLoadingState rows={4} columns={3} />
            ) : error ? (
                <ErrorState
                    title="Could not load accountants"
                    description={error}
                    onRetry={fetchAccountants}
                />
            ) : (
                <TableTemplate
                    buttonHaver={AccountantButtonHaver}
                    columns={columns}
                    rows={rows}
                    initialRowsPerPage={10}
                    emptyTitle="No accountants yet"
                    emptyDescription="Use “Add Accountant” to create a finance officer account for this school."
                />
            )}

            {!loading && !error && rows.length === 0 && searchEmail && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    No accountant matches “{searchEmail}”.
                </Typography>
            )}
        </Box>
    );
};

export default ShowAccountants;
