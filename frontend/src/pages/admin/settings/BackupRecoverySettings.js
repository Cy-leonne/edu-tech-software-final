import { API_BASE_URL } from '../../../utils/apiConfig';

import { useState, useEffect } from 'react';
import { Box, Paper, TextField, Button, Typography, Grid, Alert, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { useSelector } from 'react-redux';
import axios from 'axios';

const BackupRecoverySettings = () => {
  const { currentUser } = useSelector(state => state.user);
  const [backups, setBackups] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [backing, setBacking] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchBackups();
    fetchStats();
  }, []);

  const fetchBackups = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/Settings/School/${currentUser?._id}/Backups`, {
        headers: { 'x-admin-id': currentUser?._id }
      });
      setBackups(response.data.backups || []);
    } catch (error) {
      setMessage('Error loading backups');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/Settings/School/${currentUser?._id}/Backup/Statistics`, {
        headers: { 'x-admin-id': currentUser?._id }
      });
      setStats(response.data || {});
    } catch (error) {
      console.error('Error loading backup stats');
    }
  };

  const createBackup = async (mode = 'full') => {
    setBacking(true);
    try {
      await axios.post(`${API_BASE_URL}/Settings/School/${currentUser?._id}/Backup/Create`, 
        { backupMode: mode },
        { headers: { 'x-admin-id': currentUser?._id } }
      );
      setMessage('Backup created successfully');
      setTimeout(() => {
        fetchBackups();
        fetchStats();
      }, 2000);
    } catch (error) {
      setMessage('Error creating backup');
    } finally {
      setBacking(false);
    }
  };

  const verifyBackup = async (backupId) => {
    try {
      await axios.post(`${API_BASE_URL}/Settings/School/${currentUser?._id}/Backup/${backupId}/Verify`, {}, {
        headers: { 'x-admin-id': currentUser?._id }
      });
      setMessage('Backup verified successfully');
      fetchBackups();
    } catch (error) {
      setMessage('Error verifying backup');
    }
  };

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Backup & Recovery</Typography>
      {message && <Alert sx={{ mb: 2 }} severity={message.includes('Error') ? 'error' : 'success'}>{message}</Alert>}
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Create Backup</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={() => createBackup('full')}
              disabled={backing}
            >
              {backing ? 'Creating Full Backup...' : 'Full Backup'}
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              variant="outlined"
              color="primary"
              fullWidth
              onClick={() => createBackup('incremental')}
              disabled={backing}
            >
              {backing ? 'Creating Incremental Backup...' : 'Incremental Backup'}
            </Button>
          </Grid>
        </Grid>

        <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Backup Statistics</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Paper sx={{ p: 2, bgcolor: 'primary.light' }}>
              <Typography color="primary">Total Backups: {stats.totalBackups || 0}</Typography>
              <Typography color="primary">Total Size: {stats.totalSize || '0 GB'}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Paper sx={{ p: 2, bgcolor: 'success.light' }}>
              <Typography color="success.dark">Last Backup: {stats.lastBackupDate || 'Never'}</Typography>
              <Typography color="success.dark">Successful Backups: {stats.successfulBackups || 0}</Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Backup History</Typography>
        {backups.length === 0 ? (
          <Typography color="text.secondary">No backups found</Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {backups.map((backup) => (
                <TableRow key={backup._id}>
                  <TableCell>{new Date(backup.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{backup.backupType}</TableCell>
                  <TableCell>{backup.size || 'N/A'}</TableCell>
                  <TableCell>{backup.status}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      onClick={() => verifyBackup(backup._id)}
                    >
                      Verify
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
};

export default BackupRecoverySettings;
