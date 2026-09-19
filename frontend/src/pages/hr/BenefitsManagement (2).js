
import React, { useState } from 'react';
import { Box, Typography, Paper, Stack, Grid, Card, CardContent, Button, List, ListItem, ListItemIcon, ListItemText, Chip } from '@mui/material';
import { HealthAndSafety, Favorite, LocalHospital, DirectionsCar, Home } from '@mui/icons-material';

const BenefitsManagement = () => {
  const [benefits] = useState([
    { id: 1, name: 'Health Insurance', provider: 'XYZ Health Plus', status: 'Active', coverage: 'Self + 2 dependents' },
    { id: 2, name: 'Life Insurance', provider: 'InsureCorp', status: 'Active', amount: '₦1,000,000' },
    { id: 3, name: 'Pension Plan', provider: 'PensionHub', status: 'Active', contribution: '8% + 8%' },
  ]);

  const [enrollments] = useState({
    healthInsurance: 'Enrolled',
    lifeInsurance: 'Enrolled',
    penaltionPlan: 'Enrolled',
    formalEducation: 'Not Enrolled',
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Benefits Management</Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center">
                <LocalHospital sx={{ color: 'primary.main' }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">Health Insurance</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Active</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center">
                <Favorite sx={{ color: 'error.main' }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">Life Insurance</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Active</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center">
                <Home sx={{ color: 'warning.main' }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">Pension Plan</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Active</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Active Benefits</Typography>
        <Stack spacing={2}>
          {benefits.map((benefit) => (
            <Box key={benefit.id} sx={{ p: 2, border: '1px solid #eee', borderRadius: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="start">
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{benefit.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{benefit.provider}</Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>{benefit.coverage || benefit.amount || benefit.contribution}</Typography>
                </Box>
                <Chip label={benefit.status} color="success" size="small" />
              </Stack>
            </Box>
          ))}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Benefits Enrollment</Typography>
        <Stack spacing={1}>
          {Object.entries(enrollments).map(([benefit, status]) => (
            <Box key={benefit} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid #eee' }}>
              <Typography variant="body2">{benefit.replace(/([A-Z])/g, ' $1').trim()}</Typography>
              <Chip label={status} size="small" color={status === 'Enrolled' ? 'success' : 'default'} />
            </Box>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
};

export default BenefitsManagement;
