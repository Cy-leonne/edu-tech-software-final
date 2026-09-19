
import { Paper, TextField, Typography, Grid, Alert } from '@mui/material';

const ERPIntegrationDetails = ({ bankIntegration, erpIntegration, onChange }) => {
  const values = bankIntegration || erpIntegration || {
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
    environment: 'sandbox',
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Bank / Payment Integration</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Enable Bank Integration"
            select
            value={values.enabled ? 'true' : 'false'}
            onChange={(e) => onChange('enabled', e.target.value === 'true')}
            SelectProps={{ native: true }}
          >
            <option value="false">Disabled</option>
            <option value="true">Enabled</option>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Integration Type"
            select
            value={values.integrationType || 'DirectBankAPI'}
            onChange={(e) => onChange('integrationType', e.target.value)}
            SelectProps={{ native: true }}
          >
            <option value="DirectBankAPI">Direct Bank API</option>
            <option value="PaymentGateway">Payment Gateway</option>
            <option value="Plaid">Plaid</option>
            <option value="Custom">Custom</option>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Bank Name"
            value={values.bankName || ''}
            onChange={(e) => onChange('bankName', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Bank Code"
            value={values.bankCode || ''}
            onChange={(e) => onChange('bankCode', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Account Number Format"
            select
            value={values.accountNumberFormat || 'Student Admission Number'}
            onChange={(e) => onChange('accountNumberFormat', e.target.value)}
            SelectProps={{ native: true }}
          >
            <option value="Student Admission Number">Student Admission Number</option>
            <option value="Student ID">Student ID</option>
            <option value="Custom">Custom</option>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Environment"
            select
            value={values.environment || 'sandbox'}
            onChange={(e) => onChange('environment', e.target.value)}
            SelectProps={{ native: true }}
          >
            <option value="sandbox">Sandbox</option>
            <option value="production">Production</option>
          </TextField>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="API URL"
            value={values.apiUrl || ''}
            onChange={(e) => onChange('apiUrl', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="API Key"
            type="password"
            value={values.apiKey || ''}
            onChange={(e) => onChange('apiKey', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Client ID"
            value={values.clientId || ''}
            onChange={(e) => onChange('clientId', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Client Secret"
            type="password"
            value={values.clientSecret || ''}
            onChange={(e) => onChange('clientSecret', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Webhook URL"
            value={values.webhookUrl || ''}
            onChange={(e) => onChange('webhookUrl', e.target.value)}
          />
        </Grid>
      </Grid>
      <Alert severity="info" sx={{ mt: 2 }}>
        Enable and configure bank or payment-gateway credentials here to sync fee collections, bank reconciliations, and payment events with the school finance workflow.
      </Alert>
    </Paper>
  );
};

export default ERPIntegrationDetails;
