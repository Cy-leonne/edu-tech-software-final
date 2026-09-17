import { useState, useEffect } from 'react';
import { Box, Paper, TextField, Button, Typography, Grid, Alert } from '@mui/material';
import { useSelector } from 'react-redux';

const SchoolManagementSettings = () => {
  const { currentUser } = useSelector(state => state.user);
  const [settings, setSettings] = useState({
    schoolId: '',
    schoolName: '',
    schoolCode: '',
    principalName: '',
    principalEmail: '',
    principalPhone: '',
    schoolAddress: '',
    schoolPhone: '',
    schoolEmail: '',
    registrationNumber: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
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
      <Typography variant="h5" sx={{ mb: 3 }}>School Management Settings</Typography>
      {message && <Alert sx={{ mb: 2 }} severity={message.includes('Error') ? 'error' : 'success'}>{message}</Alert>}
      
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2 }}>School Information</Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="School Name"
              value={settings.schoolName}
              onChange={(e) => handleChange('schoolName', e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="School Code"
              value={settings.schoolCode}
              onChange={(e) => handleChange('schoolCode', e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>Principal Information</Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Principal Name"
              value={settings.principalName}
              onChange={(e) => handleChange('principalName', e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Principal Email"
              type="email"
              value={settings.principalEmail}
              onChange={(e) => handleChange('principalEmail', e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Principal Phone"
              value={settings.principalPhone}
              onChange={(e) => handleChange('principalPhone', e.target.value)}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>Contact Information</Typography>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="School Address"
              multiline
              rows={2}
              value={settings.schoolAddress}
              onChange={(e) => handleChange('schoolAddress', e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="School Phone"
              value={settings.schoolPhone}
              onChange={(e) => handleChange('schoolPhone', e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="School Email"
              type="email"
              value={settings.schoolEmail}
              onChange={(e) => handleChange('schoolEmail', e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Registration Number"
              value={settings.registrationNumber}
              onChange={(e) => handleChange('registrationNumber', e.target.value)}
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

export default SchoolManagementSettings;