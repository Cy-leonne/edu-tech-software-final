import React, { useState } from 'react';
import { Box, Typography, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button, Grid, Card, CardContent, LinearProgress } from '@mui/material';
import { School, CheckCircle, Schedule } from '@mui/icons-material';

const LearningDevelopment = () => {
  const [courses] = useState([
    { id: 1, title: 'Leadership Skills', provider: 'Coursera', status: 'In Progress', progress: 65, dueDate: '2024-03-15' },
    { id: 2, title: 'Advanced Excel', provider: 'LinkedIn Learning', status: 'Completed', progress: 100, completedDate: '2024-01-10' },
    { id: 3, title: 'Project Management', provider: 'Udemy', status: 'Not Started', progress: 0, dueDate: '2024-04-30' },
  ]);

  const [certifications] = useState([
    { id: 1, name: 'AWS Solutions Architect', issuer: 'Amazon', expiryDate: '2026-06-15', status: 'Valid' },
    { id: 2, name: 'PMP Certification', issuer: 'PMI', expiryDate: '2025-08-20', status: 'Valid' },
  ]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Learning & Development</Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Assigned Courses</Typography>
        <Stack spacing={2}>
          {courses.map((course) => (
            <Box key={course.id} sx={{ p: 2, border: '1px solid #eee', borderRadius: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="start" sx={{ mb: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{course.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{course.provider}</Typography>
                </Box>
                <Chip 
                  label={course.status} 
                  size="small" 
                  color={course.status === 'Completed' ? 'success' : course.status === 'In Progress' ? 'warning' : 'default'} 
                  icon={course.status === 'Completed' ? <CheckCircle /> : undefined}
                />
              </Stack>
              <LinearProgress variant="determinate" value={course.progress} sx={{ mb: 1 }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption">{course.progress}% Complete</Typography>
                {course.status === 'In Progress' && <Button size="small">Continue</Button>}
              </Stack>
            </Box>
          ))}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Certifications</Typography>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Certificate</TableCell>
                <TableCell>Issuer</TableCell>
                <TableCell>Expiry Date</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {certifications.map((cert) => (
                <TableRow key={cert.id}>
                  <TableCell>{cert.name}</TableCell>
                  <TableCell>{cert.issuer}</TableCell>
                  <TableCell>{cert.expiryDate}</TableCell>
                  <TableCell>
                    <Chip label={cert.status} color="success" size="small" />
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

export default LearningDevelopment;