
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Checkbox, Divider, FormControlLabel, Paper, Stack, Typography } from '@mui/material';
import axios from 'axios';
import { authLogout } from '../redux/userRelated/userSlice';

const AcceptancePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, currentRole } = useSelector((state) => state.user);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const userId = currentUser?._id || currentUser?.id || 'anonymous';
  const schoolId = currentUser?.school?._id || currentUser?.school || currentUser?.schoolId || null;

  const portalPath = () => {
    if (currentRole === 'SuperAdmin' || currentRole === 'Admin') return '/Admin/dashboard';
    if (currentRole === 'Teacher') return '/Teacher/dashboard';
    if (currentRole === 'Student') return '/Student/dashboard';
    if (currentRole === 'Accountant') return '/Accountant';
    if (currentRole === 'HR') return '/HR';
    return location.state?.returnTo || '/';
  };

  const handleContinue = async () => {
    if (!accepted) {
      setError('Please confirm that you agree to all applicable documents to continue.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const apiBaseUrl = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';
      await Promise.all(['terms', 'privacy', 'dpa', 'eula'].map((documentType) => axios.post(
        `${apiBaseUrl}/LegalAcceptance`,
        { user_id: userId, school_id: schoolId, document_type: documentType, document_version: '1.0', accepted: true },
        { headers: { 'x-user-id': userId, 'x-admin-id': userId } }
      )));
      localStorage.setItem(`edutechh-legal-accepted:${userId}`, JSON.stringify({
        acceptedAt: new Date().toISOString(),
        documents: ['terms', 'privacy', 'dpa', 'eula'],
      }));
      navigate(portalPath(), { replace: true });
    } catch (acceptanceError) {
      setError(acceptanceError.response?.data?.message || 'Unable to record your acceptance. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    dispatch(authLogout());
    navigate('/choose', { replace: true });
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Paper elevation={5} sx={{ width: '100%', maxWidth: 780, p: { xs: 3, sm: 5 } }}>
        <Stack spacing={2.5}>
          <Typography variant="overline" color="primary" fontWeight={700}>EDUTECHH ERP</Typography>
          <Typography variant="h4" component="h1">Welcome to Edutechh ERP</Typography>
          <Typography color="text.secondary">
            Before you access your dashboard, please review and accept the documents governing your use of the Edutechh ERP School Management System.
          </Typography>
          <Box>
            <Typography variant="h6" gutterBottom>Your agreement includes:</Typography>
            <Typography component="ul" sx={{ pl: 3, m: 0 }}>
              <li>Terms &amp; Conditions and Software Licence Agreement</li>
              <li>Privacy Policy</li>
              <li>Data Processing Agreement (DPA), where applicable</li>
              <li>End User Licence Agreement (EULA)</li>
            </Typography>
          </Box>
          <Box>
            <Typography variant="h6" gutterBottom>Documents</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} divider={<Divider orientation="vertical" flexItem />}>
              <Button component={Link} to="/terms" target="_blank">View Terms &amp; Conditions</Button>
              <Button component={Link} to="/privacy" target="_blank">View Privacy Policy</Button>
              <Button component={Link} to="/dpa" target="_blank">View Data Processing Agreement</Button>
              <Button component={Link} to="/eula" target="_blank">View End User Licence Agreement</Button>
            </Stack>
          </Box>
          <FormControlLabel
            control={<Checkbox checked={accepted} onChange={(event) => { setAccepted(event.target.checked); setError(''); }} />}
            label="I confirm that I have read, understood and agree to the Edutechh ERP Terms & Conditions, Software Licence Agreement, Privacy Policy, applicable Data Processing Agreement and End User Licence Agreement."
            sx={{ alignItems: 'flex-start' }}
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Typography variant="body2" color="text.secondary">
            Your acceptance may be recorded with relevant account and system information for contractual, security and audit purposes.
          </Typography>
          <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={2} justifyContent="flex-end">
            <Button variant="outlined" color="inherit" onClick={handleCancel} disabled={saving}>Cancel</Button>
            <Button variant="contained" onClick={handleContinue} disabled={saving}>{saving ? 'Recording...' : 'I Agree & Continue'}</Button>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Telephone: 0714675015 | Email: jkoilel@nita.go.ke | © {new Date().getFullYear()} Edutechh ERP. All Rights Reserved.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
};

export default AcceptancePage;
