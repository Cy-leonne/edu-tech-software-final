import React, { useState } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Chip, Stack, Button } from '@mui/material';
import { FactCheck, Gavel } from '@mui/icons-material';

const Compliance = () => {
  const [items] = useState([
    { id: 1, title: 'Data Privacy Training', status: 'Completed', due: '2024-01-15' },
    { id: 2, title: 'Health & Safety Policy Acknowledgment', status: 'Pending', due: '2024-02-05' },
    { id: 3, title: 'Annual Code of Conduct', status: 'Completed', due: '2024-01-10' },
  ]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Compliance</Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <FactCheck color="primary" />
          <Typography variant="subtitle1">Track mandatory trainings, policy acknowledgments, and audit records.</Typography>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Compliance Checklist</Typography>
        <List>
          {items.map((item) => (
            <ListItem key={item.id} secondaryAction={<Button size="small">View</Button>}>
              <ListItemText
                primary={item.title}
                secondary={`Due: ${item.due}`}
              />
              <Chip label={item.status} color={item.status === 'Completed' ? 'success' : 'warning'} size="small" />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default Compliance;