
import React, { useState } from 'react';
import { Box, Typography, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button } from '@mui/material';
import { ReceiptLong } from '@mui/icons-material';

const ExpenseClaims = () => {
  const [claims] = useState([
    { id: 1, employee: 'John Doe', type: 'Travel', amount: '₦22,500', date: '2024-02-05', status: 'Pending' },
    { id: 2, employee: 'Jane Smith', type: 'Office Supplies', amount: '₦8,400', date: '2024-01-30', status: 'Approved' },
    { id: 3, employee: 'Adeola Ade', type: 'Client Meeting', amount: '₦15,200', date: '2024-01-25', status: 'Rejected' },
  ]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Expense Claims</Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ReceiptLong color="primary" />
            <Typography variant="subtitle1">Manage and approve reimbursement requests.</Typography>
          </Stack>
          <Button variant="contained">Submit New Claim</Button>
        </Stack>

        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {claims.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell>{claim.employee}</TableCell>
                  <TableCell>{claim.type}</TableCell>
                  <TableCell>{claim.amount}</TableCell>
                  <TableCell>{claim.date}</TableCell>
                  <TableCell>
                    <Chip label={claim.status} size="small" color={claim.status === 'Approved' ? 'success' : claim.status === 'Rejected' ? 'error' : 'warning'} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default ExpenseClaims;
