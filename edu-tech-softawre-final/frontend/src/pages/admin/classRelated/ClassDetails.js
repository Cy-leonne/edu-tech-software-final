
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios';
import { getClassDetails, getClassStudents, getSubjectList, getAllSclasses } from "../../../redux/sclassRelated/sclassHandle";
import { deleteUser } from '../../../redux/userRelated/userHandle';
import {
    Box, Container, Typography, Tab, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Alert, Button, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import { resetSubjects } from "../../../redux/sclassRelated/sclassSlice";
import { promoteClassStudents } from '../../../redux/sclassRelated/sclassHandle';
import { BlueButton, GreenButton, PurpleButton } from "../../../components/buttonStyles";
import { Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Checkbox } from '@mui/material';
import TableTemplate from "../../../components/TableTemplate";
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import SpeedDialTemplate from "../../../components/SpeedDialTemplate";
import Popup from "../../../components/Popup";
import DeleteIcon from "@mui/icons-material/Delete";
import PostAddIcon from '@mui/icons-material/PostAdd';

const ClassDetails = () => {
    const params = useParams()
    const navigate = useNavigate()
    const dispatch = useDispatch();
    const { subjectsList, sclassStudents, sclassDetails, sclassesList, loading, error, response, getresponse } = useSelector((state) => state.sclass);
    const { currentUser } = useSelector((state) => state.user);

    const classID = params.id

    const [timetable, setTimetable] = useState(null);
    const [timetableLoading, setTimetableLoading] = useState(false);
    const [timetableError, setTimetableError] = useState('');
    const [editableSchedule, setEditableSchedule] = useState([]);
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState('');

    const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

    const fetchTimetable = async () => {
        if (!classID || !currentUser?._id) return;
        setTimetableError('');
        setTimetableLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/Timetable/Class/${classID}`, {
                params: { adminID: currentUser._id }
            });
            setTimetable(response.data);
        } catch (err) {
            if (err.response?.status !== 404) {
                setTimetableError(err.response?.data?.message || 'Unable to load timetable');
            } else {
                setTimetable(null);
            }
        } finally {
            setTimetableLoading(false);
        }
    };

    const handleGenerateTimetable = async () => {
        if (!currentUser) return;
        setTimetableError('');
        setTimetableLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/Timetable/Generate/${classID}`, {
                adminID: currentUser._id
            });
            setTimetable(response.data.timetable);
        } catch (err) {
            setTimetableError(err.response?.data?.message || 'Failed to generate timetable');
        } finally {
            setTimetableLoading(false);
        }
    };

    useEffect(() => {
        dispatch(getClassDetails(classID, "Sclass"));
        dispatch(getSubjectList(classID, "ClassSubjects"))
        dispatch(getClassStudents(classID));
        if (currentUser?._id) {
            fetchTimetable();
        }
    }, [dispatch, classID, currentUser])

    useEffect(() => {
        if (timetable?.schedule && Array.isArray(timetable.schedule)) {
            setEditableSchedule(timetable.schedule.map((entry) => ({
                day: entry.day,
                period: entry.period,
                subject: entry.subject ? entry.subject.toString() : '',
                teacher: entry.teacher ? entry.teacher.toString() : '',
                subjectName: entry.subjectName || 'Free Period',
                teacherName: entry.teacherName || 'Free Period',
            })));
        }
    }, [timetable]);

    const subjectOptions = useMemo(() => {
        return Array.isArray(subjectsList) ? subjectsList.map((subject) => ({
            id: subject._id,
            subName: subject.subName,
            teacherId: subject.teacher?._id || null,
            teacherName: subject.teacher?.name || 'Unassigned',
        })) : [];
    }, [subjectsList]);

    const subjectLookup = useMemo(() => {
        const map = {};
        subjectOptions.forEach((subject) => {
            map[subject.id.toString()] = subject;
        });
        return map;
    }, [subjectOptions]);

    const handleSlotChange = (day, period, subjectId) => {
        setSaveSuccess('');
        setSaveError('');
        setEditableSchedule((current) => current.map((entry) => {
            if (entry.day === day && entry.period === period) {
                const subject = subjectLookup[subjectId] || null;
                return {
                    ...entry,
                    subject: subjectId || '',
                    teacher: subject?.teacherId || '',
                    subjectName: subject?.subName || 'Free Period',
                    teacherName: subject?.teacherName || 'Free Period',
                };
            }
            return entry;
        }));
    };

    const buildSchedulePayload = (schedule) => {
        return schedule.map((entry) => ({
            day: entry.day,
            period: entry.period,
            subject: entry.subject || null,
            teacher: entry.teacher || null,
        }));
    };

    const saveTimetableChanges = async () => {
        if (!editableSchedule.length) return;
        setSaveLoading(true);
        setSaveError('');
        setSaveSuccess('');

        try {
            const response = await axios.put(`${API_BASE_URL}/Timetable/Update/${classID}`, {
                schedule: buildSchedulePayload(editableSchedule),
                adminID: currentUser._id,
            });
            setTimetable(response.data.timetable);
            setSaveSuccess('Timetable saved successfully.');
        } catch (err) {
            setSaveError(err.response?.data?.message || 'Failed to save timetable');
        } finally {
            setSaveLoading(false);
        }
    };

    if (error) {
        console.log(error)
    }

    const [value, setValue] = useState('1');

    const handleChange = (event, newValue) => {
        setValue(newValue);
    };

    const [showPopup, setShowPopup] = useState(false);
    const [message, setMessage] = useState("");
    const [promoteOpen, setPromoteOpen] = useState(false);
    const [promoteTarget, setPromoteTarget] = useState('');
    const [promoteCompletedTerms, setPromoteCompletedTerms] = useState(0);
    const [promoteMoveSubjects, setPromoteMoveSubjects] = useState(false);
    const [promoteUpdateRolls, setPromoteUpdateRolls] = useState(false);
    const [promoteLoading, setPromoteLoading] = useState(false);
    const [promoteError, setPromoteError] = useState('');

    const deleteHandler = (deleteID, address) => {
        console.log(deleteID);
        console.log(address);
        setMessage("Sorry the delete function has been disabled for now.")
        setShowPopup(true)
        // dispatch(deleteUser(deleteID, address))
        //     .then(() => {
        //         dispatch(getClassStudents(classID));
        //         dispatch(resetSubjects())
        //         dispatch(getSubjectList(classID, "ClassSubjects"))
        //     })
    }

    const openPromoteDialog = () => {
        setPromoteTarget('');
        setPromoteCompletedTerms(0);
        setPromoteMoveSubjects(false);
        setPromoteUpdateRolls(false);
        setPromoteError('');
        if (currentUser?._id) dispatch(getAllSclasses(currentUser._id, 'Sclass'));
        setPromoteOpen(true);
    }

    const handlePromote = async () => {
        if (!promoteTarget) {
            setPromoteError('Please select a target class');
            return;
        }
        if (promoteCompletedTerms !== 3) {
            setPromoteError('Promotion is allowed only after all 3 terms are completed');
            return;
        }
        setPromoteLoading(true);
        setPromoteError('');
        try {
            const stateUser = currentUser;
            const adminId = stateUser?._id || (stateUser && stateUser.id);
            await dispatch(promoteClassStudents(classID, promoteTarget, { moveSubjects: promoteMoveSubjects, updateRollNumbers: promoteUpdateRolls, completedTerms: promoteCompletedTerms, adminId }));
            setPromoteOpen(false);
            dispatch(getClassStudents(classID));
            dispatch(getSubjectList(classID, "ClassSubjects"));
            setMessage('Promotion executed successfully');
            setShowPopup(true);
        } catch (err) {
            const errMsg = err?.response?.data?.message || err?.message || 'Promotion failed';
            setPromoteError(errMsg);
            setMessage('Promotion failed: ' + errMsg);
            setShowPopup(true);
        } finally {
            setPromoteLoading(false);
        }
    }

    const PromoteDialog = () => {
        const availableTargets = Array.isArray(sclassesList) ? sclassesList.filter(c => c._id !== classID) : [];
        return (
            <Dialog open={promoteOpen} onClose={() => setPromoteOpen(false)}>
                <DialogTitle>Promote Class Students</DialogTitle>
                <DialogContent>
                    {promoteError && <Alert severity="error" sx={{ mb: 2 }}>{promoteError}</Alert>}
                    <FormControl fullWidth sx={{ mt: 1 }}>
                        <InputLabel id="promote-target-label">Target Class</InputLabel>
                        <Select labelId="promote-target-label" value={promoteTarget} label="Target Class" onChange={(e) => setPromoteTarget(e.target.value)}>
                            {availableTargets.length === 0 && <MenuItem value="">No other classes available</MenuItem>}
                            {availableTargets.map((c) => (
                                <MenuItem key={c._id} value={c._id}>{c.sclassName}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel id="completed-terms-label">Terms Completed</InputLabel>
                        <Select labelId="completed-terms-label" value={promoteCompletedTerms} label="Terms Completed" onChange={(e) => setPromoteCompletedTerms(Number(e.target.value))}>
                            <MenuItem value={0}>0 terms</MenuItem>
                            <MenuItem value={1}>1 term</MenuItem>
                            <MenuItem value={2}>2 terms</MenuItem>
                            <MenuItem value={3}>3 terms - eligible for promotion</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControlLabel control={<Checkbox checked={promoteMoveSubjects} onChange={(e) => setPromoteMoveSubjects(e.target.checked)} />} label="Also move subjects to target class" />
                    <FormControlLabel control={<Checkbox checked={promoteUpdateRolls} onChange={(e) => setPromoteUpdateRolls(e.target.checked)} />} label="Update roll numbers in target class" />
                    {availableTargets.length === 0 && <Alert severity="info" sx={{ mt: 2 }}>No other classes are available to promote this class into.</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPromoteOpen(false)}>Cancel</Button>
                    <GreenButton disabled={promoteLoading || !promoteTarget || promoteCompletedTerms !== 3 || availableTargets.length === 0} onClick={handlePromote}>
                        {promoteLoading ? 'Processing...' : 'Confirm Promote'}
                    </GreenButton>
                </DialogActions>
            </Dialog>
        );
    }

    const subjectColumns = [
        { id: 'name', label: 'Subject Name', minWidth: 170 },
        { id: 'code', label: 'Subject Code', minWidth: 100 },
    ]

    const subjectRows = subjectsList && subjectsList.length > 0 && subjectsList.map((subject) => {
        return {
            name: subject.subName,
            code: subject.subCode,
            id: subject._id,
        };
    })

    const SubjectsButtonHaver = ({ row }) => {
        return (
            <>
                <IconButton onClick={() => deleteHandler(row.id, "Subject")}>
                    <DeleteIcon color="error" />
                </IconButton>
                <BlueButton
                    variant="contained"
                    onClick={() => {
                        navigate(`/Admin/class/subject/${classID}/${row.id}`)
                    }}
                >
                    View
                </BlueButton >
            </>
        );
    };

    const subjectActions = [
        {
            icon: <PostAddIcon color="primary" />, name: 'Add New Subject',
            action: () => navigate("/Admin/addsubject/" + classID)
        },
        {
            icon: <DeleteIcon color="error" />, name: 'Delete All Subjects',
            action: () => deleteHandler(classID, "SubjectsClass")
        }
    ];

    const ClassSubjectsSection = () => {
        return (
            <>
                {response ?
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                        <GreenButton
                            variant="contained"
                            onClick={() => navigate("/Admin/addsubject/" + classID)}
                        >
                            Add Subjects
                        </GreenButton>
                    </Box>
                    :
                    <>
                        <Typography variant="h5" gutterBottom>
                            Subjects List:
                        </Typography>

                        <TableTemplate buttonHaver={SubjectsButtonHaver} columns={subjectColumns} rows={subjectRows} />
                        <SpeedDialTemplate actions={subjectActions} />
                    </>
                }
            </>
        )
    }

    const studentColumns = [
        { id: 'name', label: 'Name', minWidth: 170 },
        { id: 'rollNum', label: 'Roll Number', minWidth: 100 },
    ]

    const studentRows = sclassStudents.map((student) => {
        return {
            name: student.name,
            rollNum: student.rollNum,
            id: student._id,
        };
    })

    const StudentsButtonHaver = ({ row }) => {
        return (
            <>
                <IconButton onClick={() => deleteHandler(row.id, "Student")}>
                    <PersonRemoveIcon color="error" />
                </IconButton>
                <BlueButton
                    variant="contained"
                    onClick={() => navigate("/Admin/students/student/" + row.id)}
                >
                    View
                </BlueButton>
                <PurpleButton
                    variant="contained"
                    onClick={() =>
                        navigate("/Admin/students/student/attendance/" + row.id)
                    }
                >
                    Attendance
                </PurpleButton>
            </>
        );
    };

    const studentActions = [
        {
            icon: <PersonAddAlt1Icon color="primary" />, name: 'Add New Student',
            action: () => navigate("/Admin/class/addstudents/" + classID)
        },
        {
            icon: <PersonRemoveIcon color="error" />, name: 'Delete All Students',
            action: () => deleteHandler(classID, "StudentsClass")
        },
    ];

    const ClassStudentsSection = () => {
        return (
            <>
                {getresponse ? (
                    <>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                            <GreenButton
                                variant="contained"
                                onClick={() => navigate("/Admin/class/addstudents/" + classID)}
                            >
                                Add Students
                            </GreenButton>
                        </Box>
                    </>
                ) : (
                    <>
                        <Typography variant="h5" gutterBottom>
                            Students List:
                        </Typography>

                        <TableTemplate buttonHaver={StudentsButtonHaver} columns={studentColumns} rows={studentRows} />
                        <SpeedDialTemplate actions={studentActions} />
                    </>
                )}
            </>
        )
    }

    const ClassTeachersSection = () => {
        return (
            <>
                Teachers
            </>
        )
    }

    const ClassDetailsSection = () => {
        const numberOfSubjects = subjectsList.length;
        const numberOfStudents = sclassStudents.length;

        return (
            <>
                <Typography variant="h4" align="center" gutterBottom>
                    Class Details
                </Typography>
                <Typography variant="h5" gutterBottom>
                    This is Class {sclassDetails && sclassDetails.sclassName}
                </Typography>
                <Typography variant="h6" gutterBottom>
                    Number of Subjects: {numberOfSubjects}
                </Typography>
                <Typography variant="h6" gutterBottom>
                    Number of Students: {numberOfStudents}
                </Typography>
                {getresponse &&
                    <GreenButton
                        variant="contained"
                        onClick={() => navigate("/Admin/class/addstudents/" + classID)}
                    >
                        Add Students
                    </GreenButton>
                }
                {response &&
                    <GreenButton
                        variant="contained"
                        onClick={() => navigate("/Admin/addsubject/" + classID)}
                    >
                        Add Subjects
                    </GreenButton>
                }
                <BlueButton variant="contained" onClick={openPromoteDialog} sx={{ ml: 2 }}>Promote Class</BlueButton>
                <PurpleButton
                    variant="contained"
                    onClick={handleGenerateTimetable}
                    disabled={timetableLoading}
                >
                    {timetable ? 'Regenerate Timetable' : 'Generate Timetable'}
                </PurpleButton>
                <TimetableSection />
                <TimetableEditSection />
            </>
        );
    }

    const TimetableSection = () => {
        const schedule = timetable?.schedule || [];

        return (
            <Box sx={{ mt: 4 }}>
                <Typography variant="h5" gutterBottom>
                    Class Timetable
                </Typography>
                {timetableLoading && <CircularProgress size={24} sx={{ mt: 1 }} />}
                {timetableError && <Alert severity="error" sx={{ mt: 2 }}>{timetableError}</Alert>}
                {timetable?.generatedAt && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        Last generated: {new Date(timetable.generatedAt).toLocaleString()}
                    </Typography>
                )}
                {schedule.length > 0 ? (
                    <TableContainer sx={{ mt: 2 }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Day</TableCell>
                                    <TableCell>Period</TableCell>
                                    <TableCell>Subject</TableCell>
                                    <TableCell>Teacher</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {schedule.sort((a, b) => {
                                    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                                    return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day) || a.period - b.period;
                                }).map((entry, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{entry.day}</TableCell>
                                        <TableCell>{entry.period}</TableCell>
                                        <TableCell>{entry.subjectName}</TableCell>
                                        <TableCell>{entry.teacherName}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    !timetableLoading && <Typography sx={{ mt: 2 }}>No timetable yet. Generate one to see the schedule.</Typography>
                )}
            </Box>
        );
    }

    const TimetableEditSection = () => {
        const schedule = editableSchedule || [];

        if (!timetable || !timetable.schedule?.length) {
            return null;
        }

        return (
            <Box sx={{ mt: 4 }}>
                <Typography variant="h5" gutterBottom>
                    Edit Timetable
                </Typography>
                {saveError && <Alert severity="error" sx={{ mt: 2 }}>{saveError}</Alert>}
                {saveSuccess && <Alert severity="success" sx={{ mt: 2 }}>{saveSuccess}</Alert>}
                <TableContainer sx={{ mt: 2 }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Day</TableCell>
                                <TableCell>Period</TableCell>
                                <TableCell>Subject</TableCell>
                                <TableCell>Teacher</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {schedule.sort((a, b) => {
                                const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                                return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day) || a.period - b.period;
                            }).map((entry, index) => {
                                const selectedSubject = subjectLookup[entry.subject] || {};
                                return (
                                    <TableRow key={`${entry.day}-${entry.period}`}>
                                        <TableCell>{entry.day}</TableCell>
                                        <TableCell>{entry.period}</TableCell>
                                        <TableCell>
                                            <FormControl fullWidth>
                                                <InputLabel id={`subject-select-${entry.day}-${entry.period}`}>Subject</InputLabel>
                                                <Select
                                                    labelId={`subject-select-${entry.day}-${entry.period}`}
                                                    value={entry.subject || ''}
                                                    label="Subject"
                                                    onChange={(e) => handleSlotChange(entry.day, entry.period, e.target.value)}
                                                >
                                                    <MenuItem value="">Free Period</MenuItem>
                                                    {subjectOptions.map((subject) => (
                                                        <MenuItem key={subject.id} value={subject.id}>
                                                            {subject.subName}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </TableCell>
                                        <TableCell>{selectedSubject.teacherName || 'Unassigned'}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={saveTimetableChanges}
                        disabled={saveLoading}
                    >
                        {saveLoading ? 'Saving...' : 'Save Timetable'}
                    </Button>
                </Box>
            </Box>
        );
    }

    return (
        <>
            {loading ? (
                <div>Loading...</div>
            ) : (
                <>
                    <Box sx={{ width: '100%', typography: 'body1', }} >
                        <TabContext value={value}>
                            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                                <TabList onChange={handleChange} sx={{ position: 'fixed', width: '100%', bgcolor: 'background.paper', zIndex: 1 }}>
                                    <Tab label="Details" value="1" />
                                    <Tab label="Subjects" value="2" />
                                    <Tab label="Students" value="3" />
                                    <Tab label="Teachers" value="4" />
                                </TabList>
                            </Box>
                            <Container sx={{ marginTop: "3rem", marginBottom: "4rem" }}>
                                <TabPanel value="1">
                                    <ClassDetailsSection />
                                </TabPanel>
                                <TabPanel value="2">
                                    <ClassSubjectsSection />
                                </TabPanel>
                                <TabPanel value="3">
                                    <ClassStudentsSection />
                                </TabPanel>
                                <TabPanel value="4">
                                    <ClassTeachersSection />
                                </TabPanel>
                            </Container>
                        </TabContext>
                    </Box>
                </>
            )}
            <Popup message={message} setShowPopup={setShowPopup} showPopup={showPopup} />
        </>
    );
};

export default ClassDetails;
