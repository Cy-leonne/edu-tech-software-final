
import React from 'react';
import { Box, Typography, Stack, Breadcrumbs, Link, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

/**
 * Consistent page header used across dashboards and list pages.
 * Keeps the existing typography/colours, normalises spacing, and collapses
 * gracefully on small screens.
 */
const PageHeader = ({
    title,
    subtitle,
    breadcrumbs = [],
    actions = null,
    dense = false,
}) => (
    <Box
        component="header"
        sx={{
            width: '100%',
            mb: dense ? 2 : 3,
            mt: 0,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1.5,
            minWidth: 0,
        }}
    >
        <Box sx={{ minWidth: 0 }}>
            {breadcrumbs.length > 0 && (
                <Breadcrumbs
                    aria-label="breadcrumb"
                    sx={{ mb: 0.5, '& .MuiBreadcrumbs-separator': { mx: 0.5 } }}
                >
                    {breadcrumbs.map((crumb, index) => {
                        const isLast = index === breadcrumbs.length - 1;
                        return isLast || !crumb.to ? (
                            <Typography key={crumb.label} variant="body2" color="text.secondary">
                                {crumb.label}
                            </Typography>
                        ) : (
                            <Link
                                key={crumb.label}
                                component={RouterLink}
                                to={crumb.to}
                                underline="hover"
                                variant="body2"
                                color="inherit"
                            >
                                {crumb.label}
                            </Link>
                        );
                    })}
                </Breadcrumbs>
            )}
            <Typography
                variant={dense ? 'h5' : 'h4'}
                component="h1"
                sx={{ wordBreak: 'break-word', lineHeight: 1.25 }}
            >
                {title}
            </Typography>
            {subtitle && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {subtitle}
                </Typography>
            )}
        </Box>
        {actions && (
            <Stack
                direction="row"
                spacing={1}
                useFlexGap
                flexWrap="wrap"
                sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}
            >
                {actions}
            </Stack>
        )}
    </Box>
);

/** Small helper for header action buttons that should stretch on mobile. */
export const HeaderAction = (props) => (
    <Button variant="outlined" size="small" {...props} sx={{ ...(props.sx || {}), whiteSpace: 'nowrap' }} />
);

export default PageHeader;
