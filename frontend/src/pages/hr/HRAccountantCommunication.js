import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import {
    Box,
    Typography,
    Paper,
    TextField,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress,
    Chip,
    Stack,
    Card,
    CardContent,
    Grid,
    Avatar,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Divider,
    Tabs,
    Tab,
    Badge,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
} from '@mui/material';
import {
    Send as SendIcon,
    Close as CloseIcon,
    CheckCircle as CheckCircleIcon,
    HourglassEmpty as HourglassEmptyIcon,
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const HRAccountantCommunication = () => {
    const { currentUser, currentRole } = useSelector((state) => state.user);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [composeOpen, setComposeOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [responseText, setResponseText] = useState('');
    const [tabValue, setTabValue] = useState(0);
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    // Compose form
    const [composeTo, setComposeTo] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeMessage, setComposeMessage] = useState('');
    const [composePriority, setComposePriority] = useState('medium');
    const [composeType, setComposeType] = useState('general');
    const [composeError, setComposeError] = useState('');

    const [staffList, setStaffList] = useState([]);

    const headers = {
        'Content-Type': 'application/json',
        'x-admin-id': currentUser?._id,
    };

    // Fetch staff list for compose dropdown
    const fetchStaffList = async () => {
        try {
            const hrResponse = await axios.get(`${API_BASE_URL}/Admin/HR`, { headers });
            const accountantResponse = await axios.get(`${API_BASE_URL}/Admin/Accountants`, { headers });

            const hrStaff = Array.isArray(hrResponse.data) ? hrResponse.data : [];
            const accountants = Array.isArray(accountantResponse.data) ? accountantResponse.data : [];

            setStaffList([...hrStaff, ...accountants].filter(s => s._id !== currentUser?._id));
        } catch (err) {
            console.error('Error fetching staff:', err);
        }
    };

    // Fetch messages
    const fetchMessages = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/Communication/Inbox`, { headers });
            setMessages(Array.isArray(response.data) ? response.data : []);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch messages');
            setMessages([]);
        } finally {
            setLoading(false);
        }
    };

    // Fetch unread count
    const fetchUnreadCount = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/Communication/UnreadCount`, { headers });
            setUnreadCount(response.data.unreadCount || 0);
        } catch (err) {
            console.error('Error fetching unread count:', err);
        }
    };

    useEffect(() => {
        if (currentUser?._id) {
            fetchMessages();
            fetchUnreadCount();
            fetchStaffList();
            const interval = setInterval(() => {
                fetchUnreadCount();
            }, 30000); // Refresh every 30 seconds
            return () => clearInterval(interval);
        }
    }, [currentUser?._id]);

    const handleSendMessage = async () => {
        if (!composeTo || !composeSubject || !composeMessage) {
            setComposeError('Please fill in all required fields');
            return;
        }

        try {
            await axios.post(
                `${API_BASE_URL}/Communication/SendMessage`,
                {
                    recipientId: composeTo,
                    subject: composeSubject,
                    message: composeMessage,
                    messageType: composeType,
                    priority: composePriority,
                },
                { headers }
            );

            setSuccess('Message sent successfully');
            setComposeOpen(false);
            setComposeTo('');
            setComposeSubject('');
            setComposeMessage('');
            setComposePriority('medium');
            setComposeType('general');
            fetchMessages();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setComposeError(err.response?.data?.message || 'Failed to send message');
        }
    };

    const handleMarkAsRead = async (messageId) => {
        try {
            await axios.put(`${API_BASE_URL}/Communication/${messageId}/MarkRead`, {}, { headers });
            fetchMessages();
            fetchUnreadCount();
        } catch (err) {
            console.error('Error marking as read:', err);
        }
    };

    const handleAddResponse = async () => {
        if (!responseText) return;

        try {
            await axios.post(
                `${API_BASE_URL}/Communication/${selectedMessage._id}/AddResponse`,
                { message: responseText },
                { headers }
            );

            setResponseText('');
            fetchMessages();
            setSuccess('Response added successfully');
            setTimeout(() => setSuccess(''), 2000);

            // Refresh selected message
            const updated = messages.find(m => m._id === selectedMessage._id);
            if (updated) setSelectedMessage(updated);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add response');
        }
    };

    const handleResolve = async (messageId) => {
        try {
            await axios.put(`${API_BASE_URL}/Communication/${messageId}/Resolve`, {}, { headers });
            setSuccess('Communication marked as resolved');
            fetchMessages();
            setDetailsOpen(false);
            setTimeout(() => setSuccess(''), 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to resolve');
        }
    };

    // Filter messages
    const filteredMessages = messages.filter((msg) => {
        let typeMatch = filterType === 'all' || msg.messageType === filterType;
        let statusMatch = filterStatus === 'all' || msg.status === filterStatus;
        return typeMatch && statusMatch;
    });

    const messageStats = {
        unread: messages.filter(m => m.status === 'unread').length,
        queries: messages.filter(m => m.messageType === 'query').length,
        alerts: messages.filter(m => m.messageType === 'payment_alert').length,
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
                HR - Accountant Communication Portal
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2">
                                Unread Messages
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                                {messageStats.unread}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2">
                                Queries
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                {messageStats.queries}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2">
                                Payment Alerts
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                                {messageStats.alerts}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Button
                        variant="contained"
                        startIcon={<SendIcon />}
                        onClick={() => setComposeOpen(true)}
                        fullWidth
                    >
                        New Message
                    </Button>
                </Grid>
            </Grid>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Message Type</InputLabel>
                        <Select
                            value={filterType}
                            label="Message Type"
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <MenuItem value="all">All Types</MenuItem>
                            <MenuItem value="query">Queries</MenuItem>
                            <MenuItem value="notification">Notifications</MenuItem>
                            <MenuItem value="payment_alert">Payment Alerts</MenuItem>
                            <MenuItem value="general">General</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={filterStatus}
                            label="Status"
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <MenuItem value="all">All Status</MenuItem>
                            <MenuItem value="unread">Unread</MenuItem>
                            <MenuItem value="read">Read</MenuItem>
                            <MenuItem value="resolved">Resolved</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
            </Paper>

            {/* Messages List */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                </Box>
            ) : filteredMessages.length === 0 ? (
                <Alert severity="info">No messages found</Alert>
            ) : (
                <Paper>
                    <List>
                        {filteredMessages.map((msg, idx) => (
                            <React.Fragment key={msg._id}>
                                <ListItem
                                    button
                                    onClick={() => {
                                        setSelectedMessage(msg);
                                        setDetailsOpen(true);
                                        if (msg.status === 'unread') {
                                            handleMarkAsRead(msg._id);
                                        }
                                    }}
                                    sx={{
                                        backgroundColor:
                                            msg.status === 'unread' ? '#f5f5f5' : 'transparent',
                                        '&:hover': { backgroundColor: '#eeeeee' },
                                    }}
                                >
                                    <ListItemAvatar>
                                        <Badge
                                            color="error"
                                            variant="dot"
                                            invisible={msg.status !== 'unread'}
                                        >
                                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                                                {msg.senderName?.charAt(0) || 'U'}
                                            </Avatar>
                                        </Badge>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={msg.subject}
                                        secondary={
                                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                                                <Typography variant="body2" sx={{ mr: 1 }}>
                                                    {msg.senderName} ({msg.senderRole})
                                                </Typography>
                                                <Chip
                                                    label={msg.messageType}
                                                    size="small"
                                                    variant="outlined"
                                                    color={msg.priority === 'high' ? 'error' : 'default'}
                                                />
                                                <Typography variant="caption" sx={{ ml: 'auto' }}>
                                                    {new Date(msg.createdAt).toLocaleDateString()}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                </ListItem>
                                {idx < filteredMessages.length - 1 && <Divider />}
                            </React.Fragment>
                        ))}
                    </List>
                </Paper>
            )}

            {/* Compose Dialog */}
            <Dialog open={composeOpen} onClose={() => setComposeOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>New Message</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Stack spacing={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Recipient</InputLabel>
                            <Select
                                value={composeTo}
                                label="Recipient"
                                onChange={(e) => setComposeTo(e.target.value)}
                            >
                                {staffList.map((staff) => (
                                    <MenuItem key={staff._id} value={staff._id}>
                                        {staff.name} ({staff.role})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Subject"
                            fullWidth
                            value={composeSubject}
                            onChange={(e) => setComposeSubject(e.target.value)}
                        />
                        <FormControl fullWidth size="small">
                            <InputLabel>Message Type</InputLabel>
                            <Select
                                value={composeType}
                                label="Message Type"
                                onChange={(e) => setComposeType(e.target.value)}
                            >
                                <MenuItem value="general">General</MenuItem>
                                <MenuItem value="query">Query</MenuItem>
                                <MenuItem value="notification">Notification</MenuItem>
                                <MenuItem value="payment_alert">Payment Alert</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth size="small">
                            <InputLabel>Priority</InputLabel>
                            <Select
                                value={composePriority}
                                label="Priority"
                                onChange={(e) => setComposePriority(e.target.value)}
                            >
                                <MenuItem value="low">Low</MenuItem>
                                <MenuItem value="medium">Medium</MenuItem>
                                <MenuItem value="high">High</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="Message"
                            fullWidth
                            multiline
                            rows={5}
                            value={composeMessage}
                            onChange={(e) => setComposeMessage(e.target.value)}
                        />
                        {composeError && <Alert severity="error">{composeError}</Alert>}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setComposeOpen(false)}>Cancel</Button>
                    <Button onClick={handleSendMessage} variant="contained" startIcon={<SendIcon />}>
                        Send
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Message Details Dialog */}
            <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
                {selectedMessage && (
                    <>
                        <DialogTitle>{selectedMessage.subject}</DialogTitle>
                        <DialogContent sx={{ pt: 2 }}>
                            <Stack spacing={2}>
                                <Paper sx={{ p: 2, backgroundColor: '#f9f9f9' }}>
                                    <Typography variant="body2" color="textSecondary">
                                        <strong>From:</strong> {selectedMessage.senderName} ({selectedMessage.senderRole})
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        <strong>Date:</strong> {new Date(selectedMessage.createdAt).toLocaleString()}
                                    </Typography>
                                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                        <Chip
                                            label={selectedMessage.messageType}
                                            size="small"
                                            variant="outlined"
                                            color={selectedMessage.priority === 'high' ? 'error' : 'default'}
                                        />
                                        <Chip
                                            label={selectedMessage.status}
                                            size="small"
                                            icon={
                                                selectedMessage.status === 'resolved' ? <CheckCircleIcon /> : <HourglassEmptyIcon />
                                            }
                                            color={selectedMessage.status === 'resolved' ? 'success' : 'warning'}
                                        />
                                    </Stack>
                                </Paper>

                                <Typography variant="body1">{selectedMessage.message}</Typography>

                                {selectedMessage.responses && selectedMessage.responses.length > 0 && (
                                    <>
                                        <Divider />
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                            Responses ({selectedMessage.responses.length})
                                        </Typography>
                                        {selectedMessage.responses.map((resp, idx) => (
                                            <Paper key={idx} sx={{ p: 1.5, backgroundColor: '#f5f5f5', ml: 2 }}>
                                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                    {resp.responderName} ({resp.responderRole})
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    {new Date(resp.createdAt).toLocaleString()}
                                                </Typography>
                                                <Typography variant="body2" sx={{ mt: 1 }}>
                                                    {resp.message}
                                                </Typography>
                                            </Paper>
                                        ))}
                                    </>
                                )}

                                {selectedMessage.status !== 'resolved' && (
                                    <>
                                        <Divider />
                                        <TextField
                                            label="Add Response"
                                            fullWidth
                                            multiline
                                            rows={3}
                                            value={responseText}
                                            onChange={(e) => setResponseText(e.target.value)}
                                        />
                                    </>
                                )}
                            </Stack>
                        </DialogContent>
                        <DialogActions>
                            {selectedMessage.status !== 'resolved' && (
                                <>
                                    <Button
                                        onClick={() => handleAddResponse()}
                                        variant="contained"
                                        disabled={!responseText}
                                        startIcon={<SendIcon />}
                                    >
                                        Add Response
                                    </Button>
                                    <Button
                                        onClick={() => handleResolve(selectedMessage._id)}
                                        variant="outlined"
                                        color="success"
                                    >
                                        Mark Resolved
                                    </Button>
                                </>
                            )}
                            <Button onClick={() => setDetailsOpen(false)}>Close</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
};

export default HRAccountantCommunication;