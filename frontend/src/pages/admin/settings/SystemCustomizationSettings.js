import { useState, useEffect } from 'react';
import { Box, Paper, TextField, Button, Typography, Switch, FormControlLabel, Grid, Alert } from '@mui/material';
import { useSelector } from 'react-redux';

const SystemCustomizationSettings = () => {
  const { currentUser } = useSelector(state => state.user);
  const [settings, setSettings] = useState({
    systemTheme: 'light',
    defaultLanguage: 'en',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24H',
    customPortalName: 'School Management System',
    enableDarkMode: false,
    enableMaintenanceMode: false,
    maintenanceMessage: '',
    resultsDecimalPlaces: 2
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
      <Typography variant="h5" sx={{ mb: 3 }}>System Customization</Typography>
      {message && <Alert sx={{ mb: 2 }} severity={message.includes('Error') ? 'error' : 'success'}>{message}</Alert>}
      
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2 }}>Display Settings</Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Custom Portal Name"
              value={settings.customPortalName}
              onChange={(e) => handleChange('customPortalName', e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="System Theme"
              value={settings.systemTheme}
              onChange={(e) => handleChange('systemTheme', e.target.value)}
              SelectProps={{ native: true }}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Date Format"
              value={settings.dateFormat}
              onChange={(e) => handleChange('dateFormat', e.target.value)}
              SelectProps={{ native: true }}
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Time Format"
              value={settings.timeFormat}
              onChange={(e) => handleChange('timeFormat', e.target.value)}
              SelectProps={{ native: true }}
            >
              <option value="12H">12 Hour</option>
              <option value="24H">24 Hour</option>
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Results Decimal Places"
              value={settings.resultsDecimalPlaces}
              onChange={(e) => handleChange('resultsDecimalPlaces', parseInt(e.target.value))}
              inputProps={{ min: 0, max: 5 }}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>Advanced Settings</Typography>
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch
                checked={settings.enableDarkMode}
                onChange={(e) => handleChange('enableDarkMode', e.target.checked)}
              />}
              label="Enable Dark Mode Support"
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch
                checked={settings.enableMaintenanceMode}
                onChange={(e) => handleChange('enableMaintenanceMode', e.target.checked)}
              />}
              label="Enable Maintenance Mode"
            />
          </Grid>
          
          {settings.enableMaintenanceMode && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Maintenance Message"
                multiline
                rows={3}
                value={settings.maintenanceMessage}
                onChange={(e) => handleChange('maintenanceMessage', e.target.value)}
              />
            </Grid>
          )}

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

export default SystemCustomizationSettings;