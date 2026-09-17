import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const buildFinanceSettings = () => ({
  schoolCurrency: 'KES',
  paybillCode: 'SCHOOL-PAYBILL-001',
  paymentTerms: '',
  classFees: [],
  cheques: [],
  supplies: [],
});

const FinanceManagement = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [financeSettings, setFinanceSettings] = useState(buildFinanceSettings());
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payingSupplier, setPayingSupplier] = useState(false);
  const [message, setMessage] = useState('');
  const [chequeForm, setChequeForm] = useState({
    type: 'incoming',
    transactionType: 'Received Cheque',
    chequeNumber: '',
    chequeDate: '',
    bankName: '',
    accountName: '',
    amount: '',
    payeePayer: '',
    purposeDescription: '',
    voucherReferenceNumber: '',
    relatedEntity: '',
    status: 'Pending',
    clearanceDate: '',
    bankAccount: '',
    note: '',
  });
  const [supplyForm, setSupplyForm] = useState({
    supplier: '',
    item: '',
    amount: '',
    paymentMethod: 'Cash',
    mpesaNumber: '',
    bankAccount: '',
    reference: '',
    note: '',
  });

  const schoolId = useMemo(() => currentUser?.school?._id || currentUser?.school || currentUser?.schoolId, [currentUser]);
  const adminId = currentUser?._id;

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      setMessage('Missing school context');
      return;
    }

    const loadFinanceData = async () => {
      try {
        const [settingsResponse, classesResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/Settings/School/${schoolId}/SystemSettings`, { headers: { 'x-admin-id': adminId } }),
          axios.get(`${API_BASE_URL}/SclassList/${schoolId}`, { headers: { 'x-admin-id': adminId } }),
        ]);

        const nextSettings = {
          ...buildFinanceSettings(),
          ...(settingsResponse?.data?.settings?.financeSettings || {}),
        };
        setFinanceSettings(nextSettings);

        const classList = Array.isArray(classesResponse?.data) ? classesResponse.data : [];
        setClasses(classList);
      } catch (error) {
        setMessage(error.response?.data?.message || error.message || 'Unable to load finance data');
      } finally {
        setLoading(false);
      }
    };

    loadFinanceData();
  }, [schoolId, adminId]);

  const handleFieldChange = (field, value) => {
    setFinanceSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleClassFeeChange = (classItem, value) => {
    const classFees = [...(financeSettings.classFees || [])];
    const existingIndex = classFees.findIndex((entry) => entry.classId === classItem._id);
    const nextEntry = { classId: classItem._id, className: classItem.sclassName, feeAmount: Number(value || 0) };

    if (existingIndex >= 0) {
      classFees[existingIndex] = nextEntry;
    } else {
      classFees.push(nextEntry);
    }

    setFinanceSettings((prev) => ({ ...prev, classFees }));
  };

  const handleChequeFormChange = (field, value) => {
    setChequeForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSupplyFormChange = (field, value) => {
    setSupplyForm((prev) => ({ ...prev, [field]: value }));
  };

  const addCheque = () => {
    if (!chequeForm.chequeNumber || !chequeForm.amount) {
      setMessage('Cheque number and amount are required');
      return;
    }

    const nextCheque = {
      ...chequeForm,
      amount: Number(chequeForm.amount),
      date: new Date().toISOString(),
      chequeDate: chequeForm.chequeDate ? new Date(chequeForm.chequeDate).toISOString() : new Date().toISOString(),
      clearanceDate: chequeForm.clearanceDate ? new Date(chequeForm.clearanceDate).toISOString() : null,
      transactionType: chequeForm.transactionType || (chequeForm.type === 'incoming' ? 'Received Cheque' : 'Issued Cheque'),
      payeePayer: chequeForm.payeePayer || chequeForm.payerPayee || '',
      payerPayee: chequeForm.payeePayer || chequeForm.payerPayee || '',
      bank: chequeForm.bankName || '',
    };

    setFinanceSettings((prev) => ({
      ...prev,
      cheques: [...(prev.cheques || []), nextCheque],
    }));
    setChequeForm({
      type: 'incoming',
      transactionType: 'Received Cheque',
      chequeNumber: '',
      chequeDate: '',
      bankName: '',
      accountName: '',
      amount: '',
      payeePayer: '',
      purposeDescription: '',
      voucherReferenceNumber: '',
      relatedEntity: '',
      status: 'Pending',
      clearanceDate: '',
      bankAccount: '',
      note: '',
    });
    setMessage('Cheque entry added locally');
  };

  const addSupply = async () => {
    if (!supplyForm.supplier || !supplyForm.item || !supplyForm.amount) {
      setMessage('Supplier, item, and amount are required');
      return;
    }
    if (supplyForm.paymentMethod === 'Mpesa' && !supplyForm.mpesaNumber.trim()) {
      setMessage('M-Pesa number is required');
      return;
    }
    if (supplyForm.paymentMethod === 'Bank Transfer' && !supplyForm.bankAccount.trim()) {
      setMessage('Bank account number is required');
      return;
    }

    const nextSupply = {
      ...supplyForm,
      amount: Number(supplyForm.amount),
      date: new Date().toISOString(),
      status: 'Paid',
      paidBy: adminId,
    };

    setPayingSupplier(true);
    setMessage('');
    try {
      const response = await axios.post(`${API_BASE_URL}/Settings/School/${schoolId}/SupplierPayment`, nextSupply, {
        headers: { 'x-admin-id': adminId },
      });
      const nextFinanceSettings = {
        ...financeSettings,
        supplies: [...(financeSettings.supplies || []), response.data.payment || nextSupply],
      };
      setFinanceSettings(nextFinanceSettings);
      setSupplyForm({ supplier: '', item: '', amount: '', paymentMethod: 'Cash', mpesaNumber: '', bankAccount: '', reference: '', note: '' });
      setMessage('Supplier payment recorded successfully');
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'Supplier payment failed');
    } finally {
      setPayingSupplier(false);
    }
  };

  const saveFinanceSettings = async () => {
    setSaving(true);
    setMessage('');

    try {
      await axios.put(`${API_BASE_URL}/Settings/School/${schoolId}/SystemSettings`, { financeSettings: { ...financeSettings } }, {
        headers: { 'x-admin-id': adminId },
      });
      setMessage('Finance settings saved successfully');
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'Failed to save finance settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Finance Management</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage cheque movements, supply payments, and per-class fee settings for every student.
      </Typography>

      {message ? <Alert severity={message.includes('success') ? 'success' : 'info'} sx={{ mb: 2 }}>{message}</Alert> : null}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>School Finance Settings</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="School Currency" value={financeSettings.schoolCurrency || ''} onChange={(event) => handleFieldChange('schoolCurrency', event.target.value)} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="PayBill Code" value={financeSettings.paybillCode || ''} onChange={(event) => handleFieldChange('paybillCode', event.target.value)} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="Payment Terms" value={financeSettings.paymentTerms || ''} onChange={(event) => handleFieldChange('paymentTerms', event.target.value)} />
          </Grid>
        </Grid>

        <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>Class Fee Setup</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Set the fee amount for each class. Saving this updates all students in that class.</Typography>
        <Grid container spacing={2}>
          {classes.map((classItem) => (
            <Grid item xs={12} sm={6} md={4} key={classItem._id}>
              <TextField
                fullWidth
                label={classItem.sclassName || 'Class'}
                type="number"
                value={financeSettings.classFees?.find((entry) => entry.classId === classItem._id)?.feeAmount || ''}
                onChange={(event) => handleClassFeeChange(classItem, event.target.value)}
              />
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Cheque Register</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth select label="Type" value={chequeForm.type} onChange={(event) => handleChequeFormChange('type', event.target.value)}>
              <MenuItem value="incoming">Incoming</MenuItem>
              <MenuItem value="outgoing">Outgoing</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="Cheque Number" value={chequeForm.chequeNumber} onChange={(event) => handleChequeFormChange('chequeNumber', event.target.value)} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="Cheque Date" type="date" InputLabelProps={{ shrink: true }} value={chequeForm.chequeDate} onChange={(event) => handleChequeFormChange('chequeDate', event.target.value)} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="Bank Name" value={chequeForm.bankName} onChange={(event) => handleChequeFormChange('bankName', event.target.value)} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="Amount" type="number" value={chequeForm.amount} onChange={(event) => handleChequeFormChange('amount', event.target.value)} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="Account Name" value={chequeForm.accountName} onChange={(event) => handleChequeFormChange('accountName', event.target.value)} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="Payee / Payer" value={chequeForm.payeePayer} onChange={(event) => handleChequeFormChange('payeePayer', event.target.value)} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="Purpose / Description" value={chequeForm.purposeDescription} onChange={(event) => handleChequeFormChange('purposeDescription', event.target.value)} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="Voucher / Reference" value={chequeForm.voucherReferenceNumber} onChange={(event) => handleChequeFormChange('voucherReferenceNumber', event.target.value)} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="Student / Staff / Supplier" value={chequeForm.relatedEntity} onChange={(event) => handleChequeFormChange('relatedEntity', event.target.value)} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="Transaction Type" value={chequeForm.transactionType} onChange={(event) => handleChequeFormChange('transactionType', event.target.value)} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth select label="Status" value={chequeForm.status} onChange={(event) => handleChequeFormChange('status', event.target.value)}>
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Deposited">Deposited</MenuItem>
              <MenuItem value="Cleared">Cleared</MenuItem>
              <MenuItem value="Bounced">Bounced</MenuItem>
              <MenuItem value="Cancelled">Cancelled</MenuItem>
              <MenuItem value="Returned">Returned</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="Clearance Date" type="date" InputLabelProps={{ shrink: true }} value={chequeForm.clearanceDate} onChange={(event) => handleChequeFormChange('clearanceDate', event.target.value)} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="Bank Account" value={chequeForm.bankAccount} onChange={(event) => handleChequeFormChange('bankAccount', event.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Note" value={chequeForm.note} onChange={(event) => handleChequeFormChange('note', event.target.value)} />
          </Grid>
        </Grid>
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button variant="contained" onClick={addCheque}>Add Cheque</Button>
          <Button variant="outlined" onClick={() => setChequeForm({ type: 'incoming', chequeNumber: '', bank: '', amount: '', payerPayee: '', note: '', status: 'Pending' })}>Clear</Button>
        </Stack>

        <Box sx={{ mt: 2 }}>
          {(financeSettings.cheques || []).map((cheque, index) => (
            <Box key={`${cheque.chequeNumber}-${index}`} sx={{ py: 1, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="body2">
                <strong>{cheque.transactionType || (cheque.type === 'incoming' ? 'Received Cheque' : 'Issued Cheque')}</strong> — {cheque.chequeNumber || '-'} — {cheque.bankName || cheque.bank || '-'} — {cheque.amount || 0} — {cheque.status || 'Pending'}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Supply Payments</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="Supplier" value={supplyForm.supplier} onChange={(event) => handleSupplyFormChange('supplier', event.target.value)} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="Item" value={supplyForm.item} onChange={(event) => handleSupplyFormChange('item', event.target.value)} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="Amount" type="number" value={supplyForm.amount} onChange={(event) => handleSupplyFormChange('amount', event.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth select label="Payment Method" value={supplyForm.paymentMethod} onChange={(event) => handleSupplyFormChange('paymentMethod', event.target.value)}>
              <MenuItem value="Cash">Cash</MenuItem>
              <MenuItem value="Cheque">Cheque</MenuItem>
              <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
              <MenuItem value="Mpesa">Mpesa</MenuItem>
            </TextField>
          </Grid>
          {supplyForm.paymentMethod === 'Mpesa' && (
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="M-Pesa Phone Number" value={supplyForm.mpesaNumber} onChange={(event) => handleSupplyFormChange('mpesaNumber', event.target.value)} required />
            </Grid>
          )}
          {supplyForm.paymentMethod === 'Bank Transfer' && (
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Bank Account Number" value={supplyForm.bankAccount} onChange={(event) => handleSupplyFormChange('bankAccount', event.target.value)} required />
            </Grid>
          )}
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="Payment Reference" value={supplyForm.reference} onChange={(event) => handleSupplyFormChange('reference', event.target.value)} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="Note" value={supplyForm.note} onChange={(event) => handleSupplyFormChange('note', event.target.value)} />
          </Grid>
        </Grid>
        <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>Supplier Accounts</Typography>
        {(financeSettings.supplierAccounts || []).length === 0 ? (
          <Typography variant="body2" color="text.secondary">No supplier accounts yet.</Typography>
        ) : (
          (financeSettings.supplierAccounts || []).map((account, index) => (
            <Box key={`${account.supplier}-${index}`} sx={{ py: 1, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="body2">
                <strong>{account.supplier}</strong> — Credited: {Number(account.creditedAmount || 0).toLocaleString()} — Last payment: {account.lastPaymentDate ? new Date(account.lastPaymentDate).toLocaleDateString() : '-'}
              </Typography>
            </Box>
          ))
        )}
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button variant="contained" onClick={addSupply} disabled={payingSupplier}>
            {payingSupplier ? 'Paying...' : 'Pay Supplier'}
          </Button>
          <Button variant="outlined" onClick={() => setSupplyForm({ supplier: '', item: '', amount: '', paymentMethod: 'Cash', mpesaNumber: '', bankAccount: '', reference: '', note: '' })}>Clear</Button>
        </Stack>

        <Box sx={{ mt: 2 }}>
          {(financeSettings.supplies || []).map((supply, index) => (
            <Box key={`${supply.supplier}-${index}`} sx={{ py: 1, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="body2"><strong>{supply.supplier}</strong> — {supply.item} — {supply.amount} — {supply.paymentMethod} — {supply.status || 'Paid'}{supply.reference ? ` — ${supply.reference}` : ''}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      <Button variant="contained" onClick={saveFinanceSettings} disabled={saving}>
        {saving ? 'Saving...' : 'Save Finance Settings'}
      </Button>
    </Box>
  );
};

export default FinanceManagement;