const ExpenseClaim = require('../models/expenseClaimSchema');
const { logEntityCreation, logEntityUpdate } = require('../utils/auditLogger');

const resolveSchoolId = (admin) => {
    if (!admin) return null;
    return admin.school || admin._id;
};

const submitExpenseClaim = async (req, res) => {
    try {
        const { claimType, amount, description, date, attachmentUrl, currency } = req.body;
        const schoolId = resolveSchoolId(req.admin);

        if (!schoolId) {
            return res.status(400).json({ message: 'Unable to resolve school context for this admin.' });
        }

        if (!claimType || !description || amount === undefined || amount === null) {
            return res.status(400).json({ message: 'claimType, amount, and description are required.' });
        }

        const parsedAmount = Number(amount);
        if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ message: 'Amount must be a positive number.' });
        }

        const claim = new ExpenseClaim({
            schoolId,
            submittedBy: req.admin._id,
            submittedByName: req.admin.name || req.admin.email || 'Unknown',
            claimType,
            amount: parsedAmount,
            currency: currency || 'KES',
            date: date ? new Date(date) : new Date(),
            description,
            attachmentUrl: attachmentUrl || '',
            createdBy: req.admin._id,
        });

        await claim.save();

        await logEntityCreation(
            schoolId,
            req.admin._id,
            req.admin.name || req.admin.email || 'Admin',
            req.admin.role || 'Admin',
            'ExpenseClaim',
            claim._id,
            `Expense claim submitted by ${claim.submittedByName}`,
            claim.toObject(),
            req.clientIP,
            req.userAgent
        );

        res.status(201).json({ message: 'Expense claim submitted successfully', claim });
    } catch (err) {
        console.error('Error submitting expense claim:', err);
        res.status(500).json({ message: 'Error submitting expense claim', error: err.message });
    }
};

const getExpenseClaims = async (req, res) => {
    try {
        const { status } = req.query;
        const schoolId = resolveSchoolId(req.admin);

        if (!schoolId) {
            return res.status(400).json({ message: 'Unable to resolve school context for this admin.' });
        }

        const query = { schoolId };
        if (status) query.status = status;

        const claims = await ExpenseClaim.find(query).sort({ createdAt: -1 });

        res.status(200).json({ message: 'Expense claims retrieved successfully', claims });
    } catch (err) {
        console.error('Error retrieving expense claims:', err);
        res.status(500).json({ message: 'Error retrieving expense claims', error: err.message });
    }
};

const updateExpenseClaimStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;

        if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status value.' });
        }

        const claim = await ExpenseClaim.findById(id);
        if (!claim) {
            return res.status(404).json({ message: 'Expense claim not found.' });
        }

        const oldClaim = claim.toObject();
        claim.status = status;
        claim.approvedBy = req.admin._id;
        claim.approvedAt = new Date();
        if (status === 'Rejected') {
            claim.rejectionReason = rejectionReason || '';
        }

        await claim.save();

        await logEntityUpdate(
            claim.schoolId,
            req.admin._id,
            req.admin.name || req.admin.email || 'Admin',
            req.admin.role || 'Admin',
            'ExpenseClaim',
            claim._id,
            `Expense claim ${status.toLowerCase()} by ${req.admin.name || req.admin.email}`,
            oldClaim,
            claim.toObject(),
            [],
            req.clientIP,
            req.userAgent
        );

        res.status(200).json({ message: `Expense claim ${status.toLowerCase()} successfully`, claim });
    } catch (err) {
        console.error('Error updating expense claim status:', err);
        res.status(500).json({ message: 'Error updating expense claim status', error: err.message });
    }
};

module.exports = {
    submitExpenseClaim,
    getExpenseClaims,
    updateExpenseClaimStatus,
};