import React from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';

/**
 * Top-level React error boundary.
 *
 * Prevents the classic SPA "white screen": without a boundary, any uncaught
 * render error unmounts the whole React tree and the user is left staring at a
 * blank page. With this in place the user instead sees a recovery screen with
 * a reload action (and a reset link to clear a corrupt persisted session,
 * which is a common cause of render crashes after an upgrade).
 *
 * The boundary is intentionally thin and dependency free (MUI only, always
 * available in this project) so that the fallback itself can never fail to
 * render.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Keep the diagnostic in the console for developers; nothing sensitive
        // is shown to the end user.
        console.error('[ErrorBoundary] Uncaught render error:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleResetSession = () => {
        try {
            localStorage.removeItem('user');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('currentRole');
        } catch (error) {
            /* storage may be unavailable in some contexts */
        }
        window.location.href = '/';
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'grey.100',
                    px: 2,
                    py: 4,
                }}
            >
                <Paper elevation={0} sx={{ p: { xs: 3, sm: 4 }, maxWidth: 480, width: '100%', textAlign: 'center' }}>
                    <Stack spacing={2} alignItems="center">
                        <Typography variant="h5" component="h1">
                            Something went wrong
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            An unexpected error occurred while displaying this page. You can try
                            reloading, or reset your session and go back to the home screen.
                        </Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ pt: 1 }}>
                            <Button variant="contained" onClick={this.handleReload}>
                                Reload page
                            </Button>
                            <Button variant="outlined" onClick={this.handleResetSession}>
                                Reset session &amp; go home
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>
            </Box>
        );
    }
}

export default ErrorBoundary;
