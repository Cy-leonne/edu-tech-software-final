import React, { useState } from 'react';
import { Box, Typography, Paper, Stack, Button, List, ListItem, ListItemText, TextField, Divider } from '@mui/material';
import { Campaign, Send } from '@mui/icons-material';

const InternalCommunication = () => {
  const [messages] = useState([
    { id: 1, subject: 'Quarterly Townhall', date: '2024-02-01', preview: 'Townhall meeting scheduled for February 10th.' },
    { id: 2, subject: 'Performance Review Reminder', date: '2024-01-25', preview: 'Please complete your self-assessment by January 31st.' },
  ]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Internal Communication</Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Campaign color="primary" />
            <Typography variant="subtitle1">Share announcements, news, and internal updates.</Typography>
          </Stack>
          <Button variant="contained" startIcon={<Send />}>New Announcement</Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Recent Announcements</Typography>
        <List>
          {messages.map((message) => (
            <React.Fragment key={message.id}>
              <ListItem alignItems="flex-start">
                <ListItemText
                  primary={message.subject}
                  secondary={
                    <>
                      <Typography component="span" variant="caption" color="text.secondary">
                        {message.date}
                      </Typography>
                      <Typography component="span" variant="body2" display="block">{message.preview}</Typography>
                    </>
                  }
                />
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default InternalCommunication;