import React, { useState } from 'react';
import { Box, Typography, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions } from '@mui/material';
import { Add, Edit, Visibility } from '@mui/icons-material';

const Recruitment = () => {
  const [vacancies, setVacancies] = useState([
    { id: 1, title: 'Senior Developer', department: 'IT', posted: '2024-01-15', applicants: 12, status: 'Open' },
    { id: 2, title: 'HR Manager', department: 'HR', posted: '2024-01-10', applicants: 8, status: 'Open' },
    { id: 3, title: 'Sales Executive', department: 'Sales', posted: '2024-01-01', applicants: 15, status: 'Closed' },
  ]);

  const [candidates] = useState([
    { id: 1, name: 'John Doe', position: 'Senior Developer', status: 'Interview', rating: 4.5 },
    { id: 2, name: 'Jane Smith', position: 'Senior Developer', status: 'Screening', rating: 4.0 },
  ]);

  const [openDialog, setOpenDialog] = useState(false);
  const [positionTitle, setPositionTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [closingDate, setClosingDate] = useState('');

  const handlePostVacancy = () => {
    if (!positionTitle.trim() || !department || !description.trim() || !closingDate) return;

    setVacancies((currentVacancies) => [
      {
        id: Date.now(),
        title: positionTitle.trim(),
        department,
        posted: new Date().toISOString().split('T')[0],
        applicants: 0,
        status: 'Open',
      },
      ...currentVacancies,
    ]);
    setPositionTitle('');
    setDepartment('');
    setDescription('');
    setClosingDate('');
    setOpenDialog(false);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Recruitment</Typography>

      <Stack spacing={3}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Open Vacancies</Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>Post Vacancy</Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>Position</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Posted</TableCell>
                  <TableCell>Applicants</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vacancies.map((vacancy) => (
                  <TableRow key={vacancy.id}>
                    <TableCell>{vacancy.title}</TableCell>
                    <TableCell>{vacancy.department}</TableCell>
                    <TableCell>{vacancy.posted}</TableCell>
                    <TableCell>
                      <Button size="small">{vacancy.applicants} View</Button>
                    </TableCell>
                    <TableCell>
                      <Chip label={vacancy.status} color={vacancy.status === 'Open' ? 'success' : 'default'} size="small" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Top Candidates</Typography>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Position</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Rating</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {candidates.map((candidate) => (
                  <TableRow key={candidate.id}>
                    <TableCell>{candidate.name}</TableCell>
                    <TableCell>{candidate.position}</TableCell>
                    <TableCell><Chip label={candidate.status} size="small" /></TableCell>
                    <TableCell>⭐ {candidate.rating}</TableCell>
                    <TableCell>
                      <Button size="small" startIcon={<Visibility />}>View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Stack>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Post New Vacancy</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField label="Position Title" fullWidth value={positionTitle} onChange={(event) => setPositionTitle(event.target.value)} required />
            <TextField select label="Department" fullWidth value={department} onChange={(event) => setDepartment(event.target.value)} SelectProps={{ native: true }} required>
              <option value="">Select Department</option>
              <option value="it">IT</option>
              <option value="hr">HR</option>
              <option value="sales">Sales</option>
            </TextField>
            <TextField multiline rows={4} label="Description" fullWidth value={description} onChange={(event) => setDescription(event.target.value)} required />
            <TextField label="Closing Date" type="date" value={closingDate} onChange={(event) => setClosingDate(event.target.value)} InputLabelProps={{ shrink: true }} required />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handlePostVacancy} disabled={!positionTitle.trim() || !department || !description.trim() || !closingDate}>Post</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Recruitment;