import { API_BASE_URL } from '../../../utils/apiConfig';

import { useState, useEffect } from 'react';
import { Box, Paper, TextField, Button, Typography, Switch, FormControlLabel, Grid, Alert } from '@mui/material';
import { useSelector } from 'react-redux';
import axios from 'axios';

const CommunicationSettings = () => {
  const { currentUser } = useSelector(state => state.user);
  const [settings, setSettings] = useState({
    emailSettings: {
      emailProvider: 'Gmail',
      senderEmail: '',
      senderName: ''
    },
    notificationSettings: {
      enableEmailNotifications: true,
      enableSMSNotifications: true,
      enableInAppNotifications: true
    },
    mpesaSettings: {
      enabled: false,
      businessShortCode: '',
      environment: 'sandbox'
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/Settings/School/${currentUser?._id}/SystemSettings`, {
        headers: { 'x-admin-id': currentUser?._id }
      });
      if (response.data.settings) {
        setSettings(response.data.settings);
      }
    } catch (error) {
      setMessage('Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      emailSettings: {
        ...prev.emailSettings,
        [field]: value
      }
    }));
  };

  const handleNotificationChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      notificationSettings: {
        ...prev.notificationSettings,
        [field]: value
      }
    }));
  };

  const handleMpesaChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      mpesaSettings: {
        ...prev.mpesaSettings,
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
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
      <Typography variant="h5" sx={{ mb: 3 }}>Communication Settings</Typography>
      {message && <Alert sx={{ mb: 2 }} severity={message.includes('Error') ? 'error' : 'success'}>{message}</Alert>}
      
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2 }}>Email Settings</Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Email Provider"
              value={settings.emailSettings.emailProvider}
              onChange={(e) => handleEmailChange('emailProvider', e.target.value)}
              SelectProps={{ native: true }}
            >
              <option value="Gmail">Gmail</option>
              <option value="SendGrid">SendGrid</option>
              <option value="AWS_SES">AWS SES</option>
              <option value="Custom">Custom SMTP</option>
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Sender Email"
              type="email"
              value={settings.emailSettings.senderEmail}
              onChange={(e) => handleEmailChange('senderEmail', e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Sender Name"
              value={settings.emailSettings.senderName}
              onChange={(e) => handleEmailChange('senderName', e.target.value)}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>Notification Preferences</Typography>
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch
                checked={settings.notificationSettings.enableEmailNotifications}
                onChange={(e) => handleNotificationChange('enableEmailNotifications', e.target.checked)}
              />}
              label="Enable Email Notifications"
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch
                checked={settings.notificationSettings.enableSMSNotifications}
                onChange={(e) => handleNotificationChange('enableSMSNotifications', e.target.checked)}
              />}
              label="Enable SMS Notifications"
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch
                checked={settings.notificationSettings.enableInAppNotifications}
                onChange={(e) => handleNotificationChange('enableInAppNotifications', e.target.checked)}
              />}
              label="Enable In-App Notifications"
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>M-Pesa Settings</Typography>
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch
                checked={settings.mpesaSettings.enabled}
                onChange={(e) => handleMpesaChange('enabled', e.target.checked)}
              />}
              label="Enable M-Pesa Integration"
            />
          </Grid>
          
          {settings.mpesaSettings.enabled && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Business Short Code"
                  value={settings.mpesaSettings.businessShortCode}
                  onChange={(e) => handleMpesaChange('businessShortCode', e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Environment"
                  value={settings.mpesaSettings.environment}
                  onChange={(e) => handleMpesaChange('environment', e.target.value)}
                  SelectProps={{ native: true }}
                >
                  <option value="sandbox">Sandbox (Testing)</option>
                  <option value="production">Production</option>
                </TextField>
              </Grid>
            </>
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

export default CommunicationSettings;
