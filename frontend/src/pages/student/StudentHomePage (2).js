
import React, { useEffect, useState } from 'react'
import { Container, Grid, Paper, Typography, Button } from '@mui/material'
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { calculateOverallAttendancePercentage } from '../../components/attendanceCalculator';
import CustomPieChart from '../../components/CustomPieChart';
import { getUserDetails } from '../../redux/userRelated/userHandle';
import styled from 'styled-components';
import SeeNotice from '../../components/SeeNotice';
import CountUp from 'react-countup';
import Subject from "../../assets/subjects.svg";
import Assignment from "../../assets/assignment.svg";
import { getSubjectList } from '../../redux/sclassRelated/sclassHandle';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const StudentHomePage = () => {
    const dispatch = useDispatch();

    const { userDetails, currentUser, loading, response } = useSelector((state) => state.user);
    const { subjectsList } = useSelector((state) => state.sclass);

    const [subjectAttendance, setSubjectAttendance] = useState([]);
    const [assignmentCount, setAssignmentCount] = useState(0);
    const [learningMaterialsCount, setLearningMaterialsCount] = useState(0);
    const [liveClassesCount, setLiveClassesCount] = useState(0);
    const [quizCount, setQuizCount] = useState(0);

    const classID = currentUser.sclassName?._id || currentUser.sclassName || currentUser?.teachSclass?._id || currentUser?.teachSclass;
    const schoolId = currentUser?.school?._id || currentUser?.school;
    const headers = schoolId ? { 'x-admin-id': schoolId } : {};

    useEffect(() => {
        if (!currentUser?._id) return;
        dispatch(getUserDetails(currentUser._id, "Student"));
    }, [dispatch, currentUser?._id]);

    useEffect(() => {
        if (!classID) return;
        dispatch(getSubjectList(classID, "ClassSubjects"));
    }, [dispatch, classID]);

    useEffect(() => {
        if (!classID) return;

        const fetchAssignments = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/Assignments/Class/${classID}`, { headers });
                const data = await res.json();
                if (res.ok && Array.isArray(data)) {
                    setAssignmentCount(data.length);
                }
            } catch (err) {
                console.error('Failed to fetch assignments:', err);
            }
        };

        const fetchLearningCounts = async () => {
            try {
                const [materialsRes, classesRes, quizzesRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/LearningMaterials/${classID}`, { headers }),
                    fetch(`${API_BASE_URL}/LiveClasses/${classID}`, { headers }),
                    fetch(`${API_BASE_URL}/Quizzes/${classID}`, { headers })
                ]);
                const materialsData = await materialsRes.json();
                const classesData = await classesRes.json();
                const quizzesData = await quizzesRes.json();

                setLearningMaterialsCount(Array.isArray(materialsData) ? materialsData.length : 0);
                setLiveClassesCount(Array.isArray(classesData) ? classesData.length : 0);
                setQuizCount(Array.isArray(quizzesData) ? quizzesData.length : 0);
            } catch (err) {
                console.error('Failed to fetch learning material counts:', err);
            }
        };

        fetchAssignments();
        fetchLearningCounts();
    }, [classID, headers]);

    const numberOfSubjects = subjectsList && subjectsList.length;

    useEffect(() => {
        if (userDetails) {
            setSubjectAttendance(userDetails.attendance || []);
        }
    }, [userDetails])

    const overallAttendancePercentage = calculateOverallAttendancePercentage(subjectAttendance);
    const overallAbsentPercentage = 100 - overallAttendancePercentage;

    const chartData = [
        { name: 'Present', value: overallAttendancePercentage },
        { name: 'Absent', value: overallAbsentPercentage }
    ];
    return (
        <>
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={3} lg={3}>
                        <StyledPaper>
                            <img src={Subject} alt="Subjects" />
                            <Title>
                                Total Subjects
                            </Title>
                            <Data start={0} end={numberOfSubjects} duration={2.5} />
                        </StyledPaper>
                    </Grid>
                    <Grid item xs={12} md={3} lg={3}>
                        <StyledPaper>
                            <img src={Assignment} alt="Assignments" />
                            <Title>
                                Total Assignments
                            </Title>
                            <Data start={0} end={assignmentCount} duration={4} />
                        </StyledPaper>
                    </Grid>
                    <Grid item xs={12} md={3} lg={3}>
                        <StyledPaper>
                            <Title>
                                Learning Materials
                            </Title>
                            <Data start={0} end={learningMaterialsCount} duration={4} />
                        </StyledPaper>
                    </Grid>
                    <Grid item xs={12} md={3} lg={3}>
                        <StyledPaper>
                            <Title>
                                Live Classes
                            </Title>
                            <Data start={0} end={liveClassesCount} duration={4} />
                        </StyledPaper>
                    </Grid>
                    <Grid item xs={12} md={3} lg={3}>
                        <StyledPaper>
                            <Title>
                                Quizzes
                            </Title>
                            <Data start={0} end={quizCount} duration={4} />
                        </StyledPaper>
                    </Grid>
                    <Grid item xs={12} md={3} lg={3}>
                        <StyledPaper>
                            <Title>
                                Total Fees
                            </Title>
                            <Data start={0} end={userDetails?.totalFees ?? currentUser?.totalFees ?? 0} duration={2.5} />
                        </StyledPaper>
                    </Grid>
                    <Grid item xs={12} md={3} lg={3}>
                        <StyledPaper>
                            <Title>
                                Paid
                            </Title>
                            <Data start={0} end={userDetails?.amountPaid ?? currentUser?.amountPaid ?? 0} duration={2.5} />
                        </StyledPaper>
                    </Grid>
                    <Grid item xs={12} md={3} lg={3}>
                        <StyledPaper>
                            <Title>
                                Balance
                            </Title>
                            <Data start={0} end={userDetails?.balance ?? currentUser?.balance ?? 0} duration={2.5} />
                        </StyledPaper>
                    </Grid>
                    <Grid item xs={12} md={3} lg={3}>
                        <ActionPaper>
                            <Typography sx={{ fontSize: '1.1rem', fontWeight: 600 }}>Learning Portal</Typography>
                            <Typography sx={{ color: 'text.secondary', mb: 2 }}>Access class notes, live lessons and quizzes.</Typography>
                            <Button component={Link} to="/Student/learning-portal" variant="contained" size="small">Open Learning Portal</Button>
                        </ActionPaper>
                    </Grid>
                    <Grid item xs={12} md={4} lg={3}>
                        <ChartContainer>
                            {
                                response ?
                                    <Typography variant="h6">No Attendance Found</Typography>
                                    :
                                    <>
                                        {loading
                                            ? (
                                                <Typography variant="h6">Loading...</Typography>
                                            )
                                            :
                                            <>
                                                {
                                                    subjectAttendance && Array.isArray(subjectAttendance) && subjectAttendance.length > 0 ? (
                                                        <>
                                                            <CustomPieChart data={chartData} />
                                                        </>
                                                    )
                                                        :
                                                        <Typography variant="h6">No Attendance Found</Typography>
                                                }
                                            </>
                                        }
                                    </>
                            }
                        </ChartContainer>
                    </Grid>
                    <Grid item xs={12}>
                        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                            <SeeNotice />
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </>
    )
}

const ChartContainer = styled.div`
  padding: 2px;
  display: flex;
  flex-direction: column;
  height: 240px;
  justify-content: center;
  align-items: center;
  text-align: center;
`;

const StyledPaper = styled(Paper)`
  padding: 16px;
  display: flex;
  flex-direction: column;
  height: 200px;
  justify-content: space-between;
  align-items: center;
  text-align: center;
`;

const ActionPaper = styled(Paper)`
  padding: 16px;
  display: flex;
  flex-direction: column;
  height: 200px;
  justify-content: center;
  align-items: flex-start;
  text-align: left;
`;

const Title = styled.p`
  font-size: 1.25rem;
`;

const Data = styled(CountUp)`
  font-size: calc(1.3rem + .6vw);
  color: green;
`;



export default StudentHomePage
