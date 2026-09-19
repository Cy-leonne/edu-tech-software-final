
import { Box, Paper, Typography, Grid, Card, CardContent, Button, Alert } from '@mui/material';
import { useSelector } from 'react-redux';

const SubscriptionLicenseSettings = () => {
  const { currentUser } = useSelector(state => state.user);

  const plans = [
    { name: 'Free', price: 0, students: 50, teachers: 5 },
    { name: 'Basic', price: 3000, students: 250, teachers: 25 },
    { name: 'Professional', price: 7500, students: 750, teachers: 75 },
    { name: 'Enterprise', price: 20000, students: 'Unlimited', teachers: 'Unlimited' },
  ];

  const subscriptionData = {
    plan: 'Professional',
    status: 'Active',
    startDate: new Date().toLocaleDateString(),
    renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    users: {
      current: 45,
      limit: 100
    },
    features: {
      students: true,
      teachers: true,
      parents: true,
      assignments: true,
      messaging: true,
      attendance: true,
      analytics: true,
      timetable: true
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Subscription & License</Typography>
      
      <Alert severity="success" sx={{ mb: 3 }}>
        Your subscription is active and in good standing
      </Alert>

      <Typography variant="h6" sx={{ mb: 2 }}>Available Plans</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {plans.map((plan) => (
          <Grid item xs={12} sm={6} md={3} key={plan.name}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6">{plan.name}</Typography>
                <Typography variant="h4" color="primary" sx={{ my: 1 }}>
                  {plan.price.toLocaleString()} KES
                </Typography>
                <Typography variant="body2" color="text.secondary">per month</Typography>
                <Typography variant="body2" sx={{ mt: 2 }}>Students: {plan.students}</Typography>
                <Typography variant="body2">Teachers: {plan.teachers}</Typography>
                <Button variant="outlined" size="small" sx={{ mt: 2 }} disabled>
                  Select Plan
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Current Plan</Typography>
              <Typography variant="h4" color="primary" sx={{ mb: 2 }}>{subscriptionData.plan}</Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>Status: <strong>{subscriptionData.status}</strong></Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>Started: {subscriptionData.startDate}</Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>Renews: {subscriptionData.renewalDate}</Typography>
              <Button variant="contained" size="small">Manage Plan</Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>User Capacity</Typography>
              <Typography variant="h4" color="primary" sx={{ mb: 2 }}>
                {subscriptionData.users.current}/{subscriptionData.users.limit}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>Users: {subscriptionData.users.current} of {subscriptionData.users.limit}</Typography>
              <div style={{ width: '100%', height: 8, backgroundColor: '#e0e0e0', borderRadius: 4, overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: `${(subscriptionData.users.current / subscriptionData.users.limit) * 100}%`, 
                    height: '100%', 
                    backgroundColor: '#4caf50' 
                  }} 
                />
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Available Features</Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {Object.entries(subscriptionData.features).map(([feature, enabled]) => (
                  <Grid item xs={12} sm={6} md={4} key={feature}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography 
                        sx={{ 
                          color: enabled ? 'success.main' : 'error.main',
                          mr: 1
                        }}
                      >
                        {enabled ? '✓' : '✗'}
                      </Typography>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {feature.replace(/([A-Z])/g, ' $1')}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>License Information</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>License Key: SCH-2024-PROF-{Math.random().toString(36).substr(2, 9).toUpperCase()}</Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>License Type: Volume License</Typography>
              <Button variant="outlined" size="small" sx={{ mr: 1 }}>Download License</Button>
              <Button variant="outlined" size="small">View Terms</Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>Support & Billing</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Button variant="contained" fullWidth>Contact Support</Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button variant="outlined" fullWidth>View Invoice</Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SubscriptionLicenseSettings;
