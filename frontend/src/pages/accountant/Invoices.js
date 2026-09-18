import { API_BASE_URL } from '../../utils/apiConfig';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Alert } from '@mui/material';


const Invoices = () => {
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
      setError(err.response?.data?.message || err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Invoices</Typography>
      {error && <Alert severity="error">{error}</Alert>}

      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell>Total Fees</TableCell>
              <TableCell>Amount Paid</TableCell>
              <TableCell>Balance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.isArray(stats?.studentDetails) && stats.studentDetails.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.totalFees}</TableCell>
                <TableCell>{s.amountPaid}</TableCell>
                <TableCell>{s.balance}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default Invoices;
