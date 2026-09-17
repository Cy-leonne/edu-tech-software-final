import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const SystemLogsPage = () => {
  const { currentUser, currentRole } = useSelector((state) => state.user);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      if (!currentUser?._id || (currentRole !== 'SuperAdmin' && currentRole !== 'Admin')) {
        setError('Only admin users can access this page.');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/SuperAdmin/SystemLogs`, {
          headers: {
            'x-admin-id': currentUser._id,
          },
        });

        setLogs(response?.data?.logs || []);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load system logs.');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [currentUser, currentRole]);

  const formatDate = (value) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
        <HistoryIcon color="primary" />
        <Typography variant="h5">System Logs</Typography>
      </Stack>

      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : logs.length === 0 ? (
            <Typography color="text.secondary">No system logs found.</Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Actor</TableCell>
                    <TableCell>School</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log._id} hover>
                      <TableCell>{formatDate(log.timestamp)}</TableCell>
                      <TableCell>{log.action || '—'}</TableCell>
                      <TableCell>{log.actor?.name || log.actor?.email || '—'}</TableCell>
                      <TableCell>{log.school?.schoolName || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={log.status || 'Success'}
                          color={log.status === 'Failed' ? 'error' : 'success'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{log.description || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default SystemLogsPage;