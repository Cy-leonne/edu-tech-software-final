import { useState, useEffect } from 'react';
import { Box, Paper, TextField, Button, Typography, Grid, Alert, MenuItem } from '@mui/material';
import { useSelector } from 'react-redux';
import axios from 'axios';

const FinanceSettings = () => {
  const { currentUser } = useSelector(state => state.user);
  const [settings, setSettings] = useState({
    financeSettings: {
      schoolCurrency: 'KES',
      paybillCode: 'SCHOOL-PAYBILL-001',
      paymentTerms: '',
      classFees: [],
      cheques: [],
      supplies: [],
    }
  });
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';
      const [settingsResponse, classesResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/Settings/School/${currentUser?._id}/SystemSettings`, {
          headers: { 'x-admin-id': currentUser?._id }
        }),
        axios.get(`${API_BASE_URL}/SclassList/${currentUser?._id}`, {
          headers: { 'x-admin-id': currentUser?._id }
        })
      ]);

      const financeSettings = settingsResponse?.data?.settings?.financeSettings || {};
      setSettings({ financeSettings: { schoolCurrency: 'KES', paybillCode: 'SCHOOL-PAYBILL-001', paymentTerms: '', classFees: [], cheques: [], supplies: [], ...financeSettings } });
      setClasses(Array.isArray(classesResponse?.data) ? classesResponse.data : []);
    } catch (error) {
      setMessage('Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      financeSettings: {
        ...(prev.financeSettings || {}),
        [field]: value
      }
    }));
  };

  const handleClassFeeChange = (classItem, value) => {
    const classFees = [...(settings.financeSettings.classFees || [])];
    const existingIndex = classFees.findIndex((entry) => entry.classId === classItem._id);
    const nextEntry = { classId: classItem._id, className: classItem.sclassName, feeAmount: Number(value || 0) };

    if (existingIndex >= 0) {
      classFees[existingIndex] = nextEntry;
    } else {
      classFees.push(nextEntry);
    }

    setSettings(prev => ({
      ...prev,
      financeSettings: {
        ...(prev.financeSettings || {}),
        classFees,
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';
      await axios.put(`${API_BASE_URL}/Settings/School/${currentUser?._id}/SystemSettings`, { financeSettings: settings.financeSettings }, {
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
      <Typography variant="h5" sx={{ mb: 3 }}>Finance Settings</Typography>
      {message && <Alert sx={{ mb: 2 }} severity={message.includes('Error') ? 'error' : 'success'}>{message}</Alert>}
      
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="School Currency" value={settings.financeSettings.schoolCurrency || ''} onChange={(e) => handleChange('schoolCurrency', e.target.value)} />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="PayBill Code (M-Pesa)" value={settings.financeSettings.paybillCode || ''} onChange={(e) => handleChange('paybillCode', e.target.value)} />
          </Grid>
          
          <Grid item xs={12}>
            <TextField fullWidth label="Payment Terms" multiline rows={4} value={settings.financeSettings.paymentTerms || ''} onChange={(e) => handleChange('paymentTerms', e.target.value)} helperText="Enter payment terms and conditions" />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2 }}>Class Fee Settings</Typography>
            <Grid container spacing={2}>
              {classes.map((classItem) => (
                <Grid item xs={12} sm={6} md={4} key={classItem._id}>
                  <TextField fullWidth label={classItem.sclassName || 'Class'} type="number" value={settings.financeSettings.classFees?.find((entry) => entry.classId === classItem._id)?.feeAmount || ''} onChange={(e) => handleClassFeeChange(classItem, e.target.value)} />
                </Grid>
              ))}
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2 }}>Cheque / Supply Notes</Typography>
            <Alert severity="info">Cheque movements and supply payments can also be managed in the accountant finance page.</Alert>
          </Grid>

          <Grid item xs={12}>
            <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default FinanceSettings;