
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Box, Button, TextField, Typography, Alert, List, ListItem, ListItemText, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const AcademicCalendarPage = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [events, setEvents] = useState([]);
  const [formState, setFormState] = useState({ title: '', date: '', description: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    if (currentUser?.settings?.calendarEvents) {
      setEvents(currentUser.settings.calendarEvents);
    }
  }, [currentUser]);

  const canUpdate = currentUser?.permissions?.manageAcademicCalendar !== false;

  const updateSettings = async (newSettings) => {
    try {
      if (!currentUser?._id) return;
      setError('');
      setMessage('');
      setSaving(true);
      const response = await axios.put(`${API_BASE_URL}/Admin/Settings/${currentUser._id}`, {
        settings: { ...currentUser.settings, ...newSettings }
      });
      setMessage(response.data.message || 'Academic calendar updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save academic calendar');
    } finally {
      setSaving(false);
    }
  };

  const addEvent = () => {
    if (!formState.title || !formState.date) {
      setError('Title and date are required.');
      return;
    }
    const updatedEvents = [...events, { ...formState, type: 'Event' }];
    setEvents(updatedEvents);
    setFormState({ title: '', date: '', description: '' });
    updateSettings({ calendarEvents: updatedEvents });
  };

  const removeEvent = (index) => {
    const updatedEvents = events.filter((_, idx) => idx !== index);
    setEvents(updatedEvents);
    updateSettings({ calendarEvents: updatedEvents });
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Academic Calendar and Events
      </Typography>
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Typography sx={{ mb: 2 }}>
        Use this page to configure school calendar events and important academic dates.
      </Typography>
      <Box sx={{ display: 'grid', gap: 2, mb: 3 }}>
        <TextField
          label="Event Title"
          value={formState.title}
          onChange={(event) => setFormState({ ...formState, title: event.target.value })}
          fullWidth
          disabled={!canUpdate}
        />
        <TextField
          label="Date"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={formState.date}
          onChange={(event) => setFormState({ ...formState, date: event.target.value })}
          fullWidth
          disabled={!canUpdate}
        />
        <TextField
          label="Description"
          value={formState.description}
          onChange={(event) => setFormState({ ...formState, description: event.target.value })}
          fullWidth
          multiline
          rows={3}
          disabled={!canUpdate}
        />
        <Box>
          <Button variant="contained" onClick={addEvent} disabled={!canUpdate || saving}>
            Add Calendar Event
          </Button>
        </Box>
        {!canUpdate && (
          <Alert severity="info">You do not have permission to manage the academic calendar.</Alert>
        )}
      </Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Saved Events
      </Typography>
      <List>
        {events.length === 0 && <Typography>No calendar events have been configured yet.</Typography>}
        {events.map((event, index) => (
          <ListItem key={`${event.title}-${index}`} secondaryAction={
            <IconButton edge="end" aria-label="delete" onClick={() => removeEvent(index)} disabled={!canUpdate || saving}>
              <DeleteIcon />
            </IconButton>
          }>
            <ListItemText
              primary={`${event.title} — ${event.date}`}
              secondary={event.description}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default AcademicCalendarPage;
