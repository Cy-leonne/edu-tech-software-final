
import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const AccountantHome = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Accountant Dashboard
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Welcome, Finance Officer
        </Typography>
        <Typography sx={{ mb: 1 }}>
          Use the navigation to review student fees, reconcile payments, and generate financial reports.
        </Typography>
        <Typography>
          The Students page lets you view student fee balances and process payments. Payments, Invoices, Receipts, and Reports
          provide finance-specific views of school financial data.
        </Typography>
      </Paper>
    </Box>
  );
};

export default AccountantHome;
