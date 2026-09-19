
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Box, Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Alert } from '@mui/material';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const TeacherTimetable = () => {
    const { currentUser } = useSelector((state) => state.user);
    const [timetable, setTimetable] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const classID = currentUser?.teachSclass?._id;

    useEffect(() => {
        const fetchTimetable = async () => {
            if (!classID || !currentUser?._id) return;
            setError('');
            setLoading(true);

            try {
                const response = await axios.get(`${API_BASE_URL}/Timetable/Class/${classID}`, {
                    params: { userID: currentUser._id }
                });
                setTimetable(response.data);
            } catch (err) {
                if (err.response?.status === 404) {
                    setTimetable(null);
                } else {
                    setError(err.response?.data?.message || 'Unable to load timetable');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchTimetable();
    }, [classID, currentUser?._id]);

    const schedule = timetable?.schedule || [];

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>
                Class Timetable
            </Typography>
            {loading && <CircularProgress />}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {!loading && !error && !schedule.length && (
                <Alert severity="info">No timetable has been created yet for this class.</Alert>
            )}
            {schedule.length > 0 && (
                <TableContainer component={Paper} sx={{ mt: 2 }}>
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
                            {schedule
                                .slice()
                                .sort((a, b) => {
                                    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                                    return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day) || a.period - b.period;
                                })
                                .map((entry) => (
                                    <TableRow key={`${entry.day}-${entry.period}`}>
                                        <TableCell>{entry.day}</TableCell>
                                        <TableCell>{entry.period}</TableCell>
                                        <TableCell>{entry.subjectName || 'Free Period'}</TableCell>
                                        <TableCell>{entry.teacherName || 'Unassigned'}</TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Container>
    );
};

export default TeacherTimetable;
