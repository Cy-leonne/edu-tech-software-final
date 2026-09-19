
import React, { useState } from 'react';
import { Box, Typography, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions } from '@mui/material';
import { Add, Check, Close } from '@mui/icons-material';

const ManagerSelfService = () => {
  const [requests] = useState([
    { id: 1, employee: 'John Smith', type: 'Leave Request', from: '2024-02-01', to: '2024-02-05', status: 'Pending' },
    { id: 2, employee: 'Jane Doe', type: 'Expense Claim', amount: '₦15,000', date: '2024-01-20', status: 'Pending' },
    { id: 3, employee: 'Mike Johnson', type: 'Leave Request', from: '2024-01-29', to: '2024-01-29', status: 'Pending' },
  ]);

  const [openDialog, setOpenDialog] = useState(false);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Manager Self-Service</Typography>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Pending Approvals</Typography>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Request Type</TableCell>
                <TableCell>Details</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{request.employee}</TableCell>
                  <TableCell>
                    <Chip label={request.type} size="small" />
                  </TableCell>
                  <TableCell>
                    {request.from && `${request.from} to ${request.to}`}
                    {request.amount && `Amount: ${request.amount}`}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" startIcon={<Check />} color="success" variant="outlined">Approve</Button>
                      <Button size="small" startIcon={<Close />} color="error" variant="outlined">Reject</Button>
                    </Stack>
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

export default ManagerSelfService;
