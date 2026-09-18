
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
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  fetchSecuritySettings,
  saveSecuritySettings,
} from '../../../redux/settingsRelated/settingsHandle';

const SecuritySettingsPage = () => {
  const dispatch = useDispatch();
  const { securitySettings, loading, error, successMessage } = useSelector((state) => state.settings);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchSecuritySettings());
  }, [dispatch]);

  useEffect(() => {
    if (securitySettings) {
      setSettings(securitySettings);
    }
  }, [securitySettings]);

  const handleSwitch = (path, checked) => {
    setSettings((prev) => {
      const updated = { ...prev };
      const keys = path.split('.');
      let current = updated;
      keys.forEach((key, idx) => {
        if (idx === keys.length - 1) {
          current[key] = checked;
        } else {
          current[key] = { ...current[key] };
          current = current[key];
        }
      });
      return updated;
    });
  };

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
      await dispatch(saveSecuritySettings(settings));
    } catch (err) {
      // handled by Redux state
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Loading security settings…</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Security Settings
        </Typography>
        {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              label="Password Min Length"
              type="number"
              fullWidth
              value={settings.passwordPolicy?.minLength || 8}
              onChange={(event) => handleChange('passwordPolicy.minLength', Number(event.target.value))}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Password Expiry Days"
              type="number"
              fullWidth
              value={settings.passwordPolicy?.passwordExpiryDays || 90}
              onChange={(event) => handleChange('passwordPolicy.passwordExpiryDays', Number(event.target.value))}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Lockout Attempts"
              type="number"
              fullWidth
              value={settings.accountLockout?.failedAttemptsBeforeLockout || 5}
              onChange={(event) => handleChange('accountLockout.failedAttemptsBeforeLockout', Number(event.target.value))}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Lockout Duration (minutes)"
              type="number"
              fullWidth
              value={settings.accountLockout?.lockoutDurationMinutes || 30}
              onChange={(event) => handleChange('accountLockout.lockoutDurationMinutes', Number(event.target.value))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.passwordPolicy?.requireUppercase || false}
                  onChange={(event) => handleSwitch('passwordPolicy.requireUppercase', event.target.checked)}
                />
              }
              label="Require uppercase letters"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.passwordPolicy?.requireNumbers || false}
                  onChange={(event) => handleSwitch('passwordPolicy.requireNumbers', event.target.checked)}
                />
              }
              label="Require numbers"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.accountLockout?.enabled || false}
                  onChange={(event) => handleSwitch('accountLockout.enabled', event.target.checked)}
                />
              }
              label="Enable account lockout"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.twoFactorAuth?.enabled || false}
                  onChange={(event) => handleSwitch('twoFactorAuth.enabled', event.target.checked)}
                />
              }
              label="Enable two-factor authentication"
            />
          </Grid>
        </Grid>
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            Save Security Settings
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default SecuritySettingsPage;
