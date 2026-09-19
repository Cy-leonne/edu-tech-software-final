
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Box, Button, TextField, Typography, Alert, List, ListItem, ListItemText, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const SchoolPoliciesPage = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [policies, setPolicies] = useState([]);
  const [policyText, setPolicyText] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    if (currentUser?.settings?.schoolPolicies) {
      setPolicies(currentUser.settings.schoolPolicies);
    }
  }, [currentUser]);

  const canUpdate = currentUser?.permissions?.managePolicies !== false;

  const savePolicies = async (newPolicies) => {
    try {
      if (!currentUser?._id) return;
      setMessage('');
      setError('');
      setSaving(true);
      const response = await axios.put(`${API_BASE_URL}/Admin/Settings/${currentUser._id}`, {
        settings: { ...currentUser.settings, schoolPolicies: newPolicies }
      });
      setMessage(response.data.message || 'School policies updated successfully');
      setPolicies(newPolicies);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save school policies');
    } finally {
      setSaving(false);
    }
  };

  const addPolicy = () => {
    if (!policyText.trim()) {
      setError('Policy text cannot be empty.');
      return;
    }
    const updatedPolicies = [...policies, policyText.trim()];
    setPolicyText('');
    savePolicies(updatedPolicies);
  };

  const removePolicy = (index) => {
    const updatedPolicies = policies.filter((_, idx) => idx !== index);
    savePolicies(updatedPolicies);
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 2 }}>
      <Typography variant="h5" gutterBottom>
        School Policies
      </Typography>
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Typography sx={{ mb: 2 }}>
        Add school-specific policies and governance rules that apply to your school.
      </Typography>
      <Box sx={{ display: 'grid', gap: 2, mb: 3 }}>
        <TextField
          label="New Policy"
          value={policyText}
          onChange={(event) => setPolicyText(event.target.value)}
          fullWidth
          multiline
          rows={3}
          disabled={!canUpdate}
        />
        <Button variant="contained" onClick={addPolicy} disabled={!canUpdate || saving}>
          Add Policy
        </Button>
        {!canUpdate && (
          <Alert severity="info">You do not have permission to manage school policies.</Alert>
        )}
      </Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Configured Policies
      </Typography>
      <List>
        {policies.length === 0 && <Typography>No policies configured yet.</Typography>}
        {policies.map((policy, index) => (
          <ListItem key={`${policy}-${index}`} secondaryAction={
            <IconButton edge="end" aria-label="delete" onClick={() => removePolicy(index)} disabled={!canUpdate || saving}>
              <DeleteIcon />
            </IconButton>
          }>
            <ListItemText primary={policy} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default SchoolPoliciesPage;
