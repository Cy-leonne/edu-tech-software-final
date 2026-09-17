import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Grid,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
} from '@mui/material';
import Popup from '../../../components/Popup';

const SendMessage = () => {
  const navigate = useNavigate();
  const { currentUser } = useSelector((state) => state.user);
  const senderId = currentUser?._id || currentUser?.id;
  const schoolValue = currentUser?.school?._id || currentUser?.school?.id || currentUser?.school || currentUser?.schoolId;
  const schoolId = schoolValue ? String(schoolValue) : senderId;
  const [loader, setLoader] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [message, setMessage] = useState('');
  const [alertType, setAlertType] = useState('success');

  // Form states
  const [recipientType, setRecipientType] = useState('Student');
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [messageType, setMessageType] = useState('Email');
  const [priority, setPriority] = useState('Normal');
  const [template, setTemplate] = useState('Custom');
  const [useClass, setUseClass] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [classes, setClasses] = useState([]);

  const REACT_APP_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

  // Fetch recipients based on the selected recipient type
  useEffect(() => {
    const fetchRecipients = async () => {
      try {
        let endpoint = '';

        if (recipientType === 'Student') {
          endpoint = `${REACT_APP_BASE_URL}/Admin/StudentList/${schoolId}`;
        } else if (recipientType === 'Parent') {
          endpoint = `${REACT_APP_BASE_URL}/Admin/ParentList/${schoolId}`;
        } else if (recipientType === 'Accountant') {
          endpoint = `${REACT_APP_BASE_URL}/Admin/Accountants`;
        } else if (recipientType === 'HR') {
          endpoint = `${REACT_APP_BASE_URL}/Admin/HR`;
        }

        const response = await axios.get(endpoint, {
          headers: { 'x-admin-id': senderId },
        });

        if (response.data.students) {
          setRecipients(response.data.students);
        } else if (response.data.parents) {
          setRecipients(response.data.parents);
        } else if (Array.isArray(response.data)) {
          setRecipients(response.data);
        } else {
          setRecipients(response.data.accountants || response.data.hr || []);
        }
      } catch (err) {
        console.error('Error fetching recipients:', err);
        setRecipients([]);
      }
    };

    if (!useClass) {
      fetchRecipients();
    }
  }, [recipientType, useClass, currentUser, REACT_APP_BASE_URL, senderId, schoolId]);

  // Fetch classes for bulk messaging
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        // backend route is /SclassList/:id and returns an array
        const response = await axios.get(
          `${REACT_APP_BASE_URL}/SclassList/${schoolId}`,
          { headers: { 'x-admin-id': senderId } }
        );
        // accept either { classes: [...] } or direct array
        setClasses(response.data.classes || response.data || []);
      } catch (err) {
        console.error('Error fetching classes:', err);
        setClasses([]);
        setMessage(err.response?.data?.message || 'Unable to load classes. Please refresh and try again.');
        setAlertType('error');
        setShowPopup(true);
      }
    };

    if (useClass) {
      fetchClasses();
    }
  }, [useClass, currentUser, REACT_APP_BASE_URL, senderId, schoolId]);

  const handleRecipientToggle = (id) => {
    setSelectedRecipients((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!messageSubject.trim() || !messageBody.trim()) {
      setMessage('Please fill in all required fields');
      setAlertType('error');
      setShowPopup(true);
      return;
    }

    if (!useClass && selectedRecipients.length === 0) {
      setMessage('Please select at least one recipient');
      setAlertType('error');
      setShowPopup(true);
      return;
    }

    if (useClass && !selectedClass) {
      setMessage('Please select a class');
      setAlertType('error');
      setShowPopup(true);
      return;
    }

    setLoader(true);

    try {
      let endpoint = '';
      let payload = {};

      if (useClass) {
        // Bulk message by class only supports students and parents
        if (!['Student', 'Parent'].includes(recipientType)) {
          throw new Error('Bulk messaging is only available for students and parents');
        }

        endpoint =
          recipientType === 'Student'
            ? `${REACT_APP_BASE_URL}/Message/Students/SendBulk`
            : `${REACT_APP_BASE_URL}/Message/Parents/SendBulk`;

        payload = {
          classId: selectedClass,
          messageSubject,
          messageBody,
          messageType,
          priority,
          template,
        };
      } else {
        // Individual messages
        const promises = selectedRecipients.map((recipientId) => {
          const endpointUrl =
            recipientType === 'Student'
              ? `${REACT_APP_BASE_URL}/Message/Student/Send`
              : recipientType === 'Parent'
              ? `${REACT_APP_BASE_URL}/Message/Parent/Send`
              : `${REACT_APP_BASE_URL}/Message/Admin/Send`;

          const data =
            recipientType === 'Student'
              ? {
                  studentId: recipientId,
                  messageSubject,
                  messageBody,
                  messageType,
                  priority,
                  template,
                }
              : recipientType === 'Parent'
              ? {
                  parentId: recipientId,
                  messageSubject,
                  messageBody,
                  messageType,
                  priority,
                  template,
                }
              : {
                  recipientId,
                  recipientType,
                  messageSubject,
                  messageBody,
                  messageType,
                  priority,
                  template,
                };

          return axios.post(endpointUrl, data, {
            headers: { 'x-admin-id': senderId },
          });
        });

        await Promise.all(promises);
        setMessage(
          `Messages sent successfully to ${selectedRecipients.length} ${recipientType}(s)`
        );
        setAlertType('success');
        setShowPopup(true);

        // Reset form
        setTimeout(() => {
          setMessageSubject('');
          setMessageBody('');
          setSelectedRecipients([]);
          navigate('/Admin/messages');
        }, 2000);

        setLoader(false);
        return;
      }

      // For bulk messages
      const response = await axios.post(endpoint, payload, {
        headers: { 'x-admin-id': senderId },
      });

      setMessage(
        `Message sent to ${response.data.data.sentCount} ${recipientType}(s)`
      );
      setAlertType('success');
      setShowPopup(true);

      // Reset form
      setTimeout(() => {
        setMessageSubject('');
        setMessageBody('');
        setSelectedClass('');
        navigate('/Admin/messages');
      }, 2000);
    } catch (err) {
      console.error('Error sending message:', err);
      setMessage(
        err.response?.data?.message || 'Error sending message. Please try again.'
      );
      setAlertType('error');
      setShowPopup(true);
    } finally {
      setLoader(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 'bold' }}>
          Send Message to {recipientType}s
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Recipient Type Selection */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Send To</InputLabel>
                <Select
                  value={recipientType}
                  label="Send To"
                  onChange={(e) => {
                    setRecipientType(e.target.value);
                    setSelectedRecipients([]);
                    setUseClass(false);
                  }}
                >
                  <MenuItem value="Student">Students</MenuItem>
                  <MenuItem value="Parent">Parents</MenuItem>
                  <MenuItem value="Accountant">Accountants</MenuItem>
                  <MenuItem value="HR">HR</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Message Type Selection */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Message Type</InputLabel>
                <Select
                  value={messageType}
                  label="Message Type"
                  onChange={(e) => setMessageType(e.target.value)}
                >
                  <MenuItem value="Email">Email Only</MenuItem>
                  <MenuItem value="SMS">SMS Only</MenuItem>
                  <MenuItem value="Both">Email + SMS</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Message Subject */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Message Subject"
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                placeholder="Enter message subject..."
                required
              />
            </Grid>

            {/* Message Body */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Message Body"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Enter your message here..."
                multiline
                rows={6}
                required
              />
            </Grid>

            {/* Priority */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={priority}
                  label="Priority"
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <MenuItem value="Low">Low</MenuItem>
                  <MenuItem value="Normal">Normal</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                  <MenuItem value="Urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Template */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Template</InputLabel>
                <Select
                  value={template}
                  label="Template"
                  onChange={(e) => setTemplate(e.target.value)}
                >
                  <MenuItem value="Custom">Custom</MenuItem>
                  <MenuItem value="FeeReminder">Fee Reminder</MenuItem>
                  <MenuItem value="Attendance">Attendance</MenuItem>
                  <MenuItem value="Exam">Exam</MenuItem>
                  <MenuItem value="Event">Event</MenuItem>
                  <MenuItem value="Announcement">Announcement</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Class or Individual Selection */}
            {['Student', 'Parent'].includes(recipientType) && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={useClass}
                      onChange={(e) => {
                        setUseClass(e.target.checked);
                        setSelectedRecipients([]);
                        setSelectedClass('');
                      }}
                    />
                  }
                  label="Send to entire class"
                />
              </Grid>
            )}

            {/* Class Selection */}
            {useClass && ['Student', 'Parent'].includes(recipientType) && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Select Class</InputLabel>
                  <Select
                    value={selectedClass}
                    label="Select Class"
                    onChange={(e) => setSelectedClass(e.target.value)}
                  >
                    {classes.map((cls) => (
                      <MenuItem key={cls._id} value={cls._id}>
                        {cls.sclassName || cls.className}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {/* Individual Recipients */}
            {!useClass && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                  Select {recipientType}s
                </Typography>
                <Paper sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
                  <FormGroup>
                    {recipients.length > 0 ? (
                      recipients.map((recipient) => (
                        <FormControlLabel
                          key={recipient._id}
                          control={
                            <Checkbox
                              checked={selectedRecipients.includes(recipient._id)}
                              onChange={() => handleRecipientToggle(recipient._id)}
                            />
                          }
                          label={`${recipient.name} (${recipient.email})`}
                        />
                      ))
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        No {recipientType}s found
                      </Typography>
                    )}
                  </FormGroup>
                </Paper>
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                  {selectedRecipients.length} selected
                </Typography>
              </Grid>
            )}

            {/* Submit Button */}
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={loader}
                sx={{ py: 1.5 }}
              >
                {loader ? <CircularProgress size={24} color="inherit" /> : 'Send Message'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Popup
        message={message}
        setShowPopup={setShowPopup}
        showPopup={showPopup}
      />
    </Container>
  );
};

export default SendMessage;