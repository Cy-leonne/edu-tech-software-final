
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Parent = require('../models/parentSchema');
const Student = require('../models/studentSchema');
const Settings = require('../models/settingsSchema');
const { verifyEntityBelongsToAdminSchool } = require('../middleware/schoolAccess');
const { initiateStkPush, queryStkPushStatus, validateCallback } = require('../services/mpesaService');
const { reconcileStudentFees } = require('../utils/financeUtils');
const { logAuditAction } = require('../utils/auditLogger');

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
        // Reconcile before responding so the parent sees the same authoritative
        // values the accountant/admin portals compute.
        reconcileStudentFees(student);
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
        console.error('Parent login error:', error);
        res.status(500).json({ message: 'Login failed', error: error.message });
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

        // Reconcile in-memory so fee values match every other portal exactly
        reconcileStudentFees(student);

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
        console.error('Get fee info error:', error);
        res.status(500).json({ message: 'Failed to fetch fee information', error: error.message });
    }
};

// Parent pays student fees
const parentPayFee = async (req, res) => {
    try {
        const studentId = req.params.studentId || req.body.studentId || req.query.studentId;
        const { amount, paymentMethod, parentEmail, transactionId } = req.body;
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

        // Verify parent email
        if (!validEmails.includes(normalizedParentEmail)) {
            return res.status(403).send({ message: 'Unauthorized payment attempt' });
        }

        // Auto-complete payment if payment method is cash or has transaction ID
        const autoCompleteMethods = ['Paybill', 'Mpesa', 'Card', 'BankTransfer'];
        const paymentCompleted = paymentMethod === 'Cash' || (autoCompleteMethods.includes(paymentMethod) && transactionId);

        // Generate receipt number
        const receiptNumber = `RCPT-${student.admissionNo || student.rollNum}-${Date.now()}`;

        // Add to payment history (status depends on paymentCompleted)
        // Validate paymentMethod is in allowed enum
        const validPaymentMethods = ['Paybill', 'Card', 'Bank Transfer', 'Cash', 'Account Number', 'Online Transfer', 'Mpesa', 'M-Pesa STK Push'];
        const finalPaymentMethod = paymentMethod && validPaymentMethods.includes(paymentMethod) ? paymentMethod : 'Paybill';

        student.paymentHistory.push({
            amount: Number(amount),
            paymentMethod: finalPaymentMethod,
            receiptNumber,
            status: paymentCompleted ? 'Completed' : 'Pending',
            transactionId: transactionId || '',
            date: new Date(),
            feePeriodKey: student.feePeriodKey || 'initial',
            balanceAfter: 0
        });

        // Authoritative reconciliation: amountPaid comes from the history,
        // balance is never negative and the status follows the balance.
        reconcileStudentFees(student);

        await student.save();

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
        console.error('Parent payment error:', error);
        res.status(500).json({ message: 'Payment processing failed', error: error.message });
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
        console.error('Get parent students error:', error);
        res.status(500).json({ message: 'Failed to fetch students', error: error.message });
    }
};

// Initiate M-Pesa STK Push for fee payment
const initiateStk = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { amount, phoneNumber, parentEmail } = req.body;
        const normalizedParentEmail = parentEmail?.trim().toLowerCase();

        if (!amount || Number(amount) <= 0) {
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
        const studentParentEmail = student.parentEmail?.trim().toLowerCase();
        const studentGuardianEmail = student.guardianEmail?.trim().toLowerCase();
        const studentEmail = student.email?.trim().toLowerCase();
        const validEmails = [studentParentEmail, studentGuardianEmail, studentEmail].filter(Boolean);

        if (!validEmails.includes(normalizedParentEmail)) {
            return res.status(403).send({ message: 'Unauthorized payment attempt' });
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
            return res.status(500).send({ message: 'Failed to initiate payment: ' + stkResult.error });
        }

        // Create pending payment record
        const receiptNumber = `STK-${student.admissionNo}-${Date.now()}`;

        student.paymentHistory.push({
            amount: Number(amount),
            paymentMethod: 'M-Pesa STK Push',
            receiptNumber,
            status: 'Pending',
            transactionId: stkResult.checkoutRequestId,
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
        console.error('STK Push initiation error:', error);
        res.status(500).json({ message: 'Failed to initiate payment', error: error.message });
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
        console.error('Mock STK initiation error:', error);
        res.status(500).json({ message: 'Failed to create mock STK payment', error: error.message });
    }
};

// Check M-Pesa STK Push Status
const checkStkStatus = async (req, res) => {
    try {
        const { checkoutRequestId, studentId } = req.body;

        if (!checkoutRequestId) {
            return res.status(400).send({ message: 'Checkout request ID is required' });
        }

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).send({ message: 'Student not found' });
        }

        const schoolSettings = await Settings.findOne({ school: student.school }).select('mpesaSettings');
        const mpesaSettings = schoolSettings?.mpesaSettings;
        const statusResult = await queryStkPushStatus(
            checkoutRequestId,
            mpesaSettings?.enabled ? mpesaSettings.toObject() : undefined
        );

        if (!statusResult.success) {
            return res.status(500).send({ message: 'Failed to check payment status' });
        }

        // Find payment record (match kept loose for records created before the
        // dedicated checkoutRequestId field existed)
        const paymentIndex = student.paymentHistory.findIndex(
            p => p.checkoutRequestId === checkoutRequestId || p.transactionId === checkoutRequestId
        );

        if (paymentIndex === -1) {
            return res.status(404).send({ message: 'Payment record not found' });
        }

        // Result Code: 0 = Success, 1032 = User Cancelled
        const isSuccess = statusResult.resultCode === '0';
        
        if (isSuccess) {
            // Payment successful - update payment record and recompute totals from paymentHistory
            const paymentRecord = student.paymentHistory[paymentIndex];
            paymentRecord.status = 'Completed';

            // Authoritative reconciliation keeps amountPaid, balance and status
            // identical to the values produced by every other portal.
            reconcileStudentFees(student);
            paymentRecord.balanceAfter = student.balance;

            await student.save();

            // Re-fetch to ensure fresh data
            const updatedStudent = await Student.findById(studentId);

            // Respond with the reconciled values (data comes from the database)
            return res.send({
                message: 'Payment successful',
                paymentStatus: updatedStudent.paymentStatus,
                amountPaid: updatedStudent.amountPaid,
                balance: updatedStudent.balance,
                receiptNumber: paymentRecord.receiptNumber
            });
        } else if (statusResult.resultCode === '1032') {
            // User cancelled
            student.paymentHistory[paymentIndex].status = 'Cancelled';
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
        console.error('STK Status check error:', error);
        res.status(500).json({ message: 'Failed to check payment status', error: error.message });
    }
};

// Handle M-Pesa Callback
const mpesaCallback = async (req, res) => {
    // Safaricom metadata helpers — the callback carries payment details inside
    // CallbackMetadata.Item records (nested format used by the STK push flow).
    const getCallbackMetadataItem = (result, itemName) => {
        const items = result && result.CallbackMetadata && Array.isArray(result.CallbackMetadata.Item)
            ? result.CallbackMetadata.Item
            : [];
        const item = items.find((entry) => entry && entry.Name === itemName);
        return item ? item.Value : undefined;
    };

    try {
        const body = req.body;

        // Verify the callback really comes from Safaricom before touching any
        // payment record (prevents forged callbacks from marking payments as
        // completed without money changing hands).
        const verification = validateCallback(body, req.rawBody || '', req);
        if (!verification || !verification.valid) {
            console.warn(`Rejected unauthenticated M-Pesa callback (reason: ${verification && verification.reason}) from IP: ${(req.headers && req.headers['x-forwarded-for']) || req.ip || (req.connection && req.connection.remoteAddress) || 'unknown'}`);
            return res.status(401).send({ message: 'Callback verification failed' });
        }

        const result = body.Result;

        if (!result) {
            return res.status(400).send({ message: 'Invalid callback data' });
        }

        const resultCode = String(result.ResultCode);
        const checkoutRequestId = result.CheckoutRequestID;

        // Find student with this payment
        const student = await Student.findOne({
            $or: [
                { 'paymentHistory.checkoutRequestId': checkoutRequestId },
                { 'paymentHistory.transactionId': checkoutRequestId }
            ]
        });

        if (student) {
            const paymentIndex = student.paymentHistory.findIndex(
                p => p.checkoutRequestId === checkoutRequestId || p.transactionId === checkoutRequestId
            );

            if (paymentIndex === -1) {
                console.log('Payment record not found for checkoutRequestId:', checkoutRequestId);
                return res.send({ message: 'OK' }); // Return OK to M-Pesa
            }

            const paymentRecord = student.paymentHistory[paymentIndex];

            // Safaricom may deliver the same callback more than once. Treat
            // completed/verified records as idempotent and never mutate them again.
            if (paymentRecord.status === 'Completed' || paymentRecord.status === 'Verified') {
                console.log('Replayed M-Pesa callback ignored for already completed payment:', checkoutRequestId);
                return res.send({ message: 'OK' });
            }

            if (resultCode === '0') {
                // Payment successful for student — confirm the paid amount
                // matches the amount that was requested before crediting it.
                const callbackAmountValue = getCallbackMetadataItem(result, 'Amount');
                const callbackAmount = callbackAmountValue !== undefined && callbackAmountValue !== null && callbackAmountValue !== ''
                    ? Number(callbackAmountValue)
                    : undefined;

                if (callbackAmount !== undefined && Number.isFinite(callbackAmount)
                    && Number(paymentRecord.amount || 0) > 0 && callbackAmount !== Number(paymentRecord.amount)) {
                    // Flag for reconciliation (do NOT credit the wallet) and
                    // leave a security trail.
                    console.warn(`M-Pesa callback amount mismatch for checkoutRequestId ${checkoutRequestId}: expected ${paymentRecord.amount}, received ${callbackAmount}. Payment flagged for reconciliation.`);

                    paymentRecord.status = 'Failed';
                    await student.save();

                    await logAuditAction({
                        userId: null,
                        userRole: 'System',
                        action: 'PAYMENT_AMOUNT_MISMATCH',
                        entityType: 'payment',
                        entityId: String(student._id),
                        description: `M-Pesa callback amount mismatch (expected ${paymentRecord.amount}, received ${callbackAmount})`,
                        method: req.method,
                        route: req.originalUrl || req.url,
                        ipAddress: (req.headers && req.headers['x-forwarded-for']) || req.ip || (req.connection && req.connection.remoteAddress) || 'Unknown',
                        status: 'warning',
                        sensitivity: 'confidential',
                        errorMessage: `Expected amount ${paymentRecord.amount}, received ${callbackAmount}`,
                        metadata: {
                            checkoutRequestId,
                            expectedAmount: paymentRecord.amount,
                            receivedAmount: callbackAmount,
                            studentId: String(student._id),
                            admissionNo: student.admissionNo || student.rollNum
                        },
                        school: student.school
                    });

                    return res.send({ message: 'OK' });
                }

                // Credit the record and reconcile the student's position from
                // history (authoritative, shared computation).
                paymentRecord.status = 'Completed';
                reconcileStudentFees(student);
                paymentRecord.balanceAfter = student.balance;
                paymentRecord.mpesaReceiptNumber = getCallbackMetadataItem(result, 'MpesaReceiptNumber') ?? result.MpesaReceiptNumber ?? paymentRecord.mpesaReceiptNumber;
                paymentRecord.transactionDate = getCallbackMetadataItem(result, 'TransactionDate') ?? result.TransactionDate ?? paymentRecord.transactionDate;
                paymentRecord.phoneNumber = getCallbackMetadataItem(result, 'PhoneNumber') ?? paymentRecord.phoneNumber;

                await student.save();
                console.log(`Payment successful for student: ${student.name}, Balance: ${student.balance}`);
            } else if (resultCode === '1032') {
                // User cancelled the STK push prompt
                paymentRecord.status = 'Cancelled';
                await student.save();
                console.log(`Payment cancelled by user for student: ${student.name}, Code: ${resultCode}`);
            } else {
                // Payment failed
                paymentRecord.status = 'Failed';
                await student.save();
                console.log(`Payment failed for student: ${student.name}, Code: ${resultCode}`);
            }

            return res.send({ message: 'OK' }); // Return OK to M-Pesa
        }

        // If not a student payment, attempt to reconcile against teacher salary payments
        const teacher = await require('../models/teacherSchema').findOne({
            'salaryHistory.checkoutRequestId': checkoutRequestId
        });

        if (!teacher) {
            console.log('Payment record not found for student or teacher:', checkoutRequestId);
            return res.send({ message: 'OK' }); // Return OK to M-Pesa
        }

        const salaryIndex = teacher.salaryHistory.findIndex(
            s => s.checkoutRequestId === checkoutRequestId
        );

        if (salaryIndex === -1) {
            console.log('Salary payment record not found for checkoutRequestId:', checkoutRequestId);
            return res.send({ message: 'OK' });
        }

        if (resultCode === '0') {
            const salaryRecord = teacher.salaryHistory[salaryIndex];
            salaryRecord.status = 'Paid';
            salaryRecord.approvalStatus = 'Approved';
            salaryRecord.approvedBy = salaryRecord.approvedBy || null;
            salaryRecord.approvalDate = salaryRecord.approvalDate || new Date();
            salaryRecord.mpesaReceiptNumber = getCallbackMetadataItem(result, 'MpesaReceiptNumber') ?? result.MpesaReceiptNumber ?? salaryRecord.mpesaReceiptNumber;
            salaryRecord.transactionDate = getCallbackMetadataItem(result, 'TransactionDate') ?? result.TransactionDate ?? salaryRecord.transactionDate;

            await teacher.save();
            console.log(`Salary payment successful for teacher: ${teacher.name}, amount: ${salaryRecord.amount}`);
        } else {
            teacher.salaryHistory[salaryIndex].status = 'Failed';
            await teacher.save();
            console.log(`Salary payment failed for teacher: ${teacher.name}, Code: ${resultCode}`);
        }

        return res.send({ message: 'OK' });
    } catch (error) {
        console.error('M-Pesa callback error:', error);
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
