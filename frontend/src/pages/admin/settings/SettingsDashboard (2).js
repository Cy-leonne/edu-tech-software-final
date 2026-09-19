
import { Box, Grid, Paper, Typography, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { adminSettingsCategories } from './settingsData';

const SettingsDashboard = () => {
  return (
    <Box sx={{ p: 2, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Admin Settings
      </Typography>
      <Typography sx={{ mb: 3, color: 'text.secondary' }}>
        Choose a settings category to manage school operations, policies, communication, and integrations.
      </Typography>
      <Grid container spacing={2}>
        {adminSettingsCategories.map((category) => (
          <Grid item xs={12} sm={6} md={4} key={category.slug}>
            <Paper sx={{ p: 3, minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  {category.label}
                </Typography>
                <Typography sx={{ color: 'text.secondary', mb: 2 }}>
                  {category.description}
                </Typography>
              </Box>
              <Button
                component={RouterLink}
                to={`/Admin/settings/${category.slug}`}
                variant="outlined"
              >
                Open
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default SettingsDashboard;
