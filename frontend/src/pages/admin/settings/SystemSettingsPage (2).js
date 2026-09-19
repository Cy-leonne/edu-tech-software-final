
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Button,
  Grid,
  TextField,
  Typography,
  Alert,
  Paper,
} from '@mui/material';
import {
  fetchSystemSettings,
  saveSystemSettings,
} from '../../../redux/settingsRelated/settingsHandle';

const SystemSettingsPage = () => {
  const dispatch = useDispatch();
  const { systemSettings, loading, error, successMessage } = useSelector((state) => state.settings);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchSystemSettings());
  }, [dispatch]);

  useEffect(() => {
    if (systemSettings) {
      setSettings(systemSettings);
    }
  }, [systemSettings]);

  const handleChange = (path, value) => {
    setSettings((prev) => {
      const updated = { ...prev };
      const keys = path.split('.');
      let current = updated;
      keys.forEach((key, idx) => {
        if (idx === keys.length - 1) {
          current[key] = value;
        } else {
          current[key] = { ...current[key] };
          current = current[key];
        }
      });
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await dispatch(saveSystemSettings(settings));
    } catch (err) {
      // handled via Redux
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Loading system settings…</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          System Settings
        </Typography>
        {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Timezone"
              fullWidth
              value={settings.timezone || ''}
              onChange={(event) => handleChange('timezone', event.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Date Format"
              fullWidth
              value={settings.dateFormat || ''}
              onChange={(event) => handleChange('dateFormat', event.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Time Format"
              fullWidth
              value={settings.timeFormat || ''}
              onChange={(event) => handleChange('timeFormat', event.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Language"
              fullWidth
              value={settings.language || ''}
              onChange={(event) => handleChange('language', event.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="School Name"
              fullWidth
              value={settings.branding?.schoolName || ''}
              onChange={(event) => handleChange('branding.schoolName', event.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="School Tagline"
              fullWidth
              value={settings.branding?.schoolTagline || ''}
              onChange={(event) => handleChange('branding.schoolTagline', event.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Primary Color"
              type="color"
              fullWidth
              value={settings.branding?.primaryColor || '#1976D2'}
              onChange={(event) => handleChange('branding.primaryColor', event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Secondary Color"
              type="color"
              fullWidth
              value={settings.branding?.secondaryColor || '#424242'}
              onChange={(event) => handleChange('branding.secondaryColor', event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Accent Color"
              type="color"
              fullWidth
              value={settings.branding?.accentColor || '#FF9800'}
              onChange={(event) => handleChange('branding.accentColor', event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            Save System Settings
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default SystemSettingsPage;
