const express = require('express');
const router = express.Router();
const { verifyAdmin } = require('../middleware/superadminAuth');
const {
    addEmployee,
    approveEmployeePayment,
    rejectEmployeePayment,
    payEmployeeSalary,
    verifyEmployeePayroll,
    getAllEmployees,
    getEmployeeById,
    updateEmployee,
    deleteEmployee,
    getEmployeesByDepartment,
    getEmployeeStats,
} = require('../controllers/employee-controller');
const { preparePayroll, listPayroll, approvePayroll } = require('../controllers/payroll-controller');

// Employee routes
router.get('/api/hr/employees', verifyAdmin, getAllEmployees);
router.post('/api/hr/employees', verifyAdmin, addEmployee);
router.get('/api/hr/employees/:id', verifyAdmin, getEmployeeById);
router.put('/api/hr/employees/:id', verifyAdmin, updateEmployee);
router.delete('/api/hr/employees/:id', verifyAdmin, deleteEmployee);
router.get('/api/hr/employees/by-department', verifyAdmin, getEmployeesByDepartment);
router.get('/api/hr/employees/stats', verifyAdmin, getEmployeeStats);
router.post('/Employee/Add', verifyAdmin, addEmployee);
router.post('/Employee/:id/Pay', verifyAdmin, payEmployeeSalary);
router.put('/Employee/:id/VerifyPayroll', verifyAdmin, verifyEmployeePayroll);
router.put('/Employee/:id/Pay/Approve', verifyAdmin, approveEmployeePayment);
router.put('/Employee/:id/Payment/:paymentIndex/Approve', verifyAdmin, approveEmployeePayment);
router.put('/Employee/:id/Payment/:paymentIndex/Reject', verifyAdmin, rejectEmployeePayment);
router.get('/Employee/GetAll', verifyAdmin, getAllEmployees);
router.get('/Employee/:id', verifyAdmin, getEmployeeById);
router.put('/Employee/:id', verifyAdmin, updateEmployee);
router.delete('/Employee/:id', verifyAdmin, deleteEmployee);
router.get('/Employee/ByDepartment/List', verifyAdmin, getEmployeesByDepartment);
router.get('/Employee/Stats/Summary', verifyAdmin, getEmployeeStats);
router.post('/Payroll/Prepare', verifyAdmin, preparePayroll);
router.get('/Payroll', verifyAdmin, listPayroll);
router.put('/Payroll/:id/Approve', verifyAdmin, approvePayroll);

module.exports = router;