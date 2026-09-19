
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import SendIcon from '@mui/icons-material/Send';

const MessageHistory = () => {
  const navigate = useNavigate();
  const { currentUser } = useSelector((state) => state.user);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  const REACT_APP_BASE_URL = process.env.REACT_APP_BASE_URL;

  // Fetch messages and stats
  useEffect(() => {
    fetchMessages();
    fetchStats();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${REACT_APP_BASE_URL}/Message/Sent`,
        { headers: { 'x-admin-id': currentUser._id } }
      );
      setMessages(response.data.data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(
        `${REACT_APP_BASE_URL}/Message/Stats/Overview`,
        { headers: { 'x-admin-id': currentUser._id } }
      );
      setStats(response.data?.data || {});
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await axios.delete(
        `${REACT_APP_BASE_URL}/Message/${messageId}`,
        { headers: { 'x-admin-id': currentUser._id } }
      );
      setMessages(messages.filter((msg) => msg._id !== messageId));
      setOpenDialog(false);
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const handleViewDetails = (message) => {
    setSelectedMessage(message);
    setOpenDialog(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Sent':
        return 'success';
      case 'Failed':
        return 'error';
      case 'Pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getDeliveryStatusColor = (status) => {
    switch (status) {
      case 'Sent':
        return 'success';
      case 'Failed':
        return 'error';
      case 'Pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading && messages.length === 0) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Message History
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SendIcon />}
          onClick={() => navigate('/Admin/messages/send')}
        >
          Send Message
        </Button>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Sent
                </Typography>
                <Typography variant="h5">{stats.sentMessages || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Emails Sent
                </Typography>
                <Typography variant="h5">{stats.emailsSent || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  SMS Sent
                </Typography>
                <Typography variant="h5">{stats.smsSent || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Failed
                </Typography>
                <Typography variant="h5" color="error">
                  {stats.failedMessages || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Messages Table */}
      <TableContainer component={Paper}>
        {messages.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="subtitle1" color="textSecondary">
              No messages sent yet
            </Typography>
          </Box>
        ) : (
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Subject</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Recipient Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Recipient Email</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Message Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Sent Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {messages.map((message) => (
                <TableRow key={message._id} hover>
                  <TableCell>{message.messageSubject}</TableCell>
                  <TableCell>{message.recipientType}</TableCell>
                  <TableCell>{message.recipientEmail}</TableCell>
                  <TableCell>
                    <Chip
                      label={message.messageType}
                      size="small"
                      color={
                        message.messageType === 'Email'
                          ? 'primary'
                          : message.messageType === 'SMS'
                          ? 'warning'
                          : 'info'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={message.status}
                      size="small"
                      color={getStatusColor(message.status)}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(message.sentAt).toLocaleDateString()} {new Date(message.sentAt).toLocaleTimeString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      startIcon={<InfoIcon />}
                      size="small"
                      onClick={() => handleViewDetails(message)}
                      sx={{ mr: 1 }}
                    >
                      Details
                    </Button>
                    <Button
                      startIcon={<DeleteIcon />}
                      size="small"
                      color="error"
                      onClick={() => {
                        setSelectedMessage(message);
                        setOpenDialog(true);
                      }}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Details Dialog */}
      <Dialog
        open={openDialog && selectedMessage && !selectedMessage.deliveryStatus}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Message Details</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" color="textSecondary">
                Subject
              </Typography>
              <Typography>{selectedMessage?.messageSubject}</Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="textSecondary">
                Message Body
              </Typography>
              <Typography>{selectedMessage?.messageBody}</Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="textSecondary">
                Recipient
              </Typography>
              <Typography>
                {selectedMessage?.recipientType}: {selectedMessage?.recipientEmail}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="textSecondary">
                Message Type
              </Typography>
              <Chip label={selectedMessage?.messageType} size="small" />
            </Box>

            <Box>
              <Typography variant="subtitle2" color="textSecondary">
                Priority
              </Typography>
              <Chip label={selectedMessage?.priority} size="small" />
            </Box>

            <Box>
              <Typography variant="subtitle2" color="textSecondary">
                Status
              </Typography>
              <Chip
                label={selectedMessage?.status}
                size="small"
                color={getStatusColor(selectedMessage?.status)}
              />
            </Box>

            {selectedMessage?.deliveryStatus && (
              <>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Email Delivery Status
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip
                      label={selectedMessage?.deliveryStatus.email}
                      size="small"
                      color={getDeliveryStatusColor(selectedMessage?.deliveryStatus.email)}
                    />
                    {selectedMessage?.deliveryStatus.emailSentAt && (
                      <Typography variant="caption">
                        {new Date(selectedMessage?.deliveryStatus.emailSentAt).toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {selectedMessage?.deliveryStatus.sms && (
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">
                      SMS Delivery Status
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip
                        label={selectedMessage?.deliveryStatus.sms}
                        size="small"
                        color={getDeliveryStatusColor(selectedMessage?.deliveryStatus.sms)}
                      />
                      {selectedMessage?.deliveryStatus.smsSentAt && (
                        <Typography variant="caption">
                          {new Date(selectedMessage?.deliveryStatus.smsSentAt).toLocaleString()}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}
              </>
            )}

            <Box>
              <Typography variant="subtitle2" color="textSecondary">
                Sent At
              </Typography>
              <Typography>
                {new Date(selectedMessage?.sentAt).toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Close</Button>
          <Button
            color="error"
            onClick={() => handleDeleteMessage(selectedMessage._id)}
          >
            Delete Message
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MessageHistory;
