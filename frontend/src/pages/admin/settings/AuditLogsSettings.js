import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('currentUser')) || {};
  } catch (error) {
    return {};
  }
};

const getAdminHeaders = () => {
  const currentUser = getCurrentUser();
  const adminId = currentUser?._id || currentUser?.id || null;
  const headers = { 'Content-Type': 'application/json' };
  if (adminId) {
    headers['x-admin-id'] = adminId;
  }
  return headers;
};

const getSchoolId = () => {
  const currentUser = getCurrentUser();
  return currentUser?.school?._id || currentUser?.school || null;
};

const AuditLogsSettings = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [status, setStatus] = useState('');

  const schoolId = useMemo(getSchoolId, []);
  const headers = useMemo(getAdminHeaders, []);

  const fetchLogs = async () => {
    if (!schoolId) {
      setError('Unable to determine school context. Please sign in again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (action) query.set('action', action);
      if (entityType) query.set('entityType', entityType);
      if (status) query.set('status', status);

      const response = await axios.get(`${API_BASE_URL}/School/${schoolId}/AuditLogs?${query.toString()}`, {
        headers,
      });

      setLogs(response.data.logs || []);
      setTotal(response.data.total || 0);
    } catch (fetchError) {
      setError(fetchError.response?.data?.message || fetchError.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, action, entityType, status]);

  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    return date.toLocaleString();
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Audit Logs
      </Typography>
      <Typography sx={{ mb: 3, color: 'text.secondary' }}>
        View recent audit activity for your school. Use filters to narrow by action, entity type, or status.
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              label="Action"
              fullWidth
              value={action}
              onChange={(event) => setAction(event.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Entity Type"
              fullWidth
              value={entityType}
              onChange={(event) => setEntityType(event.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="success">Success</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button variant="contained" onClick={() => setPage(1)} fullWidth>
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Rows</InputLabel>
              <Select
                label="Rows"
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography>
              Page {page} / {Math.max(1, Math.ceil(total / limit))}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button disabled={page >= Math.max(1, Math.ceil(total / limit))} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography color="text.secondary">Total records: {total}</Typography>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Paper sx={{ p: 2, backgroundColor: '#fdecea' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Module</TableCell>
                <TableCell>Page</TableCell>
                <TableCell>IP address</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No audit records found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell>{formatDate(log.timestamp)}</TableCell>
                    <TableCell>{log.user?.name || log.user || 'System'}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.context?.module || log.entityType || '-'}</TableCell>
                    <TableCell>{log.context?.page || log.context?.endpoint || '-'}</TableCell>
                    <TableCell>{log.ipAddress || '-'}</TableCell>
                    <TableCell>{log.status || '-'}</TableCell>
                    <TableCell>{log.resultMessage || log.entityName || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default AuditLogsSettings;