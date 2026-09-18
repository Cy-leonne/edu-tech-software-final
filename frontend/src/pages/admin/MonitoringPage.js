import { API_BASE_URL } from '../../utils/apiConfig';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
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
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SchoolIcon from '@mui/icons-material/School';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';


const MonitoringPage = () => {
  const { currentUser, currentRole } = useSelector((state) => state.user);
  const isSuperAdmin = currentRole === 'SuperAdmin';
  const [stats, setStats] = useState({
    totalSchools: 0,
    activeSchools: 0,
    suspendedSchools: 0,
    totalAdmins: 0,
    activeSubscriptions: 0,
    totalSubscriptions: 0,
    systemLogs: 0,
    backups: 0,
    schoolName: '',
    schoolStatus: '',
  });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const healthChecks = [
    { label: 'API services', value: 96, color: '#22c55e' },
    { label: 'Database', value: 92, color: '#3b82f6' },
    { label: 'Backup sync', value: 84, color: '#f59e0b' },
    { label: 'School access', value: 89, color: '#a855f7' },
  ];

  const uptimeCards = [
    { label: 'System Uptime', value: '99.97%', subtext: 'Last 30 days', accent: '#22c55e' },
    { label: 'Avg. Response', value: '234ms', subtext: 'Across all modules', accent: '#3b82f6' },
    { label: 'Critical Alerts', value: stats.suspendedSchools || 0, subtext: 'Suspended schools', accent: '#ef4444' },
  ];

  const miniChartData = [42, 58, 46, 72, 68, 86, 94, 79, 88, 96];

  const alerts = [
    ...(stats.suspendedSchools > 0 ? [{ type: 'warning', title: 'Suspended schools detected', text: `${stats.suspendedSchools} schools are currently suspended and require review.` }] : []),
    ...(logs.some((log) => (log.status || '').toLowerCase() === 'failed') ? [{ type: 'danger', title: 'Failed system activity', text: 'Recent admin or backup actions reported failures that need attention.' }] : []),
    ...(Number(stats.backups || 0) === 0 ? [{ type: 'info', title: 'Backup status', text: 'No backups are currently registered in the monitoring feed.' }] : []),
  ];

  useEffect(() => {
    const fetchMonitoringData = async () => {
      if (!currentUser?._id || (currentRole !== 'SuperAdmin' && currentRole !== 'Admin')) {
        setError('Only admin users can access monitoring.');
        setLoading(false);
        return;
      }

      try {
        const schoolScope = currentRole === 'Admin'
          ? (typeof currentUser?.school === 'object'
              ? (currentUser.school._id || currentUser.school.id || currentUser.schoolId || currentUser._id)
              : (currentUser?.school || currentUser?.schoolId || currentUser?._id))
          : null;
        const query = schoolScope ? `?schoolId=${encodeURIComponent(String(schoolScope))}` : '';

        const [statsRes, logsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/SuperAdmin/SystemStats${query}`, {
            headers: { 'x-admin-id': currentUser._id },
          }),
          axios.get(`${API_BASE_URL}/SuperAdmin/SystemLogs${query}`, {
            headers: { 'x-admin-id': currentUser._id },
          }),
        ]);

        setStats(statsRes?.data?.stats || {});
        setLogs(logsRes?.data?.logs || []);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load monitoring data.');
      } finally {
        setLoading(false);
      }
    };

    fetchMonitoringData();
  }, [currentUser, currentRole]);

  const formatDate = (value) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  const getLogInformation = (log) => {
    const changedFields = log.changes?.after
      ? Object.keys(log.changes.after).filter((field) => field !== 'auditModule' && field !== 'auditPage')
      : [];
    const record = log.entityName || log.entityType || 'System record';
    return changedFields.length > 0 ? `${record} (${changedFields.join(', ')})` : record;
  };

  const statCards = isSuperAdmin ? [
    { label: 'Total Schools', value: stats.totalSchools || 0, color: '#1976d2', icon: <SchoolIcon /> },
    { label: 'Active Schools', value: stats.activeSchools || 0, color: '#2e7d32', icon: <TrendingUpIcon /> },
    { label: 'Suspended Schools', value: stats.suspendedSchools || 0, color: '#d32f2f', icon: <MonitorHeartOutlinedIcon /> },
    { label: 'Admins', value: stats.totalAdmins || 0, color: '#7b1fa2', icon: <AdminPanelSettingsOutlinedIcon /> },
    { label: 'Active Subscriptions', value: stats.activeSubscriptions || 0, color: '#ef6c00', icon: <Inventory2OutlinedIcon /> },
    { label: 'System Logs', value: stats.systemLogs || 0, color: '#00838f', icon: <TrendingUpIcon /> },
    { label: 'Backups', value: stats.backups || 0, color: '#455a64', icon: <Inventory2OutlinedIcon /> },
  ] : [
    { label: 'School', value: stats.schoolName || 'Current School', color: '#1976d2', icon: <SchoolIcon /> },
    { label: 'Status', value: stats.schoolStatus || 'Active', color: '#2e7d32', icon: <TrendingUpIcon /> },
    { label: 'School Admins', value: stats.totalAdmins || 0, color: '#7b1fa2', icon: <AdminPanelSettingsOutlinedIcon /> },
    { label: 'School Logs', value: stats.systemLogs || 0, color: '#00838f', icon: <TrendingUpIcon /> },
    { label: 'School Backups', value: stats.backups || 0, color: '#455a64', icon: <Inventory2OutlinedIcon /> },
  ];

  const renderMiniChart = () => (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', height: 120, gap: 0.6, mt: 2 }}>
      {miniChartData.map((value, index) => (
        <Box
          key={index}
          sx={{
            flex: 1,
            height: `${value}%`,
            borderRadius: '8px 8px 0 0',
            background: index % 2 === 0
              ? 'linear-gradient(180deg, #7dd3fc 0%, #2563eb 100%)'
              : 'linear-gradient(180deg, #a78bfa 0%, #7c3aed 100%)',
            minHeight: 24,
          }}
        />
      ))}
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#fff',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <MonitorHeartOutlinedIcon sx={{ color: '#7dd3fc' }} />
          <Typography variant="h5" fontWeight={700}>{isSuperAdmin ? 'System Monitoring' : 'School Monitoring'}</Typography>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    Performance Overview
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>Operations trend</Typography>
                </Box>
                <Chip label="Live" color="success" size="small" />
              </Stack>

              <Box sx={{ height: 180, borderRadius: 2, background: '#f8fafc', p: 1.5 }}>
                {renderMiniChart()}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Alert Center
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                {alerts.length === 0 ? (
                  <Alert severity="success">No active alerts. All key systems are healthy.</Alert>
                ) : (
                  alerts.map((alert, index) => (
                    <Alert
                      key={`${alert.title}-${index}`}
                      severity={alert.type === 'danger' ? 'error' : alert.type === 'warning' ? 'warning' : 'info'}
                      sx={{ alignItems: 'center' }}
                    >
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700}>{alert.title}</Typography>
                        <Typography variant="body2">{alert.text}</Typography>
                      </Box>
                    </Alert>
                  ))
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {uptimeCards.map((item) => (
          <Grid item xs={12} md={4} key={item.label}>
            <Card sx={{ borderRadius: 3, height: '100%', borderTop: `4px solid ${item.accent}` }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  {item.label}
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ mt: 1, color: item.accent }}>
                  {item.value}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {item.subtext}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Health Status</Typography>
              <Stack spacing={2.5}>
                {healthChecks.map((item) => (
                  <Box key={item.label}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                      <Typography variant="body2" fontWeight={600}>{item.label}</Typography>
                      <Typography variant="body2" sx={{ color: item.color, fontWeight: 700 }}>{item.value}%</Typography>
                    </Stack>
                    <Box sx={{ width: '100%', height: 10, borderRadius: 999, bgcolor: '#e2e8f0', overflow: 'hidden' }}>
                      <Box
                        sx={{
                          width: `${item.value}%`,
                          height: '100%',
                          borderRadius: 999,
                          background: `linear-gradient(90deg, ${item.color} 0%, ${item.color}CC 100%)`,
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>Admin Notes</Typography>
                <Button variant="outlined" size="small">Refresh</Button>
              </Stack>

              <Stack spacing={1.5}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, background: '#f8fafc' }}>
                  <Typography variant="subtitle2" fontWeight={700}>Recommended action</Typography>
                  <Typography variant="body2" color="text.secondary">Review suspended schools and clear failed backup notices before the next maintenance window.</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, background: '#f8fafc' }}>
                  <Typography variant="subtitle2" fontWeight={700}>Resource usage</Typography>
                  <Typography variant="body2" color="text.secondary">System load remains stable across staff, finance, academic, and parent modules.</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, background: '#f8fafc' }}>
                  <Typography variant="subtitle2" fontWeight={700}>Next verification</Typography>
                  <Typography variant="body2" color="text.secondary">Confirm all schools are on the correct subscription tier before generating monthly reports.</Typography>
                </Paper>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item.label}>
            <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0 8px 20px rgba(15,23,42,0.08)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>{item.label}</Typography>
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: `${item.color}20`,
                      color: item.color,
                    }}
                  >
                    {item.icon}
                  </Box>
                </Stack>
                <Typography variant="h4" fontWeight={800} sx={{ color: item.color }}>{item.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', px: 2.5, py: 2 }}>
          <Typography variant="h6" fontWeight={700}>Recent Activity</Typography>
        </Box>
        <CardContent sx={{ p: 0 }}>
          {logs.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Typography color="text.secondary">No recent activity found.</Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                    <TableCell>Time</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Actor</TableCell>
                    <TableCell>School</TableCell>
                    <TableCell>Information</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.slice(0, 8).map((log) => (
                    <TableRow key={log._id || `${log.action}-${log.timestamp}`} hover>
                      <TableCell>{formatDate(log.timestamp)}</TableCell>
                      <TableCell>{log.action || '—'}</TableCell>
                      <TableCell>{log.actor?.name || log.actor?.email || '—'}</TableCell>
                      <TableCell>{log.school?.schoolName || '—'}</TableCell>
                      <TableCell>{getLogInformation(log)}</TableCell>
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

export default MonitoringPage;
