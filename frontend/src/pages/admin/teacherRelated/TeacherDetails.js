import React, { useEffect, useState } from 'react';
import { getTeacherDetails, updateTeacherDetails, updateTeacherRole, resetTeacherPasswordByAdmin } from '../../../redux/teacherRelated/teacherHandle';
import { deleteUser } from '../../../redux/userRelated/userHandle';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Container, Typography, FormControl, InputLabel, Select, MenuItem, Box, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert } from '@mui/material';
import Popup from '../../../components/Popup';

const TeacherDetails = () => {
    const navigate = useNavigate();
    const params = useParams();
    const dispatch = useDispatch();
    const { loading, teacherDetails, error } = useSelector((state) => state.teacher);
    const [selectedRole, setSelectedRole] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [salary, setSalary] = useState('0');
    const [bankName, setBankName] = useState('');
    const [bankAccount, setBankAccount] = useState('');
    const [accountHolderName, setAccountHolderName] = useState('');
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState('');
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [resetSuccess, setResetSuccess] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [message, setMessage] = useState('');
    const roleOptions = ['Teacher', 'ClassTeacher', 'HeadTeacher', 'Coordinator'];

    const teacherID = params.id;

    useEffect(() => {
        dispatch(getTeacherDetails(teacherID));
    }, [dispatch, teacherID]);

    useEffect(() => {
        if (teacherDetails?.role) {
            setSelectedRole(teacherDetails.role);
        }
        if (teacherDetails?.name) {
            setName(teacherDetails.name);
        }
        if (teacherDetails?.email) {
            setEmail(teacherDetails.email);
        }
        setPhone(teacherDetails?.phone || '');
        setSalary(String(teacherDetails?.salary ?? 0));
        setBankName(teacherDetails?.bankName || '');
        setBankAccount(teacherDetails?.bankAccount || '');
        setAccountHolderName(teacherDetails?.accountHolderName || '');
    }, [teacherDetails]);

    if (error) {
        console.log(error);
    }

    const subjectNames = Array.isArray(teacherDetails?.teachSubjects) && teacherDetails.teachSubjects.length > 0
        ? teacherDetails.teachSubjects.map((subject) => subject.subName).filter(Boolean)
        : teacherDetails?.teachSubject?.subName ? [teacherDetails.teachSubject.subName] : [];

    const isSubjectNamePresent = subjectNames.length > 0;

    const handleChooseSubject = () => {
        navigate(`/Admin/teachers/choosesubject/${teacherDetails?.teachSclass?._id}/${teacherDetails?._id}`);
    };

    const handleSaveDetails = async () => {
        setSaveError('');
        setSaveSuccess('');
        setSaveLoading(true);

        try {
            await dispatch(updateTeacherDetails(teacherID, {
                name,
                email,
                phone,
                salary: Number(salary),
                bankName,
                bankAccount,
                accountHolderName,
            }));
            setSaveSuccess('Teacher details updated successfully.');
        } catch (err) {
            setSaveError(err.response?.data?.message || 'Failed to update teacher details.');
        } finally {
            setSaveLoading(false);
        }
    };

    const handleRoleChange = (event) => {
        setSelectedRole(event.target.value);
    };

    const handleSaveRole = () => {
        if (!selectedRole || selectedRole === teacherDetails?.role) return;
        dispatch(updateTeacherRole(teacherID, selectedRole));
    };

    const handleDeleteTeacher = async () => {
        if (!window.confirm('Delete this teacher permanently? This cannot be undone.')) {
            return;
        }

        try {
            await dispatch(deleteUser(teacherID, 'Teacher'));
            navigate(-1);
        } catch (error) {
            setMessage(error?.response?.data?.message || error?.message || 'Failed to delete teacher.');
            setShowPopup(true);
        }
    };

    const handleOpenResetDialog = () => {
        setNewPassword('');
        setPasswordError('');
        setResetSuccess('');
        setPasswordDialogOpen(true);
    };

    const handleConfirmResetPassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            setPasswordError('Password must be at least 6 characters.');
            return;
        }
        setPasswordError('');
        setResetLoading(true);

        try {
            await dispatch(resetTeacherPasswordByAdmin(teacherID, newPassword));
            setResetSuccess('Password reset successfully. The teacher has been notified by email if configured.');
            setPasswordDialogOpen(false);
        } catch (err) {
            console.error(err);
            setPasswordError(err.response?.data?.message || 'Failed to reset password.');
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <>
            {loading ? (
                <div>Loading...</div>
            ) : (
                <Container>
                    <Typography variant="h4" align="center" gutterBottom>
                        Teacher Details
                    </Typography>
                    <Typography variant="h6" gutterBottom>
                        Edit Teacher Details
                    </Typography>
                    <TextField
                        label="Teacher Name"
                        fullWidth
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        label="Teacher Email"
                        fullWidth
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        label="Phone"
                        fullWidth
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        label="Salary"
                        fullWidth
                        type="number"
                        inputProps={{ min: 0, step: 0.01 }}
                        value={salary}
                        onChange={(e) => setSalary(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        label="Bank Name"
                        fullWidth
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        label="Bank Account"
                        fullWidth
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        label="Account Holder Name"
                        fullWidth
                        value={accountHolderName}
                        onChange={(e) => setAccountHolderName(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <Typography variant="h6" gutterBottom>
                        Class Name: {teacherDetails?.teachSclass?.sclassName}
                    </Typography>
                    <Box sx={{ mt: 2, mb: 2, maxWidth: 320 }}>
                        {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
                        {saveSuccess && <Alert severity="success" sx={{ mb: 2 }}>{saveSuccess}</Alert>}
                        <Button
                            variant="contained"
                            onClick={handleSaveDetails}
                            disabled={saveLoading || !name || !email || salary === '' || Number(salary) < 0}
                            sx={{ mb: 2 }}
                        >
                            {saveLoading ? 'Saving...' : 'Save Details'}
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            sx={{ mt: 2, ml: 2 }}
                            onClick={handleDeleteTeacher}
                        >
                            Delete Teacher
                        </Button>
                        <FormControl fullWidth>
                            <InputLabel id="teacher-role-label">Teacher Role</InputLabel>
                            <Select
                                labelId="teacher-role-label"
                                value={selectedRole}
                                label="Teacher Role"
                                onChange={handleRoleChange}
                            >
                                {roleOptions.map((role) => (
                                    <MenuItem key={role} value={role}>
                                        {role}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button
                            variant="contained"
                            sx={{ mt: 2 }}
                            onClick={handleSaveRole}
                            disabled={!selectedRole || selectedRole === teacherDetails?.role}
                        >
                            Save Role
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            sx={{ mt: 2, ml: 2 }}
                            onClick={handleOpenResetDialog}
                        >
                            Reset Password
                        </Button>
                    </Box>
                    <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)}>
                        <DialogTitle>Reset Teacher Password</DialogTitle>
                        <DialogContent>
                            {passwordError && <Alert severity="error" sx={{ mb: 2 }}>{passwordError}</Alert>}
                            {resetSuccess && <Alert severity="success" sx={{ mb: 2 }}>{resetSuccess}</Alert>}
                            <TextField
                                autoFocus
                                margin="dense"
                                label="New Temporary Password"
                                type="password"
                                fullWidth
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                helperText="Minimum 6 characters"
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setPasswordDialogOpen(false)} disabled={resetLoading}>Cancel</Button>
                            <Button onClick={handleConfirmResetPassword} disabled={resetLoading}>
                                {resetLoading ? 'Resetting...' : 'Reset Password'}
                            </Button>
                        </DialogActions>
                    </Dialog>
                    {isSubjectNamePresent ? (
                        <>
                            <Typography variant="h6" gutterBottom>
                                Assigned Subjects: {subjectNames.join(', ')}
                            </Typography>
                            <Button variant="contained" onClick={handleChooseSubject} sx={{ mt: 2 }}>
                                Change Subjects
                            </Button>
                        </>
                    ) : (
                        <Button variant="contained" onClick={handleChooseSubject} sx={{ mt: 2 }}>
                            Add Subjects
                        </Button>
                    )}
                    <Popup message={message} setShowPopup={setShowPopup} showPopup={showPopup} />
                </Container>
            )}
        </>
    );
};

export default TeacherDetails;