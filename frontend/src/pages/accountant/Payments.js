import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Box, Typography, Paper, Button, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Alert, Stack } from '@mui/material';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const parseCsv = (text) => {
  const rows = text.trim().split(/\r?\n/).filter(Boolean);
  if (rows.length === 0) return [];

  const header = rows[0].split(',').map((column) => column.trim().replace(/^"|"$/g, ''));
  return rows.slice(1).map((row) => {
    const values = row.split(',').map((value) => value.trim().replace(/^"|"$/g, ''));
    const entry = {};
    header.forEach((column, index) => {
      entry[column.toLowerCase()] = values[index] || '';
    });
    return entry;
  });
};

const Payments = () => {
  const { currentUser } = useSelector(state => state.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [applying, setApplying] = useState(false);
  const [statementRows, setStatementRows] = useState([]);
  const [statementMessage, setStatementMessage] = useState('');
  const [schoolAccountBalance, setSchoolAccountBalance] = useState(0);
  const [bankDetails, setBankDetails] = useState(null);
  const [bankReconciliationEnabled, setBankReconciliationEnabled] = useState(
    Boolean(currentUser?.settings?.bankIntegration?.enabled)
  );

  const schoolId = currentUser?.school?._id || currentUser?.school || currentUser?.schoolId;

  useEffect(() => {
    fetchSystemSettings();
    fetchReconciliation();
  }, [schoolId]);

  const fetchSystemSettings = async () => {
    if (!schoolId) return;

    try {
      const res = await axios.get(`${API_BASE_URL}/Settings/School/${schoolId}/SystemSettings`, {
        headers: { 'x-admin-id': currentUser?._id }
      });
      setBankReconciliationEnabled(Boolean(res.data?.settings?.bankIntegration?.enabled));
      setSchoolAccountBalance(Number(res.data?.schoolAccountBalance || 0));
      setBankDetails(res.data?.bankDetails || null);
    } catch (err) {
      console.warn('Unable to load bank reconciliation settings', err?.message || err);
    }
  };

  const fetchReconciliation = async () => {
    if (!schoolId) {
      setError('Missing school context');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE_URL}/Student/PaymentReconciliation/${schoolId}`, { headers: { 'x-admin-id': currentUser?._id } });
      setData(res.data || {});
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load reconciliation');
    } finally {
      setLoading(false);
    }
  };

  const applyReconciliation = async () => {
    if (!schoolId) return setError('Missing school context');
    setApplying(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/Student/PaymentReconciliation/${schoolId}`, {}, { headers: { 'x-admin-id': currentUser?._id } });
      setData(prev => ({ ...prev, summary: res.data.summary }));
      await fetchReconciliation();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply reconciliation');
    } finally {
      setApplying(false);
    }
  };

  const handleStatementUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rows = parseCsv(text);
      setStatementRows(rows);
      setStatementMessage(`Imported ${rows.length} bank statement rows from ${file.name}`);
      setData(prev => ({ ...prev, statementRows: rows }));
    } catch (err) {
      setStatementMessage('Unable to parse the selected CSV file.');
    }
  };

  const matchTransactions = () => {
    if (statementRows.length === 0) {
      setStatementMessage('Upload a CSV file before matching transactions.');
      return;
    }

    const preview = statementRows.slice(0, 10).map((row) => ({
      ...row,
      status: Number(row.amount || 0) >= 0 ? 'Pending Match' : 'Needs Review',
    }));
    setStatementRows(preview);
    setData(prev => ({ ...prev, matchedTransactions: preview }));
    setStatementMessage('Preview ready. Review pending items before reconciling.');
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Payments & Reconciliation</Typography>
      {error && <Alert severity="error">{error}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1">Summary</Typography>
        <Typography>Total Students: {data?.summary?.totalStudents ?? '-'}</Typography>
        <Typography>Total Collected: {data?.summary?.totalCollected ?? '-'}</Typography>
        <Typography>Total Outstanding: {data?.summary?.totalOutstanding ?? '-'}</Typography>
        <Typography sx={{ mt: 1 }}>
          School Account Balance: <strong>KES {schoolAccountBalance.toLocaleString()}</strong>
        </Typography>
        {bankDetails && (
          <Typography>
            School Bank: <strong>{bankDetails.bankName || '-'} / {bankDetails.accountNumber || '-'}</strong>
          </Typography>
        )}
        <Typography sx={{ mt: 1 }}>Bank reconciliation is <strong>{bankReconciliationEnabled ? 'enabled' : 'disabled'}</strong>.</Typography>
        <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={applyReconciliation} disabled={applying}>{applying ? 'Applying...' : 'Apply Reconciliation'}</Button>
          <Button variant="outlined" onClick={fetchSystemSettings}>Refresh Settings</Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Bank Statement Import</Typography>
        {!bankReconciliationEnabled ? (
          <Alert severity="info">Enable bank reconciliation in School Settings to unlock CSV import and matching.</Alert>
        ) : (
          <>
            <Typography sx={{ mb: 2 }}>Upload a CSV statement to begin bank reconciliation and match deposits or withdrawals to school fee payments.</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button component="label" variant="outlined">
                Upload CSV
                <input hidden accept=".csv" type="file" onChange={handleStatementUpload} />
              </Button>
              <Button variant="contained" onClick={matchTransactions} disabled={statementRows.length === 0}>
                Preview Matches
              </Button>
            </Stack>
            {statementMessage && <Alert severity="info" sx={{ mt: 2 }}>{statementMessage}</Alert>}
                {statementRows.length > 0 && (
              <Table size="small" sx={{ mt: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {statementRows.map((row, index) => (
                    <TableRow key={`${row.date || index}-${row.description || index}`}>
                      <TableCell>{row.date || '-'}</TableCell>
                      <TableCell>{row.description || row.memo || '-'}</TableCell>
                      <TableCell>{row.amount || '-'}</TableCell>
                      <TableCell>{row.status || 'Imported'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Duplicate Transactions</Typography>
        {Array.isArray(data?.duplicateTransactions) && data.duplicateTransactions.length > 0 ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Transaction ID</TableCell>
                <TableCell>Entries</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.duplicateTransactions.map((d) => (
                <TableRow key={d.transactionId}>
                  <TableCell>{d.transactionId}</TableCell>
                  <TableCell>{d.entries.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Typography>No duplicate transactions found.</Typography>
        )}
      </Paper>

      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Student Reconciliation Review</Typography>
        {Array.isArray(data?.studentReconciliations) && data.studentReconciliations.some((student) => student.mismatch || student.pendingPayments?.length) ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Student</TableCell>
                <TableCell>Admission No.</TableCell>
                <TableCell>Recorded Paid</TableCell>
                <TableCell>Computed Paid</TableCell>
                <TableCell>Balance</TableCell>
                <TableCell>Pending Payments</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.studentReconciliations
                .filter((student) => student.mismatch || student.pendingPayments?.length)
                .map((student) => (
                  <TableRow key={student.studentId}>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.admissionNo || '-'}</TableCell>
                    <TableCell>{Number(student.amountPaid || 0).toLocaleString()}</TableCell>
                    <TableCell>{Number(student.computedPaid || 0).toLocaleString()}</TableCell>
                    <TableCell>{Number(student.balance || 0).toLocaleString()}</TableCell>
                    <TableCell>{student.pendingPayments?.length || 0}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        ) : (
          <Typography>No student payment mismatches or pending transaction payments found.</Typography>
        )}
      </Paper>
    </Box>
  );
};

export default Payments;