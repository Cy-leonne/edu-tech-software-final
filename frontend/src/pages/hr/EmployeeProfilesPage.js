import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
    Box,
    Paper,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress,
    Chip,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Grid,
    Stack,
    Typography,
    Snackbar,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BASE_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000';

const EmployeeProfilesPage = () => {
    const { currentUser } = useSelector((state) => state.user);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [toastOpen, setToastOpen] = useState(false);
    const [payeeAmount, setPayeeAmount] = useState(0);
    const [nssfAmount, setNssfAmount] = useState(0);
    const [nhifAmount, setNhifAmount] = useState(0);
    const [housingLevyAmount, setHousingLevyAmount] = useState(0);
    const [shaAmount, setShaAmount] = useState(0);
    const [totalDeductionsAmount, setTotalDeductionsAmount] = useState(0);

    const getCurrentUserFromStorage = () => {
        if (typeof window === 'undefined') return currentUser || {};
        try {
            const storedUser = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || 'null');
            return storedUser || currentUser || {};
        } catch (err) {
            return currentUser || {};
        }
    };

    const normalizeIdValue = (value) => {
        if (!value) return '';
        if (typeof value === 'string') return value;
        if (typeof value === 'object') {
            return value._id || value.id || value.schoolId || value.toString?.() || '';
        }
        return '';
    };

    const getSchoolId = () => {
        const user = getCurrentUserFromStorage();
        return (
            normalizeIdValue(user?.school) ||
            normalizeIdValue(user?.schoolId) ||
            normalizeIdValue(currentUser?.school) ||
            normalizeIdValue(currentUser?.schoolId) ||
            normalizeIdValue(user?._id) ||
            normalizeIdValue(currentUser?._id) ||
            ''
        );
    };

    const getAdminId = () => {
        const user = getCurrentUserFromStorage();
        return user?._id || user?.id || currentUser?._id || currentUser?.id || '';
    };

    const getRequestHeaders = () => {
        const adminId = getAdminId();
        const headers = {
            'Content-Type': 'application/json',
        };
        if (adminId) {
            headers['x-admin-id'] = adminId;
        }
        return headers;
    };

    const createEmptyFormData = () => ({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        nationality: '',
        idNumber: '',
        department: '',
        position: '',
        employmentType: 'Full-time',
        dateOfJoining: '',
        salary: {
            baseSalary: '',
            currency: 'KES',
            payFrequency: 'Monthly',
            grossSalary: '',
            netSalary: '',
        },
        paymentDetails: {
            paymentMethod: 'Bank Transfer',
            bankInfo: {
                bankName: '',
                accountNumber: '',
                accountType: '',
                accountHolderName: '',
                routingNumber: '',
                swiftCode: '',
                ifscCode: '',
                iban: '',
            },
            mobileMoneyInfo: {
                provider: '',
                phoneNumber: '',
                registeredName: '',
            },
        },
        taxInfo: {
            taxNumber: '',
            taxBracket: 'Standard',
            w9FormUrl: '',
            kra11FormUrl: '',
        },
        deductions: {
            healthInsurance: '',
            lifeInsurance: '',
            pensionContribution: '',
            unionDues: '',
            otherDeductions: '',
            payee: 0,
            housingLevy: 0,
            sha: 0,
        },
        allowances: {
            houseRent: '',
            transportAllowance: '',
            medicalAllowance: '',
            dearnesAllowance: '',
            performanceBonus: '',
            otherAllowances: '',
        },
        paymentPreferences: {
            preferredPaymentMethod: 'Bank Transfer',
            paymentNotificationEmail: '',
            paymentNotificationPhone: '',
            tdsDeductible: false,
        },
        emergencyContact: {
            name: '',
            relationship: '',
            phone: '',
            email: '',
        },
        address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'Kenya',
        },
    });

    const normalizeFormData = (data = {}) => {
        const base = createEmptyFormData();

        return {
            ...base,
            ...data,
            salary: {
                ...base.salary,
                ...(data.salary || {}),
            },
            paymentDetails: {
                ...base.paymentDetails,
                ...(data.paymentDetails || {}),
                bankInfo: {
                    ...base.paymentDetails.bankInfo,
                    ...(data.paymentDetails?.bankInfo || {}),
                },
                mobileMoneyInfo: {
                    ...base.paymentDetails.mobileMoneyInfo,
                    ...(data.paymentDetails?.mobileMoneyInfo || {}),
                },
            },
            taxInfo: {
                ...base.taxInfo,
                ...(data.taxInfo || {}),
            },
            deductions: {
                ...base.deductions,
                ...(data.deductions || {}),
            },
            allowances: {
                ...base.allowances,
                ...(data.allowances || {}),
            },
            paymentPreferences: {
                ...base.paymentPreferences,
                ...(data.paymentPreferences || {}),
            },
            emergencyContact: {
                ...base.emergencyContact,
                ...(data.emergencyContact || {}),
            },
            address: {
                ...base.address,
                ...(data.address || {}),
            },
        };
    };

    const [formData, setFormData] = useState(() => normalizeFormData());

    // Fetch employees when the current user and school context are available
    useEffect(() => {
        const user = getCurrentUserFromStorage();
        const school = getSchoolId();
        if (school || user?._id || user?.id) {
            fetchEmployees();
        }
    }, [currentUser]);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const school = getSchoolId();
            const requestParams = school ? { school } : {};

            const response = await axios.get(`${API_URL}/Employee/GetAll`, {
                params: requestParams,
                headers: getRequestHeaders(),
            });

            const list = response?.data?.employees || [];
            setEmployees(list);
            if (!list.length) {
                setErrorMessage('No employees found for this account yet.');
            } else {
                setErrorMessage('');
            }
        } catch (err) {
            setErrorMessage(err.response?.data?.message || 'Error fetching employees');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (employee = null) => {
        if (employee) {
            setEditingId(employee._id);
            setFormData(normalizeFormData(employee));
        } else {
            setEditingId(null);
            setFormData(normalizeFormData());
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingId(null);
    };

    const calculatePayrollValues = (data) => {
        const baseSalary = Number(data.salary?.baseSalary || 0);
        const allowancesTotal = Object.values(data.allowances || {}).reduce(
            (sum, item) => sum + Number(item || 0),
            0
        );
        const manualDeductions = Object.values(data.deductions || {}).reduce(
            (sum, item) => sum + Number(item || 0),
            0
        );
        const grossSalary = Number((baseSalary + allowancesTotal).toFixed(2));
        const payee = Number((grossSalary <= 24000
            ? grossSalary * 0.1
            : grossSalary <= 32333
            ? 2400 + (grossSalary - 24000) * 0.25
            : 2400 + (32333 - 24000) * 0.25 + (grossSalary - 32333) * 0.3).toFixed(2));
        const nssf = Number(Math.min(grossSalary * 0.06, 1080).toFixed(2));
        const nhif = (() => {
            if (grossSalary <= 5999) return 150;
            if (grossSalary <= 7999) return 300;
            if (grossSalary <= 11999) return 400;
            if (grossSalary <= 14999) return 500;
            if (grossSalary <= 19999) return 600;
            if (grossSalary <= 24999) return 750;
            if (grossSalary <= 29999) return 850;
            if (grossSalary <= 34999) return 900;
            if (grossSalary <= 39999) return 950;
            if (grossSalary <= 44999) return 1000;
            if (grossSalary <= 49999) return 1100;
            if (grossSalary <= 59999) return 1200;
            if (grossSalary <= 69999) return 1300;
            if (grossSalary <= 79999) return 1400;
            if (grossSalary <= 89999) return 1500;
            if (grossSalary <= 99999) return 1600;
            if (grossSalary <= 149999) return 1700;
            if (grossSalary <= 199999) return 1800;
            if (grossSalary <= 249999) return 1900;
            if (grossSalary <= 299999) return 2000;
            if (grossSalary <= 349999) return 2100;
            if (grossSalary <= 399999) return 2200;
            if (grossSalary <= 449999) return 2300;
            if (grossSalary <= 499999) return 2400;
            if (grossSalary <= 599999) return 2500;
            if (grossSalary <= 699999) return 2600;
            if (grossSalary <= 799999) return 2700;
            if (grossSalary <= 899999) return 2800;
            if (grossSalary <= 999999) return 2900;
            return 3000;
        })();
        const housingLevy = Number((grossSalary * 0.015).toFixed(2));
        const sha = Number((grossSalary * 0.02).toFixed(2));
        const totalDeductions = Number((manualDeductions + payee + nssf + nhif + housingLevy + sha).toFixed(2));
        const netSalary = Number((grossSalary - totalDeductions).toFixed(2));

        setPayeeAmount(payee);
        setNssfAmount(nssf);
        setNhifAmount(nhif);
        setHousingLevyAmount(housingLevy);
        setShaAmount(sha);
        setTotalDeductionsAmount(totalDeductions);

        setFormData((prev) => ({
            ...prev,
            salary: {
                ...prev.salary,
                grossSalary,
                netSalary: netSalary >= 0 ? netSalary : 0,
            },
            deductions: {
                ...prev.deductions,
                payee,
                nssf,
                nhif,
                housingLevy,
                sha,
            },
        }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name.includes('.')) {
            const keys = name.split('.');
            setFormData((prev) => {
                const newData = JSON.parse(JSON.stringify(prev)); // Deep clone
                let current = newData;

                // Navigate to the parent object
                for (let i = 0; i < keys.length - 1; i++) {
                    if (!current[keys[i]]) {
                        current[keys[i]] = {};
                    }
                    current = current[keys[i]];
                }

                // Set the value
                current[keys[keys.length - 1]] = value;
                return newData;
            });
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    useEffect(() => {
        calculatePayrollValues(formData);
    }, [formData.salary.baseSalary, formData.allowances, formData.deductions]);

    const validateEmployeeForm = () => {
        const errors = [];
        if (!formData.firstName || formData.firstName.trim() === '') errors.push('First name is required');
        if (!formData.lastName || formData.lastName.trim() === '') errors.push('Last name is required');
        if (!formData.email || formData.email.trim() === '') errors.push('Email is required');
        if (!formData.phone || formData.phone.trim() === '') errors.push('Phone number is required');
        if (!formData.department) errors.push('Department is required');
        if (!formData.position || formData.position.trim() === '') errors.push('Position is required');
        if (!formData.dateOfJoining) errors.push('Date of joining is required');

        if (errors.length) {
            setErrorMessage(errors.join('. '));
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateEmployeeForm()) return;

        try {
            setErrorMessage('');
            setSuccessMessage('');

            const school = getSchoolId();
            const adminId = getAdminId();
            if (!school || !adminId) {
                setErrorMessage('School information is not available for this account.');
                return;
            }

            const payload = {
                ...formData,
                school,
            };

            const requestHeaders = {
                'Content-Type': 'application/json',
            };
            if (adminId) {
                requestHeaders['x-admin-id'] = adminId;
            }

            console.log('Employee submit payload', payload);
            console.log('Employee submit headers', requestHeaders);

            let response;
            if (editingId) {
                response = await axios.put(`${API_URL}/Employee/${editingId}`, payload, { headers: requestHeaders });
                setSuccessMessage(response?.data?.message || 'Employee updated successfully');
            } else {
                response = await axios.post(`${API_URL}/Employee/Add`, payload, { headers: requestHeaders });
                if (response?.data?.created === false && response?.data?.employee) {
                    setSuccessMessage(response?.data?.message || 'Employee already exists and was loaded');
                    handleOpenDialog(response.data.employee);
                    return;
                }
                setSuccessMessage(response?.data?.message || 'Employee added successfully');
            }

            handleCloseDialog();
            fetchEmployees();
        } catch (err) {
            console.error('Employee submit error', err);
            const existingEmployee = err.response?.data?.employee;
            const serverMessage = err.response?.data?.message;
            const serverError = err.response?.data?.error;
            const validationErrors = err.response?.data?.errors;
            const fallbackMessage = err.response?.status === 403
                ? 'Access denied. The school account may be suspended or inactive.'
                : 'Error saving employee';

            const message = serverMessage
                ? (Array.isArray(validationErrors) ? `${serverMessage}: ${validationErrors.join(', ')}` : serverMessage)
                : serverError || fallbackMessage;

            if (err.response?.status === 409 && existingEmployee) {
                setSuccessMessage('Employee already exists. Loaded existing employee for review.');
                handleOpenDialog(existingEmployee);
            } else {
                setErrorMessage(message);
            }
        }
    };

    useEffect(() => {
        if (successMessage) {
            setToastOpen(true);
        }
    }, [successMessage]);

    const handleToastClose = (event, reason) => {
        if (reason === 'clickaway') return;
        setToastOpen(false);
        setSuccessMessage('');
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to deactivate this employee?')) {
            try {
                await axios.delete(`${API_URL}/Employee/${id}`, { headers: getRequestHeaders() });
                setSuccessMessage('Employee deactivated successfully');
                fetchEmployees();
            } catch (err) {
                setErrorMessage(err.response?.data?.message || 'Error deleting employee');
            }
        }
    };

    // Filter employees
    const filteredEmployees = employees.filter((emp) => {
        const matchesSearch =
            emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDepartment = !departmentFilter || emp.department === departmentFilter;
        return matchesSearch && matchesDepartment;
    });

    const departments = [
        'Administration',
        'HR',
        'Finance',
        'Academic',
        'Support Staff',
        'IT',
        'Maintenance',
        'Security',
        'Transportation',
        'Catering',
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ mb: 3 }}>
                Employee Profiles
            </Typography>

            {successMessage && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>
                    {successMessage}
                </Alert>
            )}
            {errorMessage && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMessage('')}>
                    {errorMessage}
                </Alert>
            )}

            <Snackbar open={toastOpen} autoHideDuration={4000} onClose={handleToastClose} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                <Alert onClose={handleToastClose} severity="success" sx={{ width: '100%' }}>
                    {successMessage}
                </Alert>
            </Snackbar>

            <Paper sx={{ p: 2, mb: 3 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
                    <TextField
                        placeholder="Search by name or email"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        size="small"
                        fullWidth
                    />
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Department</InputLabel>
                        <Select
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            label="Department"
                        >
                            <MenuItem value="">All Departments</MenuItem>
                            {departments.map((dept) => (
                                <MenuItem key={dept} value={dept}>
                                    {dept}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                    >
                        Add Employee
                    </Button>
                </Stack>
            </Paper>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Phone</TableCell>
                                <TableCell>Position</TableCell>
                                <TableCell>Department</TableCell>
                                <TableCell>Employment Type</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredEmployees.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center">
                                        No employees found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredEmployees.map((employee) => (
                                    <TableRow key={employee._id}>
                                        <TableCell>{`${employee.firstName} ${employee.lastName}`}</TableCell>
                                        <TableCell>{employee.email}</TableCell>
                                        <TableCell>{employee.phone}</TableCell>
                                        <TableCell>{employee.position}</TableCell>
                                        <TableCell>{employee.department}</TableCell>
                                        <TableCell>{employee.employmentType}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={employee.status}
                                                color={employee.status === 'Active' ? 'success' : 'default'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                size="small"
                                                startIcon={<EditIcon />}
                                                onClick={() => handleOpenDialog(employee)}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                size="small"
                                                color="error"
                                                startIcon={<DeleteIcon />}
                                                onClick={() => handleDelete(employee._id)}
                                            >
                                                Delete
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Add/Edit Employee Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
                <DialogTitle sx={{ pb: 1 }}>
                    {editingId ? 'Edit Employee' : 'Add New Employee'}
                </DialogTitle>
                <DialogContent sx={{ pt: 2, maxHeight: '80vh', overflowY: 'auto' }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        {/* Personal Information */}
                        <TextField
                            fullWidth
                            label="First Name"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Last Name"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Date of Birth"
                            name="dateOfBirth"
                            type="date"
                            value={formData.dateOfBirth}
                            onChange={handleInputChange}
                            InputLabelProps={{ shrink: true }}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Gender</InputLabel>
                            <Select
                                name="gender"
                                value={formData.gender}
                                onChange={handleInputChange}
                                label="Gender"
                            >
                                <MenuItem value="Male">Male</MenuItem>
                                <MenuItem value="Female">Female</MenuItem>
                                <MenuItem value="Other">Other</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Job Information */}
                        <TextField
                            fullWidth
                            label="ID Number"
                            name="idNumber"
                            value={formData.idNumber}
                            onChange={handleInputChange}
                        />
                        <TextField
                            fullWidth
                            label="Nationality"
                            name="nationality"
                            value={formData.nationality}
                            onChange={handleInputChange}
                        />
                        <FormControl fullWidth required>
                            <InputLabel>Department</InputLabel>
                            <Select
                                name="department"
                                value={formData.department}
                                onChange={handleInputChange}
                                label="Department"
                            >
                                {departments.map((dept) => (
                                    <MenuItem key={dept} value={dept}>
                                        {dept}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            fullWidth
                            label="Position"
                            name="position"
                            value={formData.position}
                            onChange={handleInputChange}
                            required
                        />
                        <FormControl fullWidth>
                            <InputLabel>Employment Type</InputLabel>
                            <Select
                                name="employmentType"
                                value={formData.employmentType}
                                onChange={handleInputChange}
                                label="Employment Type"
                            >
                                <MenuItem value="Full-time">Full-time</MenuItem>
                                <MenuItem value="Part-time">Part-time</MenuItem>
                                <MenuItem value="Contract">Contract</MenuItem>
                                <MenuItem value="Temporary">Temporary</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            fullWidth
                            label="Date of Joining"
                            name="dateOfJoining"
                            type="date"
                            value={formData.dateOfJoining}
                            onChange={handleInputChange}
                            required
                            InputLabelProps={{ shrink: true }}
                        />

                        {/* Salary Information */}
                        <TextField
                            fullWidth
                            label="Base Salary"
                            name="salary.baseSalary"
                            type="number"
                            value={formData.salary.baseSalary}
                            onChange={handleInputChange}
                        />
                        <TextField
                            fullWidth
                            label="Gross Salary"
                            name="salary.grossSalary"
                            type="number"
                            value={formData.salary.grossSalary}
                            InputProps={{ readOnly: true }}
                        />
                        <TextField
                            fullWidth
                            label="PAYEE (Tax)"
                            name="deductions.payee"
                            type="number"
                            value={formData.deductions.payee}
                            InputProps={{ readOnly: true }}
                        />
                        <TextField
                            fullWidth
                            label="NSSF"
                            name="deductions.nssf"
                            type="number"
                            value={formData.deductions.nssf}
                            InputProps={{ readOnly: true }}
                        />
                        <TextField
                            fullWidth
                            label="NHIF"
                            name="deductions.nhif"
                            type="number"
                            value={formData.deductions.nhif}
                            InputProps={{ readOnly: true }}
                        />
                        <TextField
                            fullWidth
                            label="Housing Levy"
                            name="deductions.housingLevy"
                            type="number"
                            value={formData.deductions.housingLevy}
                            InputProps={{ readOnly: true }}
                        />
                        <TextField
                            fullWidth
                            label="SHA"
                            name="deductions.sha"
                            type="number"
                            value={formData.deductions.sha}
                            InputProps={{ readOnly: true }}
                        />
                        <TextField
                            fullWidth
                            label="Total Deductions"
                            type="number"
                            value={totalDeductionsAmount}
                            InputProps={{ readOnly: true }}
                        />
                        <TextField
                            fullWidth
                            label="Net Salary"
                            name="salary.netSalary"
                            type="number"
                            value={formData.salary.netSalary}
                            InputProps={{ readOnly: true }}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Pay Frequency</InputLabel>
                            <Select
                                name="salary.payFrequency"
                                value={formData.salary.payFrequency}
                                onChange={handleInputChange}
                                label="Pay Frequency"
                            >
                                <MenuItem value="Monthly">Monthly</MenuItem>
                                <MenuItem value="Bi-weekly">Bi-weekly</MenuItem>
                                <MenuItem value="Weekly">Weekly</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Payment Method */}
                        <FormControl fullWidth>
                            <InputLabel>Payment Method</InputLabel>
                            <Select
                                name="paymentDetails.paymentMethod"
                                value={formData.paymentDetails?.paymentMethod || 'Bank Transfer'}
                                onChange={handleInputChange}
                                label="Payment Method"
                            >
                                <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                                <MenuItem value="Mobile Money">Mobile Money</MenuItem>
                                <MenuItem value="Cash">Cash</MenuItem>
                                <MenuItem value="Check">Check</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Bank Transfer Details - Show if Bank Transfer selected */}
                        {formData.paymentDetails?.paymentMethod === 'Bank Transfer' && (
                            <>
                                <TextField
                                    fullWidth
                                    label="Bank Name"
                                    name="paymentDetails.bankInfo.bankName"
                                    value={formData.paymentDetails?.bankInfo?.bankName || ''}
                                    onChange={handleInputChange}
                                />
                                <TextField
                                    fullWidth
                                    label="Account Number"
                                    name="paymentDetails.bankInfo.accountNumber"
                                    value={formData.paymentDetails?.bankInfo?.accountNumber || ''}
                                    onChange={handleInputChange}
                                />
                                <TextField
                                    fullWidth
                                    label="Account Holder Name"
                                    name="paymentDetails.bankInfo.accountHolderName"
                                    value={formData.paymentDetails?.bankInfo?.accountHolderName || ''}
                                    onChange={handleInputChange}
                                />
                                <FormControl fullWidth>
                                    <InputLabel>Account Type</InputLabel>
                                    <Select
                                        name="paymentDetails.bankInfo.accountType"
                                        value={formData.paymentDetails?.bankInfo?.accountType || ''}
                                        onChange={handleInputChange}
                                        label="Account Type"
                                    >
                                        <MenuItem value="Checking">Checking</MenuItem>
                                        <MenuItem value="Savings">Savings</MenuItem>
                                        <MenuItem value="Business">Business</MenuItem>
                                    </Select>
                                </FormControl>
                                <TextField
                                    fullWidth
                                    label="Routing Number"
                                    name="paymentDetails.bankInfo.routingNumber"
                                    value={formData.paymentDetails?.bankInfo?.routingNumber || ''}
                                    onChange={handleInputChange}
                                />
                                <TextField
                                    fullWidth
                                    label="SWIFT Code"
                                    name="paymentDetails.bankInfo.swiftCode"
                                    value={formData.paymentDetails?.bankInfo?.swiftCode || ''}
                                    onChange={handleInputChange}
                                />
                                <TextField
                                    fullWidth
                                    label="IFSC Code"
                                    name="paymentDetails.bankInfo.ifscCode"
                                    value={formData.paymentDetails?.bankInfo?.ifscCode || ''}
                                    onChange={handleInputChange}
                                />
                                <TextField
                                    fullWidth
                                    label="IBAN"
                                    name="paymentDetails.bankInfo.iban"
                                    value={formData.paymentDetails?.bankInfo?.iban || ''}
                                    onChange={handleInputChange}
                                />
                            </>
                        )}

                        {/* Mobile Money Details - Show if Mobile Money selected */}
                        {formData.paymentDetails?.paymentMethod === 'Mobile Money' && (
                            <>
                                <TextField
                                    fullWidth
                                    label="Provider (e.g., M-Pesa)"
                                    name="paymentDetails.mobileMoneyInfo.provider"
                                    value={formData.paymentDetails?.mobileMoneyInfo?.provider || ''}
                                    onChange={handleInputChange}
                                />
                                <TextField
                                    fullWidth
                                    label="Phone Number"
                                    name="paymentDetails.mobileMoneyInfo.phoneNumber"
                                    value={formData.paymentDetails?.mobileMoneyInfo?.phoneNumber || ''}
                                    onChange={handleInputChange}
                                />
                                <TextField
                                    fullWidth
                                    label="Registered Name"
                                    name="paymentDetails.mobileMoneyInfo.registeredName"
                                    value={formData.paymentDetails?.mobileMoneyInfo?.registeredName || ''}
                                    onChange={handleInputChange}
                                />
                            </>
                        )}

                        {/* Tax Information */}
                        <TextField
                            fullWidth
                            label="Tax Number"
                            name="taxInfo.taxNumber"
                            value={formData.taxInfo?.taxNumber || ''}
                            onChange={handleInputChange}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Tax Bracket</InputLabel>
                            <Select
                                name="taxInfo.taxBracket"
                                value={formData.taxInfo?.taxBracket || 'Standard'}
                                onChange={handleInputChange}
                                label="Tax Bracket"
                            >
                                <MenuItem value="Standard">Standard</MenuItem>
                                <MenuItem value="Exempt">Exempt</MenuItem>
                                <MenuItem value="Special">Special</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Deductions */}
                        <TextField
                            fullWidth
                            label="Health Insurance Deduction"
                            name="deductions.healthInsurance"
                            type="number"
                            value={formData.deductions?.healthInsurance || ''}
                            onChange={handleInputChange}
                        />
                        <TextField
                            fullWidth
                            label="Life Insurance Deduction"
                            name="deductions.lifeInsurance"
                            type="number"
                            value={formData.deductions?.lifeInsurance || ''}
                            onChange={handleInputChange}
                        />
                        <TextField
                            fullWidth
                            label="Pension Contribution"
                            name="deductions.pensionContribution"
                            type="number"
                            value={formData.deductions?.pensionContribution || ''}
                            onChange={handleInputChange}
                        />
                        <TextField
                            fullWidth
                            label="Union Dues"
                            name="deductions.unionDues"
                            type="number"
                            value={formData.deductions?.unionDues || ''}
                            onChange={handleInputChange}
                        />
                        <TextField
                            fullWidth
                            label="Other Deductions"
                            name="deductions.otherDeductions"
                            type="number"
                            value={formData.deductions?.otherDeductions || ''}
                            onChange={handleInputChange}
                        />

                        {/* Allowances */}
                        <TextField
                            fullWidth
                            label="House Rent Allowance"
                            name="allowances.houseRent"
                            type="number"
                            value={formData.allowances?.houseRent || ''}
                            onChange={handleInputChange}
                        />
                        <TextField
                            fullWidth
                            label="Transport Allowance"
                            name="allowances.transportAllowance"
                            type="number"
                            value={formData.allowances?.transportAllowance || ''}
                            onChange={handleInputChange}
                        />
                        <TextField
                            fullWidth
                            label="Medical Allowance"
                            name="allowances.medicalAllowance"
                            type="number"
                            value={formData.allowances?.medicalAllowance || ''}
                            onChange={handleInputChange}
                        />
                        <TextField
                            fullWidth
                            label="Dearness Allowance"
                            name="allowances.dearnesAllowance"
                            type="number"
                            value={formData.allowances?.dearnesAllowance || ''}
                            onChange={handleInputChange}
                        />
                        <TextField
                            fullWidth
                            label="Performance Bonus"
                            name="allowances.performanceBonus"
                            type="number"
                            value={formData.allowances?.performanceBonus || ''}
                            onChange={handleInputChange}
                        />
                        <TextField
                            fullWidth
                            label="Other Allowances"
                            name="allowances.otherAllowances"
                            type="number"
                            value={formData.allowances?.otherAllowances || ''}
                            onChange={handleInputChange}
                        />

                        {/* Payment Preferences */}
                        <FormControl fullWidth>
                            <InputLabel>Preferred Payment Method</InputLabel>
                            <Select
                                name="paymentPreferences.preferredPaymentMethod"
                                value={formData.paymentPreferences?.preferredPaymentMethod || 'Bank Transfer'}
                                onChange={handleInputChange}
                                label="Preferred Payment Method"
                            >
                                <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                                <MenuItem value="Mobile Money">Mobile Money</MenuItem>
                                <MenuItem value="Cash">Cash</MenuItem>
                                <MenuItem value="Check">Check</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            fullWidth
                            label="Payment Notification Email"
                            name="paymentPreferences.paymentNotificationEmail"
                            type="email"
                            value={formData.paymentPreferences?.paymentNotificationEmail || ''}
                            onChange={handleInputChange}
                        />
                        <TextField
                            fullWidth
                            label="Payment Notification Phone"
                            name="paymentPreferences.paymentNotificationPhone"
                            value={formData.paymentPreferences?.paymentNotificationPhone || ''}
                            onChange={handleInputChange}
                        />

                        {/* Address */}
                        <TextField
                            fullWidth
                            label="Street Address"
                            name="address.street"
                            value={formData.address?.street || ''}
                            onChange={handleInputChange}
                        />
                        <TextField
                            fullWidth
                            label="City"
                            name="address.city"
                            value={formData.address?.city || ''}
                            onChange={handleInputChange}
                        />
                        <TextField
                            fullWidth
                            label="State/Province"
                            name="address.state"
                            value={formData.address?.state || ''}
                            onChange={handleInputChange}
                        />
                        <TextField
                            fullWidth
                            label="ZIP Code"
                            name="address.zipCode"
                            value={formData.address?.zipCode || ''}
                            onChange={handleInputChange}
                        />

                        {/* Emergency Contact */}
                        <TextField
                            fullWidth
                            label="Emergency Contact Name"
                            name="emergencyContact.name"
                            value={formData.emergencyContact?.name || ''}
                            onChange={handleInputChange}
                        />
                        <TextField
                            fullWidth
                            label="Relationship"
                            name="emergencyContact.relationship"
                            value={formData.emergencyContact?.relationship || ''}
                            onChange={handleInputChange}
                        />
                        <TextField
                            fullWidth
                            label="Emergency Contact Phone"
                            name="emergencyContact.phone"
                            value={formData.emergencyContact?.phone || ''}
                            onChange={handleInputChange}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {editingId ? 'Update' : 'Add'} Employee
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EmployeeProfilesPage;