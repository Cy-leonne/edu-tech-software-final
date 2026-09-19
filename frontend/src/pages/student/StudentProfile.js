
import React, { useEffect } from 'react'
import styled from 'styled-components';
import { Card, CardContent, Typography, Grid, Box, Avatar, Container, Paper, Button } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { getUserDetails } from '../../redux/userRelated/userHandle';
import { buildPrintBrandingHtml, printBrandingStyles } from '../../utils/printBranding';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';

const StudentProfile = () => {
  const dispatch = useDispatch();
  const { currentUser, userDetails, response, error } = useSelector((state) => state.user);
  const financeUser = userDetails && !Array.isArray(userDetails) ? userDetails : currentUser;

  useEffect(() => {
    if (currentUser?._id) {
      dispatch(getUserDetails(currentUser._id, 'Student'));
    }
  }, [dispatch, currentUser?._id]);

  if (response) { console.log(response) }
  else if (error) { console.log(error) }

  const sclassName = financeUser.sclassName
  const studentSchool = financeUser.school

  const printFeeStructure = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Student Fee Structure</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
            ${printBrandingStyles}
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
            th { background: #f0f0f0; }
          </style>
        </head>
        <body>
          ${buildPrintBrandingHtml(financeUser, studentSchool)}
          <h2>Student Fee Structure</h2>
          <p><strong>Student:</strong> ${financeUser.name || ''}</p>
          <p><strong>Class:</strong> ${sclassName?.sclassName || ''}</p>
          <table>
            <tr><th>Description</th><th>Amount (KES)</th></tr>
            <tr><td>Total Fees</td><td>${financeUser.totalFees ?? 0}</td></tr>
            <tr><td>Amount Paid</td><td>${financeUser.amountPaid ?? 0}</td></tr>
            <tr><td>Balance / Credit</td><td>${financeUser.balance ?? 0}</td></tr>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <>
      <Container maxWidth="md">
        <StyledPaper elevation={3}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box display="flex" justifyContent="center">
                <Avatar alt="Student Avatar" sx={{ width: 150, height: 150 }}>
                  {String(financeUser.name).charAt(0)}
                </Avatar>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" justifyContent="center">
                <Typography variant="h5" component="h2" textAlign="center">
                  {financeUser.name}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" justifyContent="center">
                <Typography variant="subtitle1" component="p" textAlign="center">
                  Student Roll No: {financeUser.rollNum}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" justifyContent="center">
                <Typography variant="subtitle1" component="p" textAlign="center">
                  Class: {sclassName.sclassName}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" justifyContent="center">
                <Typography variant="subtitle1" component="p" textAlign="center">
                  School: {studentSchool.schoolName}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" justifyContent="center">
                <Typography variant="subtitle1" component="p" textAlign="center">
                  Total Fees: KES {financeUser.totalFees ?? 0}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" justifyContent="center">
                <Typography variant="subtitle1" component="p" textAlign="center">
                  Paid: KES {financeUser.amountPaid ?? 0}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" justifyContent="center">
                <Typography variant="subtitle1" component="p" textAlign="center">
                  Balance: KES {financeUser.balance ?? 0}
                </Typography>
              </Box>
            </Grid>
          </Grid>
          <Box display="flex" justifyContent="center" sx={{ mt: 3 }}>
            <Button variant="contained" startIcon={<PrintOutlinedIcon />} onClick={printFeeStructure}>
              Print Fee Structure
            </Button>
          </Box>
        </StyledPaper>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Personal Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" component="p">
                  <strong>Date of Birth:</strong> January 1, 2000
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" component="p">
                  <strong>Gender:</strong> Male
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" component="p">
                  <strong>Email:</strong> john.doe@example.com
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" component="p">
                  <strong>Phone:</strong> (123) 456-7890
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" component="p">
                  <strong>Address:</strong> 123 Main Street, City, Country
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" component="p">
                  <strong>Emergency Contact:</strong> (987) 654-3210
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Container>
    </>
  )
}

export default StudentProfile

const StyledPaper = styled(Paper)`
  padding: 20px;
  margin-bottom: 20px;
`;
