import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent, Chip, Stack, Button } from '@mui/material';
import { DevicesOther, Inventory } from '@mui/icons-material';

const AssetManagement = () => {
  const [assets] = useState([
    { id: 1, name: 'Laptop - Dell XPS 15', assignee: 'John Doe', status: 'Issued', serial: 'DX15-2024' },
    { id: 2, name: 'Mobile Phone - Samsung', assignee: 'Jane Smith', status: 'Issued', serial: 'SMG-S24' },
    { id: 3, name: 'ID Badge', assignee: 'Adeola Ade', status: 'Returned', serial: 'ID-0032' },
  ]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Asset Management</Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <DevicesOther color="primary" />
            <Typography variant="subtitle1">Track company assets and issue equipment to staff.</Typography>
          </Stack>
          <Button variant="contained">Request Asset</Button>
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        {assets.map((asset) => (
          <Grid item xs={12} md={6} key={asset.id}>
            <Card>
              <CardContent>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">{asset.name}</Typography>
                    <Chip label={asset.status} color={asset.status === 'Issued' ? 'success' : 'default'} size="small" />
                  </Stack>
                  <Typography variant="body2">Assignee: {asset.assignee}</Typography>
                  <Typography variant="body2">Serial: {asset.serial}</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default AssetManagement;