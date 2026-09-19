
import React, { useState } from 'react';
import { Box, Typography, Paper, Stack, Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from '@mui/material';
import { SupportAgent, Add } from '@mui/icons-material';

const SupportDesk = () => {
  const [tickets] = useState([
    { id: 1, subject: 'Payroll discrepancy', submittedBy: 'John Doe', date: '2024-02-03', status: 'Open' },
    { id: 2, subject: 'Benefits enrollment issue', submittedBy: 'Jane Smith', date: '2024-01-28', status: 'In Progress' },
    { id: 3, subject: 'Leave balance query', submittedBy: 'Adeola Ade', date: '2024-01-22', status: 'Resolved' },
  ]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Help Desk / HR Support</Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <SupportAgent color="primary" />
            <Typography variant="subtitle1">Submit and track HR support requests.</Typography>
          </Stack>
          <Button variant="contained" startIcon={<Add />}>Create Ticket</Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Support Tickets</Typography>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Subject</TableCell>
                <TableCell>Submitted By</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>{ticket.subject}</TableCell>
                  <TableCell>{ticket.submittedBy}</TableCell>
                  <TableCell>{ticket.date}</TableCell>
                  <TableCell>
                    <Chip label={ticket.status} size="small" color={ticket.status === 'Resolved' ? 'success' : ticket.status === 'Open' ? 'warning' : 'info'} />
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

export default SupportDesk;
