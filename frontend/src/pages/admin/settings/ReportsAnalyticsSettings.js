import { useState, useEffect } from 'react';
import { Box, Paper, TextField, Button, Typography, Grid, Alert, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { useSelector } from 'react-redux';
import axios from 'axios';

const ReportsAnalyticsSettings = () => {
  const { currentUser } = useSelector(state => state.user);
  const [reportSettings, setReportSettings] = useState({
    autoGenerateReports: true,
    reportFrequency: 'monthly',
    includeAnalytics: true,
    dataRetentionDays: 365
  });
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';
      const response = await axios.get(`${API_BASE_URL}/Settings/School/${currentUser?._id}/ReportSettings`, {
        headers: { 'x-admin-id': currentUser?._id }
      });
      if (response.data.reportSettings) {
        setReportSettings(response.data.reportSettings);
        setTemplates(response.data.reportSettings.templates || []);
      }
    } catch (error) {
      setMessage('Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setReportSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';
      await axios.put(`${API_BASE_URL}/Settings/School/${currentUser?._id}/ReportSettings`, reportSettings, {
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
      <Typography variant="h5" sx={{ mb: 3 }}>Reports & Analytics Settings</Typography>
      {message && <Alert sx={{ mb: 2 }} severity={message.includes('Error') ? 'error' : 'success'}>{message}</Alert>}
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Report Generation"
              value={reportSettings.autoGenerateReports ? 'enabled' : 'disabled'}
              onChange={(e) => handleChange('autoGenerateReports', e.target.value === 'enabled')}
              SelectProps={{ native: true }}
            >
              <option value="enabled">Auto Generate</option>
              <option value="disabled">Manual Only</option>
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Report Frequency"
              value={reportSettings.reportFrequency}
              onChange={(e) => handleChange('reportFrequency', e.target.value)}
              SelectProps={{ native: true }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Data Retention (Days)"
              value={reportSettings.dataRetentionDays}
              onChange={(e) => handleChange('dataRetentionDays', parseInt(e.target.value))}
              inputProps={{ min: 30 }}
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

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Report Templates</Typography>
        {templates.length === 0 ? (
          <Typography color="text.secondary">No templates configured</Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Template Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template._id}>
                  <TableCell>{template.name}</TableCell>
                  <TableCell>{template.type}</TableCell>
                  <TableCell>{new Date(template.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
};

export default ReportsAnalyticsSettings;