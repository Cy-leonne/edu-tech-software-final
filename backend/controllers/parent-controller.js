const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Parent = require('../models/parentSchema');
const Student = require('../models/studentSchema');
const Settings = require('../models/settingsSchema');
const Admin = require('../models/adminSchema');
const { verifyEntityBelongsToAdminSchool, getAdminIdFromReq } = require('../middleware/schoolAccess');
const { initiateStkPush, queryStkPushStatus, validateCallback } = require('../services/mpesaService');
const { logAuditAction } = require('../utils/auditLogger');

const MIN_PAYMENT_AMOUNT = 1;
const MAX_PAYMENT_AMOUNT = 100000000;

/** Normalizes an email address used for parent ownership checks. */
const normalizeEmailValue = (value) => String(value || '').trim().toLowerCase();

/** Every email (or admission number fallback) that identifies the student's guardian. */
const getParentAccessEmails = (student) =>
    [
        student?.parentEmail,
        student?.guardianEmail,
        student?.email,
    ]
        .map(normalizeEmailValue)
        .filter(Boolean);

/** True when the supplied email belongs to the student's guardians. */
const parentOwnsStudent = (student, rawEmail) => {
    const email = normalizeEmailValue(rawEmail);
    if (!email) return false;
    return getParentAccessEmails(student).includes(email);
};

/**
 * Validates a payment amount without changing any business rule:
 * the value must be a finite number inside a sane range.
 */
const normalizePaymentAmount = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    if (amount < MIN_PAYMENT_AMOUNT || amount > MAX_PAYMENT_AMOUNT) return null;
    return amount;
};

/** Recomputes amountPaid / balance / paymentStatus from the payment history. */
const reconcileStudentFees = (student) => {
    const history = Array.isArray(student.paymentHistory) ? student.paymentHistory : [];
    const currentPeriod = student.feePeriodKey || 'initial';
    const completedPayments = history.filter(
        (p) => (p.feePeriodKey || 'initial') === currentPeriod && ['Completed', 'Verified'].includes(p.status)
    );
    const computedAmountPaid = completedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    student.amountPaid = computedAmountPaid;
    student.balance = (Number(student.totalFees) || 0) - computedAmountPaid;
    student.paymentStatus = completedPayments.length > 0
        ? 'Completed'
        : (history.some((p) => p.status === 'Pending') ? 'Pending' : 'Pending');
    if (history.length > 0) {
        history[history.length - 1].balanceAfter = student.balance;
    }
    return student;
};

/** Ordered list of every payment record of a student matching a checkout id. */
const findPaymentsByCheckoutId = (student, checkoutRequestId) => {
    const records = Array.isArray(student?.paymentHistory) ? student.paymentHistory : [];
    const matches = [];
    records.forEach((payment, index) => {
        if (payment.checkoutRequestId === checkoutRequestId || payment.transactionId === checkoutRequestId) {
            matches.push({ payment, index });
        }
    });
    return matches;
};

const PAYMENT_FINAL_STATES = ['Completed', 'Verified', 'Failed', 'Cancelled'];

// Parent Login - authenticate with admission number, parent email, and password
const parentLogIn = async (req, res) => {
    try {
        let { admissionNo, parentEmail, guardianEmail, password } = req.body;
        const loginEmail = parentEmail || guardianEmail;
        const normalizedParentEmail = loginEmail?.trim().toLowerCase();
        const normalizedAdmissionNo = admissionNo?.toString().trim();

        if (!normalizedParentEmail || !normalizedAdmissionNo || !password) {
            return res.status(400).send({ message: 'Parent or guardian email, student admission number, and password are required' });
        }

        const student = await Student.findOne({ admissionNo: normalizedAdmissionNo })
            .populate('school', 'schoolName')
            .populate('sclassName', 'sclassName');

        if (!student) {
            return res.status(404).send({ message: 'Student not found with the provided identifier' });
        }

        const studentParentEmail = student.parentEmail?.trim().toLowerCase();
        const studentGuardianEmail = student.guardianEmail?.trim().toLowerCase();
        const validEmails = [studentParentEmail, studentGuardianEmail].filter(Boolean);

        if (!validEmails.includes(normalizedParentEmail)) {
            return res.status(401).send({ message: 'Parent or guardian email does not match this student' });
        }

        const schoolId = student.school?._id || student.school;
        let parent = await Parent.findOne({ email: normalizedParentEmail, school: schoolId });

        const createParent = async () => {
            const hashedPassword = await bcrypt.hash(student.admissionNo, 10);
            parent = new Parent({
                email: normalizedParentEmail,
                password: hashedPassword,
                name: student.parentName || student.guardianName || student.name || 'Parent/Guardian',
                phone: student.parentPhone || student.guardianPhone,
                studentId: student._id,
                school: schoolId,
                role: 'Parent'
            });
            await parent.save();
        };

        if (!parent) {
            if (password !== student.admissionNo) {
                return res.status(401).send({ message: 'Invalid password', role: 'Parent' });
            }

            await createParent();
        } else {
            const validated = await bcrypt.compare(password, parent.password);
            if (!validated) {
                return res.status(401).send({ message: 'Invalid password', role: 'Parent' });
            }
        }

        if (!parent.studentId.equals(student._id)) {
            parent.studentId = student._id;
            await parent.save();
        }

        const parentData = parent.toObject({ getters: true });
        delete parentData.password;
        const studentObj = student.toObject({ getters: true });

        res.send({
            ...parentData,
            student: {
                id: studentObj._id,
                name: studentObj.name,
                admissionNo: studentObj.admissionNo,
                rollNum: studentObj.rollNum,
                classId: studentObj.sclassName?._id || null,
                className: studentObj.sclassName?.sclassName || null,
                totalFees: studentObj.totalFees,
                amountPaid: studentObj.amountPaid,
                balance: studentObj.balance,
                paymentStatus: studentObj.paymentStatus,
            },
            school: studentObj.school
        });
    } catch (error) {
        console.error('Parent login error:', error.message || error);
        res.status(500).json({ message: 'Login failed' });
    }
};

// Get student fee information for parent
const getStudentFeeInfo = async (req, res) => {
    try {
        const studentId = req.params.studentId || req.query.studentId || req.body.studentId;
        const parentEmail = req.query.parentEmail?.trim().toLowerCase();

        if (!studentId || !parentEmail) {
            return res.status(400).send({ message: 'Student ID and parent email required' });
        }

        const student = await Student.findById(studentId)
            .populate("sclassName", "sclassName");

        if (!student) {
            return res.status(404).send({ message: 'Student not found' });
        }

        const studentParentEmail = student.parentEmail?.trim().toLowerCase();
        const studentGuardianEmail = student.guardianEmail?.trim().toLowerCase();
        const studentEmail = student.email?.trim().toLowerCase();
        const validEmails = [studentParentEmail, studentGuardianEmail, studentEmail].filter(Boolean);

        // Verify the parent email matches one of the stored student contact emails
        if (!validEmails.includes(parentEmail)) {
            return res.status(403).send({ message: 'Unauthorized access' });
        }

        res.send({
            id: student._id || student.id,
            studentId: student._id || student.id,
            name: student.name,
            admissionNo: student.admissionNo,
            rollNum: student.rollNum,
            className: student.sclassName?.sclassName || 'N/A',
            totalFees: student.totalFees,
            amountPaid: student.amountPaid,
            balance: student.balance,
            paymentStatus: student.paymentStatus,
            paymentHistory: student.paymentHistory || [],
        });
    } catch (error) {
        console.error('Get fee info error:', error.message || error);
        res.status(500).json({ message: 'Failed to fetch fee information' });
    }
};

// Parent pays student fees
const parentPayFee = async (req, res) => {
    try {
        const studentId = req.params.studentId || req.body.studentId || req.query.studentId;
        const { paymentMethod, parentEmail, transactionId } = req.body;
        const normalizedParentEmail = normalizeEmailValue(parentEmail);
        const amount = normalizePaymentAmount(req.body.amount);

        if (!amount) {
            return res.status(400).send({ message: 'Please enter a valid payment amount' });
        }

        const student = await Student.findById(studentId);

        if (!student) {
            return res.status(404).send({ message: 'Student not found' });
        }

        // Verify parent email
        if (!parentOwnsStudent(student, normalizedParentEmail)) {
            return res.status(403).send({ message: 'Unauthorized payment attempt' });
        }

        // Auto-complete payment if payment method is cash or has transaction ID
        const autoCompleteMethods = ['Paybill', 'Mpesa', 'Card', 'BankTransfer'];
        const paymentCompleted = paymentMethod === 'Cash' || (autoCompleteMethods.includes(paymentMethod) && transactionId);

        // Reject reuse of an existing transaction reference (duplicate payment /
        // replay protection). Reference-less cash entries keep working as before.
        const normalizedTransactionId = String(transactionId || '').trim();
        if (normalizedTransactionId && findPaymentsByCheckoutId(student, normalizedTransactionId).length > 0) {
            return res.status(409).send({
                message: 'This transaction reference has already been recorded for this student.',
            });
        }

        // Generate receipt number
        const receiptNumber = `RCPT-${student.admissionNo || student.rollNum}-${Date.now()}`;

        // Add to payment history (status depends on paymentCompleted)
        // Validate paymentMethod is in allowed enum
        const validPaymentMethods = ['Paybill', 'Card', 'Bank Transfer', 'Cash', 'Account Number', 'Online Transfer', 'Mpesa', 'M-Pesa STK Push'];
        const finalPaymentMethod = paymentMethod && validPaymentMethods.includes(paymentMethod) ? paymentMethod : 'Paybill';

        student.paymentHistory.push({
            amount,
            paymentMethod: finalPaymentMethod,
            receiptNumber,
            status: paymentCompleted ? 'Completed' : 'Pending',
            transactionId: normalizedTransactionId,
            date: new Date(),
            balanceAfter: 0
        });

        reconcileStudentFees(student);

        const result = await student.save();

        // Re-fetch to ensure we have fresh data
        const updatedStudent = await Student.findById(studentId);

        res.send({
            message: 'Payment recorded successfully',
            receiptNumber,
            studentId: updatedStudent._id,
            studentName: updatedStudent.name,
            amountPaid: updatedStudent.amountPaid,
            balance: updatedStudent.balance,
            paymentStatus: updatedStudent.paymentStatus,
            totalFees: updatedStudent.totalFees,
        });
    } catch (error) {
        console.error('Parent payment error:', error.message || error);
        res.status(500).json({ message: 'Payment processing failed' });
    }
};

// Get parent's children/students
const getParentStudents = async (req, res) => {
    try {
        const parentEmail = req.params.parentEmail?.trim().toLowerCase();

        const students = await Student.find({
            $or: [
                { parentEmail: parentEmail },
                { guardianEmail: parentEmail },
                { email: parentEmail }
            ]
        }).select('-password');

        if (students.length === 0) {
            return res.status(404).send({ message: 'No students found for this parent' });
        }

        const studentData = students.map((s) => {
            const studentObj = s && typeof s.toObject === 'function' ? s.toObject({ getters: true }) : s;
            const resolvedId = studentObj?._id || studentObj?.id || studentObj?.studentId;
            return {
                id: resolvedId,
                studentId: resolvedId,
                name: studentObj?.name,
                admissionNo: studentObj?.admissionNo,
                rollNum: studentObj?.rollNum,
                totalFees: studentObj?.totalFees,
                amountPaid: studentObj?.amountPaid,
                balance: studentObj?.balance,
                paymentStatus: studentObj?.paymentStatus,
            };
        });

        res.send(studentData);
    } catch (error) {
        console.error('Get parent students error:', error.message || error);
        res.status(500).json({ message: 'Failed to fetch students' });
    }
};

// Initiate M-Pesa STK Push for fee payment
const initiateStk = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { phoneNumber, parentEmail } = req.body;
        const normalizedParentEmail = normalizeEmailValue(parentEmail);
        const amount = normalizePaymentAmount(req.body.amount);

        if (!amount) {
            return res.status(400).send({ message: 'Please enter a valid payment amount' });
        }

        if (!phoneNumber) {
            return res.status(400).send({ message: 'Phone number is required' });
        }

        const student = await Student.findById(studentId);

        if (!student) {
            return res.status(404).send({ message: 'Student not found' });
        }

        // Verify parent email
        if (!parentOwnsStudent(student, normalizedParentEmail)) {
            return res.status(403).send({ message: 'Unauthorized payment attempt' });
        }

        // Duplicate-payment protection: an identical push requested seconds ago
        // (double click / retry) must not create a second payment record.
        const duplicateWindowMs = 60 * 1000;
        const existingPending = (student.paymentHistory || []).find((payment) =>
            payment.status === 'Pending'
            && payment.paymentMethod === 'M-Pesa STK Push'
            && Number(payment.amount) === amount
            && payment.checkoutRequestId
            && payment.date
            && (Date.now() - new Date(payment.date).getTime()) < duplicateWindowMs
        );

        if (existingPending) {
            return res.send({
                message: 'A payment request for this amount was just initiated. Complete it on your phone or wait a minute before retrying.',
                receiptNumber: existingPending.receiptNumber,
                checkoutRequestId: existingPending.checkoutRequestId,
                studentId: student._id,
                duplicate: true,
            });
        }

        const schoolSettings = await Settings.findOne({ school: student.school }).select('mpesaSettings');
        const mpesaSettings = schoolSettings?.mpesaSettings;
        if (mpesaSettings?.enabled && (!mpesaSettings.consumerKey || !mpesaSettings.consumerSecret || !mpesaSettings.businessShortCode || !mpesaSettings.passkey)) {
            return res.status(400).send({ message: 'M-Pesa is enabled but its school credentials are incomplete.' });
        }
        // Initiate STK Push
        const stkResult = await initiateStkPush(
            phoneNumber,
            amount,
            `${student.admissionNo}-${studentId}`,
            `School Fee Payment - ${student.name}`,
            mpesaSettings?.enabled ? mpesaSettings.toObject() : undefined
        );

        if (!stkResult.success) {
            return res.status(502).send({ message: 'Failed to initiate payment with the payment provider. Please try again.' });
        }

        // Create pending payment record
        const receiptNumber = `STK-${student.admissionNo}-${Date.now()}`;

        student.paymentHistory.push({
            amount,
            paymentMethod: 'M-Pesa STK Push',
            receiptNumber,
            status: 'Pending',
            transactionId: stkResult.checkoutRequestId,
            // The checkout id is required to reconcile the asynchronous
            // provider callback with this payment record.
            checkoutRequestId: stkResult.checkoutRequestId,
            phoneNumber: String(phoneNumber),
            date: new Date(),
            balanceAfter: student.balance
        });

        await student.save();

        res.send({
            message: 'STK push initiated successfully. Enter PIN on your phone to complete payment',
            receiptNumber,
            checkoutRequestId: stkResult.checkoutRequestId,
            requestId: stkResult.requestId,
            responseCode: stkResult.responseCode,
            studentId: student._id
        });
    } catch (error) {
        console.error('STK Push initiation error:', error.message || error);
        res.status(500).json({ message: 'Failed to initiate payment' });
    }
};

// Create a pending STK payment without calling external M-Pesa (for local testing)
const mockInitiateStk = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { amount, parentEmail, phoneNumber } = req.body;
        const normalizedParentEmail = parentEmail?.trim().toLowerCase();

        if (!amount || Number(amount) <= 0) {
            return res.status(400).send({ message: 'Please enter a valid payment amount' });
        }

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).send({ message: 'Student not found' });
        }

        const studentParentEmail = student.parentEmail?.trim().toLowerCase();
        const studentGuardianEmail = student.guardianEmail?.trim().toLowerCase();
        const studentEmail = student.email?.trim().toLowerCase();
        const validEmails = [studentParentEmail, studentGuardianEmail, studentEmail].filter(Boolean);

        if (!validEmails.includes(normalizedParentEmail)) {
            return res.status(403).send({ message: 'Unauthorized payment attempt' });
        }

        const checkoutRequestId = `MOCK_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const receiptNumber = `MOCK-STK-${student.admissionNo || student.rollNum}-${Date.now()}`;

        student.paymentHistory.push({
            amount: Number(amount),
            paymentMethod: 'M-Pesa STK Push',
            receiptNumber,
            status: 'Pending',
            transactionId: checkoutRequestId,
            checkoutRequestId,
            date: new Date(),
            balanceAfter: student.balance,
            phoneNumber: phoneNumber || ''
        });

        await student.save();

        return res.send({ message: 'Mock STK pending payment created', checkoutRequestId, receiptNumber, studentId: student._id });
    } catch (error) {
        console.error('Mock STK initiation error:', error.message || error);
        res.status(500).json({ message: 'Failed to create mock STK payment' });
    }
};

// Check M-Pesa STK Push Status
const checkStkStatus = async (req, res) => {
    try {
        const { checkoutRequestId, studentId, parentEmail } = req.body;

        if (!checkoutRequestId) {
            return res.status(400).send({ message: 'Checkout request ID is required' });
        }

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).send({ message: 'Student not found' });
        }

        // Ownership check (IDOR fix): the parent requesting the status must own
        // the student record. School staff of the same school keep access.
        const adminId = getAdminIdFromReq(req);
        const requester = adminId && mongoose.Types.ObjectId.isValid(String(adminId))
            ? await Admin.findById(adminId).select('role school')
            : null;
        const requesterSchoolId = requester?.school?._id || requester?.school || requester?._id;
        const requesterIsSchoolStaff = Boolean(requester) && (
            requester.role === 'SuperAdmin'
            || (requesterSchoolId && String(requesterSchoolId) === String(student.school))
        );

        if (!requesterIsSchoolStaff && !parentOwnsStudent(student, parentEmail)) {
            return res.status(403).send({ message: 'Unauthorized payment status request' });
        }

        // Find payment record before contacting the provider so unknown
        // references never trigger an outbound call.
        const paymentMatches = findPaymentsByCheckoutId(student, checkoutRequestId);
        if (paymentMatches.length === 0) {
            return res.status(404).send({ message: 'Payment record not found' });
        }

        const { payment: paymentRecord } = paymentMatches[paymentMatches.length - 1];

        // Already settled: return the stored result (idempotent, no replay).
        if (paymentRecord.status === 'Completed' || paymentRecord.status === 'Verified') {
            return res.send({
                message: 'Payment successful',
                paymentStatus: 'Completed',
                amountPaid: student.amountPaid,
                balance: student.balance,
                receiptNumber: paymentRecord.receiptNumber,
            });
        }

        const schoolSettings = await Settings.findOne({ school: student.school }).select('mpesaSettings');
        const mpesaSettings = schoolSettings?.mpesaSettings;
        const statusResult = await queryStkPushStatus(
            checkoutRequestId,
            mpesaSettings?.enabled ? mpesaSettings.toObject() : undefined
        );

        if (!statusResult.success) {
            return res.status(502).send({ message: 'Failed to check payment status with the provider' });
        }

        // Result Code: 0 = Success, 1032 = User Cancelled
        const isSuccess = String(statusResult.resultCode) === '0';

        if (isSuccess) {
            // The provider confirms the transaction amount as well – when it is
            // present it must match the recorded amount before crediting.
            const providerAmount = Number(statusResult.amount);
            if (Number.isFinite(providerAmount) && providerAmount > 0
                && Math.abs(providerAmount - Math.ceil(Number(paymentRecord.amount))) > 1) {
                paymentRecord.status = 'Failed';
                paymentRecord.paymentNote = 'Amount mismatch reported by payment provider';
                await student.save();
                console.warn('[PAYMENT SECURITY] STK status amount mismatch detected');
                return res.status(409).send({ message: 'Payment could not be confirmed: amount mismatch.' });
            }

            paymentRecord.status = 'Completed';
            if (statusResult.receiptNumber) paymentRecord.mpesaReceiptNumber = statusResult.receiptNumber;
            reconcileStudentFees(student);

            await student.save();

            // Re-fetch to ensure fresh data
            const updatedStudent = await Student.findById(studentId);

            return res.send({
                message: 'Payment successful',
                paymentStatus: 'Completed',
                amountPaid: updatedStudent.amountPaid,
                balance: updatedStudent.balance,
                receiptNumber: paymentRecord.receiptNumber
            });
        } else if (String(statusResult.resultCode) === '1032') {
            // User cancelled
            paymentRecord.status = 'Cancelled';
            await student.save();

            return res.send({
                message: 'Payment cancelled by user',
                paymentStatus: 'Cancelled'
            });
        } else {
            // Still pending or other status
            return res.send({
                message: 'Payment status: ' + statusResult.resultDescription,
                paymentStatus: 'Pending',
                resultCode: statusResult.resultCode
            });
        }
    } catch (error) {
        console.error('STK Status check error:', error.message || error);
        res.status(500).json({ message: 'Failed to check payment status' });
    }
};

// Handle M-Pesa Callback (provider -> server, asynchronous payment confirmation)
const mpesaCallback = async (req, res) => {
    try {
        const body = req.body || {};
        const result = body.Result || body.Body?.stkCallback;

        if (!result) {
            return res.status(400).send({ message: 'Invalid callback data' });
        }

        // 1. Authenticate the caller. Payment state must never be changed based
        //    on an unauthenticated request (see mpesaService.validateCallback).
        const verification = validateCallback(body, req.get('x-mpesa-signature'), req);
        if (!verification.valid) {
            console.warn(`[PAYMENT SECURITY] Rejected M-Pesa callback (${verification.reason || 'unverified'})`);
            return res.status(401).send({ message: 'Callback rejected' });
        }

        const resultCode = String(result.ResultCode);
        const checkoutRequestId = String(result.CheckoutRequestID || '');

        if (!checkoutRequestId) {
            return res.status(400).send({ message: 'Invalid callback data' });
        }

        // Provider reported transaction details (authoritative for amount check).
        const callbackMetadata = Array.isArray(result.CallbackMetadata?.Item) ? result.CallbackMetadata.Item : [];
        const metadataValue = (name) => {
            const entry = callbackMetadata.find((item) => item && item.Name === name);
            return entry ? entry.Value : undefined;
        };
        const providerAmount = Number(metadataValue('Amount'));
        const providerReceipt = metadataValue('MpesaReceiptNumber') || result.MpesaReceiptNumber || '';
        const providerTransactionDate = String(metadataValue('TransactionDate') || result.TransactionDate || '');

        // 2. Student fee payment?
        const student = await Student.findOne({ 'paymentHistory.checkoutRequestId': checkoutRequestId });
        if (student) {
            const { payment: paymentRecord } = (findPaymentsByCheckoutId(student, checkoutRequestId).slice(-1)[0] || {});

            if (!paymentRecord) {
                console.warn('[PAYMENT SECURITY] Callback without matching pending payment record');
                return res.send({ message: 'OK' });
            }

            // 3. Idempotency / replay protection: a payment that already reached
            //    a final state is never modified again.
            if (PAYMENT_FINAL_STATES.includes(paymentRecord.status)) {
                return res.send({ message: 'OK' });
            }

            if (resultCode === '0') {
                // 4. Never trust a callback amount that contradicts the amount
                //    that was requested by this application.
                if (Number.isFinite(providerAmount) && providerAmount > 0
                    && Math.abs(providerAmount - Math.ceil(Number(paymentRecord.amount))) > 1) {
                    paymentRecord.status = 'Failed';
                    paymentRecord.paymentNote = 'Amount mismatch between callback and requested amount';
                    await student.save();
                    console.warn('[PAYMENT SECURITY] Rejected callback with mismatched amount');
                    try {
                        await logAuditAction({
                            school: student.school,
                            user: null,
                            userName: 'M-Pesa callback',
                            userRole: 'System',
                            action: 'PAYMENT_AMOUNT_MISMATCH',
                            entityType: 'Student',
                            entityId: student._id,
                            entityName: student.name,
                            ipAddress: req.clientIP || null,
                            userAgent: req.userAgent || '',
                            resultMessage: 'Callback amount did not match the requested amount; payment marked failed.',
                        });
                    } catch (logErr) {
                        console.error('Failed to write audit log for amount mismatch:', logErr.message || logErr);
                    }
                    return res.send({ message: 'OK' });
                }

                paymentRecord.status = 'Completed';
                paymentRecord.mpesaReceiptNumber = providerReceipt || paymentRecord.mpesaReceiptNumber || '';
                paymentRecord.transactionDate = providerTransactionDate || paymentRecord.transactionDate || '';
                reconcileStudentFees(student);
                paymentRecord.balanceAfter = student.balance;

                await student.save();
                console.log('Payment confirmed for student record (callback reconciled)');
            } else {
                // Payment failed or was cancelled by the payer.
                paymentRecord.status = resultCode === '1032' ? 'Cancelled' : 'Failed';
                paymentRecord.paymentNote = result.ResultDesc || paymentRecord.paymentNote || '';
                await student.save();
                console.log(`Payment not completed (result code ${resultCode})`);
            }

            return res.send({ message: 'OK' }); // Acknowledge to the provider
        }

        // 5. Teacher salary payment?
        const teacher = await require('../models/teacherSchema').findOne({
            'salaryHistory.checkoutRequestId': checkoutRequestId
        });

        if (!teacher) {
            // Unknown reference: acknowledge so the provider does not retry
            // forever, and keep an audit trail.
            console.warn('[PAYMENT SECURITY] Callback for unknown checkout request id');
            return res.send({ message: 'OK' });
        }

        const salaryIndex = teacher.salaryHistory.findIndex(
            (s) => s.checkoutRequestId === checkoutRequestId
        );

        if (salaryIndex === -1) {
            return res.send({ message: 'OK' });
        }

        const salaryRecord = teacher.salaryHistory[salaryIndex];

        // Idempotency for salary payments as well.
        if (['Paid', 'Failed'].includes(salaryRecord.status)) {
            return res.send({ message: 'OK' });
        }

        if (resultCode === '0') {
            if (Number.isFinite(providerAmount) && providerAmount > 0
                && Math.abs(providerAmount - Math.ceil(Number(salaryRecord.amount))) > 1) {
                salaryRecord.status = 'Failed';
                await teacher.save();
                console.warn('[PAYMENT SECURITY] Rejected salary callback with mismatched amount');
                return res.send({ message: 'OK' });
            }

            salaryRecord.status = 'Paid';
            salaryRecord.approvalStatus = 'Approved';
            salaryRecord.approvedBy = salaryRecord.approvedBy || null;
            salaryRecord.approvalDate = salaryRecord.approvalDate || new Date();
            salaryRecord.mpesaReceiptNumber = providerReceipt;
            salaryRecord.transactionDate = providerTransactionDate;

            await teacher.save();
            console.log('Salary payment confirmed (callback reconciled)');
        } else {
            salaryRecord.status = 'Failed';
            await teacher.save();
            console.log(`Salary payment failed (result code ${resultCode})`);
        }

        return res.send({ message: 'OK' });
    } catch (error) {
        console.error('M-Pesa callback error:', error.message || error);
        res.status(500).json({ message: 'Callback processing error' });
    }
};

module.exports = {
    parentLogIn,
    getStudentFeeInfo,
    parentPayFee,
    getParentStudents,
    initiateStk,
    // For testing without real M-Pesa integration
    mockInitiateStk,
    checkStkStatus,
    mpesaCallback,
};