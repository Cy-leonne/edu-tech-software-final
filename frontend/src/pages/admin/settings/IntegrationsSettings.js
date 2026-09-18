import { API_BASE_URL } from '../../../utils/apiConfig';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Paper, TextField, Button, Typography, Grid, Alert } from '@mui/material';
import { useSelector } from 'react-redux';
import ERPIntegrationDetails from './ERPIntegrationDetails';


const IntegrationsSettings = () => {
  const { currentUser } = useSelector(state => state.user);
  const [settings, setSettings] = useState({
    googleIntegration: {
      enabled: false,
      clientId: '',
      clientSecret: ''
    },
    microsoftIntegration: {
      enabled: false,
      clientId: '',
      clientSecret: ''
    },
    apiKeys: {
      stripeKey: '',
      twilioKey: '',
      sendgridKey: ''
    },
    bankIntegration: {
      enabled: false,
      integrationType: 'DirectBankAPI',
      bankName: '',
      bankCode: '',
      accountNumberFormat: 'Student Admission Number',
      apiUrl: '',
      apiKey: '',
      clientId: '',
      clientSecret: '',
      webhookUrl: '',
      environment: 'sandbox'
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const incoming = currentUser?.settings || {};
    setSettings(prev => ({
      ...prev,
      ...incoming,
      bankIntegration: {
        ...prev.bankIntegration,
        ...(incoming.bankIntegration || incoming.erpIntegration || {})
      },
      erpIntegration: {
        ...prev.erpIntegration,
        ...(incoming.erpIntegration || {})
      }
    }));
    setLoading(false);
  }, [currentUser]);

  const handleChange = (category, field, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const schoolId = currentUser?.school?._id || currentUser?.school || currentUser?.schoolId;
      if (!schoolId) {
        throw new Error('Missing school identity');
      }

      const response = await axios.put(
        `${API_BASE_URL}/Settings/School/${schoolId}/SystemSettings`,
        { bankIntegration: settings.bankIntegration },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-admin-id': currentUser?._id,
          },
        }
      );

      setMessage(response.data.message || 'Settings saved successfully');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Integrations</Typography>
      {message && <Alert sx={{ mb: 2 }} severity={message.includes('Error') ? 'error' : 'success'}>{message}</Alert>}

      <Alert severity="info" sx={{ mb: 3 }}>
        Configure external service integrations and API keys for your school management system.
      </Alert>

      <ERPIntegrationDetails
        bankIntegration={settings.bankIntegration}
        onChange={(field, value) => handleChange('bankIntegration', field, value)}
      />

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>API Keys</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Stripe API Key"
              type="password"
              value={settings.apiKeys.stripeKey}
              onChange={(e) => handleChange('apiKeys', 'stripeKey', e.target.value)}
              helperText="Used for payment processing"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Twilio API Key"
              type="password"
              value={settings.apiKeys.twilioKey}
              onChange={(e) => handleChange('apiKeys', 'twilioKey', e.target.value)}
              helperText="Used for SMS notifications"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="SendGrid API Key"
              type="password"
              value={settings.apiKeys.sendgridKey}
              onChange={(e) => handleChange('apiKeys', 'sendgridKey', e.target.value)}
              helperText="Used for email delivery"
            />
          </Grid>
        </Grid>
      </Paper>

      <Button
        variant="contained"
        color="primary"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </Box>
  );
};

export default IntegrationsSettings;
