import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';

/**
 * Friendly 404 page.
 *
 * Implemented with the existing theme colours/icons (no new icon library and no
 * external images) so it renders identically offline, in previews and in
 * production. The pre-existing components/ErrorPage.js is left untouched.
 */
const NotFoundPage = () => {
    const navigate = useNavigate();

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
                textAlign: 'center',
            }}
        >
            <Stack spacing={2} alignItems="center" sx={{ maxWidth: 460 }}>
                <SearchOffOutlinedIcon sx={{ fontSize: 56, color: 'text.disabled' }} />
                <Typography variant="h4" component="h1">Page not found</Typography>
                <Typography variant="body2" color="text.secondary">
                    The page you are looking for does not exist or may have been moved.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ pt: 1 }}>
                    <Button variant="contained" onClick={() => navigate('/')}>Back to home</Button>
                    <Button variant="outlined" onClick={() => navigate(-1)}>Go back</Button>
                </Stack>
            </Stack>
        </Box>
    );
};

export default NotFoundPage;
