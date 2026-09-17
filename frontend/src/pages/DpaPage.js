import React from 'react';
import { Box, Typography } from '@mui/material';

const DpaPage = () => (
  <Box sx={{ maxWidth: 900, mx: 'auto', p: 4 }}>
    <Typography variant="overline" color="primary">EDUTECHH ERP</Typography>
    <Typography variant="h3" component="h1" gutterBottom>Data Processing Agreement</Typography>
    <Typography paragraph>Edutechh ERP processes school, student, parent and employee information only to provide, secure and support the School Management System.</Typography>
    <Typography variant="h5">Data protection responsibilities</Typography>
    <Typography paragraph>The School remains responsible for determining the purposes and lawful basis of processing. Edutechh ERP acts on the School&apos;s documented instructions and applies appropriate technical and organisational safeguards.</Typography>
    <Typography variant="h5">Security and confidentiality</Typography>
    <Typography paragraph>Access is limited by role and permission. Users must protect credentials, use information only for authorised purposes, and report suspected data exposure or unauthorised access.</Typography>
    <Typography variant="h5">Retention and incidents</Typography>
    <Typography paragraph>Personal information is retained according to the School&apos;s instructions and applicable law. Edutechh ERP will support reasonable investigation and notification of confirmed security incidents.</Typography>
    <Typography paragraph>For questions, contact jkoilel@nita.go.ke or 0714675015.</Typography>
  </Box>
);

export default DpaPage;