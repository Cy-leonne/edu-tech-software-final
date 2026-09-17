import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Alert, Box, CircularProgress, Grid, Paper, Stack, Typography } from '@mui/material';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const FinanceReport = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const schoolId = useMemo(() => currentUser?.school?._id || currentUser?.school || currentUser?.schoolId, [currentUser]);
  const adminId = currentUser?._id;

  useEffect(() => {
    const loadReport = async () => {
      if (!schoolId) {
        setLoading(false);
        setMessage('Missing school context');
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/Settings/School/${schoolId}/FinanceReport`, {
          headers: { 'x-admin-id': adminId },
        });
        setReport(response.data.report || null);
      } catch (error) {
        setMessage(error.response?.data?.message || error.message || 'Unable to load finance report');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [schoolId, adminId]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Finance Report</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Review fees collected, outstanding balances, cheques, and supply expenses for the school.
      </Typography>

      {message ? <Alert severity="info" sx={{ mb: 2 }}>{message}</Alert> : null}

      {report ? (
        <Grid container spacing={2}>
          {[
            { label: 'Total Expected Fees', value: report.totalExpectedFees ?? 0 },
            { label: 'Total Collected', value: report.totalCollected ?? 0 },
            { label: 'Outstanding Balance', value: report.outstandingBalance ?? 0 },
            { label: 'Class Fee Budget', value: report.classFeeBudget ?? 0 },
            { label: 'Incoming Cheques', value: report.incomingCheques ?? 0 },
            { label: 'Outgoing Cheques', value: report.outgoingCheques ?? 0 },
            { label: 'Supply Payments', value: report.supplyPayments ?? 0 },
            { label: 'Pending Cheques', value: report.pendingCheques ?? 0 },
          ].map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item.label}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">{item.label}</Typography>
                <Typography variant="h5">{item.value}</Typography>
              </Paper>
            </Grid>
          ))}

          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Cheque Register</Typography>
              {Array.isArray(report.chequeEntries) && report.chequeEntries.length > 0 ? (
                <Stack spacing={1.5}>
                  {report.chequeEntries.map((cheque, index) => (
                    <Box key={`${cheque.chequeNumber || 'entry'}-${index}`} sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 1.5 }}>
                      <Typography variant="subtitle2">{cheque.transactionType || 'Cheque'}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {cheque.chequeNumber || '-'} • {cheque.bankName || cheque.bank || '-'} • {cheque.amount ?? 0} • {cheque.status || 'Pending'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Payee/Payer: {cheque.payeePayer || cheque.payerPayee || '-'}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">No cheque entries recorded yet.</Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      ) : (
        <Alert severity="info">No report data is available yet.</Alert>
      )}
    </Box>
  );
};

export default FinanceReport;