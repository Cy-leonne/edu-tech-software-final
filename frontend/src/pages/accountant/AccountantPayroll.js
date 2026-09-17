import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  TablePagination,
} from '@mui/material';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const AccountantPayroll = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedPersonType, setSelectedPersonType] = useState('teacher');
  const [employees, setEmployees] = useState([]);
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [reference, setReference] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [payrollDetailsOpen, setPayrollDetailsOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [verificationChecks, setVerificationChecks] = useState(null);
  const [verificationError, setVerificationError] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [payrollPeriod, setPayrollPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [payrolls, setPayrolls] = useState([]);
  const [payrollMessage, setPayrollMessage] = useState('');

  const resolveSchoolId = (user) => {
    if (!user) return null;
    const schoolValue = user?.school ?? user?.schoolId ?? null;
    if (!schoolValue) return null;
    if (typeof schoolValue === 'string') return schoolValue.trim();
    if (typeof schoolValue === 'object' && schoolValue !== null) {
      if (schoolValue._id) return String(schoolValue._id);
      if (schoolValue.id) return String(schoolValue.id);
      if (schoolValue.schoolId) return String(schoolValue.schoolId);
      return null;
    }
    return String(schoolValue);
  };

  const adminId = currentUser?._id || currentUser?.id || null;
  const schoolId = resolveSchoolId(currentUser) || adminId;

  const headers = {
    'Content-Type': 'application/json',
    ...(adminId ? { 'x-admin-id': adminId } : {}),
  };

  const getDisplayName = (emp) => {
    if (!emp) return 'N/A';
    const name = emp.name || emp.fullName || emp.firstName || emp.first_name || '';
    if (name && !name.startsWith('enc:')) return name;
    if (emp.email) {
      const local = emp.email.split('@')[0];
      if (local) return local.charAt(0).toUpperCase() + local.slice(1);
    }
    return 'N/A';
  };

  const fetchTeachers = async () => {
    let effectiveSchoolId = schoolId;
    if (!effectiveSchoolId) {
      // Try to resolve school from admin details as a fallback
      if (!adminId) {
        setError('Missing school context (no admin info available).');
        setLoading(false);
        return;
      }
      try {
        const adminRes = await axios.get(`${API_BASE_URL}/Admin/${adminId}`, { headers });
        const adminData = adminRes.data || adminRes.data.admin || {};
        const resolved = adminData.school || adminData.schoolId || (adminData.school && adminData.school._id) || null;
        if (resolved) effectiveSchoolId = typeof resolved === 'string' ? resolved : String(resolved);
      } catch (err) {
        // ignore - we'll later report missing school
      }

      if (!effectiveSchoolId) {
        setError('Missing school context. Please ensure your account has a school assigned (check localStorage currentUser.school).');
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const [teachersRes, employeesRes, payrollRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/Teachers/${effectiveSchoolId}`, { headers }),
        axios.get(`${API_BASE_URL}/Employee/GetAll`, { params: { school: effectiveSchoolId }, headers }),
        axios.get(`${API_BASE_URL}/Payroll`, { headers }),
      ]);

      const teacherData = Array.isArray(teachersRes.data) ? teachersRes.data : [];
      const employeeData = Array.isArray(employeesRes.data.employees) ? employeesRes.data.employees : [];

      setTeachers(teacherData);
      setEmployees(employeeData);
      setPayrolls(payrollRes.data?.payrolls || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load teachers or HR employee data');
      setTeachers([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const preparePayroll = async () => {
    setPayrollMessage('');
    try {
      const response = await axios.post(`${API_BASE_URL}/Payroll/Prepare`, { period: payrollPeriod }, { headers });
      setPayrollMessage(response.data.message || 'Payroll submitted for approval');
      await fetchTeachers();
    } catch (err) {
      setPayrollMessage(err.response?.data?.message || 'Payroll preparation failed');
    }
  };

  const approvePayroll = async (payrollId) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/Payroll/${payrollId}/Approve`, {}, { headers });
      setPayrollMessage(response.data.message || 'Payroll approved');
      await fetchTeachers();
    } catch (err) {
      setPayrollMessage(err.response?.data?.message || 'Payroll approval failed');
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [schoolId]);

  const getHrEmployeeForTeacher = (teacher) => {
    if (!teacher || !Array.isArray(employees)) return null;
    const teacherEmail = teacher.email?.toLowerCase();
    const teacherName = getDisplayName(teacher).toLowerCase();

    return (
      employees.find((emp) => emp.email?.toLowerCase() === teacherEmail) ||
      employees.find(
        (emp) =>
          `${emp.firstName || ''} ${emp.lastName || ''}`.trim().toLowerCase() === teacherName
      ) ||
      employees.find((emp) => getDisplayName(emp).toLowerCase() === teacherName)
    );
  };

  const getEmployeeSalary = (employee) => {
    if (!employee) return '';
    return (
      employee.salary?.netSalary ??
      employee.salary?.grossSalary ??
      employee.salary?.baseSalary ??
      ''
    );
  };

  const getTeacherHrPayroll = (teacher) => {
    const hrEmployee = getHrEmployeeForTeacher(teacher);
    const teacherPaymentDetails = teacher.paymentDetails || {};
    const teacherBankInfo = teacherPaymentDetails.bankInfo || {};
    return {
      salary:
        hrEmployee?.salary?.netSalary ??
        hrEmployee?.salary?.grossSalary ??
        hrEmployee?.salary ??
        teacher.salary ??
        teacher.salary?.netSalary ??
        teacher.salary?.grossSalary ??
        teacher.salary?.baseSalary ??
        '',
      paymentMethod:
        hrEmployee?.paymentDetails?.paymentMethod ||
        teacherPaymentDetails.paymentMethod ||
        'Bank Transfer',
      bankName:
        hrEmployee?.paymentDetails?.bankInfo?.bankName ||
        teacherBankInfo.bankName ||
        teacher.bankName ||
        '',
      bankAccount:
        hrEmployee?.paymentDetails?.bankInfo?.accountNumber ||
        teacherBankInfo.accountNumber ||
        teacher.bankAccount ||
        '',
      accountHolderName:
        hrEmployee?.paymentDetails?.bankInfo?.accountHolderName ||
        teacherBankInfo.accountHolderName ||
        teacher.accountHolderName ||
        getDisplayName(teacher) ||
        '',
    };
  };

  const getEmployeeHrPayroll = (employee) => ({
    salary: getEmployeeSalary(employee),
    paymentMethod: employee.paymentDetails?.paymentMethod || 'Bank Transfer',
    bankName: employee.paymentDetails?.bankInfo?.bankName || '',
    bankAccount: employee.paymentDetails?.bankInfo?.accountNumber || '',
    accountHolderName:
      employee.paymentDetails?.bankInfo?.accountHolderName || getDisplayName(employee) || '',
  });

  const getCommonValue = (rows, accessor, fallback = '') => {
    if (!rows || rows.length === 0) return fallback;
    const firstValue = accessor(rows[0]);
    return rows.every((row) => accessor(row) === firstValue) ? firstValue : fallback;
  };

  const openPayDialog = (person, type = 'teacher') => {
    const payrollInfo =
      type === 'teacher' ? getTeacherHrPayroll(person) : getEmployeeHrPayroll(person);

    setSelectedTeacher(person);
    setSelectedPersonType(type);
    setAmount(payrollInfo.salary !== '' ? String(payrollInfo.salary) : '');
    setPaymentMethod(payrollInfo.paymentMethod);
    setBankName(payrollInfo.bankName);
    setBankAccount(payrollInfo.bankAccount);
    setAccountHolderName(payrollInfo.accountHolderName);
    setReference('');
    setNote('');
    setPaymentError('');
    setPayOpen(true);
  };

  const openPayrollDetails = (employee) => {
    setSelectedEmployee(employee);
    setVerificationChecks(null);
    setVerificationError('');
    setPayrollDetailsOpen(true);
  };

  const verifyPayroll = async () => {
    if (!selectedEmployee) return;
    setVerificationLoading(true);
    setVerificationError('');
    try {
      const response = await axios.put(
        `${API_BASE_URL}/Employee/${selectedEmployee._id}/VerifyPayroll`,
        {},
        { headers }
      );
      setVerificationChecks(response.data.checks);
      setSelectedEmployee(response.data.employee);
      await fetchTeachers();
    } catch (err) {
      setVerificationChecks(err.response?.data?.checks || null);
      setVerificationError(err.response?.data?.message || 'Payroll verification failed');
    } finally {
      setVerificationLoading(false);
    }
  };

  const openBulkPayDialog = () => {
    const selectedTeacherRows = teachers.filter((teacher) => selectedTeachers.includes(teacher._id));
    const paymentMethod = getCommonValue(selectedTeacherRows, (teacher) => getTeacherHrPayroll(teacher).paymentMethod, 'Bank Transfer');
    const bankName = getCommonValue(selectedTeacherRows, (teacher) => getTeacherHrPayroll(teacher).bankName, '');
    const bankAccount = getCommonValue(selectedTeacherRows, (teacher) => getTeacherHrPayroll(teacher).bankAccount, '');
    const accountHolderName = getCommonValue(selectedTeacherRows, (teacher) => getTeacherHrPayroll(teacher).accountHolderName, '');

    setSelectedTeacher(null);
    setSelectedPersonType('teacher');
    setAmount('');
    setPaymentMethod(paymentMethod);
    setBankName(bankName);
    setBankAccount(bankAccount);
    setAccountHolderName(accountHolderName);
    setReference('');
    setNote('');
    setPaymentError('');
    setPayOpen(true);
  };

  const closePayDialog = () => {
    setPayOpen(false);
    setSelectedTeacher(null);
    setAmount('');
    setNote('');
    setReference('');
    setPaymentError('');
  };

  const handleSalaryPayment = async () => {
    if (!selectedTeacher && selectedTeachers.length === 0) return;

    if (selectedPersonType === 'teacher' && selectedTeacher) {
      const numericAmount = Number(getTeacherHrPayroll(selectedTeacher).salary || 0);
      if (!numericAmount || numericAmount <= 0) {
        setPaymentError('This teacher does not have a salary set by HR. Please ask HR to enter the salary first.');
        return;
      }
    }

    if (selectedPersonType === 'employee' && selectedTeacher) {
      const numericAmount = Number(getEmployeeHrPayroll(selectedTeacher).salary || 0);
      if (!numericAmount || numericAmount <= 0) {
        setPaymentError('This staff member does not have salary information set. Please ask HR to enter the salary first.');
        return;
      }
    }

    if (!selectedTeacher && !allSelectedSalariesPresent) {
      setPaymentError('All selected teachers must have salaries set by HR before accountant can submit payment.');
      return;
    }

    setPaymentLoading(true);
    setPaymentError('');

    try {
      if (selectedTeacher) {
        if (selectedPersonType === 'teacher') {
          const numericAmount = Number(getTeacherHrPayroll(selectedTeacher).salary || 0);
          await axios.put(
            `${API_BASE_URL}/Teacher/SalaryPayment/${selectedTeacher._id || selectedTeacher.id}`,
            {
              amount: numericAmount,
              paymentMethod,
              note,
              reference,
              bankName,
              bankAccount,
              accountHolderName,
            },
            { headers }
          );
          setPaymentSuccess(`Salary payment submitted for ${getDisplayName(selectedTeacher)}. Awaiting principal approval.`);
        } else {
          const numericAmount = Number(getEmployeeHrPayroll(selectedTeacher).salary || 0);
          await axios.post(
            `${API_BASE_URL}/Employee/${selectedTeacher._id || selectedTeacher.id}/Pay`,
            {
              amount: numericAmount,
              paymentMethod,
              note,
              reference,
              bankName,
              bankAccount,
              accountHolderName,
            },
            { headers }
          );
          setPaymentSuccess(`Staff payment submitted for ${getDisplayName(selectedTeacher)}.`);
        }
      } else {
        const promises = selectedTeacherRows.map((teacher) => {
          const numericAmount = Number(getTeacherHrPayroll(teacher).salary || 0);
          return axios.put(
            `${API_BASE_URL}/Teacher/SalaryPayment/${teacher._id}`,
            {
              amount: numericAmount,
              paymentMethod,
              note,
              reference,
              bankName,
              bankAccount,
              accountHolderName,
            },
            { headers }
          );
        });
        await Promise.all(promises);
        setPaymentSuccess(`Salary payment submitted for ${selectedTeachers.length} teachers. Awaiting principal approval.`);
      }

      closePayDialog();
      await fetchTeachers();
      setSelectedTeachers([]);
      setTimeout(() => setPaymentSuccess(''), 3000);
    } catch (err) {
      setPaymentError(err.response?.data?.message || err.message || 'Payment failed');
    } finally {
      setPaymentLoading(false);
    }
  };

  const teacherColumns = [
    { id: 'select', label: '', minWidth: 50 },
    { id: 'name', label: 'Name', minWidth: 180 },
    { id: 'email', label: 'Email', minWidth: 200 },
    { id: 'role', label: 'Role', minWidth: 120 },
    { id: 'className', label: 'Class', minWidth: 120 },
    { id: 'salary', label: 'Salary', minWidth: 120 },
    { id: 'lastPayment', label: 'Last Payment', minWidth: 180 },
  ];

  const selectedTeacherRows = teachers.filter((teacher) => selectedTeachers.includes(teacher._id));
  const selectedTeacherSalaries = selectedTeacherRows.map((teacher) => Number(getTeacherHrPayroll(teacher).salary || 0));
  const allSelectedSalariesPresent = selectedTeacherRows.length > 0 && selectedTeacherSalaries.every((salary) => salary > 0);
  const totalSelectedSalaryAmount = selectedTeacherSalaries.reduce((sum, salary) => sum + salary, 0);

  const teacherRows = Array.isArray(teachers)
    ? teachers.map((teacher) => {
        const lastPayment = (teacher.salaryHistory || []).slice(-1)[0];
        const hasPendingPayment = (teacher.salaryHistory || []).some(
          (payment) => payment.approvalStatus === 'Pending' || payment.status === 'Pending'
        );
        return {
          id: teacher._id,
          selected: selectedTeachers.includes(teacher._id),
          name: getDisplayName(teacher),
          email: teacher.email || 'N/A',
          role: teacher.role || 'Teacher',
          className: teacher.teachSclass?.sclassName || 'N/A',
          salary: Number(getTeacherHrPayroll(teacher).salary || 0) > 0 ? getTeacherHrPayroll(teacher).salary : 'N/A',
          lastPayment: lastPayment ? `${lastPayment.amount} on ${new Date(lastPayment.date).toLocaleDateString()}` : 'None',
          hasPendingPayment,
          raw: teacher,
        };
      })
    : [];

  const employeeRows = Array.isArray(employees)
    ? employees.map((employee) => {
        const lastPayment = (employee.paymentHistory || []).slice(-1)[0];
        return {
          id: employee._id,
          name: getDisplayName(employee),
          email: employee.email || 'N/A',
          role: employee.position || employee.department || 'Staff',
          className: employee.department || 'N/A',
          salary: getEmployeeSalary(employee) || 'N/A',
          employeeNo: employee.employeeId || 'N/A',
          employmentStatus: employee.status || 'Active',
          payrollStatus: employee.payrollStatus || 'Pending Verification',
          accountsStatus: employee.accountsStatus || 'Not Yet Verified',
          lastPayment: lastPayment ? `${lastPayment.netAmount ?? lastPayment.grossAmount ?? 0} on ${new Date(lastPayment.paymentDate || lastPayment.date).toLocaleDateString()}` : 'None',
          raw: employee,
        };
      })
    : [];

  const handleToggleSelect = (teacherId) => {
    setSelectedTeachers((prev) =>
      prev.includes(teacherId)
        ? prev.filter((id) => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const selectAll = (isSelected) => {
    if (isSelected) {
      setSelectedTeachers(
        teacherRows
          .filter((row) => !row.hasPendingPayment)
          .map((row) => row.id)
      );
    } else {
      setSelectedTeachers([]);
    }
  };

  const TeacherActions = ({ row }) => (
    <Stack direction="row" spacing={1} justifyContent="center">
      <Button
        variant="outlined"
        size="small"
        onClick={() => openPayDialog(row.raw)}
        disabled={row.hasPendingPayment}
      >
        Pay Salary
      </Button>
      <Button variant="outlined" size="small" onClick={() => setSelectedTeacher(row.raw)}>
        View
      </Button>
    </Stack>
  );

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Payroll Dashboard
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {paymentSuccess && <Alert severity="success" sx={{ mb: 2 }}>{paymentSuccess}</Alert>}

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Accountant Role Restrictions:</strong> You can submit salary payments for principal approval, but salary amounts and employee details are managed by HR staff only.
      </Alert>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography sx={{ mb: 1 }}>Manage teacher and staff salary payments and payroll records.</Typography>
        <Typography>Total teachers: {teacherRows.length}</Typography>
        <Typography>Total staff: {employeeRows.length}</Typography>
        <Typography sx={{ mt: 1, color: 'text.secondary' }}>
          Select multiple teachers below to submit salary payments in bulk. Teachers with pending salary payments cannot be selected.
        </Typography>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">New Payroll</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ mt: 1 }}>
          <TextField label="Payroll Period" type="month" value={payrollPeriod} onChange={(event) => setPayrollPeriod(event.target.value)} InputLabelProps={{ shrink: true }} />
          <Button variant="contained" onClick={preparePayroll}>Generate Payroll</Button>
        </Stack>
        {payrollMessage && <Alert severity="info" sx={{ mt: 2 }}>{payrollMessage}</Alert>}
        {payrolls.map((payroll) => (
          <Stack key={payroll._id} direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ mt: 2 }}>
            <Typography>{payroll.period}: {payroll.lines?.length || 0} employees, Net KES {Number(payroll.totalNet || 0).toLocaleString()} ({payroll.status})</Typography>
            {['Admin', 'SuperAdmin'].includes(currentUser?.role) && payroll.status === 'Pending Approval' && <Button size="small" variant="outlined" onClick={() => approvePayroll(payroll._id)}>Approve Payroll</Button>}
          </Stack>
        ))}
      </Paper>

      {teacherRows.length === 0 ? (
        <Paper sx={{ p: 2 }}>
          <Typography>No teachers found for this school.</Typography>
        </Paper>
      ) : (
        <Paper sx={{ p: 2 }}>
          <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => selectAll(true)}
              disabled={teacherRows.filter((row) => !row.hasPendingPayment).length === 0}
            >
              Select All
            </Button>
            <Button
              variant="outlined"
              onClick={() => selectAll(false)}
              disabled={selectedTeachers.length === 0}
            >
              Clear Selection
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={openBulkPayDialog}
              disabled={selectedTeachers.length === 0}
            >
              Pay Selected ({selectedTeachers.length})
            </Button>
          </Box>
          <TableContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={
                        selectedTeachers.length > 0 &&
                        selectedTeachers.length < teacherRows.filter((row) => !row.hasPendingPayment).length
                      }
                      checked={
                        teacherRows.filter((row) => !row.hasPendingPayment).length > 0 &&
                        selectedTeachers.length === teacherRows.filter((row) => !row.hasPendingPayment).length
                      }
                      onChange={(event) => selectAll(event.target.checked)}
                    />
                  </TableCell>
                  {teacherColumns.slice(1).map((column) => (
                    <TableCell key={column.id} style={{ minWidth: column.minWidth }}>
                      {column.label}
                    </TableCell>
                  ))}
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teacherRows
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row) => (
                    <TableRow hover key={row.id} selected={row.selected}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedTeachers.includes(row.id)}
                          disabled={row.hasPendingPayment}
                          onChange={() => handleToggleSelect(row.id)}
                        />
                      </TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.role}</TableCell>
                      <TableCell>{row.className}</TableCell>
                      <TableCell>{row.salary}</TableCell>
                      <TableCell>{row.lastPayment}</TableCell>
                      <TableCell align="center">
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => openPayDialog(row.raw)}
                          disabled={row.hasPendingPayment}
                        >
                          Pay Salary
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={teacherRows.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(event, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
          />
        </Paper>
      )}

      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Payroll Employees</Typography>
        {employeeRows.length === 0 ? (
          <Typography>No HR employees found.</Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee No.</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Salary</TableCell>
                  <TableCell>Employee Status</TableCell>
                  <TableCell>Payroll Status</TableCell>
                  <TableCell>Accounts Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employeeRows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.employeeNo}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.className}</TableCell>
                    <TableCell>{row.salary === 'N/A' ? row.salary : `KES ${Number(row.salary).toLocaleString()}`}</TableCell>
                    <TableCell>{row.employmentStatus}</TableCell>
                    <TableCell>{row.payrollStatus}</TableCell>
                    <TableCell>{row.accountsStatus}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button variant="outlined" size="small" onClick={() => openPayrollDetails(row.raw)}>
                          View Payroll Details
                        </Button>
                        <Button variant="contained" size="small" disabled={row.accountsStatus !== 'Verified'} onClick={() => openPayDialog(row.raw, 'employee')}>
                          Pay Salary
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={payrollDetailsOpen} onClose={() => setPayrollDetailsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>View Payroll Details</DialogTitle>
        <DialogContent>
          {selectedEmployee && (
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <Typography variant="h6">{getDisplayName(selectedEmployee)} ({selectedEmployee.employeeId || 'N/A'})</Typography>
              <Typography>Department: {selectedEmployee.department || 'N/A'}</Typography>
              <Typography>Employment status: {selectedEmployee.status || 'Active'}</Typography>
              <Typography>Salary: KES {Number(getEmployeeSalary(selectedEmployee) || 0).toLocaleString()}</Typography>
              <Typography>Payment method: {selectedEmployee.paymentDetails?.paymentMethod || 'N/A'}</Typography>
              <Typography>Bank/M-Pesa details: {selectedEmployee.paymentDetails?.bankInfo?.accountNumber || selectedEmployee.paymentDetails?.mobileMoneyInfo?.phoneNumber || 'Not configured'}</Typography>
              <Typography>Deductions: {Object.entries(selectedEmployee.deductions || {}).filter(([, value]) => Number(value) > 0).map(([key, value]) => `${key}: ${value}`).join(', ') || 'Not configured'}</Typography>
              <Typography>Payroll period: {selectedEmployee.payrollPeriod || 'Not configured'}</Typography>
              {verificationError && <Alert severity="error">{verificationError}</Alert>}
              {verificationChecks && (
                <Box>
                  <Typography variant="subtitle2">Verification checks</Typography>
                  {Object.entries(verificationChecks).map(([key, passed]) => (
                    <Typography key={key} color={passed ? 'success.main' : 'error.main'}>
                      {passed ? 'Passed' : 'Failed'}: {key}
                    </Typography>
                  ))}
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayrollDetailsOpen(false)}>Close</Button>
          <Button variant="contained" onClick={verifyPayroll} disabled={verificationLoading || selectedEmployee?.accountsStatus === 'Verified'}>
            {verificationLoading ? 'Verifying...' : selectedEmployee?.accountsStatus === 'Verified' ? 'Verified' : 'Verify Employee'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={payOpen} onClose={closePayDialog} fullWidth maxWidth="sm">
        <DialogTitle>Pay Teacher Salary</DialogTitle>
        <DialogContent>
          {(selectedTeacher || selectedTeachers.length > 0) && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Alert severity="info">
                This salary payment will be submitted for principal approval before being finalized.
              </Alert>
              {selectedTeacher ? (
                <Typography><strong>{getDisplayName(selectedTeacher)}</strong></Typography>
              ) : (
                <Typography>
                  <strong>{selectedTeachers.length}</strong> teachers selected for bulk salary payment.
                </Typography>
              )}
              {selectedTeacher ? (
                <TextField
                  label="Salary Amount"
                  type="number"
                  value={amount}
                  fullWidth
                  disabled
                  helperText={
                    amount
                      ? 'Salary amount is pulled from HR-defined records.'
                      : 'Salary amount is not set by HR. Please ask HR to define the salary first.'
                  }
                />
              ) : (
                <Alert severity="info">
                  Teacher salary amounts will be pulled automatically from HR-defined salary records for the selected teachers.
                  {allSelectedSalariesPresent && (
                    <div>{`Total salary amount for selected teachers: KES ${totalSelectedSalaryAmount.toLocaleString()}`}</div>
                  )}
                </Alert>
              )}
              <TextField
                label="Payment Method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                fullWidth
              />
              <TextField
                label="Bank Name"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                fullWidth
                helperText="This is fetched from HR profile if available"
              />
              <TextField
                label="Account Number"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                fullWidth
                helperText="This is fetched from HR profile if available"
              />
              <TextField
                label="Account Holder Name"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                fullWidth
                helperText="This is fetched from HR profile if available"
              />
              <TextField
                label="Reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                fullWidth
              />
              <TextField
                label="Note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                multiline
                rows={3}
                fullWidth
              />
              {paymentError && <Alert severity="error">{paymentError}</Alert>}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closePayDialog} disabled={paymentLoading}>Cancel</Button>
          <Button onClick={handleSalaryPayment} disabled={paymentLoading} variant="contained">
            {paymentLoading ? 'Processing...' : 'Submit Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccountantPayroll;