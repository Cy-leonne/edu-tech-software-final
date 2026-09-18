
import React, { useState } from 'react';
import { Box, Typography, Paper, Stack, TextField, Button, Grid, Card, CardContent, Alert } from '@mui/material';
import { Edit, Save } from '@mui/icons-material';

const EmployeeSelfService = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@company.com',
    phone: '+234 123 456 7890',
    address: '123 Main Street',
    emergencyContact: 'Jane Doe',
    emergencyPhone: '+234 987 654 3210',
    bankName: 'First Bank',
    accountNumber: '1234567890',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    setIsEditing(false);
    alert('Information updated successfully!');
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Employee Self-Service</Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Update your personal information, bank details, and emergency contacts
      </Alert>

      <Paper sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h6">Personal Information</Typography>
          <Button 
            variant={isEditing ? 'contained' : 'outlined'} 
            startIcon={isEditing ? <Save /> : <Edit />}
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          >
            {isEditing ? 'Save Changes' : 'Edit'}
          </Button>
        </Stack>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField 
              fullWidth 
              label="First Name" 
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField 
              fullWidth 
              label="Last Name" 
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField 
              fullWidth 
              label="Email" 
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField 
              fullWidth 
              label="Phone" 
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField 
              fullWidth 
              label="Address" 
              name="address"
              value={formData.address}
              onChange={handleChange}
              disabled={!isEditing}
              multiline
              rows={2}
            />
          </Grid>
        </Grid>

        <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Emergency Contact</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField 
              fullWidth 
              label="Name" 
              name="emergencyContact"
              value={formData.emergencyContact}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField 
              fullWidth 
              label="Phone" 
              name="emergencyPhone"
              value={formData.emergencyPhone}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </Grid>
        </Grid>

        <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Bank Details</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField 
              fullWidth 
              label="Bank Name" 
              name="bankName"
              value={formData.bankName}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField 
              fullWidth 
              label="Account Number" 
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default EmployeeSelfService;
