
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  Button,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import TableTemplate from '../../components/TableTemplate';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const AccountantStudents = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchType, setSearchType] = useState('student');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [feeOpen, setFeeOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [newTotalFees, setNewTotalFees] = useState('');
  const [feeError, setFeeError] = useState('');
  const [feeLoading, setFeeLoading] = useState(false);

  const schoolId = currentUser?.school?._id || currentUser?.school || currentUser?.schoolId;
  const adminId = currentUser?._id;

  const headers = {
    'Content-Type': 'application/json',
    'x-admin-id': adminId,
  };

  const fetchStudents = async () => {
    if (!schoolId) {
      setLoading(false);
      setError('Missing school context');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await axios.get(`${API_BASE_URL}/Students/${schoolId}`, { headers });
      const data = res.data;
      if (Array.isArray(data)) {
        setStudents(data);
      } else if (data.message) {
        setStudents([]);
      } else {
        setStudents([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!schoolId) return setError('Missing school context');
    if (!searchQuery || searchQuery.trim().length === 0) return setError('Enter search query');
    setLoading(true);
    setError('');
    setSearchResults(null);
    try {
      if (searchType === 'student') {
        const res = await axios.get(`${API_BASE_URL}/Student/Search/${schoolId}?query=${encodeURIComponent(searchQuery)}`, { headers });
        setSearchResults({ type: 'student', data: res.data.results || [] });
      } else if (searchType === 'teacher') {
        const res = await axios.get(`${API_BASE_URL}/Teacher/Search/${schoolId}?query=${encodeURIComponent(searchQuery)}`, { headers });
        setSearchResults({ type: 'teacher', data: res.data.results || [] });
      } else if (searchType === 'assignment') {
        const res = await axios.get(`${API_BASE_URL}/Assignments/Search/${schoolId}?query=${encodeURIComponent(searchQuery)}`, { headers });
        setSearchResults({ type: 'assignment', data: res.data.results || [] });
      } else if (searchType === 'cheque') {
        const res = await axios.get(`${API_BASE_URL}/Student/SearchCheque/${schoolId}?chequeNumber=${encodeURIComponent(searchQuery)}`, { headers });
        setSearchResults({ type: 'cheque', data: res.data.results || [] });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [schoolId, adminId]);

  const openDetailsDialog = (student) => {
    setSelectedStudent(student);
    setDetailsOpen(true);
  };

  const closeDetailsDialog = () => {
    setDetailsOpen(false);
    setSelectedStudent(null);
  };

  const openPayDialog = (student) => {
    setSelectedStudent(student);
    setPaymentAmount('');
    setPaymentMethod('Cash');
    setPaymentReference('');
    setChequeNumber('');
    setPaymentNote('');
    setPaymentError('');
    setPayOpen(true);
  };

  const closePayDialog = () => {
    setPayOpen(false);
    setSelectedStudent(null);
    setPaymentAmount('');
    setPaymentMethod('Cash');
    setPaymentReference('');
    setChequeNumber('');
    setPaymentNote('');
    setPaymentError('');
  };

  const openFeeDialog = (student) => {
    setSelectedStudent(student);
    setNewTotalFees(student.totalFees != null ? String(student.totalFees) : '');
    setFeeError('');
    setFeeOpen(true);
  };

  const closeFeeDialog = () => {
    setFeeOpen(false);
    setSelectedStudent(null);
    setNewTotalFees('');
    setFeeError('');
  };

  const handlePaymentSubmit = async () => {
    if (!selectedStudent) return;
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      setPaymentError('Enter a valid payment amount greater than zero');
      return;
    }

    if (paymentMethod === 'Cheque' && !chequeNumber.trim()) {
      setPaymentError('Enter the cheque number');
      return;
    }

    if ((paymentMethod === 'Bank Transfer' || paymentMethod === 'Lipa Na Mpesa') && !paymentReference.trim()) {
      setPaymentError('Enter a reference or transaction number');
      return;
    }

    setPaymentLoading(true);
    setPaymentError('');

    try {
      await axios.put(
        `${API_BASE_URL}/StudentPayment/${selectedStudent._id || selectedStudent.id}`,
        {
          amount,
          paymentMethod,
          paymentReference: paymentReference.trim(),
          chequeNumber: chequeNumber.trim(),
          paymentNote: paymentNote.trim(),
          transactionId: paymentMethod === 'Cash' ? '' : paymentReference.trim(),
          reference: paymentMethod === 'Cash' ? '' : paymentReference.trim(),
        },
        { headers }
      );
      closePayDialog();
      await fetchStudents();
    } catch (err) {
      setPaymentError(err.response?.data?.message || err.message || 'Payment submission failed');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleFeeUpdateSubmit = async () => {
    if (!selectedStudent) return;
    const totalFees = Number(newTotalFees);
    if (isNaN(totalFees) || totalFees < 0) {
      setFeeError('Enter a valid total fee amount');
      return;
    }

    setFeeLoading(true);
    setFeeError('');

    try {
      await axios.put(
        `${API_BASE_URL}/Student/${selectedStudent._id || selectedStudent.id}`,
        { totalFees },
        { headers }
      );
      closeFeeDialog();
      await fetchStudents();
    } catch (err) {
      setFeeError(err.response?.data?.message || err.message || 'Fee update failed');
    } finally {
      setFeeLoading(false);
    }
  };

  const studentColumns = [
    { id: 'name', label: 'Name', minWidth: 180 },
    { id: 'admissionNo', label: 'Admission No', minWidth: 120 },
    { id: 'className', label: 'Class', minWidth: 120 },
    { id: 'totalFees', label: 'Total Fees', minWidth: 120 },
    { id: 'amountPaid', label: 'Paid', minWidth: 120 },
    { id: 'balance', label: 'Balance', minWidth: 120 },
    { id: 'paymentStatus', label: 'Status', minWidth: 120 },
  ];

  const studentRows = Array.isArray(students)
    ? students.map((student) => ({
        id: student._id,
        name: student.name || student.fullName || 'Unknown',
        admissionNo: student.admissionNo || 'N/A',
        className: student.sclassName?.sclassName || 'N/A',
        totalFees: student.totalFees ?? 'N/A',
        amountPaid: student.amountPaid ?? 'N/A',
        balance: student.balance ?? 'N/A',
        paymentStatus: student.paymentStatus || 'Pending',
        raw: student,
      }))
    : [];

  const StudentActions = ({ row }) => (
    <Stack direction="row" spacing={1} justifyContent="center">
      <Button variant="outlined" size="small" onClick={() => openDetailsDialog(row.raw)}>
        View
      </Button>
      <Button variant="contained" size="small" onClick={() => openPayDialog(row.raw)}>
        Pay Fee
      </Button>
      <Button variant="outlined" size="small" onClick={() => openFeeDialog(row.raw)}>
        Update Fee
      </Button>
    </Stack>
  );

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Student Fee Management
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography sx={{ mb: 1 }}>Student fee overview</Typography>
        <Typography>Total students: {studentRows.length}</Typography>
        <Typography>
          Use the actions to view student details and process fee payments for the selected student.
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }} alignItems="center">
          <Select value={searchType} onChange={(e) => setSearchType(e.target.value)} size="small">
            <MenuItem value="student">Student</MenuItem>
            <MenuItem value="teacher">Teacher</MenuItem>
            <MenuItem value="assignment">Assignment</MenuItem>
            <MenuItem value="cheque">Cheque number</MenuItem>
          </Select>
          <TextField size="small" placeholder={searchType === 'cheque' ? 'Search by cheque number' : 'Search by email, admission number, or title'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          <Button variant="contained" onClick={handleSearch}>Search</Button>
        </Stack>
      </Paper>

      {studentRows.length === 0 ? (
        <Paper sx={{ p: 2 }}>
          <Typography>No student fee records found.</Typography>
        </Paper>
      ) : (
        <Paper sx={{ p: 2 }}>
          <TableTemplate columns={studentColumns} rows={studentRows} buttonHaver={StudentActions} />
        </Paper>
      )}

      {searchResults && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6">Search Results ({searchResults.type})</Typography>
          {searchResults.data.length === 0 ? (
            <Typography>No results found</Typography>
          ) : (
            <Box sx={{ mt: 1 }}>
              {searchResults.type === 'student' && searchResults.data.map(s => (
                <Paper key={s._id} sx={{ p: 1, mb: 1 }}>
                  <Typography>{s.name} — {s.admissionNo} — {s.parentEmail || s.email}</Typography>
                </Paper>
              ))}
              {searchResults.type === 'teacher' && searchResults.data.map(t => (
                <Paper key={t._id} sx={{ p: 1, mb: 1 }}>
                  <Typography>{t.name} — {t.email}</Typography>
                </Paper>
              ))}
              {searchResults.type === 'assignment' && searchResults.data.map(a => (
                <Paper key={a._id} sx={{ p: 1, mb: 1 }}>
                  <Typography>{a.title} — {a.teacher?.name || 'N/A'}</Typography>
                </Paper>
              ))}
              {searchResults.type === 'cheque' && searchResults.data.map((payment) => (
                <Paper key={`${payment.studentId}-${payment.receiptNumber}`} sx={{ p: 1, mb: 1 }}>
                  <Typography>{payment.studentName} — Admission: {payment.admissionNo || 'N/A'} — Class: {payment.className || 'N/A'}</Typography>
                  <Typography variant="body2">Cheque: {payment.chequeNumber} — Amount: KES {payment.amount} — Receipt: {payment.receiptNumber || 'N/A'} — Status: {payment.status || 'N/A'}</Typography>
                </Paper>
              ))}
            </Box>
          )}
        </Paper>
      )}

      <Dialog open={detailsOpen} onClose={closeDetailsDialog} fullWidth maxWidth="sm">
        <DialogTitle>Student Details</DialogTitle>
        <DialogContent>
          {selectedStudent ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography><strong>Name:</strong> {selectedStudent.name}</Typography>
              <Typography><strong>Admission No:</strong> {selectedStudent.admissionNo || 'N/A'}</Typography>
              <Typography><strong>Class:</strong> {selectedStudent.sclassName?.sclassName || 'N/A'}</Typography>
              <Typography><strong>Total Fees:</strong> {selectedStudent.totalFees ?? 'N/A'}</Typography>
              <Typography><strong>Amount Paid:</strong> {selectedStudent.amountPaid ?? 'N/A'}</Typography>
              <Typography><strong>Balance:</strong> {selectedStudent.balance ?? 'N/A'}</Typography>
              <Typography><strong>Payment Status:</strong> {selectedStudent.paymentStatus || 'Pending'}</Typography>
              <Typography><strong>Phone:</strong> {selectedStudent.parentPhone || selectedStudent.phone || 'N/A'}</Typography>
              <Typography><strong>Email:</strong> {selectedStudent.parentEmail || selectedStudent.email || 'N/A'}</Typography>
            </Box>
          ) : (
            <Typography>No student selected.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetailsDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={payOpen} onClose={closePayDialog} fullWidth maxWidth="sm">
        <DialogTitle>Process Fee Payment</DialogTitle>
        <DialogContent>
          {selectedStudent && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Typography>
                Recording payment for <strong>{selectedStudent.name}</strong>.
              </Typography>
              <Typography>
                Current balance: <strong>{selectedStudent.balance ?? 'N/A'}</strong>
              </Typography>
              <TextField
                label="Payment Amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                fullWidth
              />
              <TextField
                select
                label="Payment Method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                fullWidth
              >
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="Lipa Na Mpesa">Lipa Na Mpesa</MenuItem>
                <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                <MenuItem value="Cheque">Cheque</MenuItem>
              </TextField>
              {paymentMethod === 'Cheque' ? (
                <TextField
                  label="Cheque Number"
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                  fullWidth
                  required
                />
              ) : (paymentMethod === 'Bank Transfer' || paymentMethod === 'Lipa Na Mpesa') ? (
                <TextField
                  label={paymentMethod === 'Lipa Na Mpesa' ? 'Mpesa Reference / Transaction Code' : 'Bank Reference / Transaction Number'}
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  fullWidth
                  required
                />
              ) : null}
              <TextField
                label="Additional Information"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                fullWidth
                multiline
                minRows={2}
              />
              {paymentError && <Alert severity="error">{paymentError}</Alert>}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closePayDialog} disabled={paymentLoading}>Cancel</Button>
          <Button onClick={handlePaymentSubmit} disabled={paymentLoading} variant="contained">
            {paymentLoading ? 'Processing...' : 'Submit Payment'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={feeOpen} onClose={closeFeeDialog} fullWidth maxWidth="sm">
        <DialogTitle>Update Student Fee</DialogTitle>
        <DialogContent>
          {selectedStudent && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Typography>
                Update fee for <strong>{selectedStudent.name}</strong>.
              </Typography>
              <Typography>
                Current total fees: <strong>{selectedStudent.totalFees ?? '0'}</strong>
              </Typography>
              <TextField
                label="New Total Fees"
                type="number"
                value={newTotalFees}
                onChange={(e) => setNewTotalFees(e.target.value)}
                fullWidth
              />
              {feeError && <Alert severity="error">{feeError}</Alert>}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeFeeDialog} disabled={feeLoading}>Cancel</Button>
          <Button onClick={handleFeeUpdateSubmit} disabled={feeLoading} variant="contained">
            {feeLoading ? 'Saving...' : 'Save Fee'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccountantStudents;
