import * as React from 'react';
import { useDispatch } from 'react-redux';
import { underControl } from '../redux/userRelated/userSlice';
import { underStudentControl } from '../redux/studentRelated/studentSlice';
import MuiAlert from '@mui/material/Alert';
import { Snackbar } from '@mui/material';

const getNotificationSeverity = (message, severity) => {
    if (severity) return severity;
    const text = String(message || '').toLowerCase();
    if (/(success|successfully|completed|saved|uploaded|created|updated|approved|activated)/.test(text)) {
        return 'success';
    }
    if (/(info|please|note|reminder|available)/.test(text)) {
        return 'info';
    }
    return 'error';
};

const Popup = ({ message, setShowPopup, showPopup, severity, autoHideDuration = null }) => {
    const dispatch = useDispatch();
    const notificationSeverity = getNotificationSeverity(message, severity);

    const vertical = "top"
    const horizontal = "right"

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setShowPopup(false);
        dispatch(underControl())
        dispatch(underStudentControl())
    };

    return (
        <>
            <Snackbar open={showPopup} autoHideDuration={autoHideDuration} onClose={handleClose} anchorOrigin={{ vertical, horizontal }} key={vertical + horizontal}>
                <Alert
                    onClose={handleClose}
                    severity={notificationSeverity}
                    sx={{
                        width: '100%',
                        ...(notificationSeverity === 'success' && { backgroundColor: '#2E7D32' }),
                        ...(notificationSeverity === 'info' && { backgroundColor: '#1565C0' }),
                        ...(['warning', 'error'].includes(notificationSeverity) && { backgroundColor: '#C62828' }),
                    }}
                >
                    {message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default Popup;

const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});