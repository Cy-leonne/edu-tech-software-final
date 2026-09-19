
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
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

const ShowHR = () => {
    const navigate = useNavigate();
    const { currentUser } = useSelector((state) => state.user);
    const [hrs, setHrs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState('');
    const [showPopup, setShowPopup] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchEmail, setSearchEmail] = useState('');

    useEffect(() => {
        const fetchHrs = async () => {
            setLoading(true);
            try {
                const headers = { 'Content-Type': 'application/json' };
                const adminId = currentUser?._id || currentUser?.id || null;
                if (adminId) {
                    headers['x-admin-id'] = adminId;
                }
                const result = await axios.get(`${API_BASE_URL}/Admin/HR`, { headers });
                setHrs(result.data || []);
            } catch (err) {
                setError(err.response?.data?.message || err.message || 'Failed to load HR staff');
            } finally {
                setLoading(false);
            }
        };

        fetchHrs();
    }, [currentUser]);

    const handleSearch = () => {
        setPage(0);
        if (searchEmail.trim()) {
            const filtered = hrs.filter((hr) => hr.email?.toLowerCase().includes(searchEmail.toLowerCase()));
            setHrs(filtered);
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
                <Typography variant="h5">School HR Staff</Typography>
                <Button variant="contained" onClick={() => navigate('/Admin/hrs/add')}>
                    Add HR Staff
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
                <Typography>Loading HR staff...</Typography>
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
                                {hrs
                                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                    .map((hr) => (
                                        <StyledTableRow hover role="checkbox" tabIndex={-1} key={hr._id}>
                                            <StyledTableCell>{hr.name}</StyledTableCell>
                                            <StyledTableCell>{hr.email}</StyledTableCell>
                                            <StyledTableCell>{hr.role}</StyledTableCell>
                                        </StyledTableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        count={hrs.length}
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

export default ShowHR;
