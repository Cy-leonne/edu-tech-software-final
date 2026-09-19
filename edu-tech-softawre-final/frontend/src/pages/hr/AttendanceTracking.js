
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Grid,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { CheckCircle, Schedule, Cancel } from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const AttendanceTracking = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ presentDays: 0, absentDays: 0, lateDays: 0, overtimeHours: 0 });
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('Present');
  const [checkInTime, setCheckInTime] = useState('09:00');
  const [checkOutTime, setCheckOutTime] = useState('17:00');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const schoolValue = currentUser?.school?._id || currentUser?.school || currentUser?.schoolId;
  const schoolId = schoolValue || currentUser?._id;
  const headers = currentUser?._id ? { 'x-admin-id': currentUser._id } : {};

  const statusOptions = ['Present', 'Absent', 'Late', 'Early Departure', 'Half Day', 'On Leave'];

  const loadEmployees = async () => {
    if (!schoolId) return;
    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`${API_BASE_URL}/Employee/GetAll?school=${schoolId}`, { headers });
      setEmployees(response.data.employees || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load employees');
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async () => {
    if (!schoolId) return;
    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`${API_BASE_URL}/Attendance/GetAll?schoolId=${schoolId}`, { headers });
      const attendance = response.data.attendance || [];
      setRecords(attendance);
      const presentDays = attendance.filter((a) => a.status === 'Present').length;
      const absentDays = attendance.filter((a) => a.status === 'Absent').length;
      const lateDays = attendance.filter((a) => a.status === 'Late').length;
      const overtimeHours = attendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
      setSummary({ presentDays, absentDays, lateDays, overtimeHours });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (schoolId) {
      loadEmployees();
      loadAttendance();
    }
  }, [schoolId]);

  const combineDateTime = (baseDate, time) => {
    if (!baseDate || !time) return null;
    return new Date(`${baseDate}T${time}:00`).toISOString();
  };

  const handleSubmit = async () => {
    if (!selectedEmployee || !date || !status) {
      setError('Employee, date, and status are required.');
      setSuccess('');
      return;
    }

    if (!schoolId) {
      setError('Your account is not linked to a school.');
      setSuccess('');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        schoolId,
        employeeId: selectedEmployee,
        date,
        status,
        checkInTime: combineDateTime(date, checkInTime),
        checkOutTime: combineDateTime(date, checkOutTime),
        remarks,
      };

      await axios.post(`${API_BASE_URL}/Attendance/Mark`, payload, { headers });
      setSuccess('Attendance marked successfully.');
      setSelectedEmployee('');
      setDate('');
      setRemarks('');
      await loadAttendance();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Attendance & Time Tracking</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Mark Staff Attendance</Typography>
        <Stack spacing={2}>
          <TextField
            select
            label="Employee"
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            fullWidth
            disabled={loading || employees.length === 0}
          >
            <MenuItem value="">Select employee</MenuItem>
            {employees.map((employee) => (
              <MenuItem key={employee._id} value={employee._id}>
                {`${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.email || employee.employeeId}
              </MenuItem>
            ))}
          </TextField>
          {!loading && employees.length === 0 && (
            <Alert severity="warning">No employees found for this school.</Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                type="date"
                label="Date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                fullWidth
              >
                {statusOptions.map((option) => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                type="time"
                label="Check In"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                type="time"
                label="Check Out"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Grid>
          </Grid>

          <TextField
            label="Remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />

          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || loading}
          >
            {submitting ? <CircularProgress size={20} color="inherit" /> : 'Submit Attendance'}
          </Button>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CheckCircle sx={{ color: 'green', fontSize: 30 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">Present Days</Typography>
                  <Typography variant="h6">{summary.presentDays}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Cancel sx={{ color: 'red', fontSize: 30 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">Absent Days</Typography>
                  <Typography variant="h6">{summary.absentDays}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Schedule sx={{ color: 'orange', fontSize: 30 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">Late Days</Typography>
                  <Typography variant="h6">{summary.lateDays}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>Overtime Hours</Typography>
                <Typography variant="h6">{summary.overtimeHours}h</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Recent Attendance</Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Employee</TableCell>
                  <TableCell>Clock In</TableCell>
                  <TableCell>Clock Out</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record._id || record.id}>
                    <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                    <TableCell>{record.employeeName || 'Unknown'}</TableCell>
                    <TableCell>{record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</TableCell>
                    <TableCell>{record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</TableCell>
                    <TableCell>
                      <Chip label={record.status} size="small" color={record.status === 'Present' ? 'success' : record.status === 'Absent' ? 'error' : 'warning'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default AttendanceTracking;
