
import React, { useState } from 'react';
import { Box, Typography, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Rating, LinearProgress, Card, CardContent } from '@mui/material';

const PerformanceManagement = () => {
  const [goals] = useState([
    { id: 1, title: 'Complete Project X', progress: 85, dueDate: '2024-03-31', status: 'On Track' },
    { id: 2, title: 'Improve Code Quality', progress: 60, dueDate: '2024-02-28', status: 'On Track' },
    { id: 3, title: 'Team Leadership Training', progress: 40, dueDate: '2024-04-30', status: 'At Risk' },
  ]);

  const [appraisals] = useState([
    { id: 1, period: 'Q4 2023', rating: 4, reviewer: 'Manager Name', status: 'Completed' },
    { id: 2, period: 'Q3 2023', rating: 4.5, reviewer: 'Manager Name', status: 'Completed' },
  ]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Performance Management</Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Current Goals</Typography>
        <Stack spacing={2}>
          {goals.map((goal) => (
            <Box key={goal.id} sx={{ p: 2, border: '1px solid #eee', borderRadius: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="start" sx={{ mb: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{goal.title}</Typography>
                  <Typography variant="caption" color="text.secondary">Due: {goal.dueDate}</Typography>
                </Box>
                <Chip label={goal.status} size="small" color={goal.status === 'On Track' ? 'success' : 'warning'} />
              </Stack>
              <LinearProgress variant="determinate" value={goal.progress} sx={{ mb: 1 }} />
              <Typography variant="caption">{goal.progress}% Complete</Typography>
            </Box>
          ))}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Performance Appraisals</Typography>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Period</TableCell>
                <TableCell>Rating</TableCell>
                <TableCell>Reviewer</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {appraisals.map((appraisal) => (
                <TableRow key={appraisal.id}>
                  <TableCell>{appraisal.period}</TableCell>
                  <TableCell>
                    <Rating value={appraisal.rating} readOnly precision={0.5} />
                  </TableCell>
                  <TableCell>{appraisal.reviewer}</TableCell>
                  <TableCell>
                    <Chip label={appraisal.status} color="success" size="small" />
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

export default PerformanceManagement;
