
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  MenuItem
} from '@mui/material';
import MailIcon from '@mui/icons-material/Mail';
import PhoneIcon from '@mui/icons-material/Phone';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

const CommunicationLogPage = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

  const canView = currentUser?.permissions?.sendBulkSMS !== false || currentUser?.permissions?.sendBulkEmail !== false;

  useEffect(() => {
    fetchMessages();
    fetchStats();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_BASE_URL}/Message/Sent`, {
        headers: { 'x-admin-id': currentUser?._id }
      });
      setMessages(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load communication log');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/Message/Stats/Overview`, {
        headers: { 'x-admin-id': currentUser?._id }
      });
      setStats(response.data?.data || {});
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const getMessageIcon = (type) => {
    return type === 'SMS' ? <PhoneIcon /> : <MailIcon />;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Sent':
        return 'success';
      case 'Failed':
        return 'error';
      case 'Partial':
        return 'warning';
      case 'Draft':
        return 'default';
      case 'Scheduled':
        return 'info';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Urgent':
        return '#d32f2f';
      case 'High':
        return '#f57c00';
      case 'Normal':
        return '#1976d2';
      case 'Low':
        return '#388e3c';
      default:
        return '#757575';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const filteredMessages = messages.filter((msg) => {
    const typeMatch = filterType === 'All' || msg.messageType === filterType;
    const statusMatch = filterStatus === 'All' || msg.status === filterStatus;
    return typeMatch && statusMatch;
  });

  if (!canView) {
    return (
      <Box sx={{ maxWidth: 900, mx: 'auto', p: 2 }}>
        <Alert severity="warning">
          You do not have permission to view communication logs.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Communication Log
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Sent
              </Typography>
              <Typography variant="h6">
                {stats.sentMessages || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Emails Sent
              </Typography>
              <Typography variant="h6">
                {stats.emailsSent || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                SMS Sent
              </Typography>
              <Typography variant="h6">
                {stats.smsSent || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Failed
              </Typography>
              <Typography variant="h6" sx={{ color: 'error.main' }}>
                {stats.failedMessages || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Box sx={{ display: 'grid', gap: 2, mb: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' } }}>
        <TextField
          select
          label="Message Type"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          size="small"
        >
          <MenuItem value="All">All Types</MenuItem>
          <MenuItem value="Email">Email</MenuItem>
          <MenuItem value="SMS">SMS</MenuItem>
          <MenuItem value="Both">Both</MenuItem>
        </TextField>
        <TextField
          select
          label="Status"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          size="small"
        >
          <MenuItem value="All">All Statuses</MenuItem>
          <MenuItem value="Sent">Sent</MenuItem>
          <MenuItem value="Failed">Failed</MenuItem>
          <MenuItem value="Partial">Partial</MenuItem>
          <MenuItem value="Draft">Draft</MenuItem>
          <MenuItem value="Scheduled">Scheduled</MenuItem>
        </TextField>
        <Button variant="contained" onClick={fetchMessages} disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Refresh'}
        </Button>
      </Box>

      {/* Messages Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><strong>Date & Time</strong></TableCell>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell><strong>Subject</strong></TableCell>
              <TableCell><strong>Recipient Type</strong></TableCell>
              <TableCell><strong>Priority</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', p: 3 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredMessages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', p: 2 }}>
                  <Typography color="textSecondary">
                    No communication records found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredMessages.map((message) => (
                <TableRow key={message._id} hover>
                  <TableCell sx={{ fontSize: '0.875rem' }}>
                    {formatDate(message.createdAt)}
                  </TableCell>
                  <TableCell>
                    {message.messageType === 'SMS' ? (
                      <Chip icon={<PhoneIcon />} label="SMS" size="small" />
                    ) : message.messageType === 'Email' ? (
                      <Chip icon={<MailIcon />} label="Email" size="small" />
                    ) : (
                      <Chip label="Both" size="small" />
                    )}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {message.messageSubject || message.messageBody?.substring(0, 30) + '...'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={message.recipientType}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={message.priority}
                      size="small"
                      sx={{
                        backgroundColor: getPriorityColor(message.priority),
                        color: 'white'
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={message.status === 'Sent' ? <CheckCircleIcon /> : message.status === 'Failed' ? <ErrorIcon /> : undefined}
                      label={message.status}
                      size="small"
                      color={getStatusColor(message.status)}
                      variant={getStatusColor(message.status) === 'default' ? 'outlined' : 'filled'}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="caption" sx={{ mt: 2, display: 'block', color: 'textSecondary' }}>
        Showing {filteredMessages.length} of {messages.length} communications
      </Typography>
    </Box>
  );
};

export default CommunicationLogPage;
