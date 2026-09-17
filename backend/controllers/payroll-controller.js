const Payroll = require('../models/payrollSchema');
const Employee = require('../models/employeeSchema');
const { logAuditAction } = require('../utils/auditLogger');

const getSchoolId = (user) => user?.school || user?.schoolId || user?._id;
const sumValues = (values) => values.reduce((sum, value) => sum + (Number(value) || 0), 0);

const preparePayroll = async (req, res) => {
    try {
        if (!['Accountant', 'Admin', 'SuperAdmin'].includes(req.user?.role)) return res.status(403).json({ message: 'Only Accounts or Admin staff can prepare payroll.' });
        const { period } = req.body;
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period || '')) return res.status(400).json({ message: 'Payroll period must use YYYY-MM format.' });
        const school = getSchoolId(req.user);
        const employees = await Employee.find({ school, status: 'Active', payrollStatus: 'Verified', accountsStatus: 'Verified' });
        if (!employees.length) return res.status(400).json({ message: 'No active verified employees are available for this payroll period.' });

        const lines = employees.map((employee) => {
            const salary = employee.salary || {};
            const grossSalary = Number(salary.grossSalary || salary.baseSalary || 0);
            const allowances = sumValues(Object.values(employee.allowances?.toObject ? employee.allowances.toObject() : employee.allowances || {}));
            const deductions = sumValues(Object.values(employee.deductions?.toObject ? employee.deductions.toObject() : employee.deductions || {}));
            return { employee: employee._id, employeeNo: employee.employeeId, employeeName: `${employee.firstName} ${employee.lastName}`, grossSalary, allowances, deductions, netPay: Math.max(0, grossSalary + allowances - deductions) };
        });
        const payroll = await Payroll.findOneAndUpdate(
            { school, period },
            { school, period, lines, totalGross: sumValues(lines.map((line) => line.grossSalary + line.allowances)), totalDeductions: sumValues(lines.map((line) => line.deductions)), totalNet: sumValues(lines.map((line) => line.netPay)), status: 'Pending Approval', preparedBy: req.userId },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        await logAuditAction({ school, user: req.userId, userName: req.user.name || req.user.email, userRole: req.user.role, action: 'CREATE', entityType: 'report', entityId: payroll._id, entityName: `Payroll ${period}`, resultMessage: 'Payroll prepared and submitted for approval', metadata: { period, employeeCount: lines.length, totalNet: payroll.totalNet }, req });
        return res.status(201).json({ message: 'Payroll prepared and submitted for approval', payroll });
    } catch (error) { return res.status(500).json({ message: 'Payroll preparation failed', error: error.message }); }
};

const listPayroll = async (req, res) => {
    try {
        if (!['Accountant', 'Admin', 'SuperAdmin'].includes(req.user?.role)) return res.status(403).json({ message: 'Only Accounts or Admin staff can view payroll.' });
        const payrolls = await Payroll.find({ school: getSchoolId(req.user) }).sort({ period: -1 }).populate('preparedBy', 'name email').populate('approvedBy', 'name email');
        return res.json({ payrolls });
    } catch (error) { return res.status(500).json({ message: 'Unable to load payroll', error: error.message }); }
};

const approvePayroll = async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin'].includes(req.user?.role)) return res.status(403).json({ message: 'Only an Admin or SuperAdmin can approve payroll.' });
        const payroll = await Payroll.findById(req.params.id);
        if (!payroll || String(payroll.school) !== String(getSchoolId(req.user))) return res.status(404).json({ message: 'Payroll not found' });
        if (payroll.status !== 'Pending Approval') return res.status(400).json({ message: 'Only pending payroll can be approved.' });
        payroll.status = 'Approved'; payroll.approvedBy = req.userId; payroll.approvedAt = new Date(); await payroll.save();
        await logAuditAction({ school: payroll.school, user: req.userId, userName: req.user.name || req.user.email, userRole: req.user.role, action: 'APPROVE', entityType: 'report', entityId: payroll._id, entityName: `Payroll ${payroll.period}`, resultMessage: 'Payroll approved for payment', req });
        return res.json({ message: 'Payroll approved for payment', payroll });
    } catch (error) { return res.status(500).json({ message: 'Payroll approval failed', error: error.message }); }
};

module.exports = { preparePayroll, listPayroll, approvePayroll };