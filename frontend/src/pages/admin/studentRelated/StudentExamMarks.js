import { API_BASE_URL } from '../../../utils/apiConfig';

import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { getUserDetails } from '../../../redux/userRelated/userHandle';
import { getSubjectList } from '../../../redux/sclassRelated/sclassHandle';
import { updateStudentFields } from '../../../redux/studentRelated/studentHandle';

import Popup from '../../../components/Popup';
import { BlueButton } from '../../../components/buttonStyles';
import {
    Box, InputLabel,
    MenuItem, Select,
    Typography, Stack,
    TextField, CircularProgress, FormControl, Chip
} from '@mui/material';
import { calculateGrade, getGradeColor, GRADING_SYSTEMS } from '../../../utils/gradingSystem';
import axios from 'axios';


const StudentExamMarks = ({ situation }) => {
    const dispatch = useDispatch();
    const { currentUser, userDetails, loading } = useSelector((state) => state.user);
    const { subjectsList } = useSelector((state) => state.sclass);
    const { response, error, statestatus } = useSelector((state) => state.student);
    const params = useParams()

    const [subjectName, setSubjectName] = useState("");
    const [chosenSubName, setChosenSubName] = useState("");
    const [examType, setExamType] = useState('CAT');
    const [term, setTerm] = useState('Term 1');
    const [marksObtained, setMarksObtained] = useState("");
    const [gradeInfo, setGradeInfo] = useState(null);
    const [gradingSystem, setGradingSystem] = useState('achievement');
    const [changeReason, setChangeReason] = useState('');

    const examTypes = [
        { key: 'CAT', label: 'CAT' },
        { key: 'END_TERM', label: 'End Term' },
    ];

    const [showPopup, setShowPopup] = useState(false);
    const [message, setMessage] = useState("");
    const [loader, setLoader] = useState(false)

    const requestedStudentId = situation === "Student" ? params.id : params.studentID;
    const classId = userDetails?.sclassName?._id || currentUser?.teachSclass?._id;
    const isCurrentStudentLoaded = userDetails?._id === requestedStudentId;
    const showLoadingState = loading && !isCurrentStudentLoaded && !currentUser?.name;

    useEffect(() => {
        if (requestedStudentId && !isCurrentStudentLoaded) {
            dispatch(getUserDetails(requestedStudentId, "Student"));
        }
        if (situation === "Subject" && params.subjectID) {
            setChosenSubName(params.subjectID);
        }
    }, [dispatch, requestedStudentId, isCurrentStudentLoaded, params, situation]);

    useEffect(() => {
        if (classId && (situation === "Student" || situation === "Subject") && (!Array.isArray(subjectsList) || subjectsList.length === 0)) {
            dispatch(getSubjectList(classId, "ClassSubjects"));
        }
    }, [dispatch, classId, situation, subjectsList]);

    useEffect(() => {
        if (situation === "Subject" && params.subjectID && Array.isArray(subjectsList) && subjectsList.length > 0) {
            const matchingSubject = subjectsList.find((subject) => subject._id === params.subjectID);
            if (matchingSubject) {
                setSubjectName(matchingSubject.subName || "");
                setChosenSubName(matchingSubject._id || "");
            }
        }
    }, [params.subjectID, situation, subjectsList]);

    useEffect(() => {
        if (!subjectName && currentUser?.teachSubject) {
            setSubjectName(currentUser.teachSubject.subName || "");
            setChosenSubName(currentUser.teachSubject._id || "");
        }
    }, [currentUser, subjectName]);

    useEffect(() => {
        const schoolId = currentUser?.school?._id || currentUser?.school;
        if (!schoolId || !currentUser?._id) return;
        axios.get(`${API_BASE_URL}/Admin/Settings/${schoolId}`, {
            headers: { 'x-admin-id': currentUser._id }
        }).then(({ data }) => {
            setGradingSystem(data.settings?.gradingSystem?.type || 'achievement');
        }).catch(() => {});
    }, [currentUser]);

    useEffect(() => {
        if (marksObtained && marksObtained !== '') {
            const grade = calculateGrade(parseFloat(marksObtained), gradingSystem);
            setGradeInfo(grade);
        } else {
            setGradeInfo(null);
        }
    }, [marksObtained, gradingSystem]);

    const changeHandler = (event) => {
        const selectedValue = event.target.value;
        const selectedSubject = Array.isArray(subjectsList)
            ? subjectsList.find((subject) => subject?.subName === selectedValue)
            : null;

        if (!selectedSubject) {
            setSubjectName(selectedValue || "");
            setChosenSubName("");
            return;
        }

        setSubjectName(selectedSubject.subName || "");
        setChosenSubName(selectedSubject._id || "");
    }

    const submitHandler = (event) => {
        event.preventDefault()

        const numericMarks = Number(marksObtained);
        if (!Number.isFinite(numericMarks) || numericMarks < 0 || numericMarks > 100) {
            setMessage("Marks must be a number between 0 and 100");
            setShowPopup(true);
            return;
        }
        if (!chosenSubName) {
            setMessage("Please select a subject");
            setShowPopup(true);
            return;
        }

        setLoader(true)
        
        const fields = { subName: chosenSubName, examType, term, marksObtained: numericMarks, gradingSystem, changeReason };
        if (gradeInfo) {
            fields.grade = gradeInfo.grade;
            fields.level = gradeInfo.level;
            fields.points = gradeInfo.points;
            fields.remark = gradeInfo.remark;
        }
        
        const studentID = requestedStudentId;
        dispatch(updateStudentFields(studentID, fields, "UpdateExamResult"))
    }

    useEffect(() => {
        if (response) {
            setLoader(false)
            setShowPopup(true)
            setMessage(response)
        }
        else if (error) {
            setLoader(false)
            setShowPopup(true)
            setMessage(typeof error === 'string' ? error : "Marks submission failed. Please try again.")
        }
        else if (statestatus === "added") {
            setLoader(false)
            setShowPopup(true)
            setMessage("Done Successfully")
        }
    }, [response, statestatus, error])

    return (
        <>
            {showLoadingState
                ?
                <>
                    <div>Loading...</div>
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
                                <Typography variant="h4">
                                    Student Name: {userDetails.name}
                                </Typography>
                                <TextField
                                    select
                                    label="Grading System"
                                    value={gradingSystem}
                                    onChange={(event) => setGradingSystem(event.target.value)}
                                    SelectProps={{ native: true }}
                                    sx={{ mb: 2, minWidth: 280 }}
                                >
                                    {Object.entries(GRADING_SYSTEMS).map(([type, system]) => (
                                        <option key={type} value={type}>{system.label}</option>
                                    ))}
                                </TextField>
                                {currentUser.teachSubject &&
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
                                            <InputLabel id="demo-simple-select-label">
                                                Select Subject
                                            </InputLabel>
                                            <Select
                                                labelId="demo-simple-select-label"
                                                id="demo-simple-select"
                                                value={subjectName || currentUser?.teachSubject?.subName || ""}
                                                label="Choose an option"
                                                onChange={changeHandler}
                                                required
                                            >
                                                {Array.isArray(subjectsList) && subjectsList.length > 0 ?
                                                    subjectsList.map((subject, index) => (
                                                        <MenuItem key={index} value={subject.subName}>
                                                            {subject.subName}
                                                        </MenuItem>
                                                    ))
                                                    :
                                                    <MenuItem value="">
                                                        Add Subjects For Marks
                                                    </MenuItem>
                                                }
                                            </Select>
                                        </FormControl>
                                    }
                                    <FormControl fullWidth>
                                        <InputLabel id="exam-type-label">Exam Type</InputLabel>
                                        <Select
                                            labelId="exam-type-label"
                                            id="exam-type-select"
                                            value={examType}
                                            label="Exam Type"
                                            onChange={(event) => setExamType(event.target.value)}
                                        >
                                            {examTypes.map((item) => (
                                                <MenuItem key={item.key} value={item.key}>
                                                    {item.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <FormControl fullWidth>
                                        <InputLabel id="term-label">Term</InputLabel>
                                        <Select labelId="term-label" value={term} label="Term" onChange={(event) => setTerm(event.target.value)}>
                                            <MenuItem value="Term 1">Term 1</MenuItem>
                                            <MenuItem value="Term 2">Term 2</MenuItem>
                                            <MenuItem value="Term 3">Term 3</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <FormControl>
                                        <TextField type="number" label='Enter marks'
                                            value={marksObtained} required
                                            onChange={(e) => setMarksObtained(e.target.value)}
                                            InputLabelProps={{
                                                shrink: true,
                                            }}
                                        />
                                    </FormControl>
                                    <TextField
                                        label="Reason for mark change"
                                        value={changeReason}
                                        onChange={(event) => setChangeReason(event.target.value)}
                                        placeholder="Required when correcting an existing mark"
                                        multiline
                                        minRows={2}
                                    />
                                    {gradeInfo && (
                                        <FormControl>
                                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                                Grade Preview
                                            </Typography>
                                            <Chip
                                                label={`${gradeInfo.grade} (${gradeInfo.points}) - ${gradeInfo.remark}`}
                                                sx={{
                                                    backgroundColor: getGradeColor(gradeInfo.grade),
                                                    color: 'white',
                                                    fontSize: '0.95rem',
                                                    height: 'auto',
                                                    py: 1.5
                                                }}
                                            />
                                        </FormControl>
                                    )}
                                </Stack>
                                <BlueButton
                                    fullWidth
                                    size="large"
                                    sx={{ mt: 3 }}
                                    variant="contained"
                                    type="submit"
                                    disabled={loader}
                                >
                                    {loader ? <CircularProgress size={24} color="inherit" /> : "Submit"}
                                </BlueButton>
                            </form>
                        </Box>
                    </Box>
                    <Popup message={message} setShowPopup={setShowPopup} showPopup={showPopup} />
                </>
            }
        </>
    )
}

export default StudentExamMarks
