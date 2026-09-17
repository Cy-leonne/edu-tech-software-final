import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent, Stack, Chip } from '@mui/material';
import { BarChart, Assessment, TrendingUp } from '@mui/icons-material';

const ReportsAnalytics = () => {
  const [metrics] = useState([
    { id: 1, title: 'Employee Turnover', value: '8.5%', trend: 'Down' },
    { id: 2, title: 'Average Time to Hire', value: '21 days', trend: 'Stable' },
    { id: 3, title: 'Leave Utilization', value: '64%', trend: 'Up' },
  ]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Reports & Analytics</Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center">
                <BarChart color="primary" />
                <Typography variant="subtitle1">Workforce metrics and trends.</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center">
                <Assessment color="success" />
                <Typography variant="subtitle1">Compliance and performance reporting.</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center">
                <TrendingUp color="warning" />
                <Typography variant="subtitle1">Talent analytics and leadership insights.</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Key HR Metrics</Typography>
        <Stack spacing={2}>
          {metrics.map((metric) => (
            <Paper key={metric.id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{metric.title}</Typography>
                <Typography variant="caption" color="text.secondary">Current performance overview</Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h6">{metric.value}</Typography>
                <Chip label={metric.trend} size="small" color={metric.trend === 'Up' ? 'success' : metric.trend === 'Down' ? 'error' : 'default'} />
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
};

export default ReportsAnalytics;