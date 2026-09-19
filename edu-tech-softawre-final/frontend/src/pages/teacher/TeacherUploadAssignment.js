
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Box, Button, Paper, TextField, Typography } from '@mui/material';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const TeacherUploadAssignment = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/Assignment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          dueDate,
          subject: currentUser.teachSubject?._id,
          classId: currentUser.teachSclass?._id,
          teacher: currentUser._id,
          school: currentUser.school?._id || currentUser.school,
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Assignment uploaded successfully!');
        setTitle('');
        setDescription('');
        setDueDate('');
      } else {
        setMessage(data.message || 'Failed to upload assignment');
      }
    } catch (err) {
      setMessage('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Upload Assignment</Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            fullWidth
            required
            sx={{ mb: 2 }}
          />
          <TextField
            label="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
            required
            sx={{ mb: 2 }}
          />
          <Button type="submit" variant="contained" disabled={loading} fullWidth>
            {loading ? 'Uploading...' : 'Upload Assignment'}
          </Button>
        </form>
        {message && <Typography sx={{ mt: 2 }} color={message.includes('success') ? 'green' : 'error'}>{message}</Typography>}
      </Paper>
    </Box>
  );
};

export default TeacherUploadAssignment;
