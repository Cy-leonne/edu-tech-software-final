
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { Box, Table, TableBody, TableContainer, TableHead, Typography, Paper, Checkbox } from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom';
import { getTeacherFreeClassSubjects } from '../../../redux/sclassRelated/sclassHandle';
import { updateTeachSubject } from '../../../redux/teacherRelated/teacherHandle';
import { GreenButton, PurpleButton } from '../../../components/buttonStyles';
import { StyledTableCell, StyledTableRow } from '../../../components/styles';

const ChooseSubject = ({ situation }) => {
    const params = useParams();
    const navigate = useNavigate()
    const dispatch = useDispatch();

    const [classID, setClassID] = useState("");
    const [teacherID, setTeacherID] = useState("");
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [loader, setLoader] = useState(false)

    const { subjectsList, loading, error, response } = useSelector((state) => state.sclass);

    useEffect(() => {
        if (situation === "Norm") {
            setClassID(params.id);
            const classID = params.id
            dispatch(getTeacherFreeClassSubjects(classID));
        }
        else if (situation === "Teacher") {
            const { classID, teacherID } = params
            setClassID(classID);
            setTeacherID(teacherID);
            dispatch(getTeacherFreeClassSubjects(classID));
        }
    }, [situation, params.id, params.classID, params.teacherID, dispatch]);

    if (loading) {
        return <div>Loading...</div>;
    } else if (response) {
        return <div>
            <h1>Sorry all subjects have teachers assigned already</h1>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <PurpleButton variant="contained"
                    onClick={() => navigate("/Admin/addsubject/" + classID)}>
                    Add Subjects
                </PurpleButton>
            </Box>
        </div>;
    } else if (error) {
        console.log(error)
    }

    const toggleSubjectSelection = (subjectId) => {
        setSelectedSubjects((currentSelections) => {
            if (currentSelections.includes(subjectId)) {
                return currentSelections.filter((id) => id !== subjectId);
            }
            return [...currentSelections, subjectId];
        });
    };

    const updateSubjectHandler = (teacherId) => {
        if (selectedSubjects.length === 0) return;
        setLoader(true)
        dispatch(updateTeachSubject(teacherId, selectedSubjects[0], selectedSubjects))
        navigate("/Admin/teachers")
    }

    return (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <Typography variant="h6" gutterBottom component="div">
                Choose a subject
            </Typography>
            <>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, marginBottom: 2 }}>
                    {situation === "Teacher" && (
                        <GreenButton variant="contained" disabled={loader || selectedSubjects.length === 0}
                            onClick={() => updateSubjectHandler(teacherID)}>
                            {loader ? <div className="load"></div> : `Assign ${selectedSubjects.length} Subject${selectedSubjects.length > 1 ? 's' : ''}`}
                        </GreenButton>
                    )}
                    {situation === "Norm" && (
                        <GreenButton variant="contained" disabled={selectedSubjects.length === 0}
                            onClick={() => navigate(`/Admin/teachers/addteacher/${selectedSubjects[0]}`)}>
                            Add Teacher for selected subject
                        </GreenButton>
                    )}
                </Box>
                <TableContainer>
                    <Table aria-label="sclasses table">
                        <TableHead>
                            <StyledTableRow>
                                <StyledTableCell></StyledTableCell>
                                <StyledTableCell align="center">Select</StyledTableCell>
                                <StyledTableCell align="center">Subject Name</StyledTableCell>
                                <StyledTableCell align="center">Subject Code</StyledTableCell>
                            </StyledTableRow>
                        </TableHead>
                        <TableBody>
                            {Array.isArray(subjectsList) && subjectsList.length > 0 && subjectsList.map((subject, index) => (
                                <StyledTableRow key={subject._id}>
                                    <StyledTableCell component="th" scope="row" style={{ color: "white" }}>
                                        {index + 1}
                                    </StyledTableCell>
                                    <StyledTableCell align="center">
                                        <Checkbox
                                            checked={selectedSubjects.includes(subject._id)}
                                            onChange={() => toggleSubjectSelection(subject._id)}
                                        />
                                    </StyledTableCell>
                                    <StyledTableCell align="center">{subject.subName}</StyledTableCell>
                                    <StyledTableCell align="center">{subject.subCode}</StyledTableCell>
                                </StyledTableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </>
        </Paper >
    );
};

export default ChooseSubject;
