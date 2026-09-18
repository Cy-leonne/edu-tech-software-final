
import React from 'react';
import { Box, Typography } from '@mui/material';

const EulaPage = () => (
  <Box sx={{ maxWidth: 900, mx: 'auto', p: 4 }}>
    <Typography variant="overline" color="primary">EDUTECHH ERP</Typography>
    <Typography variant="h3" component="h1" gutterBottom>End User Licence Agreement</Typography>
    <Typography paragraph><strong>Software Provider:</strong> Edutechh ERP | <strong>Country:</strong> Kenya | <strong>Telephone:</strong> 0714675015 | <strong>Email:</strong> jkoilel@nita.go.ke</Typography>
    <Typography variant="h5">1. Licence grant</Typography>
    <Typography paragraph>Edutechh ERP grants authorised users a limited, non-exclusive, non-transferable and revocable right to access the School Management System. Your licence is limited to the role and permissions assigned by your School.</Typography>
    <Typography variant="h5">2. User responsibilities</Typography>
    <Typography paragraph>Provide accurate information, protect your password, log out on shared devices, respect student and School privacy, use only assigned permissions, and follow applicable law and School policies.</Typography>
    <Typography variant="h5">3. Prohibited activities</Typography>
    <Typography paragraph>You must not access another user&apos;s account or another School&apos;s information, bypass security, reverse engineer or copy the Software, upload malicious files, conduct unauthorised testing, manipulate financial records, abuse communications, or interfere with system operations.</Typography>
    <Typography variant="h5">4. Data and audit logs</Typography>
    <Typography paragraph>School information must be accessed only for authorised purposes. Activities may be recorded in audit logs, including logins, record changes, financial actions and security events, for security, troubleshooting, compliance and accountability.</Typography>
    <Typography variant="h5">5. Availability and third-party services</Typography>
    <Typography paragraph>Reasonable efforts will be made to keep the Software available, but interruptions may occur. Payment, SMS, email and other integrated services may be operated by third parties under their own terms.</Typography>
    <Typography variant="h5">6. Suspension, termination and governing law</Typography>
    <Typography paragraph>Access may be suspended or terminated for misuse, unauthorised access, fraud, security violations, account removal or subscription termination. This Agreement is governed by the laws of the Republic of Kenya.</Typography>
    <Typography variant="h5">7. Electronic acceptance</Typography>
    <Typography paragraph>Selecting &quot;I Agree&quot; or &quot;Accept &amp; Continue&quot; constitutes electronic acceptance of this Agreement, subject to applicable law.</Typography>
  </Box>
);

export default EulaPage;
