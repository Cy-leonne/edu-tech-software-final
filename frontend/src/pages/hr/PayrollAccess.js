
import React, { useState } from 'react';
import { Box, Typography, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button, Grid, Card, CardContent } from '@mui/material';
import { Download, Visibility } from '@mui/icons-material';

const PayrollAccess = () => {
  const [payslips] = useState([
    { id: 1, month: 'January 2024', amount: '₦450,000', date: '2024-01-31', status: 'Paid' },
    { id: 2, month: 'December 2023', amount: '₦450,000', date: '2023-12-31', status: 'Paid' },
    { id: 3, month: 'November 2023', amount: '₦450,000', date: '2023-11-30', status: 'Paid' },
  ]);

  const [currentPayroll] = useState({
    grossSalary: 450000,
    deductions: 62500,
    netSalary: 387500,
    nextPayDate: '2024-02-29',
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Payroll & Salary</Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Gross Salary</Typography>
              <Typography variant="h6">₦{currentPayroll.grossSalary.toLocaleString()}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Deductions</Typography>
              <Typography variant="h6">₦{currentPayroll.deductions.toLocaleString()}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Net Salary</Typography>
              <Typography variant="h6" sx={{ color: 'green' }}>₦{currentPayroll.netSalary.toLocaleString()}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Next Pay Date</Typography>
              <Typography variant="h6">{currentPayroll.nextPayDate}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Payslips</Typography>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Month</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payslips.map((slip) => (
                <TableRow key={slip.id}>
                  <TableCell>{slip.month}</TableCell>
                  <TableCell>₦{slip.amount}</TableCell>
                  <TableCell>{slip.date}</TableCell>
                  <TableCell><Chip label={slip.status} color="success" size="small" /></TableCell>
                  <TableCell>
                    <Button size="small" startIcon={<Download />}>Download</Button>
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

export default PayrollAccess;
