
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Box, Button, Paper, TextField, Typography, Alert } from '@mui/material';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const TeacherScheduleLiveClass = () => {
    const { currentUser } = useSelector((state) => state.user);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [meetingLink, setMeetingLink] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const response = await fetch(`${API_BASE_URL}/LiveClass`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-id': currentUser?._id || '',
                },
                body: JSON.stringify({
                    title,
                    description,
                    scheduledAt,
                    meetingLink,
                    subject: currentUser?.teachSubject?._id,
                    classId: currentUser?.teachSclass?._id,
                    teacher: currentUser?._id,
                    school: currentUser?.school?._id || currentUser?.school,
                }),
            });

            const data = await response.json();
            if (response.ok) {
                setMessage('Live class scheduled successfully.');
                setTitle('');
                setDescription('');
                setScheduledAt('');
                setMeetingLink('');
            } else {
                setMessage(data.message || 'Failed to schedule live class.');
            }
        } catch (error) {
            setMessage('Network error while scheduling live class.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}>
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Schedule Live Class</Typography>
                <form onSubmit={handleSubmit}>
                    <TextField label="Title" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} required sx={{ mb: 2 }} />
                    <TextField label="Description" fullWidth multiline rows={3} value={description} onChange={(e) => setDescription(e.target.value)} sx={{ mb: 2 }} />
                    <TextField label="Schedule Date & Time" type="datetime-local" fullWidth value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} InputLabelProps={{ shrink: true }} required sx={{ mb: 2 }} />
                    <TextField label="Meeting Link" fullWidth value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} required sx={{ mb: 2 }} />
                    <Button type="submit" variant="contained" disabled={loading} fullWidth>
                        {loading ? 'Scheduling...' : 'Schedule Live Class'}
                    </Button>
                </form>
                {message && <Alert severity={message.includes('success') ? 'success' : 'error'} sx={{ mt: 2 }}>{message}</Alert>}
            </Paper>
        </Box>
    );
};

export default TeacherScheduleLiveClass;
