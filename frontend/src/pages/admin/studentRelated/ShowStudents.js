import { API_BASE_URL } from '../../../utils/apiConfig';

import { useEffect } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from "react-router-dom";
import { getAllStudents, searchStudents } from '../../../redux/studentRelated/studentHandle';
import { deleteUser } from '../../../redux/userRelated/userHandle';
import {
    Paper, Box, IconButton
} from '@mui/material';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import { BlackButton, BlueButton, GreenButton } from '../../../components/buttonStyles';
import TableTemplate from '../../../components/TableTemplate';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import SpeedDialTemplate from '../../../components/SpeedDialTemplate';

import * as React from 'react';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
// import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { KeyboardArrowUp, KeyboardArrowDown } from '@mui/icons-material';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Grow from '@mui/material/Grow';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Popup from '../../../components/Popup';

const ShowStudents = () => {

    const navigate = useNavigate()
    const dispatch = useDispatch();
    const { studentsList, loading, error, response } = useSelector((state) => state.student);
    const { currentUser } = useSelector(state => state.user)

    const schoolValue = currentUser?.school?._id || currentUser?.school || currentUser?.schoolId || currentUser?._id;
    const schoolId = schoolValue && typeof schoolValue === 'object'
        ? schoolValue._id || schoolValue.id || schoolValue.schoolId
        : schoolValue;
    const requesterId = currentUser?._id || currentUser?.id;

    const [searchQuery, setSearchQuery] = React.useState('');
    const [searching, setSearching] = React.useState(false);
    const [importing, setImporting] = React.useState(false);
    const [importResults, setImportResults] = React.useState(null);
    const fileInputRef = React.useRef(null);

    useEffect(() => {
        if (schoolId && requesterId) {
            dispatch(getAllStudents(schoolId, requesterId));
        }
    }, [schoolId, requesterId, dispatch]);

    if (error) {
        console.log(error);
    }

    const [showPopup, setShowPopup] = React.useState(false);
    const [message, setMessage] = React.useState("");

    const deleteHandler = async (deleteID, address) => {
        if (!deleteID || !address) return;

        if (!window.confirm('Delete this student permanently? This cannot be undone.')) {
            return;
        }

        try {
            await dispatch(deleteUser(deleteID, address));
            await dispatch(getAllStudents(schoolId, requesterId));
            setMessage('Student deleted successfully.');
        } catch (err) {
            setMessage(err.response?.data?.message || err.message || 'Delete failed');
        } finally {
            setShowPopup(true);
        }
    }

    const handleSearch = async () => {
        if (!searchQuery) {
            dispatch(getAllStudents(schoolId, requesterId));
            return;
        }
        setSearching(true);
        try {
            await dispatch(searchStudents(schoolId, searchQuery, requesterId));
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setSearching(false);
        }
    };

    const handleImportClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleImportFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!currentUser?._id) {
            setMessage('Unable to determine admin identity for import');
            setShowPopup(true);
            return;
        }

        setImporting(true);
        setImportResults(null);

        try {
            const formData = new FormData();
            formData.append('studentsFile', file);

            const response = await axios.post(
                `${API_BASE_URL}/Students/Import/${schoolId}`,
                formData,
                {
                    headers: {
                        'x-admin-id': currentUser._id,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            setImportResults(response.data);
            dispatch(getAllStudents(schoolId, requesterId));
        } catch (err) {
            console.error('Import failed:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Import failed';
            setMessage(errorMessage);
            setShowPopup(true);
        } finally {
            setImporting(false);
            if (event.target) event.target.value = null;
        }
    };

    const studentColumns = [
        { id: 'name', label: 'Name', minWidth: 170 },
        { id: 'rollNum', label: 'Roll Number', minWidth: 100 },
        { id: 'sclassName', label: 'Class', minWidth: 170 },
    ]

    const studentRows = Array.isArray(studentsList) && studentsList.length > 0 ? studentsList.map((student) => {
        return {
            name: student?.name || 'Unknown',
            rollNum: student?.rollNum || 'N/A',
            sclassName: student?.sclassName?.sclassName || 'N/A',
            id: student?._id,
        };
    }) : [];

    const StudentButtonHaver = ({ row }) => {
        const options = ['Take Attendance', 'Provide Marks'];

        const [open, setOpen] = React.useState(false);
        const anchorRef = React.useRef(null);
        const [selectedIndex, setSelectedIndex] = React.useState(0);

        const handleClick = () => {
            console.info(`You clicked ${options[selectedIndex]}`);
            if (selectedIndex === 0) {
                handleAttendance();
            } else if (selectedIndex === 1) {
                handleMarks();
            }
        };

        const handleAttendance = () => {
            navigate("/Admin/students/student/attendance/" + row.id)
        }
        const handleMarks = () => {
            navigate("/Admin/students/student/marks/" + row.id)
        };

        const handleMenuItemClick = (event, index) => {
            setSelectedIndex(index);
            setOpen(false);
        };

        const handleToggle = () => {
            setOpen((prevOpen) => !prevOpen);
        };

        const handleClose = (event) => {
            if (anchorRef.current && anchorRef.current.contains(event.target)) {
                return;
            }

            setOpen(false);
        };
        return (
            <>
                <IconButton onClick={() => deleteHandler(row.id, "Student")}>
                    <PersonRemoveIcon color="error" />
                </IconButton>
                <BlueButton variant="contained"
                    onClick={() => navigate("/Admin/students/student/" + row.id)}>
                    View
                </BlueButton>
                <BlueButton variant="outlined" sx={{ ml: 1 }} onClick={() => navigate(`/Admin/students/student/${row.id}/edit`)}>
                    Edit
                </BlueButton>
                <React.Fragment>
                    <ButtonGroup variant="contained" ref={anchorRef} aria-label="split button">
                        <Button onClick={handleClick}>{options[selectedIndex]}</Button>
                        <BlackButton
                            size="small"
                            aria-controls={open ? 'split-button-menu' : undefined}
                            aria-expanded={open ? 'true' : undefined}
                            aria-label="select merge strategy"
                            aria-haspopup="menu"
                            onClick={handleToggle}
                        >
                            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                        </BlackButton>
                    </ButtonGroup>
                    <Popper
                        sx={{
                            zIndex: 1,
                        }}
                        open={open}
                        anchorEl={anchorRef.current}
                        role={undefined}
                        transition
                        disablePortal
                    >
                        {({ TransitionProps, placement }) => (
                            <Grow
                                {...TransitionProps}
                                style={{
                                    transformOrigin:
                                        placement === 'bottom' ? 'center top' : 'center bottom',
                                }}
                            >
                                <Paper>
                                    <ClickAwayListener onClickAway={handleClose}>
                                        <MenuList id="split-button-menu" autoFocusItem>
                                            {options.map((option, index) => (
                                                <MenuItem
                                                    key={option}
                                                    disabled={index === 2}
                                                    selected={index === selectedIndex}
                                                    onClick={(event) => handleMenuItemClick(event, index)}
                                                >
                                                    {option}
                                                </MenuItem>
                                            ))}
                                        </MenuList>
                                    </ClickAwayListener>
                                </Paper>
                            </Grow>
                        )}
                    </Popper>
                </React.Fragment>
            </>
        );
    };

    const actions = [
        {
            icon: <PersonAddAlt1Icon color="primary" />, name: 'Add New Student',
            action: () => navigate("/Admin/addstudents")
        },
        {
            icon: <PersonRemoveIcon color="error" />, name: 'Delete All Students',
            action: () => deleteHandler(currentUser._id, "Students")
        },
    ];

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                hidden
                onChange={handleImportFile}
            />
            <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
                <input
                    type="text"
                    placeholder="Search by admission or roll number"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ padding: '8px', flex: 1, borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <GreenButton variant="contained" onClick={handleSearch} disabled={searching}>
                    {searching ? 'Searching...' : 'Search'}
                </GreenButton>
                <GreenButton variant="outlined" onClick={handleImportClick} disabled={importing}>
                    {importing ? 'Importing...' : 'Import Students'}
                </GreenButton>
            </Box>
            {importResults && (
                <Paper sx={{ p: 2, mb: 2, background: '#f4fdf7', border: '1px solid #d1f0d1' }}>
                    <div style={{ marginBottom: 8, fontWeight: 600 }}>
                        Import Summary: {importResults.createdCount} created, {importResults.failedCount} failed.
                    </div>
                    {Array.isArray(importResults.results) && importResults.results.slice(0, 8).map((item, index) => (
                        <div key={index} style={{ marginBottom: 4 }}>
                            {item.status === 'created'
                                ? `Line ${item.lineNumber}: Created ${item.student?.name || 'student'}`
                                : `Line ${item.lineNumber}: ${item.error}`}
                        </div>
                    ))}
                    {Array.isArray(importResults.results) && importResults.results.length > 8 && (
                        <div>+{importResults.results.length - 8} more rows processed.</div>
                    )}
                </Paper>
            )}
            {loading ?
                <div>Loading...</div>
                :
                <>
                    {response ?
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                            <GreenButton variant="contained" onClick={() => navigate("/Admin/addstudents")}>
                                Add Students
                            </GreenButton>
                        </Box>
                        :
                        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                            {Array.isArray(studentsList) && studentsList.length > 0 &&
                                <TableTemplate buttonHaver={StudentButtonHaver} columns={studentColumns} rows={studentRows} />
                            }
                            <SpeedDialTemplate actions={actions} />
                        </Paper>
                    }
                </>
            }
            <Popup message={message} setShowPopup={setShowPopup} showPopup={showPopup} />
        </>
    );
};

export default ShowStudents;
