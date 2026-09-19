
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Alert, Button } from '@mui/material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const ParentTimetable = () => {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [timetable, setTimetable] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('currentUser')) || JSON.parse(localStorage.getItem('user'));
        if (!user || user.role !== 'Parent') {
            navigate('/Parent/login', { replace: true });
            return;
        }
        setCurrentUser(user);
    }, [navigate]);

    useEffect(() => {
        const fetchTimetable = async () => {
            if (!currentUser?.student?.classId) {
                setError('Student class information is missing.');
                setLoading(false);
                return;
            }

            setError('');
            setLoading(true);

            try {
                const response = await axios.get(`${API_BASE_URL}/Timetable/Class/${currentUser.student.classId}`, {
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
    }, [currentUser]);

    const schedule = timetable?.schedule || [];

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Student Timetable</Typography>
                <Button variant="outlined" onClick={() => navigate('/Parent/dashboard')}>Back to Dashboard</Button>
            </Box>
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

export default ParentTimetable;
