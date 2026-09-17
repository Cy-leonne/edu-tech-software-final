import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Box, Typography, Paper, Button, CircularProgress, Alert } from '@mui/material';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const Reports = () => {
  const { currentUser } = useSelector(state => state.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  const schoolId = currentUser?.school?._id || currentUser?.school || currentUser?.schoolId;

  useEffect(() => {
    fetchStats();
  }, [schoolId]);

  const fetchStats = async () => {
    if (!schoolId) {
      setError('Missing school context');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/Student/PaymentStats/${schoolId}`, { headers: { 'x-admin-id': currentUser?._id } });
      setStats(res.data || {});
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!stats) return;
    const rows = [];
    rows.push(['Student', 'TotalFees', 'AmountPaid', 'Balance']);
    (stats.studentDetails || []).forEach(s => rows.push([s.name, s.totalFees, s.amountPaid, s.balance]));
    const csv = rows.map(r => r.map(c => `"${(c ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Financial Reports</Typography>
      {error && <Alert severity="error">{error}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography>Total Students: {stats?.totalStudents ?? '-'}</Typography>
        <Typography>Total Collected: {stats?.totalFeesCollected ?? stats?.totalFeesCollected ?? '-'}</Typography>
        <Typography>Total Outstanding: {stats?.totalOutstanding ?? '-'}</Typography>
      </Paper>

      <Button variant="contained" onClick={exportCSV}>Export CSV</Button>
    </Box>
  );
};

export default Reports;