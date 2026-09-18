import { API_BASE_URL } from '../../utils/apiConfig';

import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Box, Paper, Typography, List, ListItem, ListItemText, Link as MuiLink, Divider, CircularProgress, Alert } from '@mui/material';


const StudentLearningPortal = () => {
    const { currentUser } = useSelector((state) => state.user);
    const [materials, setMaterials] = useState([]);
    const [classes, setClasses] = useState([]);
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [attendanceMessage, setAttendanceMessage] = useState('');

    const classValue = currentUser?.sclassName || currentUser?.teachSclass;
    const classId = typeof classValue === 'object' ? classValue?._id || classValue?.id : classValue;
    const schoolValue = currentUser?.school;
    const schoolId = typeof schoolValue === 'object'
        ? schoolValue?._id || schoolValue?.id
        : schoolValue || currentUser?.schoolId;
    const headers = React.useMemo(() => (schoolId ? { 'x-admin-id': schoolId } : {}), [schoolId]);

    const getMaterialLink = (item) => {
        const url = item.fileUrl || item.file_url || item.fileUrl || item.file_url;
        if (!url) return null;
        return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    };

    const getMeetingLink = (item) => {
        if (!item?.meetingLink && !item?.meeting_url) return null;
        const link = item.meetingLink || item.meeting_url;
        return link.startsWith('http') ? link : `https://${link}`;
    };

    const joinLiveClass = async (item) => {
        const studentId = currentUser?._id || currentUser?.id;
        const link = getMeetingLink(item);
        if (!studentId || !link) return;

        try {
            const response = await fetch(`${API_BASE_URL}/LiveClasses/${item._id}/Join`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json', 'x-user-id': studentId },
                body: JSON.stringify({ studentId }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Unable to join live class');
            setAttendanceMessage(data.alreadyMarked
                ? 'Attendance was already recorded for this subject today.'
                : 'Online class attendance recorded successfully.');
            window.open(data.meetingLink || link, '_blank', 'noopener,noreferrer');
        } catch (joinError) {
            setError(joinError.message);
        }
    };

    useEffect(() => {
        const fetchMaterials = async () => {
            if (!classId) {
                setError('Class information is not available for this student.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError('');

            try {
                const [materialsRes, classesRes, quizzesRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/LearningMaterials/${classId}`, { headers }),
                    fetch(`${API_BASE_URL}/LiveClasses/${classId}`, { headers }),
                    fetch(`${API_BASE_URL}/Quizzes/${classId}`, { headers })
                ]);

                if (!materialsRes.ok || !classesRes.ok || !quizzesRes.ok) {
                    const errText = await materialsRes.text();
                    throw new Error(`Unable to load learning content: ${errText}`);
                }

                const materialsData = await materialsRes.json();
                const classesData = await classesRes.json();
                const quizzesData = await quizzesRes.json();

                setMaterials(Array.isArray(materialsData) ? materialsData : []);
                setClasses(Array.isArray(classesData) ? classesData : []);
                setQuizzes(Array.isArray(quizzesData) ? quizzesData : []);
            } catch (fetchError) {
                console.error(fetchError);
                setError('Failed to load student learning resources. Please refresh or contact your school administrator.');
            } finally {
                setLoading(false);
            }
        };

        fetchMaterials();
    }, [classId, headers]);

    if (loading) {
        return (
            <Box sx={{ maxWidth: 1000, mx: 'auto', mt: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 1000, mx: 'auto', mt: 4, display: 'grid', gap: 2 }}>
            {attendanceMessage && <Alert severity="success">{attendanceMessage}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}

            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Learning Materials</Typography>
                <List>
                    {materials.length === 0 && (
                        <ListItem>
                            <ListItemText primary="No learning materials available yet." />
                        </ListItem>
                    )}
                    {materials.map((item) => {
                        const link = getMaterialLink(item);
                        return (
                            <React.Fragment key={item._id || item.id}>
                                <ListItem secondaryAction={link ? <MuiLink href={link} target="_blank" rel="noreferrer">Open</MuiLink> : null}>
                                    <ListItemText
                                        primary={item.title || 'Untitled Material'}
                                        secondary={[item.description || item.material_type || 'No description', item.subject?.subName, item.teacher?.name]
                                            .filter(Boolean)
                                            .join(' • ')}
                                    />
                                </ListItem>
                                <Divider />
                            </React.Fragment>
                        );
                    })}
                </List>
            </Paper>

            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Live Classes</Typography>
                <List>
                    {classes.length === 0 && (
                        <ListItem>
                            <ListItemText primary="No live classes scheduled for your class." />
                        </ListItem>
                    )}
                    {classes.map((item) => {
                        const link = getMeetingLink(item);
                        return (
                            <React.Fragment key={item._id || item.id}>
                                <ListItem secondaryAction={link ? <MuiLink component="button" onClick={() => joinLiveClass(item)}>Join</MuiLink> : null}>
                                    <ListItemText
                                        primary={item.topic || item.title || 'Live class session'}
                                        secondary={[
                                            item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : null,
                                            item.meetingLink || item.meeting_url,
                                        ].filter(Boolean).join(' • ')}
                                    />
                                </ListItem>
                                <Divider />
                            </React.Fragment>
                        );
                    })}
                </List>
            </Paper>

            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Quizzes</Typography>
                <List>
                    {quizzes.length === 0 && (
                        <ListItem>
                            <ListItemText primary="No quizzes are available for your class right now." />
                        </ListItem>
                    )}
                    {quizzes.map((item) => (
                        <React.Fragment key={item._id || item.id}>
                            <ListItem>
                                <ListItemText primary={item.title || 'Untitled Quiz'} secondary={item.description || 'No description available.'} />
                            </ListItem>
                            <Divider />
                        </React.Fragment>
                    ))}
                </List>
            </Paper>
        </Box>
    );
};

export default StudentLearningPortal;
