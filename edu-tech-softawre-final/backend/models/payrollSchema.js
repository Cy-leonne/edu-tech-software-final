
const mongoose = require('mongoose');

const payrollLineSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'employee', required: true },
    employeeNo: String,
    employeeName: String,
    grossSalary: { type: Number, required: true },
    allowances: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    netPay: { type: Number, required: true },
}, { _id: false });

const payrollSchema = new mongoose.Schema({
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'school', required: true, index: true },
    period: { type: String, required: true },
    lines: { type: [payrollLineSchema], default: [] },
    totalGross: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    totalNet: { type: Number, default: 0 },
    status: { type: String, enum: ['Draft', 'Pending Approval', 'Approved', 'Paid', 'Rejected'], default: 'Draft' },
    preparedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'admin', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'admin', default: null },
    approvedAt: { type: Date, default: null },
}, { timestamps: true });

payrollSchema.index({ school: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('payroll', payrollSchema);
