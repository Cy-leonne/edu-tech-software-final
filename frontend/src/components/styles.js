
import {
    TableCell,
    TableRow,
    styled,
    tableCellClasses,
    Drawer as MuiDrawer,
    AppBar as MuiAppBar,
} from "@mui/material";

const drawerWidth = 240

export const StyledTableCell = styled(TableCell)(({ theme }) => ({
    [`&.${tableCellClasses.head}`]: {
        backgroundColor: theme.palette.common.black,
        color: theme.palette.common.white,
        // Keep header text readable while rows scroll horizontally.
        whiteSpace: 'nowrap',
        fontWeight: 600,
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: 14,
    },
}));

export const StyledTableRow = styled(TableRow)(({ theme }) => ({
    '&:nth-of-type(odd)': {
        backgroundColor: theme.palette.action.hover,
    },
    // hide last border
    '&:last-child td, &:last-child th': {
        border: 0,
    },
}));

export const AppBar = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(['width', 'margin'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    }),
    [theme.breakpoints.down('sm')]: {
        marginLeft: 0,
        width: '100%',
        '& .MuiToolbar-root': {
            minHeight: 56,
            paddingLeft: theme.spacing(1),
            paddingRight: theme.spacing(1),
        },
        ...(open && {
            width: '100%',
        }),
    },
}));

export const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
    ({ theme, open }) => ({
        '& .MuiDrawer-paper': {
            position: 'relative',
            whiteSpace: 'nowrap',
            width: drawerWidth,
            transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
            }),
            boxSizing: 'border-box',
            ...(!open && {
                overflowX: 'hidden',
                transition: theme.transitions.create('width', {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.leavingScreen,
                }),
                width: theme.spacing(7),
                [theme.breakpoints.up('sm')]: {
                    width: theme.spacing(9),
                },
            }),
        },
        [theme.breakpoints.down('sm')]: {
            display: open ? 'block' : 'none',
            position: 'fixed',
            inset: 0,
            zIndex: theme.zIndex.drawer + 2,
            '& .MuiDrawer-paper': {
                position: 'fixed',
                inset: 0,
                width: 'min(82vw, 280px)',
                height: '100dvh',
                maxWidth: '100%',
                overflowY: 'auto',
                boxShadow: theme.shadows[8],
            },
        },
    }),
);

/**
 * Shared dashboard content area.
 *
 * Fixes the previous full-height layout in a responsive way: padding scales
 * with the viewport, content can shrink (`minWidth: 0`) so wide tables scroll
 * inside their own container instead of pushing the page wider, and horizontal
 * page scrolling is prevented. The original background colour expression is
 * preserved so the visual identity does not change.
 */
export const dashboardContentStyles = {
    backgroundColor: (theme) =>
        theme.palette.mode === 'light'
            ? theme.palette.grey[100]
            : theme.palette.grey[900],
    flexGrow: 1,
    minWidth: 0,
    width: '100%',
    minHeight: '100vh',
    overflowY: 'auto',
    overflowX: 'hidden',
    p: { xs: 1.5, sm: 2, md: 3 },
    boxSizing: 'border-box',
};

export const dashboardToolbarStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    px: [1],
};

export const dashboardDrawerStyles = {
    display: "flex"
};

export const dashboardHideDrawerStyles = {
    display: 'flex',
    '@media (max-width: 600px)': {
        display: 'none',
    },
};

/**
 * Convenience wrapper used by dashboard pages for their content sections.
 */
export const dashboardSectionStyles = {
    width: '100%',
    minWidth: 0,
    mb: { xs: 2, md: 3 },
};

export { drawerWidth };
