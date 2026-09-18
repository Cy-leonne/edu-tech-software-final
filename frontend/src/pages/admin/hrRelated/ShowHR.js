import { API_BASE_URL } from '../../../utils/apiConfig';

import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button, Box, TextField, Stack } from '@mui/material';
import TableTemplate from '../../../components/TableTemplate';
import PageHeader from '../../../components/PageHeader';
import { ErrorState, TableLoadingState } from '../../../components/StateViews';

/**
 * HR staff list.
 *
 * Same data flow as before, presented through the shared paginated table
 * (page clamping, page-size selection, mobile card layout, empty state).
 */
const ShowHR = () => {
    const navigate = useNavigate();
    const { currentUser } = useSelector((state) => state.user);
    const [hrs, setHrs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchEmail, setSearchEmail] = useState('');
    const adminBasePath = window.location.pathname.startsWith('/admin') ? '/admin' : '/Admin';

    const fetchHrs = async () => {
        setLoading(true);
        setError(null);
        try {
            const headers = { 'Content-Type': 'application/json' };
            const adminId = currentUser?._id || currentUser?.id || null;
            if (adminId) {
                headers['x-admin-id'] = adminId;
            }
            const result = await axios.get(`${API_BASE_URL}/Admin/HR`, { headers });
            setHrs(Array.isArray(result.data) ? result.data : []);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to load HR staff');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHrs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    const columns = [
        { id: 'name', label: 'Name', minWidth: 170 },
        { id: 'email', label: 'Email', minWidth: 210 },
        { id: 'role', label: 'Role', minWidth: 120 },
    ];

    const rows = useMemo(() => {
        const term = searchEmail.trim().toLowerCase();
        return (hrs || [])
            .filter((hr) => !term || String(hr.email || '').toLowerCase().includes(term))
            .map((hr) => ({
                id: hr._id || hr.id,
                name: hr.name || '—',
                email: hr.email || '—',
                role: hr.role || 'HR',
            }));
    }, [hrs, searchEmail]);

    const HRButtonHaver = ({ row }) => (
        <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
                size="small"
                variant="outlined"
                onClick={() => navigate(`${adminBasePath}/hrs/${row.id}`)}
            >
                View
            </Button>
        </Stack>
    );

    return (
        <Box sx={{ width: '100%', minWidth: 0 }}>
            <PageHeader
                title="School HR Staff"
                subtitle="Human resource officers for this school."
                actions={
                    <Button variant="contained" onClick={() => navigate(`${adminBasePath}/hrs/add`)}>
                        Add HR Staff
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
                <ErrorState title="Could not load HR staff" description={error} onRetry={fetchHrs} />
            ) : (
                <TableTemplate
                    buttonHaver={HRButtonHaver}
                    columns={columns}
                    rows={rows}
                    initialRowsPerPage={10}
                    emptyTitle="No HR staff yet"
                    emptyDescription="Use “Add HR Staff” to create an HR account for this school."
                />
            )}
        </Box>
    );
};

export default ShowHR;
