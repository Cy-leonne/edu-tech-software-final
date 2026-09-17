const mongoose = require('mongoose');
const Employee = require('../models/employeeSchema');
const Admin = require('../models/adminSchema');
const School = require('../models/schoolSchema');
const { validateEmployee } = require('../utils/validation');
const { logAuditAction } = require('../utils/auditLogger');
const { sendEmail } = require('../services/emailService');
const { sendSMS } = require('../services/smsService');
const Message = require('../models/messageSchema');
const { sanitizeEmployeePayload } = require('../utils/employeePayload');

const calculatePayee = (grossSalary) => {
    const salary = Number(grossSalary) || 0;
    let tax = 0;
    if (salary <= 24000) {
        tax = salary * 0.1;
    } else if (salary <= 32333) {
        tax = 2400 + (salary - 24000) * 0.25;
    } else {
        tax = 2400 + (32333 - 24000) * 0.25 + (salary - 32333) * 0.3;
    }
    return Number(tax.toFixed(2));
};

const calculateNssf = (grossSalary) => {
    const salary = Number(grossSalary) || 0;
    const contribution = Number((salary * 0.06).toFixed(2));
    const maxContribution = 1080;
    return Number(Math.min(contribution, maxContribution).toFixed(2));
};

const calculateNhif = (grossSalary) => {
    const salary = Number(grossSalary) || 0;
    if (salary <= 5999) return 150;
    if (salary <= 7999) return 300;
    if (salary <= 11999) return 400;
    if (salary <= 14999) return 500;
    if (salary <= 19999) return 600;
    if (salary <= 24999) return 750;
    if (salary <= 29999) return 850;
    if (salary <= 34999) return 900;
    if (salary <= 39999) return 950;
    if (salary <= 44999) return 1000;
    if (salary <= 49999) return 1100;
    if (salary <= 59999) return 1200;
    if (salary <= 69999) return 1300;
    if (salary <= 79999) return 1400;
    if (salary <= 89999) return 1500;
    if (salary <= 99999) return 1600;
    if (salary <= 149999) return 1700;
    if (salary <= 199999) return 1800;
    if (salary <= 249999) return 1900;
    if (salary <= 299999) return 2000;
    if (salary <= 349999) return 2100;
    if (salary <= 399999) return 2200;
    if (salary <= 449999) return 2300;
    if (salary <= 499999) return 2400;
    if (salary <= 599999) return 2500;
    if (salary <= 699999) return 2600;
    if (salary <= 799999) return 2700;
    if (salary <= 899999) return 2800;
    if (salary <= 999999) return 2900;
    return 3000;
};

const calculatePayroll = ({ salary = {}, allowances = {}, deductions = {} }) => {
    const baseSalary = Number(salary.baseSalary) || 0;
    const allowanceTotal = Object.values(allowances).reduce(
        (sum, value) => sum + Number(value || 0),
        0
    );
    const manualDeductions = Object.values(deductions).reduce(
        (sum, value) => sum + Number(value || 0),
        0
    );
    const grossSalary = Number((baseSalary + allowanceTotal).toFixed(2));
    const payee = calculatePayee(grossSalary);
    const nssf = calculateNssf(grossSalary);
    const nhif = calculateNhif(grossSalary);
    const housingLevy = Number((grossSalary * 0.015).toFixed(2));
    const sha = Number((grossSalary * 0.02).toFixed(2));
    const totalDeductions = Number((manualDeductions + payee + nssf + nhif + housingLevy + sha).toFixed(2));
    const netSalary = Number((grossSalary - totalDeductions).toFixed(2));
    return {
        grossSalary,
        netSalary: netSalary >= 0 ? netSalary : 0,
        payee,
        nssf,
        nhif,
        housingLevy,
        sha,
        totalDeductions,
    };
};

// Helper function to get admin role from request
const getAdminRole = async (adminId) => {
    try {
        const admin = await Admin.findById(adminId).select('role roles');
        return admin?.role || admin?.roles?.[0] || 'Admin';
    } catch (err) {
        return 'Admin';
    }
};

// Check if admin can edit employee profiles (HR and Admin only, not Accountant)
const canEditEmployeeProfile = (adminRole) => {
    return ['Admin', 'SuperAdmin', 'HR'].includes(adminRole);
};

// Check if admin can delete employee (HR and Admin only, not Accountant)
const canDeleteEmployee = (adminRole) => {
    return ['Admin', 'SuperAdmin', 'HR'].includes(adminRole);
};

// Check if admin can process staff payroll payments
const canProcessPayroll = (adminRole) => {
    return ['Admin', 'SuperAdmin', 'Accountant'].includes(adminRole);
};

const getPayrollPeriod = (date = new Date()) => {
    const paymentDate = new Date(date);
    return `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
};

const ensureSchoolAccessible = async (schoolId, adminContext = null) => {
    if (!schoolId && !adminContext?.school && !adminContext?.schoolId && !adminContext?.schoolName) {
        return { allowed: false, message: 'School ID is required' };
    }

    const candidateSchoolIds = [];
    if (schoolId) candidateSchoolIds.push(schoolId);
    if (adminContext?.school) candidateSchoolIds.push(adminContext.school.toString());
    if (adminContext?.schoolId) candidateSchoolIds.push(adminContext.schoolId.toString());

    for (const candidate of candidateSchoolIds) {
        if (mongoose.Types.ObjectId.isValid(candidate)) {
            const school = await School.findById(candidate).select('_id status schoolName');
            if (school) {
                if (school.status === 'Suspended') {
                    return { allowed: false, message: 'Access denied. This school account is suspended.' };
                }
                return { allowed: true, school, resolvedSchoolId: school._id.toString() };
            }
        }
    }

    if (adminContext?.schoolName) {
        const schoolByName = await School.findOne({ schoolName: adminContext.schoolName }).select('_id status schoolName');
        if (schoolByName) {
            return schoolByName.status === 'Suspended'
                ? { allowed: false, message: 'Access denied. This school account is suspended.' }
                : { allowed: true, school: schoolByName, resolvedSchoolId: schoolByName._id.toString() };
        }
    }

    if (adminContext?.school) {
        const school = await School.findById(adminContext.school).select('_id status schoolName');
        if (school) {
            if (school.status === 'Suspended') {
                return { allowed: false, message: 'Access denied. This school account is suspended.' };
            }
            return { allowed: true, school, resolvedSchoolId: school._id.toString() };
        }
    }

    // Fallback: some installations store school details as Admin records instead of School documents.
    try {
        // Try resolving by provided id in Admin collection
        if (schoolId && mongoose.Types.ObjectId.isValid(schoolId)) {
            const adminAsSchool = await Admin.findById(schoolId).select('_id approved schoolName');
            if (adminAsSchool) {
                if (adminAsSchool.approved === false) {
                    return { allowed: false, message: 'Access denied. This school account is not approved.' };
                }
                return { allowed: true, school: adminAsSchool, resolvedSchoolId: adminAsSchool._id.toString() };
            }
        }

        // Try resolving by schoolName on Admin collection
        if (adminContext?.schoolName) {
            const adminByName = await Admin.findOne({ schoolName: adminContext.schoolName }).select('_id approved schoolName');
            if (adminByName) {
                if (adminByName.approved === false) {
                    return { allowed: false, message: 'Access denied. This school account is not approved.' };
                }
                return { allowed: true, school: adminByName, resolvedSchoolId: adminByName._id.toString() };
            }
        }
    } catch (err) {
        // ignore fallback errors
    }

    return { allowed: false, message: 'School not found' };
};

// Add a new employee
const addEmployee = async (req, res) => {
    try {
        // Check authorization
        const adminRole = await getAdminRole(req.userId);
        if (!canEditEmployeeProfile(adminRole)) {
            return res.status(403).json({
                message: 'Permission denied. Only HR and Admin staff can add employees. Accountants cannot add employees.'
            });
        }

        const sanitizedBody = sanitizeEmployeePayload(req.body);
        const { school } = sanitizedBody;

        const schoolAccess = await ensureSchoolAccessible(school, req.user);
        if (!schoolAccess.allowed) {
            return res.status(403).json({ message: schoolAccess.message });
        }

        const resolvedSchoolId = schoolAccess.resolvedSchoolId || school;

        // Validate input
        const validation = validateEmployee(sanitizedBody);
        if (!validation.valid) {
            return res.status(400).json({ message: 'Validation errors', errors: validation.errors });
        }

        const duplicateChecks = [];
        if (sanitizedBody.email) duplicateChecks.push({ email: sanitizedBody.email });
        if (sanitizedBody.employeeId) duplicateChecks.push({ employeeId: sanitizedBody.employeeId });
        if (sanitizedBody.idNumber) duplicateChecks.push({ idNumber: sanitizedBody.idNumber });

        const existingEmployee = duplicateChecks.length > 0
            ? await Employee.findOne({ $or: duplicateChecks })
            : null;

        if (existingEmployee) {
            return res.status(200).json({
                message: 'Employee already exists and was loaded',
                employee: existingEmployee,
                created: false,
            });
        }

        // Generate employee ID if not provided and ensure it is unique
        let employeeId = sanitizedBody.employeeId;
        if (!employeeId) {
            let nextIndex = await Employee.countDocuments({ school: resolvedSchoolId }) + 1;
            employeeId = `EMP${String(nextIndex).padStart(5, '0')}`;
            while (await Employee.exists({ school: resolvedSchoolId, employeeId })) {
                nextIndex += 1;
                employeeId = `EMP${String(nextIndex).padStart(5, '0')}`;
            }
        }

        const employeeData = {
            ...sanitizedBody,
            employeeId,
            school: resolvedSchoolId,
            createdBy: req.userId,
            status: 'Active',
            payrollStatus: 'Pending Verification',
            accountsStatus: 'Not Yet Verified',
        };

        const computedSalary = calculatePayroll({
            salary: employeeData.salary,
            allowances: employeeData.allowances,
            deductions: employeeData.deductions,
        });
        employeeData.salary = {
            ...employeeData.salary,
            ...computedSalary,
        };

        const employee = new Employee(employeeData);
        try {
            await employee.save();
        } catch (saveErr) {
            if (saveErr?.code === 11000) {
                const duplicateChecks = [];
                if (sanitizedBody.email) duplicateChecks.push({ email: sanitizedBody.email });
                if (employeeData.employeeId) duplicateChecks.push({ employeeId: employeeData.employeeId });
                if (sanitizedBody.idNumber) duplicateChecks.push({ idNumber: sanitizedBody.idNumber });

                const duplicateEmployee = duplicateChecks.length > 0
                    ? await Employee.findOne({ $or: duplicateChecks })
                    : null;

                if (duplicateEmployee) {
                    return res.status(200).json({
                        message: 'Employee already exists and was loaded',
                        employee: duplicateEmployee,
                        created: false,
                    });
                }
            }
            throw saveErr;
        }

        // Log action
        await logAuditAction({
            school: resolvedSchoolId,
            user: req.userId,
            userName: req.user?.name || req.user?.email || 'Admin',
            userRole: req.user?.role || 'Admin',
            action: 'CREATE',
            entityType: 'employee',
            entityId: employee._id,
            entityName: `${employee.firstName} ${employee.lastName}`,
            resultMessage: 'Employee added successfully',
            status: 'success',
            statusCode: 201,
            req,
        });

        // Send notification emails/SMS to the new employee (if contact provided)
        try {
            const emailBody = `Hi ${employee.firstName},\n\nWelcome to the school. Your employee ID is ${employee.employeeId}. Please contact HR for login details.`;
            if (employee.email) {
                await sendEmail(employee.email, 'Welcome to the School', emailBody);
            }
            if (employee.phone) {
                await sendSMS(employee.phone, `Welcome ${employee.firstName}. Your employee ID: ${employee.employeeId}`);
            }
        } catch (notifyErr) {
            console.warn('Employee notification failed:', notifyErr.message || notifyErr);
        }

        // Notify the admin who added the employee via internal Message record and optional email/SMS
        try {
            const admin = await Admin.findById(req.userId).select('firstName lastName email phone role school');
            const adminName = admin ? `${admin.firstName || ''} ${admin.lastName || ''}`.trim() : 'Admin';
            const msgBody = `Employee ${employee.firstName} ${employee.lastName} (${employee.email || 'no-email'}) was added successfully by ${adminName}. EmployeeId: ${employee.employeeId}`;

            const messageRecord = new Message({
                sender: req.userId,
                senderRole: admin?.role || 'Admin',
                recipientType: 'HR',
                recipientModel: 'admin',
                recipient: req.userId,
                recipientEmail: admin?.email || '',
                recipientPhone: admin?.phone || '',
                school: employee.school,
                messageSubject: 'New Employee Added',
                messageBody: msgBody,
                messageType: 'Both',
                status: 'Sent',
                sentAt: new Date(),
            });

            if (admin?.email) {
                const emailRes = await sendEmail(admin.email, 'New Employee Added', msgBody);
                messageRecord.deliveryStatus.email = emailRes.success ? 'Sent' : 'Failed';
                messageRecord.deliveryStatus.emailSentAt = new Date();
                if (!emailRes.success) messageRecord.deliveryStatus.emailErrorMessage = emailRes.error;
            }

            if (admin?.phone) {
                const smsRes = await sendSMS(admin.phone, msgBody);
                messageRecord.deliveryStatus.sms = smsRes.success ? 'Sent' : 'Failed';
                messageRecord.deliveryStatus.smsSentAt = new Date();
                if (!smsRes.success) messageRecord.deliveryStatus.smsErrorMessage = smsRes.error;
            }

            await messageRecord.save();
        } catch (notifyAdminErr) {
            console.warn('Admin notification failed:', notifyAdminErr.message || notifyAdminErr);
        }

        res.status(201).json({
            message: 'Employee added successfully',
            employee,
        });
    } catch (err) {
        console.error('Add Employee Error:', err);
        if (err.code === 11000) {
            const duplicateField = Object.keys(err.keyValue || {})[0];
            const duplicateMessage = duplicateField
                ? `${duplicateField.charAt(0).toUpperCase() + duplicateField.slice(1)} already exists.`
                : 'Duplicate field value error';
            return res.status(409).json({ message: duplicateMessage, error: err.message });
        }
        res.status(500).json({ message: 'Error adding employee', error: err.message });
    }
};

const approveEmployeePayment = async (req, res) => {
    try {
        const adminRole = await getAdminRole(req.userId);
        if (!['Admin', 'SuperAdmin'].includes(adminRole)) {
            return res.status(403).json({
                message: 'Permission denied. Only Admin staff can approve staff payments.'
            });
        }

        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Determine which payment to approve. If no index provided, default to the latest payment
        let paymentIndexRaw = req.params.paymentIndex ?? req.query.paymentIndex ?? req.body.paymentIndex;
        let paymentIndex = typeof paymentIndexRaw !== 'undefined' && paymentIndexRaw !== null ? Number(paymentIndexRaw) : null;
        if (paymentIndex === null) {
            paymentIndex = (employee.paymentHistory && employee.paymentHistory.length) ? employee.paymentHistory.length - 1 : -1;
        }

        if (!Number.isInteger(paymentIndex) || paymentIndex < 0 || !employee.paymentHistory?.[paymentIndex]) {
            return res.status(404).json({ message: 'Staff payment not found' });
        }

        const payment = employee.paymentHistory[paymentIndex];
        const payrollPeriod = payment.payrollPeriod || getPayrollPeriod(payment.paymentDate);
        const duplicateApprovedPayment = employee.paymentHistory.some((entry, index) => {
            if (index === paymentIndex) return false;
            const entryPeriod = entry.payrollPeriod || getPayrollPeriod(entry.paymentDate);
            return entryPeriod === payrollPeriod
                && (entry.status === 'Paid' || entry.approvalStatus === 'Approved');
        });
        if (duplicateApprovedPayment) {
            return res.status(400).json({ message: 'This employee has already received salary for this payroll month.' });
        }
        const paymentAmount = Number(payment.netAmount || payment.grossAmount || 0);
        if (!paymentAmount || paymentAmount <= 0) {
            return res.status(400).json({ message: 'Payment amount must be greater than zero' });
        }

        const schoolAccess = await ensureSchoolAccessible(employee.school, req.user);
        if (!schoolAccess.allowed) {
            return res.status(403).json({ message: schoolAccess.message });
        }

        payment.status = 'Paid';
        payment.approvalStatus = 'Approved';
        payment.approvedBy = req.userId;
        payment.approvalDate = new Date();

        const school = await School.findById(employee.school);
        if (school) {
            const currentSchoolBalance = Number(school.accountBalance || 0);
            school.accountBalance = currentSchoolBalance - paymentAmount;
            school.accountLedger = school.accountLedger || [];
            school.accountLedger.push({
                type: 'Debit',
                amount: paymentAmount,
                reference: payment.referenceNumber || `EMPLOYEE-PAYMENT-${employee._id}-${paymentIndex}`,
                description: `Approved staff payment for ${employee.firstName || employee.lastName || 'employee'}`,
                relatedEntity: 'Employee',
                entityId: employee._id,
                createdBy: req.userId,
            });
            await school.save();
        }

        employee.accountBalance = Number(employee.accountBalance || 0) + paymentAmount;
        employee.accountLedger = employee.accountLedger || [];
        employee.accountLedger.push({
            type: 'Credit',
            amount: paymentAmount,
            reference: payment.referenceNumber || `EMPLOYEE-PAYMENT-${employee._id}-${paymentIndex}`,
            description: `Staff payment credited to ${employee.firstName || employee.lastName || 'employee'}`,
            relatedEntity: 'Employee',
            entityId: employee._id,
            createdBy: req.userId,
        });

        await employee.save();

        res.status(200).json({
            message: 'Staff payment approved successfully and the school bank balance has been debited while the employee account has been credited.',
            employee,
            schoolBalance: school ? school.accountBalance : null,
            employeeBalance: employee.accountBalance,
        });
    } catch (err) {
        console.error('Approve Employee Payment Error:', err);
        res.status(500).json({ message: 'Failed to approve staff payment', error: err.message });
    }
};

const rejectEmployeePayment = async (req, res) => {
    try {
        const adminRole = await getAdminRole(req.userId);
        if (!['Admin', 'SuperAdmin'].includes(adminRole)) {
            return res.status(403).json({ message: 'Permission denied. Only Admin staff can reject staff payments.' });
        }
        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });
        const payment = employee.paymentHistory?.[req.params.paymentIndex];
        if (!payment) return res.status(404).json({ message: 'Staff payment not found' });
        if (payment.approvalStatus !== 'Pending' && payment.status !== 'Pending') {
            return res.status(400).json({ message: 'Only pending staff payments can be rejected' });
        }
        payment.status = 'Failed';
        payment.approvalStatus = 'Rejected';
        payment.approvedBy = req.userId;
        payment.approvalDate = new Date();
        payment.rejectionReason = req.body.reason || 'Payment details were rejected';
        await employee.save();
        res.json({ message: 'Staff payment rejected; school funds were not debited', employee });
    } catch (err) {
        res.status(500).json({ message: 'Failed to reject staff payment', error: err.message });
    }
};

// Record a payroll payment for an employee
const payEmployeeSalary = async (req, res) => {
    try {
        const adminRole = await getAdminRole(req.userId);
        if (!canProcessPayroll(adminRole)) {
            return res.status(403).json({
                message: 'Permission denied. Only Accountant and Admin staff can process staff payments.'
            });
        }

        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const { amount, paymentMethod = 'Cash', note = '', reference = '', bankName = '', bankAccount = '', accountHolderName = '' } = req.body;
        let numericAmount = Number(amount);
        if ((!amount || numericAmount <= 0) && employee.salary) {
            numericAmount = Number(employee.salary.netSalary || employee.salary.grossSalary || employee.salary.baseSalary || 0);
        }

        if (!numericAmount || numericAmount <= 0) {
            return res.status(400).json({ message: 'Salary amount must be greater than zero and should be set by HR.' });
        }

        const schoolAccess = await ensureSchoolAccessible(employee.school, req.user);
        if (!schoolAccess.allowed) {
            return res.status(403).json({ message: schoolAccess.message });
        }

        if (employee.accountsStatus !== 'Verified' || employee.payrollStatus !== 'Verified') {
            return res.status(400).json({ message: 'Employee payroll must be verified by Accounts before payment.' });
        }

        employee.paymentHistory = employee.paymentHistory || [];
        const payrollPeriod = getPayrollPeriod();
        const alreadyPaidThisPeriod = employee.paymentHistory.some((entry) => {
            const entryPeriod = entry.payrollPeriod || getPayrollPeriod(entry.paymentDate);
            return entryPeriod === payrollPeriod
                && (entry.status === 'Paid' || entry.approvalStatus === 'Approved');
        });
        if (alreadyPaidThisPeriod) {
            return res.status(400).json({ message: 'This employee has already received salary for the current month.' });
        }
        // Consider payments pending when either `status` or `approvalStatus` indicates pending
        const pendingPayment = employee.paymentHistory.some((entry) => entry.status === 'Pending' || entry.approvalStatus === 'Pending');
        if (pendingPayment) {
            return res.status(400).json({ message: 'A payment is already pending for this employee.' });
        }

        employee.paymentHistory.push({
            paymentDate: new Date(),
            payrollPeriod,
            grossAmount: numericAmount,
            netAmount: numericAmount,
            paymentMethod,
            referenceNumber: reference,
            status: 'Processed',
            approvalStatus: 'Pending',
            approvedBy: null,
            approvalDate: null,
            notes: note,
            processedBy: req.userId,
            bankName: bankName || employee.paymentDetails?.bankInfo?.bankName || '',
            bankAccount: bankAccount || employee.paymentDetails?.bankInfo?.accountNumber || '',
            accountHolderName: accountHolderName || employee.paymentDetails?.bankInfo?.accountHolderName || '',
        });

        await employee.save();

        res.status(200).json({
            message: 'Staff payment recorded successfully',
            employee,
        });
    } catch (err) {
        console.error('Pay Employee Error:', err);
        res.status(500).json({ message: 'Error processing staff payment', error: err.message });
    }
};

const verifyEmployeePayroll = async (req, res) => {
    try {
        const adminRole = await getAdminRole(req.userId);
        if (!['Accountant', 'Admin', 'SuperAdmin'].includes(adminRole)) {
            return res.status(403).json({ message: 'Permission denied. Only Accounts or Admin staff can verify payroll.' });
        }

        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        const schoolAccess = await ensureSchoolAccessible(employee.school, req.user);
        if (!schoolAccess.allowed) return res.status(403).json({ message: schoolAccess.message });

        const salary = Number(employee.salary?.grossSalary || employee.salary?.netSalary || employee.salary?.baseSalary || 0);
        const bankInfo = employee.paymentDetails?.bankInfo || {};
        const mobileMoneyInfo = employee.paymentDetails?.mobileMoneyInfo || {};
        const hasPaymentDetails = Boolean(
            bankInfo.accountNumber || mobileMoneyInfo.phoneNumber || employee.paymentDetails?.paymentMethod === 'Cash'
        );
        const deductions = employee.deductions?.toObject ? employee.deductions.toObject() : employee.deductions;
        const hasDeductions = Boolean(deductions && Object.keys(deductions).length > 0);
        const checks = {
            employeeExists: true,
            employmentActive: employee.status === 'Active',
            salaryCorrect: salary > 0,
            paymentDetailsCorrect: hasPaymentDetails,
            deductionsConfigured: Boolean(hasDeductions),
            payrollPeriodCorrect: Boolean(employee.payrollPeriod),
        };

        const failedChecks = Object.entries(checks).filter(([, passed]) => !passed).map(([check]) => check);
        if (failedChecks.length > 0) {
            return res.status(400).json({ message: 'Payroll verification failed', checks, failedChecks });
        }

        employee.payrollStatus = 'Verified';
        employee.accountsStatus = 'Verified';
        employee.accountsVerifiedBy = req.userId;
        employee.accountsVerifiedAt = new Date();
        await employee.save();

        await logAuditAction({
            school: employee.school,
            user: req.userId,
            userName: req.user?.name || req.user?.email || 'Accounts',
            userRole: adminRole,
            action: 'APPROVE',
            entityType: 'employee',
            entityId: employee._id,
            entityName: `${employee.firstName} ${employee.lastName}`,
            resultMessage: 'Employee payroll details verified by Accounts',
            metadata: { checks, payrollPeriod: employee.payrollPeriod },
            req,
        });

        return res.status(200).json({ message: 'Employee payroll verified successfully', employee, checks });
    } catch (error) {
        return res.status(500).json({ message: 'Payroll verification failed', error: error.message });
    }
};

// Get all employees for a school
const getAllEmployees = async (req, res) => {
    try {
        const { school } = req.query;
        const adminContext = req.user || req.admin || {};
        const candidateSchoolIds = [
            school,
            req.user?.school?.toString(),
            req.user?.schoolId?.toString(),
            req.admin?.school?.toString(),
            req.admin?.schoolId?.toString(),
            adminContext?.school,
            adminContext?.schoolId,
            adminContext?.schoolName,
        ].filter(Boolean);

        const resolvedSchoolId = candidateSchoolIds.find((value) => value && String(value).trim()) || '';

        let schoolAccess = null;
        if (resolvedSchoolId) {
            schoolAccess = await ensureSchoolAccessible(resolvedSchoolId, adminContext);
        }

        if (!schoolAccess?.allowed || !resolvedSchoolId) {
            const fallbackEmployees = await Employee.find({}).select('-documents').populate('reportingTo', 'firstName lastName position').limit(100);
            return res.status(200).json({
                message: 'Employees retrieved successfully using fallback lookup',
                count: fallbackEmployees.length,
                employees: fallbackEmployees,
            });
        }

        const employeeSchoolIds = [
            schoolAccess.resolvedSchoolId,
            resolvedSchoolId,
            ...candidateSchoolIds,
        ]
            .map((value) => value?._id || value?.id || value?.schoolId || value)
            .filter(Boolean)
            .map((value) => String(value))
            .filter((value) => mongoose.Types.ObjectId.isValid(value));

        const employees = await Employee.find({ school: { $in: [...new Set(employeeSchoolIds)] } })
            .select('-documents')
            .populate('reportingTo', 'firstName lastName position');

        res.status(200).json({
            message: 'Employees retrieved successfully',
            count: employees.length,
            employees,
        });
    } catch (err) {
        console.error('Get Employees Error:', err);
        const fallbackEmployees = await Employee.find({}).select('-documents').populate('reportingTo', 'firstName lastName position').limit(100);
        res.status(200).json({
            message: 'Employees retrieved successfully using fallback lookup',
            count: fallbackEmployees.length,
            employees: fallbackEmployees,
        });
    }
};

// Get employee by ID
const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid employee ID' });
        }

        const employee = await Employee.findById(id)
            .populate('reportingTo', 'firstName lastName position')
            .populate('createdBy', 'firstName lastName email');

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const schoolAccess = await ensureSchoolAccessible(employee.school);
        if (!schoolAccess.allowed) {
            return res.status(403).json({ message: schoolAccess.message });
        }

        res.status(200).json({
            message: 'Employee retrieved successfully',
            employee,
        });
    } catch (err) {
        console.error('Get Employee Error:', err);
        res.status(500).json({ message: 'Error fetching employee', error: err.message });
    }
};

// Update employee
const updateEmployee = async (req, res) => {
    try {
        // Check authorization
        const adminRole = await getAdminRole(req.userId);
        if (!canEditEmployeeProfile(adminRole)) {
            return res.status(403).json({
                message: 'Permission denied. Only HR and Admin staff can edit employee profiles. Accountants cannot edit employee details.'
            });
        }

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid employee ID' });
        }

        const employee = await Employee.findById(id);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const schoolAccess = await ensureSchoolAccessible(employee.school);
        if (!schoolAccess.allowed) {
            return res.status(403).json({ message: schoolAccess.message });
        }

        // Validate input if making changes
        if (Object.keys(req.body).length > 0) {
            const validation = validateEmployee({ ...employee.toObject(), ...req.body });
            if (!validation.valid) {
                return res.status(400).json({ message: 'Validation errors', errors: validation.errors });
            }
        }

        const mergedSalary = {
            ...(employee.salary ? employee.salary.toObject ? employee.salary.toObject() : employee.salary : {}),
            ...req.body.salary,
        };
        const mergedAllowances = {
            ...(employee.allowances || {}),
            ...(req.body.allowances || {}),
        };
        const mergedDeductions = {
            ...(employee.deductions || {}),
            ...(req.body.deductions || {}),
        };

        const computedSalary = calculatePayroll({
            salary: mergedSalary,
            allowances: mergedAllowances,
            deductions: mergedDeductions,
        });

        const updatedData = {
            ...req.body,
            salary: {
                ...mergedSalary,
                ...computedSalary,
            },
            allowances: mergedAllowances,
            deductions: mergedDeductions,
            updatedBy: req.userId,
            updatedAt: Date.now(),
        };

        const updatedEmployee = await Employee.findByIdAndUpdate(id, updatedData, {
            new: true,
            runValidators: true,
        });

        // Log action
        await logAuditAction({
            school: employee.school,
            user: req.userId,
            userName: req.user?.name || req.user?.email || 'Admin',
            userRole: req.user?.role || 'Admin',
            action: 'Update Employee',
            entityType: 'Employee',
            entityId: employee._id,
            entityName: `${employee.firstName} ${employee.lastName}`,
            resultMessage: 'Employee updated successfully',
            status: 'success',
            statusCode: 200,
            req,
        });

        res.status(200).json({
            message: 'Employee updated successfully',
            employee: updatedEmployee,
        });
    } catch (err) {
        console.error('Update Employee Error:', err);
        res.status(500).json({ message: 'Error updating employee', error: err.message });
    }
};

// Delete employee (soft delete)
const deleteEmployee = async (req, res) => {
    try {
        // Check authorization
        const adminRole = await getAdminRole(req.userId);
        if (!canDeleteEmployee(adminRole)) {
            return res.status(403).json({
                message: 'Permission denied. Only HR and Admin staff can delete employees. Accountants cannot delete employee records.'
            });
        }

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid employee ID' });
        }

        const employee = await Employee.findById(id);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const schoolAccess = await ensureSchoolAccessible(employee.school);
        if (!schoolAccess.allowed) {
            return res.status(403).json({ message: schoolAccess.message });
        }

        // Soft delete by changing status
        employee.status = 'Inactive';
        employee.updatedBy = req.userId;
        await employee.save();

        // Log action
        await logAuditAction({
            school: employee.school,
            user: req.userId,
            userName: req.user?.name || req.user?.email || 'Admin',
            userRole: req.user?.role || 'Admin',
            action: 'Delete Employee',
            entityType: 'Employee',
            entityId: employee._id,
            entityName: `${employee.firstName} ${employee.lastName}`,
            resultMessage: 'Employee deleted successfully',
            status: 'success',
            statusCode: 200,
            req,
        });

        res.status(200).json({
            message: 'Employee deactivated successfully',
            employee,
        });
    } catch (err) {
        console.error('Delete Employee Error:', err);
        res.status(500).json({ message: 'Error deleting employee', error: err.message });
    }
};

// Get employees by department
const getEmployeesByDepartment = async (req, res) => {
    try {
        const { school, department } = req.query;

        const resolvedSchoolId = school || req.user?.school?.toString() || req.user?.schoolId?.toString() || '';
        if (!resolvedSchoolId || !department) {
            return res.status(400).json({ message: 'School ID and department are required' });
        }

        const schoolAccess = await ensureSchoolAccessible(resolvedSchoolId, req.user);
        if (!schoolAccess.allowed) {
            return res.status(403).json({ message: schoolAccess.message });
        }

        const employees = await Employee.find({ school: schoolAccess.resolvedSchoolId || resolvedSchoolId, department, status: 'Active' })
            .select('firstName lastName email position');

        res.status(200).json({
            message: 'Employees retrieved successfully',
            count: employees.length,
            employees,
        });
    } catch (err) {
        console.error('Get Employees by Department Error:', err);
        res.status(500).json({ message: 'Error fetching employees', error: err.message });
    }
};

// Get employee statistics
const getEmployeeStats = async (req, res) => {
    try {
        const { school } = req.query;
        const resolvedSchoolId = school || req.user?.school?.toString() || req.user?.schoolId?.toString() || '';

        if (!resolvedSchoolId) {
            return res.status(400).json({ message: 'School ID is required' });
        }

        const schoolAccess = await ensureSchoolAccessible(resolvedSchoolId, req.user);
        if (!schoolAccess.allowed) {
            return res.status(403).json({ message: schoolAccess.message });
        }

        const effectiveSchoolId = schoolAccess.resolvedSchoolId || resolvedSchoolId;
        const stats = {
            totalEmployees: await Employee.countDocuments({ school: effectiveSchoolId, status: 'Active' }),
            byDepartment: await Employee.aggregate([
                { $match: { school: mongoose.Types.ObjectId(effectiveSchoolId), status: 'Active' } },
                { $group: { _id: '$department', count: { $sum: 1 } } },
            ]),
            byEmploymentType: await Employee.aggregate([
                { $match: { school: mongoose.Types.ObjectId(effectiveSchoolId), status: 'Active' } },
                { $group: { _id: '$employmentType', count: { $sum: 1 } } },
            ]),
        };

        res.status(200).json({
            message: 'Employee statistics retrieved successfully',
            stats,
        });
    } catch (err) {
        console.error('Get Employee Stats Error:', err);
        res.status(500).json({ message: 'Error fetching statistics', error: err.message });
    }
};

module.exports = {
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
};