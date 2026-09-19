
import { useState, useEffect } from 'react';
import { Box, Paper, TextField, Button, Typography, Grid, Alert } from '@mui/material';
import { useSelector } from 'react-redux';
import axios from 'axios';

const AcademicSettings = () => {
  const { currentUser } = useSelector(state => state.user);
  const [settings, setSettings] = useState({
    academicYear: new Date().getFullYear(),
    term: 1,
    classificationSystem: 'traditional',
    gradesScale: 'A-F',
    attendanceThreshold: 75
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';
      const response = await axios.get(`${API_BASE_URL}/Settings/School/${currentUser?._id}/SystemSettings`, {
        headers: { 'x-admin-id': currentUser?._id }
      });
      setLoading(false);
    } catch (error) {
      setMessage('Error loading settings');
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';
      await axios.put(`${API_BASE_URL}/Settings/School/${currentUser?._id}/SystemSettings`, settings, {
        headers: { 'x-admin-id': currentUser?._id }
      });
      setMessage('Settings saved successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Academic Settings</Typography>
      {message && <Alert sx={{ mb: 2 }} severity={message.includes('Error') ? 'error' : 'success'}>{message}</Alert>}
      
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Current Academic Year"
              value={settings.academicYear}
              onChange={(e) => handleChange('academicYear', parseInt(e.target.value))}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Current Term"
              value={settings.term}
              onChange={(e) => handleChange('term', parseInt(e.target.value))}
              SelectProps={{ native: true }}
            >
              <option value={1}>Term 1</option>
              <option value={2}>Term 2</option>
              <option value={3}>Term 3</option>
              <option value={4}>Term 4</option>
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Classification System"
              value={settings.classificationSystem}
              onChange={(e) => handleChange('classificationSystem', e.target.value)}
              SelectProps={{ native: true }}
            >
              <option value="traditional">Traditional (Classes)</option>
              <option value="level">By Level</option>
              <option value="stream">By Stream</option>
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Grading Scale"
              value={settings.gradesScale}
              onChange={(e) => handleChange('gradesScale', e.target.value)}
              SelectProps={{ native: true }}
            >
              <option value="A-F">A-F</option>
              <option value="1-10">1-10</option>
              <option value="Percentage">Percentage</option>
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Minimum Attendance Threshold (%)"
              value={settings.attendanceThreshold}
              onChange={(e) => handleChange('attendanceThreshold', parseInt(e.target.value))}
              inputProps={{ min: 0, max: 100 }}
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default AcademicSettings;
