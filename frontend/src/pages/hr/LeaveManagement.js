import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Alert,
  CircularProgress,
  MenuItem,
} from '@mui/material';
import { Add } from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const LeaveManagement = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [leaves, setLeaves] = useState([]);
  const [balances] = useState({
    annual: 12,
    casual: 5,
    sick: 10,
    maternity: 90,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [leaveType, setLeaveType] = useState('Annual Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [workingDaysOnly, setWorkingDaysOnly] = useState(true);
  const [formError, setFormError] = useState('');

  const schoolId = currentUser?.school?._id || currentUser?.school || currentUser?.schoolId;
  const headers = {
    'Content-Type': 'application/json',
    'x-admin-id': currentUser?._id,
  };

  const statusChipColor = (status) => {
    switch (status) {
      case 'Approved':
        return 'success';
      case 'Rejected':
        return 'error';
      case 'Cancelled':
        return 'default';
      default:
        return 'warning';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const fetchLeaves = async () => {
    if (!schoolId) return;
    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`${API_BASE_URL}/Leave/GetAll`, {
        params: { schoolId },
        headers,
      });
      setLeaves(response.data.leaves || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (!schoolId) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/Employee/GetAll?school=${schoolId}`, { headers });
      setEmployees(response.data.employees || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load employees');
    }
  };

  const handleApplyLeave = async () => {
    if (!schoolId || !selectedEmployee || !startDate || !endDate || !reason) {
      setFormError('Please select an employee and complete the leave type, dates, and reason before submitting.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setFormError('The start date cannot be later than the end date.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setFormError('');

    try {
      await axios.post(
        `${API_BASE_URL}/Leave/Apply`,
        {
          schoolId,
          employeeId: selectedEmployee,
          leaveType,
          startDate,
          endDate,
          reason,
          workingDaysOnly,
        },
        { headers }
      );

      setSuccess('Leave request submitted successfully.');
      setOpenDialog(false);
      setLeaveType('Annual Leave');
      setSelectedEmployee('');
      setStartDate('');
      setEndDate('');
      setReason('');
      setWorkingDaysOnly(true);
      await fetchLeaves();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (leaveId) => {
    if (!leaveId) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.put(
        `${API_BASE_URL}/Leave/${leaveId}/Approve`,
        {
          status: 'Approved',
          approvedBy: currentUser?._id,
        },
        { headers }
      );
      setSuccess('Leave request approved successfully.');
      await fetchLeaves();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve leave request');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = (leave) => {
    setSelectedLeave(leave);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const confirmReject = async () => {
    if (!selectedLeave) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.put(
        `${API_BASE_URL}/Leave/${selectedLeave._id}/Approve`,
        {
          status: 'Rejected',
          approvedBy: currentUser?._id,
          rejectionReason: rejectionReason || 'Rejected by HR',
        },
        { headers }
      );
      setSuccess('Leave request rejected successfully.');
      setRejectDialogOpen(false);
      setSelectedLeave(null);
      setRejectionReason('');
      await fetchLeaves();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject leave request');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?._id) {
      fetchLeaves();
      fetchEmployees();
    }
  }, [currentUser?._id, schoolId]);

  const summary = {
    pending: leaves.filter((leave) => leave.status === 'Pending').length,
    approved: leaves.filter((leave) => leave.status === 'Approved').length,
    rejected: leaves.filter((leave) => leave.status === 'Rejected').length,
    cancelled: leaves.filter((leave) => leave.status === 'Cancelled').length,
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Leave Management</Typography>

      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack spacing={3}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Leave Summary</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
            <Paper sx={{ flex: 1, minWidth: 150, p: 2, bgcolor: '#e3f2fd' }}>
              <Typography variant="body2" color="text.secondary">Pending Requests</Typography>
              <Typography variant="h5">{summary.pending}</Typography>
            </Paper>
            <Paper sx={{ flex: 1, minWidth: 150, p: 2, bgcolor: '#e8f5e9' }}>
              <Typography variant="body2" color="text.secondary">Approved</Typography>
              <Typography variant="h5">{summary.approved}</Typography>
            </Paper>
            <Paper sx={{ flex: 1, minWidth: 150, p: 2, bgcolor: '#ffebee' }}>
              <Typography variant="body2" color="text.secondary">Rejected</Typography>
              <Typography variant="h5">{summary.rejected}</Typography>
            </Paper>
            <Paper sx={{ flex: 1, minWidth: 150, p: 2, bgcolor: '#f3e5f5' }}>
              <Typography variant="body2" color="text.secondary">Cancelled</Typography>
              <Typography variant="h5">{summary.cancelled}</Typography>
            </Paper>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6">Leave Requests</Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>
              Apply Leave
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Leave Type</TableCell>
                    <TableCell>From</TableCell>
                    <TableCell>To</TableCell>
                    <TableCell>Days</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaves.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No leave requests found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    leaves.map((leave) => (
                      <TableRow key={leave._id} hover>
                        <TableCell>{leave.employeeName || leave.employeeId?.firstName || 'Unknown'}</TableCell>
                        <TableCell>{leave.department || '—'}</TableCell>
                        <TableCell>{leave.leaveType}</TableCell>
                        <TableCell>{formatDate(leave.startDate)}</TableCell>
                        <TableCell>{formatDate(leave.endDate)}</TableCell>
                        <TableCell>{leave.numberOfDays || '—'}</TableCell>
                        <TableCell>
                          <Chip label={leave.status} color={statusChipColor(leave.status)} size="small" />
                        </TableCell>
                        <TableCell>
                          {leave.status === 'Pending' ? (
                            <Stack direction="row" spacing={1}>
                              <Button size="small" variant="contained" color="success" onClick={() => handleApprove(leave._id)}>
                                Approve
                              </Button>
                              <Button size="small" variant="outlined" color="error" onClick={() => handleReject(leave)}>
                                Reject
                              </Button>
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              {leave.status}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Leave Balance</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
            {Object.entries(balances).map(([type, days]) => (
              <Box key={type} sx={{ flex: 1, minWidth: 150, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Typography>
                <Typography variant="h6">{days} Days</Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      </Stack>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Apply for Leave</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              select
              label="Employee"
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              fullWidth
            >
              {employees.length === 0 ? (
                <MenuItem value="">No employees found</MenuItem>
              ) : (
                employees.map((employee) => (
                  <MenuItem key={employee._id} value={employee._id}>
                    {`${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.email || employee.employeeId}
                  </MenuItem>
                ))
              )}
            </TextField>
            <TextField
              select
              label="Leave Type"
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              SelectProps={{ native: true }}
              fullWidth
            >
              <option value="Annual Leave">Annual Leave</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Maternity Leave">Maternity Leave</option>
              <option value="Paternity Leave">Paternity Leave</option>
              <option value="Compassionate Leave">Compassionate Leave</option>
              <option value="Study Leave">Study Leave</option>
              <option value="Unpaid Leave">Unpaid Leave</option>
              <option value="Other">Other</option>
            </TextField>
            <TextField
              type="date"
              label="From Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              type="date"
              label="To Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              multiline
              rows={3}
              label="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              fullWidth
            />
            <TextField
              select
              label="Working Days Only"
              value={workingDaysOnly ? 'yes' : 'no'}
              onChange={(e) => setWorkingDaysOnly(e.target.value === 'yes')}
              SelectProps={{ native: true }}
              fullWidth
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleApplyLeave}>
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Leave Request</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              multiline
              rows={4}
              label="Rejection Reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmReject}>
            Reject Request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeaveManagement;