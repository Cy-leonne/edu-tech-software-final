import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom'
import { getAllTeachers } from '../../../redux/teacherRelated/teacherHandle';
import { Button, Box, IconButton, TextField, Stack } from '@mui/material';
import { deleteUser } from '../../../redux/userRelated/userHandle';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import { BlueButton, GreenButton } from '../../../components/buttonStyles';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import SpeedDialTemplate from '../../../components/SpeedDialTemplate';
import Popup from '../../../components/Popup';
import TableTemplate from '../../../components/TableTemplate';
import PageHeader from '../../../components/PageHeader';
import { ErrorState, TableLoadingState } from '../../../components/StateViews';

/**
 * Teacher list.
 *
 * Presentation updated to the shared table component: real pagination (the
 * previous rows-per-page selector used an invalid radix of 5 and was ignored),
 * page clamping, empty state, contained horizontal scrolling and a card layout
 * on phones. Data loading, search and delete behaviour are unchanged.
 */
const ShowTeachers = () => {
    const [searchEmail, setSearchEmail] = useState('');
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { teachersList, loading, error, response } = useSelector((state) => state.teacher);
    const { currentUser } = useSelector((state) => state.user);
    const adminBasePath = window.location.pathname.startsWith('/admin') ? '/admin' : '/Admin';

    useEffect(() => {
        if (currentUser?._id) {
            dispatch(getAllTeachers(currentUser._id));
        }
    }, [currentUser?._id, dispatch]);

    const handleSearch = () => {
        if (currentUser?._id) {
            dispatch(getAllTeachers(currentUser._id, searchEmail));
        }
    };

    const handleClearSearch = () => {
        setSearchEmail('');
        if (currentUser?._id) {
            dispatch(getAllTeachers(currentUser._id));
        }
    };

    const [showPopup, setShowPopup] = useState(false);
    const [message, setMessage] = useState("");

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
        {
            id: 'teachSubject',
            label: 'Subject',
            minWidth: 140,
            wrap: true,
            render: (row) => (row.teachSubject ? row.teachSubject : (
                <Button
                    variant="contained"
                    size="small"
                    onClick={() => navigate(`${adminBasePath}/teachers/choosesubject/${row.teachSclassID}/${row.id}`)}
                >
                    Add Subject
                </Button>
            )),
        },
        { id: 'teachSclass', label: 'Class', minWidth: 150, wrap: true },
    ];

    const rows = (teachersList || []).map((teacher) => {
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
            action: () => navigate(`${adminBasePath}/teachers/chooseclass`)
        },
        {
            icon: <PersonRemoveIcon color="error" />, name: 'Delete All Teachers',
            action: () => deleteHandler(currentUser._id, "Teachers")
        },
    ];

    const TeacherButtonHaver = ({ row }) => (
        <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap">
            <IconButton
                aria-label={`Delete ${row.name}`}
                onClick={() => deleteHandler(row.id, "Teacher")}
            >
                <PersonRemoveIcon color="error" />
            </IconButton>
            <BlueButton variant="contained" onClick={() => navigate(`${adminBasePath}/teachers/teacher/` + row.id)}>
                View
            </BlueButton>
            <BlueButton variant="outlined" onClick={() => navigate(`${adminBasePath}/teachers/teacher/${row.id}`)}>
                Edit
            </BlueButton>
        </Stack>
    );

    if (loading) {
        return (
            <Box sx={{ width: '100%' }}>
                <PageHeader title="Teachers" subtitle="Loading the teacher list…" />
                <TableLoadingState rows={5} columns={4} />
            </Box>
        );
    }

    if (response) {
        // Existing behaviour: when the API reports that no teacher exists yet,
        // the user is offered the "Add Teacher" action.
        return (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <GreenButton variant="contained" onClick={() => navigate(`${adminBasePath}/teachers/chooseclass`)}>
                    Add Teacher
                </GreenButton>
            </Box>
        );
    }

    return (
        <>
            <PageHeader
                title="Teachers"
                subtitle={`${rows.length} teacher${rows.length === 1 ? '' : 's'} in this school`}
                actions={
                    <Button
                        variant="contained"
                        onClick={() => navigate(`${adminBasePath}/teachers/chooseclass`)}
                    >
                        Add Teacher
                    </Button>
                }
            />

            {error && (
                <ErrorState
                    title="Could not load teachers"
                    description={typeof error === 'string' ? error : 'Please check the connection and try again.'}
                    onRetry={() => currentUser?._id && dispatch(getAllTeachers(currentUser._id))}
                    minHeight={140}
                />
            )}

            <Box
                sx={{
                    p: { xs: 1.5, sm: 2 },
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 2,
                    alignItems: 'center',
                    width: '100%',
                }}
            >
                <TextField
                    label="Search teacher by email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    size="small"
                    sx={{ flex: '1 1 260px', minWidth: 0, maxWidth: { xs: '100%', sm: 360 } }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            handleSearch();
                        }
                    }}
                />
                <Stack direction="row" spacing={1}>
                    <Button variant="contained" onClick={handleSearch}>Search</Button>
                    <Button variant="outlined" onClick={handleClearSearch}>Clear</Button>
                </Stack>
            </Box>

            <TableTemplate
                buttonHaver={TeacherButtonHaver}
                columns={columns}
                rows={rows}
                initialRowsPerPage={10}
                emptyTitle="No teachers yet"
                emptyDescription="Add a teacher to get started."
            />

            <SpeedDialTemplate actions={actions} />
            <Popup message={message} setShowPopup={setShowPopup} showPopup={showPopup} />
        </>
    );
}

export default ShowTeachers
