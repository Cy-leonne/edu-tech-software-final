
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Box, Button, TextField, Typography, Alert, MenuItem } from '@mui/material';
import { GRADING_SYSTEMS } from '../../utils/gradingSystem';

const GradingSettingsPage = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [gradingSystem, setGradingSystem] = useState({ enabled: true, type: 'achievement', scaleDescription: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    if (currentUser?._id) {
      const schoolValue = currentUser.school?._id || currentUser.schoolId || currentUser.school || currentUser._id;
      const schoolId = schoolValue && typeof schoolValue === 'object' ? schoolValue._id || schoolValue.id : schoolValue;
      axios.get(`${API_BASE_URL}/Admin/Settings/${schoolId}`, {
        headers: { 'x-admin-id': currentUser._id }
      }).then(({ data }) => {
        setGradingSystem({ enabled: true, type: 'achievement', scaleDescription: '', ...data.settings?.gradingSystem });
      }).catch(() => setError('Failed to load grading settings'));
    }
  }, [currentUser]);

  const canUpdate = currentUser?.permissions?.manageGradingSystem !== false;

  const saveGrading = async () => {
    try {
      if (!currentUser?._id) return;
      setMessage('');
      setError('');
      setSaving(true);
      const schoolValue = currentUser.school?._id || currentUser.schoolId || currentUser.school || currentUser._id;
      const schoolId = schoolValue && typeof schoolValue === 'object' ? schoolValue._id || schoolValue.id : schoolValue;
      const response = await axios.put(`${API_BASE_URL}/Admin/Settings/${schoolId}`, {
        gradingSystem
      }, {
        headers: { 'x-admin-id': currentUser._id }
      });
      setMessage(response.data.message || 'Grading settings updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save grading settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Grading System Configuration
      </Typography>
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Typography sx={{ mb: 2 }}>
        Define school grading system information and whether grading is enabled for this school.
      </Typography>
      <Box sx={{ display: 'grid', gap: 2 }}>
        <TextField
          select
          label="Grading Enabled"
          value={gradingSystem.enabled ? 'true' : 'false'}
          onChange={(event) => setGradingSystem({ ...gradingSystem, enabled: event.target.value === 'true' })}
          SelectProps={{ native: true }}
          fullWidth
          disabled={!canUpdate}
        >
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </TextField>
        <TextField
          select
          label="Grading System"
          value={gradingSystem.type || 'achievement'}
          onChange={(event) => setGradingSystem({ ...gradingSystem, type: event.target.value })}
          fullWidth
          disabled={!canUpdate}
        >
          {Object.entries(GRADING_SYSTEMS).map(([type, system]) => (
            <MenuItem key={type} value={type}>{system.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          label="Grading Scale Description"
          value={gradingSystem.scaleDescription || ''}
          onChange={(event) => setGradingSystem({ ...gradingSystem, scaleDescription: event.target.value })}
          fullWidth
          multiline
          rows={4}
          disabled={!canUpdate}
        />
        <Button
          variant="contained"
          onClick={saveGrading}
          disabled={!canUpdate || saving}
        >
          Save Grading Settings
        </Button>
      </Box>
      {!canUpdate && (
        <Alert severity="info" sx={{ mt: 2 }}>
          You do not have permission to manage the grading system.
        </Alert>
      )}
    </Box>
  );
};

export default GradingSettingsPage;
