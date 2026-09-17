import React from 'react';
import { Box, Typography, CircularProgress, Button, Stack, Skeleton } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';

/**
 * Shared loading / empty / error states so every list, card and table presents
 * consistent feedback instead of blank space or a raw browser error.
 * (Existing colours and icons are reused; no new icon library is introduced.)
 */

export const LoadingState = ({ label = 'Loading…', minHeight = 160 }) => (
    <Box
        role="status"
        aria-live="polite"
        sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            minHeight,
            width: '100%',
            py: 3,
        }}
    >
        <CircularProgress size={30} />
        <Typography variant="body2" color="text.secondary">{label}</Typography>
    </Box>
);

export const TableLoadingState = ({ rows = 5, columns = 4 }) => (
    <Box sx={{ width: '100%', py: 1 }}>
        <Stack spacing={1}>
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <Stack key={rowIndex} direction="row" spacing={2}>
                    {Array.from({ length: columns }).map((__, colIndex) => (
                        <Skeleton key={colIndex} variant="text" height={32} sx={{ flex: 1 }} />
                    ))}
                </Stack>
            ))}
        </Stack>
    </Box>
);

export const EmptyState = ({
    title = 'Nothing to show yet',
    description = '',
    actionLabel = '',
    onAction = null,
    icon = null,
    minHeight = 160,
}) => (
    <Box
        sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: 1,
            minHeight,
            width: '100%',
            px: 2,
            py: 3,
            color: 'text.secondary',
        }}
    >
        {icon || <InboxOutlinedIcon sx={{ fontSize: 40, color: 'action.disabled' }} />}
        <Typography variant="subtitle1" color="text.primary">{title}</Typography>
        {description && (
            <Typography variant="body2" sx={{ maxWidth: 420 }}>{description}</Typography>
        )}
        {actionLabel && onAction && (
            <Button variant="outlined" size="small" onClick={onAction} sx={{ mt: 1 }}>
                {actionLabel}
            </Button>
        )}
    </Box>
);

export const ErrorState = ({
    title = 'Something went wrong',
    description = 'We could not load this content. Please try again.',
    onRetry = null,
    minHeight = 160,
}) => (
    <Box
        role="alert"
        sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: 1,
            minHeight,
            width: '100%',
            px: 2,
            py: 3,
        }}
    >
        <ErrorOutlineRoundedIcon sx={{ fontSize: 40, color: 'error.main' }} />
        <Typography variant="subtitle1">{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
            {description}
        </Typography>
        {onRetry && (
            <Button variant="outlined" size="small" onClick={onRetry} sx={{ mt: 1 }}>
                Try again
            </Button>
        )}
    </Box>
);

export default LoadingState;
