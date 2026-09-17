import React, { useState } from 'react';
import { Box, Typography, Paper, TextField, Grid, Card, CardContent, Stack, Chip } from '@mui/material';
import { Search, Groups } from '@mui/icons-material';

const OrganizationDirectory = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const [people] = useState([
    { id: 1, name: 'John Doe', role: 'HR Manager', department: 'HR', location: 'Nairobi' },
    { id: 2, name: 'Jane Smith', role: 'Finance Analyst', department: 'Finance', location: 'Mombasa' },
    { id: 3, name: 'Mike Johnson', role: 'IT Support', department: 'IT', location: 'Kisumu' },
  ]);

  const filteredPeople = people.filter((person) =>
    person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Organization Directory</Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <Search color="primary" />
          <TextField
            label="Search employees, roles, or departments"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        {filteredPeople.map((person) => (
          <Grid item xs={12} md={6} key={person.id}>
            <Card>
              <CardContent>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">{person.name}</Typography>
                    <Chip label={person.department} size="small" />
                  </Stack>
                  <Typography variant="body2">Role: {person.role}</Typography>
                  <Typography variant="body2">Location: {person.location}</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default OrganizationDirectory;