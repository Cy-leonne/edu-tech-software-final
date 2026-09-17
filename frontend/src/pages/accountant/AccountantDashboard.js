import React from 'react';
import { Box, Typography, Paper, Button, Stack } from '@mui/material';
import { Link, Routes, Route, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { authLogout } from '../../redux/userRelated/userSlice';
import Payments from './Payments';
import Invoices from './Invoices';
import Receipts from './Receipts';
import Reports from './Reports';
import AccountantPayroll from './AccountantPayroll';
import AccountantHome from './AccountantHome';
import AccountantStudents from './AccountantStudents';
import FinanceManagement from './FinanceManagement';
import FinanceReport from './FinanceReport';
import HRAccountantCommunication from '../hr/HRAccountantCommunication';
import DataExportButton from '../../components/DataExportButton';

const AccountantDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(authLogout());
    navigate('/');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Accountant Portal</Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography sx={{ mb: 1 }}>Welcome to the Accountant / Finance Officer portal.</Typography>
        <Typography sx={{ mb: 2 }}>Use the navigation to access student fees, payments, invoices, receipts, and reports.</Typography>

        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Button component={Link} to="/Accountant" variant="contained">Home</Button>
          <Button component={Link} to="/Accountant/students" variant="outlined">Students</Button>
          <Button component={Link} to="/Accountant/payments" variant="outlined">Payments</Button>
          <Button component={Link} to="/Accountant/finance" variant="outlined">Finance</Button>
          <Button component={Link} to="/Accountant/finance-report" variant="outlined">Finance Report</Button>
          <Button component={Link} to="/Accountant/invoices" variant="outlined">Invoices</Button>
          <Button component={Link} to="/Accountant/receipts" variant="outlined">Receipts</Button>
          <Button component={Link} to="/Accountant/payroll" variant="outlined">Payroll</Button>
          <Button component={Link} to="/Accountant/communication" variant="outlined">Communication</Button>
          <Button component={Link} to="/Accountant/reports" variant="outlined">Reports</Button>
          <DataExportButton endpoint="/Exports/AccountantData" filename="accounting-data.csv" label="Download Finance Data" />
          <Button variant="contained" color="error" onClick={handleLogout}>Logout</Button>
        </Stack>
      </Paper>

      <Routes>
        <Route index element={<AccountantHome />} />
        <Route path="students" element={<AccountantStudents />} />
        <Route path="payments" element={<Payments />} />
        <Route path="finance" element={<FinanceManagement />} />
        <Route path="finance-report" element={<FinanceReport />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="receipts" element={<Receipts />} />
        <Route path="payroll" element={<AccountantPayroll />} />
        <Route path="communication" element={<HRAccountantCommunication />} />
        <Route path="reports" element={<Reports />} />
      </Routes>
    </Box>
  );
};

export default AccountantDashboard;