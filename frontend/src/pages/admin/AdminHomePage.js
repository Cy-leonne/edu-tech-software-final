import { API_BASE_URL } from '../../utils/apiConfig';

import { Container, Grid, Paper, Button, Box, Stack, Skeleton } from '@mui/material'
import { useNavigate } from 'react-router-dom';
import SeeNotice from '../../components/SeeNotice';
import Students from "../../assets/img1.png";
import Classes from "../../assets/img2.png";
import Teachers from "../../assets/img3.png";
import Fees from "../../assets/img4.png";
import styled from 'styled-components';
import CountUp from 'react-countup';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { getAllSclasses } from '../../redux/sclassRelated/sclassHandle';
import { getAllStudents } from '../../redux/studentRelated/studentHandle';
import { getAllTeachers } from '../../redux/teacherRelated/teacherHandle';
import DataExportButton from '../../components/DataExportButton';
import PageHeader from '../../components/PageHeader';
import { ErrorState } from '../../components/StateViews';

/**
 * Admin dashboard home.
 *
 * Presentation-only changes: shared page header, a KPI grid that scales from
 * 320px phones to large desktops, consistent card proportions and visible
 * loading/error feedback. All data fetching and business logic is unchanged.
 */
const AdminHomePage = () => {
    const dispatch = useDispatch();
    const { studentsList } = useSelector((state) => state.student);
    const { sclassesList } = useSelector((state) => state.sclass);
    const { teachersList } = useSelector((state) => state.teacher);

    const { currentUser } = useSelector(state => state.user)
    const navigate = useNavigate();

    const [summary, setSummary] = useState({ approvedCount: 0, pendingCount: 0 });
    const [summaryError, setSummaryError] = useState(false);
    const [loading, setLoading] = useState(true);

    const adminID = currentUser?._id

    const fetchSummary = async () => {
        try {
            setSummaryError(false);
            const response = await axios.get(`${API_BASE_URL}/Admin/Summary`, {
                headers: { 'x-admin-id': currentUser?._id || currentUser?.id }
            });
            setSummary(response.data);
        } catch (error) {
            console.error('Failed to load summary:', error?.message || error);
            setSummaryError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!adminID) return;
        dispatch(getAllStudents(adminID));
        dispatch(getAllSclasses(adminID, "Sclass"));
        dispatch(getAllTeachers(adminID));
        fetchSummary();
        // fetchSummary is intentionally not part of the dependency array: it is
        // re-created on every render and only depends on the API base URL.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adminID, dispatch]);

    const numberOfStudents = studentsList?.length ?? 0;
    const numberOfClasses = sclassesList?.length ?? 0;
    const numberOfTeachers = teachersList?.length ?? 0;

    const firstName = String(currentUser?.name || '').trim().split(' ')[0];

    const cards = [
        { key: 'students', image: Students, alt: 'Students', title: 'Total Students', value: numberOfStudents, duration: 2.5 },
        { key: 'classes', image: Classes, alt: 'Classes', title: 'Total Classes', value: numberOfClasses, duration: 5 },
        { key: 'teachers', image: Teachers, alt: 'Teachers', title: 'Total Teachers', value: numberOfTeachers, duration: 2.5 },
        { key: 'approvals', image: Fees, alt: 'Pending Approvals', title: 'Pending Registrations', value: summary.pendingCount ?? 0, duration: 2.5 },
    ];

    return (
        <>
            <Container maxWidth="lg" sx={{ px: { xs: 0, sm: 2 }, py: { xs: 1, md: 2 } }}>
                <PageHeader
                    title={firstName ? `Welcome back, ${firstName}` : 'Admin Dashboard'}
                    subtitle="Overview of your school's students, classes, teachers and approvals."
                    breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Dashboard' }]}
                />

                {summaryError && (
                    <Paper sx={{ mb: 3 }}>
                        <ErrorState
                            title="Could not load dashboard summary"
                            description="Some figures below may be incomplete. Check the connection to the server and try again."
                            onRetry={fetchSummary}
                            minHeight={120}
                        />
                    </Paper>
                )}

                <Grid container spacing={{ xs: 2, md: 3 }}>
                    {cards.map((card) => (
                        <Grid item xs={12} sm={6} lg={3} key={card.key}>
                            <StyledPaper>
                                <img src={card.image} alt={card.alt} />
                                <Box sx={{ mt: 1, minWidth: 0, width: '100%' }}>
                                    <Title>{card.title}</Title>
                                    {loading && !summaryError ? (
                                        <Skeleton variant="text" width={72} height={44} sx={{ mx: 'auto' }} />
                                    ) : (
                                        <Data start={0} end={card.value} duration={card.duration} />
                                    )}
                                </Box>
                            </StyledPaper>
                        </Grid>
                    ))}

                    <Grid item xs={12}>
                        <Stack
                            direction={{ xs: 'column-reverse', sm: 'row' }}
                            spacing={2}
                            alignItems={{ xs: 'stretch', sm: 'center' }}
                            justifyContent="space-between"
                            sx={{ mb: { xs: 1.5, md: 2 } }}
                        >
                            <Button
                                variant="contained"
                                size="small"
                                onClick={() => navigate('/Admin/students')}
                                sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
                            >
                                Manage students
                            </Button>
                            <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                                <DataExportButton endpoint="/Exports/SchoolData" filename="school-data.csv" label="Download School Data" />
                            </Box>
                        </Stack>

                        <Paper sx={{ p: { xs: 1.5, sm: 2 }, display: 'flex', flexDirection: 'column', width: '100%' }}>
                            <SeeNotice />
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </>
    );
};


const StyledPaper = styled(Paper)`
  padding: 16px;
  display: flex;
  flex-direction: column;
  min-height: 190px;
  height: 100%;
  justify-content: space-between;
  align-items: center;
  text-align: center;
  border-radius: 10px;

  @media (max-width: 600px) {
    min-height: 150px;
    padding: 14px;
  }
`;

const Title = styled.p`
  font-size: 1.15rem;
  margin: 0 0 4px;
  color: #1f2937;
`;

const Data = styled(CountUp)`
  font-size: calc(1.3rem + .6vw);
  color: green;
  font-weight: 600;
  word-break: break-word;
`;

export default AdminHomePage
