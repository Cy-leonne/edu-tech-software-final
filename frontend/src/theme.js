import { createTheme } from '@mui/material/styles';

/**
 * Shared application theme.
 *
 * IMPORTANT: the palette below keeps the application's existing visual identity
 * (default MUI blue primary, the institutional dark purple #2c2143 used by the
 * auth screens and the SuperAdmin red #b71c1c). Only typography scaling,
 * spacing and component defaults are standardised so that every dashboard,
 * table and form gets a consistent, responsive baseline.
 */
const theme = createTheme({
    palette: {
        primary: {
            main: '#1976d2',
        },
        secondary: {
            main: '#2c2143',
        },
        error: {
            main: '#b71c1c',
        },
        background: {
            default: '#f5f6f8',
            paper: '#ffffff',
        },
    },
    shape: {
        borderRadius: 8,
    },
    typography: {
        fontFamily: "'Poppins', 'Helvetica', 'Arial', sans-serif",
        h1: { fontSize: '2.125rem', fontWeight: 600 },
        h2: { fontSize: '1.75rem', fontWeight: 600 },
        h3: { fontSize: '1.5rem', fontWeight: 600 },
        h4: { fontSize: '1.35rem', fontWeight: 600 },
        h5: { fontSize: '1.15rem', fontWeight: 600 },
        h6: { fontSize: '1.02rem', fontWeight: 600 },
        subtitle1: { fontSize: '0.95rem' },
        body1: { fontSize: '0.95rem' },
        body2: { fontSize: '0.86rem' },
        button: { textTransform: 'none', fontWeight: 600 },
    },
    breakpoints: {
        values: {
            xs: 0,
            sm: 480,
            md: 768,
            lg: 1024,
            xl: 1440,
        },
    },
    components: {
        CssBaseline: {
            styleOverrides: {
                html: {
                    WebkitTextSizeAdjust: '100%',
                },
            },
        },
        MuiContainer: {
            styleOverrides: {
                root: {
                    paddingLeft: 16,
                    paddingRight: 16,
                    '@media (max-width:480px)': {
                        paddingLeft: 12,
                        paddingRight: 12,
                    },
                },
            },
        },
        MuiPaper: {
            defaultProps: { elevation: 1 },
            styleOverrides: {
                root: ({ theme: t }) => ({
                    // Long tables/forms must never force the whole page to scroll.
                    maxWidth: '100%',
                    [t.breakpoints.down('md')]: {
                        borderRadius: 10,
                    },
                }),
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    minHeight: 40,
                    '@media (max-width:480px)': {
                        minHeight: 44,
                    },
                },
                containedPrimary: {
                    boxShadow: 'none',
                },
            },
        },
        MuiTextField: {
            defaultProps: {
                size: 'small',
            },
        },
        MuiSelect: {
            defaultProps: {
                size: 'small',
            },
        },
        MuiTableContainer: {
            styleOverrides: {
                root: {
                    width: '100%',
                    overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch',
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: ({ theme: t }) => ({
                    whiteSpace: 'nowrap',
                    [t.breakpoints.down('md')]: {
                        padding: '8px 10px',
                        fontSize: '0.8rem',
                    },
                }),
            },
        },
        MuiTablePagination: {
            styleOverrides: {
                root: ({ theme: t }) => ({
                    overflow: 'hidden',
                    [t.breakpoints.down('md')]: {
                        '.MuiTablePagination-toolbar': {
                            minHeight: 48,
                            paddingLeft: 8,
                            paddingRight: 8,
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                        },
                        '.MuiTablePagination-spacer': { display: 'none' },
                    },
                }),
            },
        },
        MuiDialog: {
            defaultProps: {
                maxWidth: 'sm',
                fullWidth: true,
            },
            styleOverrides: {
                paper: {
                    margin: 16,
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    overflowX: 'hidden',
                },
            },
        },
        MuiTooltip: {
            defaultProps: {
                arrow: true,
            },
        },
    },
});

export default theme;
