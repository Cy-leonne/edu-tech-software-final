
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Box, Button, MenuItem, Paper, TextField, Typography, Alert } from '@mui/material';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const TeacherUploadMaterials = () => {
    const { currentUser } = useSelector((state) => state.user);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('Note');
    const [fileUrl, setFileUrl] = useState('');
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const submitMaterial = async (materialData) => {
        setLoading(true);
        setMessage('');

        try {
            const schoolId = currentUser?.school?._id || currentUser?.school || '';
            const classId = currentUser?.teachSclass?._id || currentUser?.teachSclass || '';
            const subjectId = currentUser?.teachSubject?._id || currentUser?.teachSubject || '';
            const teacherId = currentUser?._id || '';

            const formData = new FormData();
            formData.append('title', materialData.title);
            formData.append('description', materialData.description);
            formData.append('type', materialData.type);
            formData.append('subject', subjectId);
            formData.append('subject_id', subjectId);
            formData.append('classId', classId);
            formData.append('class_id', classId);
            formData.append('teacher', teacherId);
            formData.append('teacher_id', teacherId);
            formData.append('school', schoolId);
            formData.append('school_id', schoolId);
            if (materialData.fileUrl) formData.append('fileUrl', materialData.fileUrl);
            if (materialData.file) formData.append('file', materialData.file);

            const response = await fetch(`${API_BASE_URL}/LearningMaterial`, {
                method: 'POST',
                headers: {
                    'x-admin-id': schoolId,
                },
                body: formData,
            });

            const data = await response.json();
            if (response.ok) {
                setMessage(materialData.successMessage || 'Learning material uploaded successfully.');
                setTitle('');
                setDescription('');
                setFileUrl('');
                setFile(null);
                return true;
            }

            setMessage(data.message || 'Failed to upload learning material.');
            return false;
        } catch (error) {
            setMessage('Network error while uploading material.');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        await submitMaterial({ title, description, type, fileUrl, file, successMessage: 'Learning material uploaded successfully.' });
    };

    const handleCreateTestMaterial = async () => {
        await submitMaterial({
            title: 'Test Learning Material',
            description: 'This is a sample material created for testing student visibility.',
            type: 'Note',
            fileUrl: 'https://example.com/sample-learning-material.pdf',
            successMessage: 'Test learning material created successfully.',
        });
    };

    return (
        <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}>
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Upload Learning Material</Typography>
                <form onSubmit={handleSubmit}>
                    <TextField label="Title" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} required sx={{ mb: 2 }} />
                    <TextField label="Description" fullWidth multiline rows={3} value={description} onChange={(e) => setDescription(e.target.value)} sx={{ mb: 2 }} />
                    <TextField
                        select
                        label="Type"
                        fullWidth
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        sx={{ mb: 2 }}
                    >
                        <MenuItem value="Note">Note</MenuItem>
                        <MenuItem value="PDF">PDF</MenuItem>
                        <MenuItem value="PPT">PPT</MenuItem>
                        <MenuItem value="Document">Document</MenuItem>
                        <MenuItem value="Video">Video</MenuItem>
                    </TextField>
                    <TextField label="File URL (optional)" placeholder="https://..." fullWidth value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} sx={{ mb: 2 }} />
                    <Button variant="outlined" component="label" sx={{ mb: 2 }}>
                        Select File
                        <input hidden accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mov,.webm,.m4v,.jpg,.jpeg,.png,.txt" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    </Button>
                    {file && <Typography variant="body2" sx={{ mb: 2 }}>Selected: {file.name}</Typography>}
                    <Button type="submit" variant="contained" disabled={loading} fullWidth>
                        {loading ? 'Uploading...' : 'Upload Material'}
                    </Button>
                </form>
                {message && <Alert severity={message.includes('success') ? 'success' : 'error'} sx={{ mt: 2 }}>{message}</Alert>}
            </Paper>
        </Box>
    );
};

export default TeacherUploadMaterials;
