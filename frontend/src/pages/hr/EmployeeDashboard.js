
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Stack, Grid, Card, CardContent, Button, Chip, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { Announcement, Task, AttachMoney, EventNote, Phone, Email } from '@mui/icons-material';

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const [announcements] = useState([
    { id: 1, title: 'HR Policy Update', date: '2024-01-15', content: 'New remote work policy effective from Feb 1st' },
    { id: 2, title: 'Holiday Calendar Released', date: '2024-01-10', content: 'View 2024 holiday schedule and public holidays' },
  ]);

  const [tasks] = useState([
    { id: 1, title: 'Complete 360 Feedback', due: '2024-02-05', priority: 'High' },
    { id: 2, title: 'Update Emergency Contact', due: '2024-02-10', priority: 'Medium' },
    { id: 3, title: 'Compliance Training', due: '2024-02-28', priority: 'High' },
  ]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Welcome to Your Dashboard</Typography>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <AttachMoney color="primary" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">Next Payslip</Typography>
                  <Typography variant="h6">Jan 31, 2024</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <EventNote color="success" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">Leave Balance</Typography>
                  <Typography variant="h6">12 Days</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Task color="warning" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">Pending Tasks</Typography>
                  <Typography variant="h6">3 Items</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Announcement color="error" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">Announcements</Typography>
                  <Typography variant="h6">2 New</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>📢 Recent Announcements</Typography>
            <Stack spacing={2}>
              {announcements.map((ann) => (
                <Box key={ann.id}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{ann.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{ann.date}</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>{ann.content}</Typography>
                  <Divider sx={{ my: 1 }} />
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>✓ Your Pending Tasks</Typography>
            <Stack spacing={1}>
              {tasks.map((task) => (
                <Box key={task.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid #eee' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{task.title}</Typography>
                    <Typography variant="caption" color="text.secondary">Due: {task.due}</Typography>
                  </Box>
                  <Chip label={task.priority} size="small" color={task.priority === 'High' ? 'error' : 'default'} />
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Quick Links</Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Button variant="outlined" startIcon={<AttachMoney />} onClick={() => navigate('/HR/payroll')}>View Payslips</Button>
              <Button variant="outlined" startIcon={<EventNote />} onClick={() => navigate('/HR/leave')}>Apply Leave</Button>
              <Button variant="outlined" startIcon={<Email />} onClick={() => navigate('/HR/communication')}>Contact HR</Button>
              <Button variant="outlined" startIcon={<Phone />} onClick={() => navigate('/HR/documents')}>Download Documents</Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EmployeeDashboard;
