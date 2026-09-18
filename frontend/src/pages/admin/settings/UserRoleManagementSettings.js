
import { useState, useEffect } from 'react';
import { Box, Paper, TextField, Button, Typography, Switch, FormControlLabel, Grid, Alert } from '@mui/material';
import { useSelector } from 'react-redux';

const UserRoleManagementSettings = () => {
  const { currentUser } = useSelector(state => state.user);
  const [settings, setSettings] = useState({
    enableSelfRegistration: false,
    autoApproveRegistration: false,
    requireEmailVerification: true,
      maxUsersPerRole: {
      admin: 10,
      teacher: 100,
      student: 1000,
      parent: 1000,
      accountant: 5
    },
    defaultUserRole: 'student'
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

  const handleRoleLimit = (role, value) => {
    setSettings(prev => ({
      ...prev,
      maxUsersPerRole: {
        ...prev.maxUsersPerRole,
        [role]: parseInt(value)
      }
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
      <Typography variant="h5" sx={{ mb: 3 }}>User & Role Management Settings</Typography>
      {message && <Alert sx={{ mb: 2 }} severity={message.includes('Error') ? 'error' : 'success'}>{message}</Alert>}
      
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2 }}>Registration Settings</Typography>
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch
                checked={settings.enableSelfRegistration}
                onChange={(e) => handleChange('enableSelfRegistration', e.target.checked)}
              />}
              label="Enable Self Registration"
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch
                checked={settings.autoApproveRegistration}
                onChange={(e) => handleChange('autoApproveRegistration', e.target.checked)}
              />}
              label="Auto-approve Registrations"
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch
                checked={settings.requireEmailVerification}
                onChange={(e) => handleChange('requireEmailVerification', e.target.checked)}
              />}
              label="Require Email Verification"
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>User Limits Per Role</Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Max Admins"
              value={settings.maxUsersPerRole.admin}
              onChange={(e) => handleRoleLimit('admin', e.target.value)}
              inputProps={{ min: 1 }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Max Teachers"
              value={settings.maxUsersPerRole.teacher}
              onChange={(e) => handleRoleLimit('teacher', e.target.value)}
              inputProps={{ min: 1 }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Max Students"
              value={settings.maxUsersPerRole.student}
              onChange={(e) => handleRoleLimit('student', e.target.value)}
              inputProps={{ min: 1 }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Max Parents"
              value={settings.maxUsersPerRole.parent}
              onChange={(e) => handleRoleLimit('parent', e.target.value)}
              inputProps={{ min: 1 }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              select
              label="Default User Role"
              value={settings.defaultUserRole}
              onChange={(e) => handleChange('defaultUserRole', e.target.value)}
              SelectProps={{ native: true }}
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="parent">Parent</option>
              <option value="accountant">Accountant / Finance Officer</option>
            </TextField>
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

export default UserRoleManagementSettings;
