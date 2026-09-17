import React, { useState } from 'react';
import { Box, Typography, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, LinearProgress, Button, Stepper, Step, StepLabel } from '@mui/material';
import { CheckCircle, Schedule } from '@mui/icons-material';

const Onboarding = () => {
  const [tasks] = useState([
    { id: 1, task: 'Submit Required Documents', status: 'Completed', dueDate: '2024-01-05' },
    { id: 2, task: 'IT Equipment Setup', status: 'Completed', dueDate: '2024-01-06' },
    { id: 3, task: 'Orientation Program', status: 'In Progress', dueDate: '2024-01-25' },
    { id: 4, task: 'Department Induction', status: 'Pending', dueDate: '2024-01-30' },
    { id: 5, task: 'System Access Setup', status: 'Pending', dueDate: '2024-02-05' },
  ]);

  const [completion] = useState(40);

  const steps = ['Pre-boarding', 'First Day', 'First Week', 'First Month', 'Settled'];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Onboarding</Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Onboarding Progress</Typography>
        <Stack spacing={2}>
          <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="body2">Overall Completion</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{completion}%</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={completion} sx={{ height: 8, borderRadius: 4 }} />
          </Box>

          <Stepper activeStep={2} sx={{ pt: 2 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Onboarding Checklist</Typography>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Task</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>{task.task}</TableCell>
                  <TableCell>
                    <Chip 
                      label={task.status} 
                      size="small" 
                      color={task.status === 'Completed' ? 'success' : task.status === 'In Progress' ? 'warning' : 'default'} 
                      icon={task.status === 'Completed' ? <CheckCircle /> : undefined}
                    />
                  </TableCell>
                  <TableCell>{task.dueDate}</TableCell>
                  <TableCell>
                    {task.status === 'Pending' && <Button size="small" variant="outlined">Start</Button>}
                    {task.status === 'In Progress' && <Button size="small" variant="outlined">Continue</Button>}
                    {task.status === 'Completed' && <Button size="small" disabled>Done</Button>}
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

export default Onboarding;