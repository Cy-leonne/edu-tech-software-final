
import { useState, useEffect } from 'react';
import { Box, Paper, TextField, Button, Typography, Switch, FormControlLabel, Grid, Alert } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSystemSettings, saveSystemSettings } from '../../../redux/settingsRelated/settingsHandle';

const AttendanceSettings = () => {
  const { currentUser } = useSelector(state => state.user);
  const dispatch = useDispatch();
  const [settings, setSettings] = useState({
    attendanceTrackingMode: 'daily',
    markingAttendanceByTime: true,
    workingDaysPerWeek: 5,
    attendanceThreshold: 75,
    autoGenerateAttendanceReports: true,
    allowLateEntry: true,
    lateEntryBuffer: 15,
    allowEarlyExit: false,
    enableBiometricAttendance: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    dispatch(fetchSystemSettings())
      .then((savedSettings) => {
        if (savedSettings) {
          setSettings((previous) => ({ ...previous, ...savedSettings }));
        }
      })
      .catch(() => setMessage('Error loading attendance settings'))
      .finally(() => setLoading(false));
  }, [dispatch]);

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await dispatch(saveSystemSettings(settings));
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
      <Typography variant="h5" sx={{ mb: 3 }}>Attendance Settings</Typography>
      {message && <Alert sx={{ mb: 2 }} severity={message.includes('Error') ? 'error' : 'success'}>{message}</Alert>}
      
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Attendance Tracking Mode"
              value={settings.attendanceTrackingMode}
              onChange={(e) => handleChange('attendanceTrackingMode', e.target.value)}
              SelectProps={{ native: true }}
            >
              <option value="daily">Daily</option>
              <option value="perClass">Per Class</option>
              <option value="hybrid">Hybrid</option>
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Working Days Per Week"
              value={settings.workingDaysPerWeek}
              onChange={(e) => handleChange('workingDaysPerWeek', parseInt(e.target.value))}
              inputProps={{ min: 1, max: 7 }}
            />
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
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Late Entry Buffer (Minutes)"
              value={settings.lateEntryBuffer}
              onChange={(e) => handleChange('lateEntryBuffer', parseInt(e.target.value))}
              inputProps={{ min: 0 }}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch
                checked={settings.markingAttendanceByTime}
                onChange={(e) => handleChange('markingAttendanceByTime', e.target.checked)}
              />}
              label="Mark Attendance by Time"
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch
                checked={settings.allowLateEntry}
                onChange={(e) => handleChange('allowLateEntry', e.target.checked)}
              />}
              label="Allow Late Entry"
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch
                checked={settings.allowEarlyExit}
                onChange={(e) => handleChange('allowEarlyExit', e.target.checked)}
              />}
              label="Allow Early Exit"
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch
                checked={settings.enableBiometricAttendance}
                onChange={(e) => handleChange('enableBiometricAttendance', e.target.checked)}
              />}
              label="Enable Biometric Attendance"
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch
                checked={settings.autoGenerateAttendanceReports}
                onChange={(e) => handleChange('autoGenerateAttendanceReports', e.target.checked)}
              />}
              label="Auto-generate Attendance Reports"
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

export default AttendanceSettings;
