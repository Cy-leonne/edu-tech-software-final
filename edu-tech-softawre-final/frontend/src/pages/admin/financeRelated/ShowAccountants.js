
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Paper,
    Table,
    TableBody,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TableCell,
    Button,
    Box,
    TextField,
    Typography
} from '@mui/material';
import { StyledTableCell, StyledTableRow } from '../../../components/styles';
import Popup from '../../../components/Popup';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const ShowAccountants = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { currentUser } = useSelector((state) => state.user);
    const [accountants, setAccountants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState('');
    const [showPopup, setShowPopup] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchEmail, setSearchEmail] = useState('');

    useEffect(() => {
        const fetchAccountants = async () => {
            setLoading(true);
            try {
                const headers = {
                    'Content-Type': 'application/json'
                };
                const adminId = currentUser?._id || currentUser?.id || null;
                if (adminId) {
                    headers['x-admin-id'] = adminId;
                }
                const result = await axios.get(`${API_BASE_URL}/Admin/Accountants`, { headers });
                setAccountants(result.data || []);
            } catch (err) {
                setError(err.response?.data?.message || err.message || 'Failed to load accountants');
            } finally {
                setLoading(false);
            }
        };

        fetchAccountants();
    }, [currentUser]);

    const handleSearch = () => {
        setPage(0);
        if (searchEmail.trim()) {
            const filtered = accountants.filter((acc) => acc.email?.toLowerCase().includes(searchEmail.toLowerCase()));
            setAccountants(filtered);
        } else {
            setError(null);
        }
    };

    const handleClearSearch = () => {
        setSearchEmail('');
        setError(null);
    };

    const columns = [
        { id: 'name', label: 'Name', minWidth: 170 },
        { id: 'email', label: 'Email', minWidth: 210 },
        { id: 'role', label: 'Role', minWidth: 120 }
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">School Accountants</Typography>
                <Button variant="contained" onClick={() => navigate('/Admin/accountants/add')}>
                    Add Accountant
                </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                    label="Search by email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    size="small"
                    sx={{ width: 320 }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            handleSearch();
                        }
                    }}
                />
                <Button variant="outlined" onClick={handleSearch}>Search</Button>
                <Button variant="text" onClick={handleClearSearch}>Clear</Button>
            </Box>

            {loading ? (
                <Typography>Loading accountants...</Typography>
            ) : error ? (
                <Typography color="error">{error}</Typography>
            ) : (
                <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                    <TableContainer>
                        <Table stickyHeader>
                            <TableHead>
                                <TableRow>
                                    {columns.map((column) => (
                                        <StyledTableCell key={column.id} style={{ minWidth: column.minWidth }}>
                                            {column.label}
                                        </StyledTableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {accountants
                                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                    .map((accountant) => (
                                        <StyledTableRow hover role="checkbox" tabIndex={-1} key={accountant._id}>
                                            <StyledTableCell>{accountant.name}</StyledTableCell>
                                            <StyledTableCell>{accountant.email}</StyledTableCell>
                                            <StyledTableCell>{accountant.role}</StyledTableCell>
                                        </StyledTableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        count={accountants.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={(event, newPage) => setPage(newPage)}
                        onRowsPerPageChange={(event) => {
                            setRowsPerPage(parseInt(event.target.value, 10));
                            setPage(0);
                        }}
                    />
                </Paper>
            )}
            <Popup message={message} setShowPopup={setShowPopup} showPopup={showPopup} />
        </Box>
    );
};

export default ShowAccountants;
