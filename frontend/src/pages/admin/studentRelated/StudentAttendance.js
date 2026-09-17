import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { getUserDetails } from '../../../redux/userRelated/userHandle';
import { getSubjectList } from '../../../redux/sclassRelated/sclassHandle';
import { updateStudentFields } from '../../../redux/studentRelated/studentHandle';

import {
    Box, InputLabel,
    MenuItem, Select,
    Typography, Stack,
    TextField, CircularProgress, FormControl
} from '@mui/material';
import { PurpleButton } from '../../../components/buttonStyles';
import Popup from '../../../components/Popup';

const StudentAttendance = ({ situation }) => {
    const dispatch = useDispatch();
    const { currentUser, userDetails, loading, error: userError } = useSelector((state) => state.user);
    const { subjectsList } = useSelector((state) => state.sclass);
    const { response, error, statestatus, loading: studentLoading } = useSelector((state) => state.student);
    const params = useParams()

    const [subjectName, setSubjectName] = useState("");
    const [chosenSubName, setChosenSubName] = useState("");
    const [status, setStatus] = useState('Present');
    const [date, setDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });

    const [showPopup, setShowPopup] = useState(false);
    const [message, setMessage] = useState("");
    const [loader, setLoader] = useState(false)
    const [loadFailed, setLoadFailed] = useState(false)

    const requestedStudentId = situation === "Student" ? params.id : params.studentID;
    const classId = userDetails?.sclassName?._id || userDetails?.sclassName || currentUser?.teachSclass?._id || currentUser?.teachSclass;
    const studentName = userDetails?.name || currentUser?.name || "Student";
    const isCurrentStudentLoaded = userDetails?._id === requestedStudentId;
    const showLoadingState = loading && !isCurrentStudentLoaded && !currentUser?.name;
    const showErrorState = !showLoadingState && loadFailed;

    useEffect(() => {
        setLoadFailed(false);

        if (requestedStudentId && !isCurrentStudentLoaded) {
            dispatch(getUserDetails(requestedStudentId, "Student"));
        }

        if (situation === "Subject" && params.subjectID) {
            setChosenSubName(params.subjectID);
            setSubjectName("");
        }
    }, [dispatch, requestedStudentId, isCurrentStudentLoaded, params, situation]);

    useEffect(() => {
        if (classId && (situation === "Student" || situation === "Subject")) {
            dispatch(getSubjectList(classId, "ClassSubjects"));
        }
    }, [dispatch, classId, situation]);

    useEffect(() => {
        if (situation === "Subject" && params.subjectID) {
            setChosenSubName(params.subjectID);
            setSubjectName("");
        }
    }, [params.subjectID, situation]);

    useEffect(() => {
        if (Array.isArray(subjectsList) && subjectsList.length > 0) {
            if (chosenSubName) {
                const selectedSubject = subjectsList.find((subject) => subject._id === chosenSubName);
                if (selectedSubject) {
                    setSubjectName(selectedSubject.subName || "");
                }
            } else if (!subjectName && currentUser?.teachSubject) {
                const teachSubId = currentUser.teachSubject?._id || currentUser.teachSubject;
                const selectedSubject = subjectsList.find((subject) => subject._id === teachSubId);
                if (selectedSubject) {
                    setChosenSubName(selectedSubject._id || "");
                    setSubjectName(selectedSubject.subName || "");
                }
            }
        }
    }, [subjectsList, chosenSubName, subjectName, currentUser]);


    const changeHandler = (event) => {
        const selectedId = event.target.value;
        const selectedSubject = Array.isArray(subjectsList)
            ? subjectsList.find((subject) => subject?._id === selectedId)
            : null;

        if (!selectedSubject) {
            setSubjectName("");
            setChosenSubName("");
            return;
        }

        setSubjectName(selectedSubject.subName || "");
        setChosenSubName(selectedSubject._id || "");
    }

    const submitHandler = (event) => {
        event.preventDefault()
        
        if (!chosenSubName || !chosenSubName.trim()) {
            setMessage("Please select a subject")
            setShowPopup(true)
            return
        }
        if (!date) {
            setMessage("Please select an attendance date")
            setShowPopup(true)
            return
        }
        
        setLoader(true)
        const fieldsToSubmit = { 
            subName: chosenSubName, 
            status: status, 
            date 
        }
        dispatch(updateStudentFields(studentID, fieldsToSubmit, "StudentAttendance"))
    }

    // Use requestedStudentId for form submission
    const studentID = requestedStudentId;

    useEffect(() => {
        if (userError && !loading && !userDetails?.name && !currentUser?.name) {
            setLoadFailed(true);
        } else if (!loading) {
            setLoadFailed(false);
        }
    }, [currentUser, loading, userDetails, userError]);

    useEffect(() => {
        if (!studentLoading && loader) {
            setLoader(false);

            if (response) {
                setShowPopup(true);
                setMessage(response);
            } else if (error) {
                setShowPopup(true);
                setMessage(typeof error === 'string' ? error : "Attendance submission failed. Please try again.");
            } else if (statestatus === "added") {
                setShowPopup(true);
                setMessage("Done Successfully");
            }
        }
    }, [studentLoading, response, statestatus, error, loader]);

    return (
        <>
            {showLoadingState
                ?
                <>
                    <div>Loading student details...</div>
                </>
                :
                <>
                    <Box
                        sx={{
                            flex: '1 1 auto',
                            alignItems: 'center',
                            display: 'flex',
                            justifyContent: 'center'
                        }}
                    >
                        <Box
                            sx={{
                                maxWidth: 550,
                                px: 3,
                                py: '100px',
                                width: '100%'
                            }}
                        >
                            <Stack spacing={1} sx={{ mb: 3 }}>
                                {showErrorState && (
                                    <Typography color="error" sx={{ mb: 1 }}>
                                        Unable to load the student details. Please verify the student ID or try again.
                                    </Typography>
                                )}
                                <Typography variant="h4">
                                    Student Name: {studentName}
                                </Typography>
                                {currentUser?.teachSubject &&
                                    <Typography variant="h4">
                                        Subject Name: {currentUser.teachSubject?.subName}
                                    </Typography>
                                }
                            </Stack>
                            <form onSubmit={submitHandler}>
                                <Stack spacing={3}>
                                    {
                                        (situation === "Student" || situation === "Subject") &&
                                        <FormControl fullWidth>
                                            <InputLabel id="demo-simple-select-label">Select Subject</InputLabel>
                                            <Select
                                                labelId="demo-simple-select-label"
                                                id="demo-simple-select"
                                                value={chosenSubName || ""}
                                                label="Choose an option"
                                                onChange={changeHandler}
                                                required
                                            >
                                                <MenuItem value="" disabled>
                                                    Select Subject
                                                </MenuItem>
                                                {Array.isArray(subjectsList) && subjectsList.length > 0 ?
                                                    subjectsList.map((subject) => (
                                                        <MenuItem key={subject._id} value={subject._id}>
                                                            {subject.subName}
                                                        </MenuItem>
                                                    ))
                                                    :
                                                    <MenuItem value="" disabled>
                                                        No subjects assigned to this class
                                                    </MenuItem>
                                                }
                                            </Select>
                                        </FormControl>
                                    }
                                    <FormControl fullWidth>
                                        <InputLabel id="status-label">Attendance Status</InputLabel>
                                        <Select
                                            labelId="status-label"
                                            id="status-select"
                                            value={status}
                                            label="Attendance Status"
                                            onChange={(event) => setStatus(event.target.value)}
                                        >
                                            <MenuItem value="Present">Present</MenuItem>
                                            <MenuItem value="Absent">Absent</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <FormControl fullWidth>
                                        <TextField
                                            label="Date"
                                            type="date"
                                            value={date}
                                            onChange={(event) => setDate(event.target.value)}
                                            InputLabelProps={{
                                                shrink: true,
                                            }}
                                        />
                                    </FormControl>
                                </Stack>

                                <PurpleButton
                                    fullWidth
                                    size="large"
                                    sx={{ mt: 3 }}
                                    variant="contained"
                                    type="submit"
                                    disabled={loader || !studentID}
                                >
                                    {loader ? <CircularProgress size={24} color="inherit" /> : "Submit"}
                                </PurpleButton>
                            </form>
                        </Box>
                    </Box>
                    <Popup message={message} setShowPopup={setShowPopup} showPopup={showPopup} />
                </>
            }
        </>
    )
}

export default StudentAttendance