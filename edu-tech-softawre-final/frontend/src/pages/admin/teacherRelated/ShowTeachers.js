
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom'
import { getAllTeachers } from '../../../redux/teacherRelated/teacherHandle';
import {
    Paper, Table, TableBody, TableContainer,
    TableHead, TablePagination, Button, Box, IconButton, TextField,
} from '@mui/material';
import { deleteUser } from '../../../redux/userRelated/userHandle';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import { StyledTableCell, StyledTableRow } from '../../../components/styles';
import { BlueButton, GreenButton } from '../../../components/buttonStyles';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import SpeedDialTemplate from '../../../components/SpeedDialTemplate';
import Popup from '../../../components/Popup';

const ShowTeachers = () => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchEmail, setSearchEmail] = useState('');

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { teachersList, loading, error, response } = useSelector((state) => state.teacher);
    const { currentUser } = useSelector((state) => state.user);

    useEffect(() => {
        if (currentUser?._id) {
            dispatch(getAllTeachers(currentUser._id));
        }
    }, [currentUser?._id, dispatch]);

    const handleSearch = () => {
        if (currentUser?._id) {
            dispatch(getAllTeachers(currentUser._id, searchEmail));
            setPage(0);
        }
    };

    const handleClearSearch = () => {
        setSearchEmail('');
        if (currentUser?._id) {
            dispatch(getAllTeachers(currentUser._id));
            setPage(0);
        }
    };

    const [showPopup, setShowPopup] = useState(false);
    const [message, setMessage] = useState("");

    if (loading) {
        return <div>Loading...</div>;
    } else if (response) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <GreenButton variant="contained" onClick={() => navigate("/Admin/teachers/chooseclass")}>
                    Add Teacher
                </GreenButton>
            </Box>
        );
    } else if (error) {
        console.log(error);
    }

    const deleteHandler = async (deleteID, address) => {
        if (!deleteID || !address) return;

        if (!window.confirm('Delete this teacher permanently? This cannot be undone.')) {
            return;
        }

        try {
            await dispatch(deleteUser(deleteID, address));
            await dispatch(getAllTeachers(currentUser._id));
            setMessage('Teacher deleted successfully.');
        } catch (err) {
            setMessage(err.response?.data?.message || err.message || 'Delete failed');
        } finally {
            setShowPopup(true);
        }
    };

    const columns = [
        { id: 'name', label: 'Name', minWidth: 170 },
        { id: 'role', label: 'Role', minWidth: 120 },
        { id: 'teachSubject', label: 'Subject', minWidth: 100 },
        { id: 'teachSclass', label: 'Class', minWidth: 170 },
    ];

    const rows = teachersList.map((teacher) => {
        const teacherSubjects = Array.isArray(teacher.teachSubjects)
            ? teacher.teachSubjects.map((subject) => subject?.subName).filter(Boolean)
            : [];

        return {
            name: teacher.name,
            role: teacher.role || 'Teacher',
            teachSubject: teacherSubjects.length > 0 ? teacherSubjects.join(', ') : teacher.teachSubject?.subName || null,
            teachSclass: teacher.teachSclass?.sclassName,
            teachSclassID: teacher.teachSclass?._id,
            id: teacher._id,
        };
    });

    const actions = [
        {
            icon: <PersonAddAlt1Icon color="primary" />, name: 'Add New Teacher',
            action: () => navigate("/Admin/teachers/chooseclass")
        },
        {
            icon: <PersonRemoveIcon color="error" />, name: 'Delete All Teachers',
            action: () => deleteHandler(currentUser._id, "Teachers")
        },
    ];

    return (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <Box sx={{ p: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <TextField
                    label="Search teacher by email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    size="small"
                    sx={{ minWidth: 300 }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            handleSearch();
                        }
                    }}
                />
                <Button variant="contained" onClick={handleSearch}>Search</Button>
                <Button variant="outlined" onClick={handleClearSearch}>Clear</Button>
            </Box>
            <TableContainer>
                <Table stickyHeader aria-label="sticky table">
                    <TableHead>
                        <StyledTableRow>
                            {columns.map((column) => (
                                <StyledTableCell
                                    key={column.id}
                                    align={column.align}
                                    style={{ minWidth: column.minWidth }}
                                >
                                    {column.label}
                                </StyledTableCell>
                            ))}
                            <StyledTableCell align="center">
                                Actions
                            </StyledTableCell>
                        </StyledTableRow>
                    </TableHead>
                    <TableBody>
                        {rows
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((row) => {
                                return (
                                    <StyledTableRow hover role="checkbox" tabIndex={-1} key={row.id}>
                                        {columns.map((column) => {
                                            const value = row[column.id];
                                            if (column.id === 'teachSubject') {
                                                return (
                                                    <StyledTableCell key={column.id} align={column.align}>
                                                        {value ? (
                                                            value
                                                        ) : (
                                                            <Button variant="contained"
                                                                onClick={() => {
                                                                    navigate(`/Admin/teachers/choosesubject/${row.teachSclassID}/${row.id}`)
                                                                }}>
                                                                Add Subject
                                                            </Button>
                                                        )}
                                                    </StyledTableCell>
                                                );
                                            }
                                            return (
                                                <StyledTableCell key={column.id} align={column.align}>
                                                    {column.format && typeof value === 'number' ? column.format(value) : value}
                                                </StyledTableCell>
                                            );
                                        })}
                                        <StyledTableCell align="center">
                                            <IconButton onClick={() => deleteHandler(row.id, "Teacher")}>
                                                <PersonRemoveIcon color="error" />
                                            </IconButton>
                                            <BlueButton variant="contained" sx={{ mr: 1 }}
                                                onClick={() => navigate("/Admin/teachers/teacher/" + row.id)}>
                                                View
                                            </BlueButton>
                                            <BlueButton variant="outlined" onClick={() => navigate(`/Admin/teachers/teacher/${row.id}`)}>
                                                Edit
                                            </BlueButton>
                                        </StyledTableCell>
                                    </StyledTableRow>
                                );
                            })}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[5, 10, 25, 100]}
                component="div"
                count={rows.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(event, newPage) => setPage(newPage)}
                onRowsPerPageChange={(event) => {
                    setRowsPerPage(parseInt(event.target.value, 5));
                    setPage(0);
                }}
            />

            <SpeedDialTemplate actions={actions} />
            <Popup message={message} setShowPopup={setShowPopup} showPopup={showPopup} />
        </Paper >
    );
};

export default ShowTeachers
