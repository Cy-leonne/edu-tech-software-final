
import React, { useState } from 'react';
import { Box, Typography, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button, Grid, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Download, Visibility, Description, Description as FileIcon } from '@mui/icons-material';

const DocumentManagement = () => {
  const [documents] = useState([
    { id: 1, name: 'Employee Handbook', type: 'PDF', uploadedBy: 'HR Department', date: '2024-01-01', size: '2.5 MB' },
    { id: 2, name: 'Code of Conduct', type: 'PDF', uploadedBy: 'HR Department', date: '2023-12-15', size: '1.2 MB' },
    { id: 3, name: 'Leave Policy', type: 'DOC', uploadedBy: 'HR Department', date: '2023-12-10', size: '0.8 MB' },
  ]);

  const [personalDocs] = useState([
    { id: 1, name: 'Employment Contract', date: '2023-01-15' },
    { id: 2, name: 'Offer Letter', date: '2023-01-10' },
    { id: 3, name: 'Appointment Letter', date: '2023-01-05' },
  ]);
  const [openDoc, setOpenDoc] = useState(null);

  const handleView = (doc) => {
    setOpenDoc(doc);
  };

  const handleClose = () => {
    setOpenDoc(null);
  };

  const handleDownload = (doc) => {
    const fileContent = `Document Name: ${doc.name}\nUploaded: ${doc.date}\nType: ${doc.type || 'Document'}`;
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Document Management</Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Company Policies</Typography>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Document</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Uploaded</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <FileIcon fontSize="small" />
                      <Typography variant="body2">{doc.name}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{doc.type}</TableCell>
                  <TableCell>{doc.date}</TableCell>
                  <TableCell>{doc.size}</TableCell>
                  <TableCell>
                    <Button size="small" startIcon={<Visibility />} onClick={() => handleView(doc)}>View</Button>
                    <Button size="small" startIcon={<Download />} onClick={() => handleDownload(doc)}>Download</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>My Documents</Typography>
        <Stack spacing={1}>
          {personalDocs.map((doc) => (
            <Box key={doc.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, border: '1px solid #eee', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FileIcon />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{doc.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{doc.date}</Typography>
                </Box>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button size="small" startIcon={<Visibility />} onClick={() => handleView(doc)}>View</Button>
                <Button size="small" startIcon={<Download />} onClick={() => handleDownload(doc)}>Download</Button>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Paper>
      <Dialog open={Boolean(openDoc)} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{openDoc?.name || 'Document Preview'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {openDoc ? `Name: ${openDoc.name}\nUploaded: ${openDoc.date}\nType: ${openDoc.type || 'Document'}\n\nThis is a preview of the document content.` : ''}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentManagement;
