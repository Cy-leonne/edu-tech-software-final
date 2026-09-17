import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import {
    Box,
    Paper,
    Tabs,
    Tab,
    TextField,
    Button,
    Grid,
    Typography,
    Alert,
    CircularProgress,
    FormControlLabel,
    Switch,
    MenuItem,
    Card,
    CardContent,
    Divider,
    InputAdornment,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import WarningIcon from '@mui/icons-material/Warning';
import { authSuccess } from '../../redux/userRelated/userSlice';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const AdminSettingsPage = () => {
    const dispatch = useDispatch();
    const { currentUser } = useSelector((state) => state.user);
    const schoolId = currentUser?.school?._id || currentUser?.school || currentUser?.schoolId || currentUser?._id || currentUser?.id;
    
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const [settings, setSettings] = useState(null);
    const [formData, setFormData] = useState({
        branding: {},
        emailSettings: {},
        smsSettings: {},
        mpesaSettings: {},
        bankIntegration: {},
        fileUpload: {},
        notificationSettings: {},
    });

    useEffect(() => {
        if (schoolId) {
            fetchSettings();
        }
    }, [schoolId]);

    const fetchSettings = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.get(
                `${API_BASE_URL}/Admin/Settings/${schoolId}`,
                {
                    headers: { 'x-admin-id': currentUser?._id }
                }
            );
            const fetchedSettings = response.data.settings;
            setSettings(fetchedSettings);
            setFormData({
                branding: Object.assign({}, fetchedSettings.branding || {}, { schoolLogo: fetchedSettings.branding?.schoolLogo && (fetchedSettings.branding.schoolLogo.startsWith('http') ? fetchedSettings.branding.schoolLogo : `${API_BASE_URL}${fetchedSettings.branding.schoolLogo}`) }),
                emailSettings: fetchedSettings.emailSettings || {},
                smsSettings: fetchedSettings.smsSettings || {},
                mpesaSettings: fetchedSettings.mpesaSettings || {},
                bankIntegration: fetchedSettings.bankIntegration || {},
                fileUpload: fetchedSettings.fileUpload || {},
                notificationSettings: fetchedSettings.notificationSettings || {},
                timezone: fetchedSettings.timezone || 'UTC',
                dateFormat: fetchedSettings.dateFormat || 'DD/MM/YYYY',
                timeFormat: fetchedSettings.timeFormat || '24H',
                language: fetchedSettings.language || 'en',
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const handleInputChange = (section, field, value) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value,
            }
        }));
    };

    const handleTopLevelChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            const response = await axios.put(
                `${API_BASE_URL}/Admin/Settings/${schoolId}`,
                formData,
                {
                    headers: { 'x-admin-id': currentUser?._id }
                }
            );
            setSuccess('Settings saved successfully!');
            setSettings(response.data.settings);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const resizeImageFile = (file, maxBytes = 2 * 1024 * 1024) => {
        return new Promise((resolve, reject) => {
            try {
                const img = new Image();
                img.onload = async () => {
                    try {
                        const maxDim = 1200;
                        let { width, height } = img;
                        if (width > maxDim || height > maxDim) {
                            const ratio = Math.min(maxDim / width, maxDim / height);
                            width = Math.round(width * ratio);
                            height = Math.round(height * ratio);
                        }

                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        const toBlobAsync = (quality) => new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));

                        // Try decreasing quality until under limit
                        let quality = 0.92;
                        let blob = await toBlobAsync(quality);
                        while (blob && blob.size > maxBytes && quality > 0.3) {
                            quality -= 0.08;
                            blob = await toBlobAsync(quality);
                        }

                        if (!blob) return resolve(file);

                        // If resized blob is smaller, return a File-like object
                        const resizedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
                        resolve(resizedFile);
                    } catch (e) {
                        resolve(file);
                    }
                };
                img.onerror = () => resolve(file);
                img.src = URL.createObjectURL(file);
            } catch (err) {
                resolve(file);
            }
        });
    };

    const handleUploadLogo = async (file) => {
        if (!file) return;
        setSaving(true);
        setError('');

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        const maxBytes = 2 * 1024 * 1024; // must match backend limit

        if (!allowedTypes.includes(file.type)) {
            setError('Unsupported file type. Allowed: jpg, jpeg, png, gif');
            setSaving(false);
            return;
        }

        let fileToUpload = file;
        try {
            if (file.size > maxBytes) {
                // attempt client-side resize/compress
                const resized = await resizeImageFile(file, maxBytes);
                if (resized.size <= maxBytes) fileToUpload = resized;
                else {
                    setError('File too large even after compression. Please choose a smaller image.');
                    setSaving(false);
                    return;
                }
            }

            const form = new FormData();
            form.append('logo', fileToUpload);
            const res = await axios.post(
                `${API_BASE_URL}/School/${schoolId}/Branding/UploadLogo`,
                form,
                {
                    headers: { 'x-admin-id': currentUser?._id }
                }
            );
            let logoUrl = res.data.logoUrl;
            if (logoUrl && !logoUrl.startsWith('http')) logoUrl = `${API_BASE_URL}${logoUrl}`;
            setFormData(prev => ({ ...prev, branding: { ...prev.branding, schoolLogo: logoUrl } }));
            dispatch(authSuccess({
                ...currentUser,
                settings: res.data.settings || currentUser?.settings,
                schoolLogo: logoUrl,
                school: {
                    ...(currentUser?.school || {}),
                    schoolLogo: logoUrl,
                },
            }));
            setSuccess('Logo uploaded successfully');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Logo upload failed');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (settings) {
            setFormData({
                branding: settings.branding || {},
                emailSettings: settings.emailSettings || {},
                smsSettings: settings.smsSettings || {},
                mpesaSettings: settings.mpesaSettings || {},
                bankIntegration: settings.bankIntegration || {},
                fileUpload: settings.fileUpload || {},
                notificationSettings: settings.notificationSettings || {},
                timezone: settings.timezone || 'UTC',
                dateFormat: settings.dateFormat || 'DD/MM/YYYY',
                timeFormat: settings.timeFormat || '24H',
                language: settings.language || 'en',
            });
        }
    };

    // Backup management
    const [backups, setBackups] = useState([]);
    const [backupsLoading, setBackupsLoading] = useState(false);
    const [backupActionLoading, setBackupActionLoading] = useState(false);
    const [backupStats, setBackupStats] = useState(null);

    const fetchBackups = async () => {
        if (!schoolId) return;
        setBackupsLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/School/${schoolId}/Backups`, { headers: { 'x-admin-id': currentUser?._id } });
            setBackups(Array.isArray(res.data) ? res.data : (res.data.backups || []));
        } catch (err) {
            console.error('Failed to fetch backups', err);
        } finally {
            setBackupsLoading(false);
        }
    };

    const createBackup = async () => {
        if (!schoolId) return;
        setBackupActionLoading(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/School/${schoolId}/Backup/Create`, {}, { headers: { 'x-admin-id': currentUser?._id } });
            setSuccess(res.data?.message || 'Backup created');
            fetchBackups();
            fetchBackupStats();
            setTimeout(() => setSuccess(''), 4000);
        } catch (err) {
            setError(err.response?.data?.message || 'Backup creation failed');
        } finally {
            setBackupActionLoading(false);
        }
    };

    const verifyBackup = async (backupId) => {
        if (!schoolId || !backupId) return;
        setBackupActionLoading(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/School/${schoolId}/Backup/${backupId}/Verify`, {}, { headers: { 'x-admin-id': currentUser?._id } });
            setSuccess(res.data?.message || 'Backup verification started');
            fetchBackups();
            setTimeout(() => setSuccess(''), 4000);
        } catch (err) {
            setError(err.response?.data?.message || 'Verify failed');
        } finally {
            setBackupActionLoading(false);
        }
    };

    const restoreBackup = async (backupId) => {
        if (!schoolId || !backupId) return;
        if (!window.confirm('Restoring a backup will overwrite current data. Continue?')) return;
        setBackupActionLoading(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/School/${schoolId}/Backup/${backupId}/Restore`, {}, { headers: { 'x-admin-id': currentUser?._id } });
            setSuccess(res.data?.message || 'Restore started');
            setTimeout(() => setSuccess(''), 4000);
        } catch (err) {
            setError(err.response?.data?.message || 'Restore failed');
        } finally {
            setBackupActionLoading(false);
        }
    };

    const fetchBackupStats = async () => {
        if (!schoolId) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/School/${schoolId}/Backup/Statistics`, { headers: { 'x-admin-id': currentUser?._id } });
            setBackupStats(res.data || null);
        } catch (err) {
            console.error('Failed to fetch backup stats', err);
        }
    };

    useEffect(() => {
        if (schoolId) {
            fetchBackups();
            fetchBackupStats();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schoolId]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
                ⚙️ School Settings
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Paper sx={{ width: '100%' }}>
                <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                    <Tab label="Branding" />
                    <Tab label="Email Settings" />
                    <Tab label="SMS Settings" />
                    <Tab label="M-Pesa Settings" />
                    <Tab label="Bank Settings" />
                    <Tab label="Notifications" />
                    <Tab label="Regional" />
                    <Tab label="File Upload" />
                    <Tab label="Backups" />
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {/* Branding Tab */}
                    {tabValue === 0 && (
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>School Branding</Typography>
                                <Divider sx={{ mb: 2 }} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="School Name"
                                    value={formData.branding?.schoolName || ''}
                                    onChange={(e) => handleInputChange('branding', 'schoolName', e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="School Tagline"
                                    value={formData.branding?.schoolTagline || ''}
                                    onChange={(e) => handleInputChange('branding', 'schoolTagline', e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="School Logo URL"
                                    value={formData.branding?.schoolLogo || ''}
                                    onChange={(e) => handleInputChange('branding', 'schoolLogo', e.target.value)}
                                    helperText="Enter the URL to your school logo or upload below"
                                />
                                <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <input
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        id="logo-upload-input"
                                        type="file"
                                        onChange={(e) => handleUploadLogo(e.target.files[0])}
                                    />
                                    <label htmlFor="logo-upload-input">
                                        <Button variant="outlined" component="span" disabled={saving}>
                                            Upload Logo
                                        </Button>
                                    </label>
                                    {formData.branding?.schoolLogo && (
                                        <img src={formData.branding.schoolLogo} alt="logo" style={{ height: 40, marginLeft: 8 }} />
                                    )}
                                </Box>
                                <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                                    Allowed types: jpg, jpeg, png, gif — Max: 2MB. Larger images are compressed automatically.
                                </Typography>
                                
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="color"
                                    label="Primary Color"
                                    value={formData.branding?.primaryColor || '#1976D2'}
                                    onChange={(e) => handleInputChange('branding', 'primaryColor', e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="color"
                                    label="Secondary Color"
                                    value={formData.branding?.secondaryColor || '#424242'}
                                    onChange={(e) => handleInputChange('branding', 'secondaryColor', e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="color"
                                    label="Accent Color"
                                    value={formData.branding?.accentColor || '#FF9800'}
                                    onChange={(e) => handleInputChange('branding', 'accentColor', e.target.value)}
                                />
                            </Grid>
                        </Grid>
                    )}

                    {/* Email Settings Tab */}
                    {tabValue === 1 && (
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>Email Configuration</Typography>
                                <Divider sx={{ mb: 2 }} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Email Provider"
                                    value={formData.emailSettings?.emailProvider || 'Gmail'}
                                    onChange={(e) => handleInputChange('emailSettings', 'emailProvider', e.target.value)}
                                >
                                    <MenuItem value="Gmail">Gmail</MenuItem>
                                    <MenuItem value="SendGrid">SendGrid</MenuItem>
                                    <MenuItem value="AWS_SES">AWS SES</MenuItem>
                                    <MenuItem value="Custom">Custom</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Sender Name"
                                    value={formData.emailSettings?.senderName || ''}
                                    onChange={(e) => handleInputChange('emailSettings', 'senderName', e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Email Address"
                                    type="email"
                                    value={formData.emailSettings?.senderEmail || ''}
                                    onChange={(e) => handleInputChange('emailSettings', 'senderEmail', e.target.value)}
                                    helperText="Email address for sending notifications"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Email Password/API Key"
                                    type="password"
                                    value={formData.emailSettings?.emailPassword || ''}
                                    onChange={(e) => handleInputChange('emailSettings', 'emailPassword', e.target.value)}
                                    helperText="Encrypted - Will be securely stored"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Email API Key (Alternative)"
                                    type="password"
                                    value={formData.emailSettings?.emailAPIKey || ''}
                                    onChange={(e) => handleInputChange('emailSettings', 'emailAPIKey', e.target.value)}
                                    helperText="For services using API keys instead of passwords"
                                />
                            </Grid>
                        </Grid>
                    )}

                    {/* SMS Settings Tab */}
                    {tabValue === 2 && (
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>SMS Configuration</Typography>
                                <Divider sx={{ mb: 2 }} />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={formData.smsSettings?.enabled || false}
                                            onChange={(e) => handleInputChange('smsSettings', 'enabled', e.target.checked)}
                                        />
                                    }
                                    label="Enable SMS Notifications"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    select
                                    fullWidth
                                    label="SMS Provider"
                                    value={formData.smsSettings?.smsProvider || 'Africa_Talking'}
                                    onChange={(e) => handleInputChange('smsSettings', 'smsProvider', e.target.value)}
                                >
                                    <MenuItem value="Africa_Talking">Africa's Talking</MenuItem>
                                    <MenuItem value="Twilio">Twilio</MenuItem>
                                    <MenuItem value="AWS_SNS">AWS SNS</MenuItem>
                                    <MenuItem value="Custom">Custom</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="SMS Sender ID"
                                    value={formData.smsSettings?.senderID || ''}
                                    onChange={(e) => handleInputChange('smsSettings', 'senderID', e.target.value)}
                                    placeholder="e.g., ABCSchool"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="API Key"
                                    type="password"
                                    value={formData.smsSettings?.apiKey || ''}
                                    onChange={(e) => handleInputChange('smsSettings', 'apiKey', e.target.value)}
                                    helperText="Encrypted - Will be securely stored"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="API Secret"
                                    type="password"
                                    value={formData.smsSettings?.apiSecret || ''}
                                    onChange={(e) => handleInputChange('smsSettings', 'apiSecret', e.target.value)}
                                    helperText="Encrypted - Will be securely stored"
                                />
                            </Grid>
                        </Grid>
                    )}

                    {/* M-Pesa Settings Tab */}
                    {tabValue === 3 && (
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
                                    M-Pesa credentials are sensitive. Ensure these are kept secure and changed regularly.
                                </Alert>
                                <Typography variant="h6" gutterBottom>M-Pesa Configuration</Typography>
                                <Divider sx={{ mb: 2 }} />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={formData.mpesaSettings?.enabled || false}
                                            onChange={(e) => handleInputChange('mpesaSettings', 'enabled', e.target.checked)}
                                        />
                                    }
                                    label="Enable M-Pesa Integration"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Paybill Number"
                                    value={formData.mpesaSettings?.businessShortCode || ''}
                                    onChange={(e) => handleInputChange('mpesaSettings', 'businessShortCode', e.target.value)}
                                    placeholder="e.g., 522533"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Business Till Number"
                                    value={formData.mpesaSettings?.businessTillNumber || ''}
                                    onChange={(e) => handleInputChange('mpesaSettings', 'businessTillNumber', e.target.value)}
                                    placeholder="e.g., 1234567"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Account Number Format"
                                    value={formData.mpesaSettings?.accountNumberFormat || 'Student Admission Number'}
                                    onChange={(e) => handleInputChange('mpesaSettings', 'accountNumberFormat', e.target.value)}
                                >
                                    <MenuItem value="Student Admission Number">Student Admission Number</MenuItem>
                                    <MenuItem value="Student ID">Student ID</MenuItem>
                                    <MenuItem value="Custom">Custom</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Environment"
                                    value={formData.mpesaSettings?.environment || 'sandbox'}
                                    onChange={(e) => handleInputChange('mpesaSettings', 'environment', e.target.value)}
                                >
                                    <MenuItem value="sandbox">Sandbox (Testing)</MenuItem>
                                    <MenuItem value="production">Production (Live)</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="M-Pesa Consumer Key"
                                    type="password"
                                    value={formData.mpesaSettings?.consumerKey || ''}
                                    onChange={(e) => handleInputChange('mpesaSettings', 'consumerKey', e.target.value)}
                                    helperText="Encrypted - Will be securely stored"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="M-Pesa Consumer Secret"
                                    type="password"
                                    value={formData.mpesaSettings?.consumerSecret || ''}
                                    onChange={(e) => handleInputChange('mpesaSettings', 'consumerSecret', e.target.value)}
                                    helperText="Encrypted - Will be securely stored"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="M-Pesa Passkey"
                                    type="password"
                                    value={formData.mpesaSettings?.passkey || ''}
                                    onChange={(e) => handleInputChange('mpesaSettings', 'passkey', e.target.value)}
                                    helperText="Encrypted - Will be securely stored"
                                />
                            </Grid>
                        </Grid>
                    )}

                    {/* Bank Settings Tab */}
                    {tabValue === 4 && (
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    Configure your school bank integration and account details. This is separate from the M-Pesa payment gateway settings.
                                </Alert>
                                <Typography variant="h6" gutterBottom>Bank Integration</Typography>
                                <Divider sx={{ mb: 2 }} />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={formData.bankIntegration?.enabled || false}
                                            onChange={(e) => handleInputChange('bankIntegration', 'enabled', e.target.checked)}
                                        />
                                    }
                                    label="Enable Bank Integration"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Integration Type"
                                    value={formData.bankIntegration?.integrationType || 'DirectBankAPI'}
                                    onChange={(e) => handleInputChange('bankIntegration', 'integrationType', e.target.value)}
                                >
                                    <MenuItem value="DirectBankAPI">Direct Bank API</MenuItem>
                                    <MenuItem value="PaymentGateway">Payment Gateway</MenuItem>
                                    <MenuItem value="Plaid">Plaid</MenuItem>
                                    <MenuItem value="Custom">Custom</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Bank Name"
                                    value={formData.bankIntegration?.bankName || ''}
                                    onChange={(e) => handleInputChange('bankIntegration', 'bankName', e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Bank Code"
                                    value={formData.bankIntegration?.bankCode || ''}
                                    onChange={(e) => handleInputChange('bankIntegration', 'bankCode', e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Account Number Format"
                                    value={formData.bankIntegration?.accountNumberFormat || 'Student Admission Number'}
                                    onChange={(e) => handleInputChange('bankIntegration', 'accountNumberFormat', e.target.value)}
                                >
                                    <MenuItem value="Student Admission Number">Student Admission Number</MenuItem>
                                    <MenuItem value="Student ID">Student ID</MenuItem>
                                    <MenuItem value="Custom">Custom</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="API URL"
                                    value={formData.bankIntegration?.apiUrl || ''}
                                    onChange={(e) => handleInputChange('bankIntegration', 'apiUrl', e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Webhook URL"
                                    value={formData.bankIntegration?.webhookUrl || ''}
                                    onChange={(e) => handleInputChange('bankIntegration', 'webhookUrl', e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="API Key"
                                    type="password"
                                    value={formData.bankIntegration?.apiKey || ''}
                                    onChange={(e) => handleInputChange('bankIntegration', 'apiKey', e.target.value)}
                                    helperText="Encrypted - only use if your bank integration requires an API key"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Client ID"
                                    value={formData.bankIntegration?.clientId || ''}
                                    onChange={(e) => handleInputChange('bankIntegration', 'clientId', e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Client Secret"
                                    type="password"
                                    value={formData.bankIntegration?.clientSecret || ''}
                                    onChange={(e) => handleInputChange('bankIntegration', 'clientSecret', e.target.value)}
                                    helperText="Encrypted - only use if your bank integration requires OAuth credentials"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Environment"
                                    value={formData.bankIntegration?.environment || 'sandbox'}
                                    onChange={(e) => handleInputChange('bankIntegration', 'environment', e.target.value)}
                                >
                                    <MenuItem value="sandbox">Sandbox (Testing)</MenuItem>
                                    <MenuItem value="production">Production (Live)</MenuItem>
                                </TextField>
                            </Grid>
                        </Grid>
                    )}

                    {/* Notifications Tab */}
                    {tabValue === 5 && (
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>Notification Preferences</Typography>
                                <Divider sx={{ mb: 2 }} />
                            </Grid>
                            <Grid item xs={12}>
                                <Card>
                                    <CardContent>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={formData.notificationSettings?.enableEmailNotifications ?? true}
                                                    onChange={(e) => handleInputChange('notificationSettings', 'enableEmailNotifications', e.target.checked)}
                                                />
                                            }
                                            label="Enable Email Notifications"
                                        />
                                        <Typography variant="caption" color="textSecondary">
                                            Allow system to send email notifications to users
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12}>
                                <Card>
                                    <CardContent>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={formData.notificationSettings?.enableSMSNotifications ?? true}
                                                    onChange={(e) => handleInputChange('notificationSettings', 'enableSMSNotifications', e.target.checked)}
                                                />
                                            }
                                            label="Enable SMS Notifications"
                                        />
                                        <Typography variant="caption" color="textSecondary">
                                            Allow system to send SMS notifications to users
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12}>
                                <Card>
                                    <CardContent>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={formData.notificationSettings?.enableInAppNotifications ?? true}
                                                    onChange={(e) => handleInputChange('notificationSettings', 'enableInAppNotifications', e.target.checked)}
                                                />
                                            }
                                            label="Enable In-App Notifications"
                                        />
                                        <Typography variant="caption" color="textSecondary">
                                            Show notifications within the application
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    )}

                    {/* Regional Tab */}
                    {tabValue === 5 && (
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>Regional Settings</Typography>
                                <Divider sx={{ mb: 2 }} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Timezone"
                                    value={formData.timezone || 'UTC'}
                                    onChange={(e) => handleTopLevelChange('timezone', e.target.value)}
                                >
                                    <MenuItem value="UTC">UTC</MenuItem>
                                    <MenuItem value="Africa/Nairobi">Africa/Nairobi</MenuItem>
                                    <MenuItem value="Africa/Lagos">Africa/Lagos</MenuItem>
                                    <MenuItem value="Africa/Johannesburg">Africa/Johannesburg</MenuItem>
                                    <MenuItem value="Asia/Kolkata">Asia/Kolkata</MenuItem>
                                    <MenuItem value="Europe/London">Europe/London</MenuItem>
                                    <MenuItem value="America/New_York">America/New_York</MenuItem>
                                    <MenuItem value="America/Los_Angeles">America/Los_Angeles</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Date Format"
                                    value={formData.dateFormat || 'DD/MM/YYYY'}
                                    onChange={(e) => handleTopLevelChange('dateFormat', e.target.value)}
                                >
                                    <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                                    <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                                    <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Time Format"
                                    value={formData.timeFormat || '24H'}
                                    onChange={(e) => handleTopLevelChange('timeFormat', e.target.value)}
                                >
                                    <MenuItem value="12H">12-Hour (AM/PM)</MenuItem>
                                    <MenuItem value="24H">24-Hour</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Language"
                                    value={formData.language || 'en'}
                                    onChange={(e) => handleTopLevelChange('language', e.target.value)}
                                >
                                    <MenuItem value="en">English</MenuItem>
                                    <MenuItem value="es">Spanish</MenuItem>
                                    <MenuItem value="fr">French</MenuItem>
                                    <MenuItem value="sw">Swahili</MenuItem>
                                    <MenuItem value="pt">Portuguese</MenuItem>
                                    <MenuItem value="ar">Arabic</MenuItem>
                                </TextField>
                            </Grid>
                        </Grid>
                    )}

                    {/* File Upload Tab */}
                    {tabValue === 6 && (
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>File Upload Settings</Typography>
                                <Divider sx={{ mb: 2 }} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Max File Size (MB)"
                                    value={formData.fileUpload?.maxSizeInMB || 50}
                                    onChange={(e) => handleInputChange('fileUpload', 'maxSizeInMB', parseInt(e.target.value))}
                                    inputProps={{ min: 1, max: 1000 }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Max Student Photo Size (MB)"
                                    value={formData.fileUpload?.maxStudentPhotoBytesInMB || 5}
                                    onChange={(e) => handleInputChange('fileUpload', 'maxStudentPhotoBytesInMB', parseInt(e.target.value))}
                                    inputProps={{ min: 1, max: 100 }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Storage Quota (GB)"
                                    value={formData.fileUpload?.storageQuotaInGB || 100}
                                    onChange={(e) => handleInputChange('fileUpload', 'storageQuotaInGB', parseInt(e.target.value))}
                                    inputProps={{ min: 1, max: 10000 }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Allowed File Types"
                                    value={formData.fileUpload?.allowedFileTypes?.join(', ') || ''}
                                    onChange={(e) => handleInputChange('fileUpload', 'allowedFileTypes', e.target.value.split(', '))}
                                    helperText="Comma-separated list of file extensions (e.g., pdf, doc, xlsx, jpg, png)"
                                />
                            </Grid>
                        </Grid>
                    )}
                    {/* Backups Tab */}
                    {tabValue === 7 && (
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>Backups</Typography>
                                <Divider sx={{ mb: 2 }} />
                            </Grid>
                            <Grid item xs={12}>
                                <Button variant="contained" onClick={createBackup} disabled={backupActionLoading}>
                                    {backupActionLoading ? 'Processing...' : 'Create Backup'}
                                </Button>
                                <Button variant="outlined" sx={{ ml: 2 }} onClick={fetchBackups} disabled={backupsLoading}>
                                    {backupsLoading ? 'Refreshing...' : 'Refresh List'}
                                </Button>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="subtitle1">Backup Statistics</Typography>
                                        {backupStats ? (
                                            <Box>
                                                <Typography>Backups Count: {backupStats.count || backupStats.totalBackups || 0}</Typography>
                                                <Typography>Last Backup: {backupStats.lastBackup ? new Date(backupStats.lastBackup).toLocaleString() : 'N/A'}</Typography>
                                            </Box>
                                        ) : (
                                            <Typography color="textSecondary">No statistics available</Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>Available Backups</Typography>
                                {backupsLoading ? (
                                    <Typography>Loading backups...</Typography>
                                ) : backups && backups.length > 0 ? (
                                    backups.map((b) => (
                                        <Card key={b._id} sx={{ mb: 2 }}>
                                            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box>
                                                    <Typography><strong>{b.name || b._id}</strong></Typography>
                                                    <Typography variant="caption">Created: {b.createdAt ? new Date(b.createdAt).toLocaleString() : 'N/A'}</Typography>
                                                    <Typography variant="caption" sx={{ display: 'block' }}>Status: {b.status || 'Unknown'}</Typography>
                                                </Box>
                                                <Box>
                                                    <Button variant="outlined" sx={{ mr: 1 }} onClick={() => verifyBackup(b._id)} disabled={backupActionLoading}>Verify</Button>
                                                    <Button variant="contained" color="error" onClick={() => restoreBackup(b._id)} disabled={backupActionLoading}>Restore</Button>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    ))
                                ) : (
                                    <Typography>No backups found.</Typography>
                                )}
                            </Grid>
                        </Grid>
                    )}
                </Box>
            </Paper>

            {/* Save/Reset Buttons */}
            <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}>
                <Button
                    variant="outlined"
                    startIcon={<RestartAltIcon />}
                    onClick={handleReset}
                    disabled={saving}
                >
                    Reset
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveSettings}
                    disabled={saving || !settings}
                >
                    {saving ? <CircularProgress size={24} /> : 'Save Settings'}
                </Button>
            </Box>
        </Box>
    );
};

export default AdminSettingsPage;