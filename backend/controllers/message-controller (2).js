
const Message = require('../models/messageSchema.js');
const Admin = require('../models/adminSchema.js');
const Student = require('../models/studentSchema.js');
const Parent = require('../models/parentSchema.js');
const Teacher = require('../models/teacherSchema.js');
const Sclass = require('../models/sclassSchema.js');
const { sendEmail } = require('../services/emailService.js');
let sendSMS;
try {
    // try to require the SMS service; if it fails, provide a safe stub so the app doesn't crash
    const smsSvc = require('../services/smsService.js');
    sendSMS = smsSvc.sendSMS || (async () => ({ success: false, error: 'sendSMS not implemented' }));
} catch (err) {
    console.warn('[message-controller] smsService require failed, using fallback stub:', err.message);
    sendSMS = async () => ({ success: false, error: 'sms service unavailable' });
}

// Verify admin sending message
const verifyAdminSender = async (req, res, adminId) => {
    try {
        const admin = await Admin.findById(adminId);
        if (!admin) {
            res.status(404).send({ message: 'Admin not found' });
            return null;
        }
        if (!admin.approved) {
            res.status(403).send({ message: 'Admin not approved' });
            return null;
        }
        return admin;
    } catch (err) {
        res.status(500).send({ message: 'Error verifying admin', error: err.message });
        return null;
    }
};

const getAdminStudentList = async (req, res) => {
    try {
        const admin = await verifyAdminSender(req, res, req.params.id);
        if (!admin) return;

        const students = await Student.find({ school: req.params.id })
            .select('_id name email phone sclassName')
            .populate('sclassName', 'sclassName');

        const sanitizedStudents = students.map((student) => ({
            ...student._doc,
            password: undefined,
        }));

        res.status(200).json({ students: sanitizedStudents });
    } catch (err) {
        res.status(500).send({ message: 'Error fetching student list', error: err.message });
    }
};

const getAdminParentList = async (req, res) => {
    try {
        const admin = await verifyAdminSender(req, res, req.params.id);
        if (!admin) return;

        const parents = await Parent.find({ school: req.params.id })
            .select('_id name email phone studentId school');

        res.status(200).json({ parents });
    } catch (err) {
        res.status(500).send({ message: 'Error fetching parent list', error: err.message });
    }
};

// ==================== SEND MESSAGES ====================

// Send message to single student
const sendMessageToStudent = async (req, res) => {
    try {
        const adminId = req.get('x-admin-id');
        const { studentId, messageSubject, messageBody, messageType, priority, template } = req.body;

        // Verify admin
        const admin = await verifyAdminSender(req, res, adminId);
        if (!admin) return;

        // Get student
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).send({ message: 'Student not found' });
        }

        // Create message record
        const message = new Message({
            sender: adminId,
            senderRole: admin.role,
            recipientType: 'Student',
            recipientModel: 'student',
            recipient: studentId,
            recipientEmail: student.email,
            recipientPhone: student.phone,
            school: student.school,
            messageSubject: messageSubject || 'Message from School',
            messageBody,
            messageType: messageType || 'Email',
            priority: priority || 'Normal',
            template: template || 'Custom',
            status: 'Sent',
            sentAt: new Date(),
        });

        // Send email if required
        if (messageType === 'Email' || messageType === 'Both') {
            try {
                const emailResult = await sendEmail(
                    student.email,
                    messageSubject || 'Message from School',
                    messageBody
                );
                message.deliveryStatus.email = emailResult.success ? 'Sent' : 'Failed';
                message.deliveryStatus.emailSentAt = new Date();
                if (!emailResult.success) {
                    message.deliveryStatus.emailErrorMessage = emailResult.error;
                }
            } catch (emailErr) {
                message.deliveryStatus.email = 'Failed';
                message.deliveryStatus.emailErrorMessage = emailErr.message;
            }
        }

        // Send SMS if required
        if ((messageType === 'SMS' || messageType === 'Both') && student.phone) {
            try {
                const smsResult = await sendSMS(student.phone, messageBody);
                message.deliveryStatus.sms = smsResult.success ? 'Sent' : 'Failed';
                message.deliveryStatus.smsSentAt = new Date();
                if (!smsResult.success) {
                    message.deliveryStatus.smsErrorMessage = smsResult.error;
                }
            } catch (smsErr) {
                message.deliveryStatus.sms = 'Failed';
                message.deliveryStatus.smsErrorMessage = smsErr.message;
            }
        }

        await message.save();

        res.status(201).json({
            message: 'Message sent to student successfully',
            data: message
        });
    } catch (err) {
        res.status(500).send({ message: 'Error sending message', error: err.message });
    }
};

// Send message to parent
const sendMessageToParent = async (req, res) => {
    try {
        const adminId = req.get('x-admin-id');
        const { parentId, messageSubject, messageBody, messageType, priority, template } = req.body;

        // Verify admin
        const admin = await verifyAdminSender(req, res, adminId);
        if (!admin) return;

        // Get parent
        const parent = await Parent.findById(parentId);
        if (!parent) {
            return res.status(404).send({ message: 'Parent not found' });
        }

        // Create message record
        const message = new Message({
            sender: adminId,
            senderRole: admin.role,
            recipientType: 'Parent',
            recipientModel: 'parent',
            recipient: parentId,
            recipientEmail: parent.email,
            recipientPhone: parent.phone,
            school: parent.school,
            messageSubject: messageSubject || 'Message from School',
            messageBody,
            messageType: messageType || 'Email',
            priority: priority || 'Normal',
            template: template || 'Custom',
            status: 'Sent',
            sentAt: new Date(),
        });

        // Send email if required
        if (messageType === 'Email' || messageType === 'Both') {
            try {
                const emailResult = await sendEmail(
                    parent.email,
                    messageSubject || 'Message from School',
                    messageBody
                );
                message.deliveryStatus.email = emailResult.success ? 'Sent' : 'Failed';
                message.deliveryStatus.emailSentAt = new Date();
                if (!emailResult.success) {
                    message.deliveryStatus.emailErrorMessage = emailResult.error;
                }
            } catch (emailErr) {
                message.deliveryStatus.email = 'Failed';
                message.deliveryStatus.emailErrorMessage = emailErr.message;
            }
        }

        // Send SMS if required
        if ((messageType === 'SMS' || messageType === 'Both') && parent.phone) {
            try {
                const smsResult = await sendSMS(parent.phone, messageBody);
                message.deliveryStatus.sms = smsResult.success ? 'Sent' : 'Failed';
                message.deliveryStatus.smsSentAt = new Date();
                if (!smsResult.success) {
                    message.deliveryStatus.smsErrorMessage = smsResult.error;
                }
            } catch (smsErr) {
                message.deliveryStatus.sms = 'Failed';
                message.deliveryStatus.smsErrorMessage = smsErr.message;
            }
        }

        await message.save();

        res.status(201).json({
            message: 'Message sent to parent successfully',
            data: message
        });
    } catch (err) {
        res.status(500).send({ message: 'Error sending message', error: err.message });
    }
};

// Send message to internal admin role
const sendMessageToAdminUser = async (req, res) => {
    try {
        const adminId = req.get('x-admin-id');
        const { recipientId, recipientType, messageSubject, messageBody, messageType, priority, template } = req.body;

        if (!['Accountant', 'HR'].includes(recipientType)) {
            return res.status(400).send({ message: 'Invalid recipient type for internal message' });
        }

        // Verify admin sender
        const admin = await verifyAdminSender(req, res, adminId);
        if (!admin) return;

        const recipient = await Admin.findById(recipientId);
        if (!recipient || recipient.role !== recipientType) {
            return res.status(404).send({ message: `${recipientType} not found` });
        }

        const message = new Message({
            sender: adminId,
            senderRole: admin.role,
            recipientType,
            recipientModel: 'admin',
            recipient: recipientId,
            recipientEmail: recipient.email,
            recipientPhone: recipient.phone || '',
            school: recipient.school || admin.school || recipient._id,
            messageSubject: messageSubject || 'Internal message from School',
            messageBody,
            messageType: messageType || 'Email',
            priority: priority || 'Normal',
            template: template || 'Custom',
            status: 'Sent',
            sentAt: new Date(),
        });

        if (messageType === 'Email' || messageType === 'Both') {
            try {
                const emailResult = await sendEmail(
                    recipient.email,
                    messageSubject || 'Internal message from School',
                    messageBody
                );
                message.deliveryStatus.email = emailResult.success ? 'Sent' : 'Failed';
                message.deliveryStatus.emailSentAt = new Date();
                if (!emailResult.success) {
                    message.deliveryStatus.emailErrorMessage = emailResult.error;
                }
            } catch (emailErr) {
                message.deliveryStatus.email = 'Failed';
                message.deliveryStatus.emailErrorMessage = emailErr.message;
            }
        }

        if ((messageType === 'SMS' || messageType === 'Both') && recipient.phone) {
            try {
                const smsResult = await sendSMS(recipient.phone, messageBody);
                message.deliveryStatus.sms = smsResult.success ? 'Sent' : 'Failed';
                message.deliveryStatus.smsSentAt = new Date();
                if (!smsResult.success) {
                    message.deliveryStatus.smsErrorMessage = smsResult.error;
                }
            } catch (smsErr) {
                message.deliveryStatus.sms = 'Failed';
                message.deliveryStatus.smsErrorMessage = smsErr.message;
            }
        }

        await message.save();

        res.status(201).json({
            message: `Message sent to ${recipientType} successfully`,
            data: message
        });
    } catch (err) {
        res.status(500).send({ message: 'Error sending internal message', error: err.message });
    }
};

// Send message to multiple students
const sendBulkMessageToStudents = async (req, res) => {
    try {
        const adminId = req.get('x-admin-id');
        const { studentIds, classId, messageSubject, messageBody, messageType, priority, template } = req.body;

        // Verify admin
        const admin = await verifyAdminSender(req, res, adminId);
        if (!admin) return;

        let recipients = [];

        // Get students by IDs or class
        if (studentIds && studentIds.length > 0) {
            recipients = await Student.find({ _id: { $in: studentIds } }).select('_id email phone name school');
        } else if (classId) {
            recipients = await Student.find({ sclassName: classId }).select('_id email phone name school');
        } else {
            return res.status(400).send({ message: 'Provide either studentIds or classId' });
        }

        if (recipients.length === 0) {
            return res.status(404).send({ message: 'No students found' });
        }

        // Prepare bulk recipients
        const bulkRecipients = recipients.map(student => ({
            _id: student._id,
            email: student.email,
            phone: student.phone,
            name: student.name,
        }));

        // Create message record
        const message = new Message({
            sender: adminId,
            senderRole: admin.role,
            recipientType: 'Bulk',
            school: recipients[0].school,
            class: classId || null,
            bulkRecipients,
            messageSubject: messageSubject || 'Message from School',
            messageBody,
            messageType: messageType || 'Email',
            priority: priority || 'Normal',
            template: template || 'Custom',
            status: 'Sent',
            sentAt: new Date(),
        });

        let sentCount = 0;
        let failedCount = 0;

        // Send to all recipients
        for (const recipient of recipients) {
            // Send email if required
            if (messageType === 'Email' || messageType === 'Both') {
                try {
                    await sendEmail(
                        recipient.email,
                        messageSubject || 'Message from School',
                        messageBody
                    );
                    sentCount++;
                } catch (emailErr) {
                    failedCount++;
                    console.error(`Error sending email to ${recipient.email}:`, emailErr.message);
                }
            }

            // Send SMS if required
            if ((messageType === 'SMS' || messageType === 'Both') && recipient.phone) {
                try {
                    const smsResult = await sendSMS(recipient.phone, messageBody);
                    if (smsResult?.success) {
                        sentCount++;
                    } else {
                        failedCount++;
                        console.error(`Error sending SMS to ${recipient.phone}:`, smsResult?.error || 'SMS provider failed');
                    }
                } catch (smsErr) {
                    failedCount++;
                    console.error(`Error sending SMS to ${recipient.phone}:`, smsErr.message);
                }
            }
        }

        // Update status based on delivery
        if (failedCount === 0) {
            message.status = 'Sent';
        } else if (sentCount > 0) {
            message.status = 'Partial';
        } else {
            message.status = 'Failed';
        }

        await message.save();

        res.status(201).json({
            message: 'Bulk message sent',
            data: {
                messageId: message._id,
                totalRecipients: recipients.length,
                sentCount,
                failedCount,
                status: message.status
            }
        });
    } catch (err) {
        res.status(500).send({ message: 'Error sending bulk message', error: err.message });
    }
};

// Send message to multiple parents
const sendBulkMessageToParents = async (req, res) => {
    try {
        const adminId = req.get('x-admin-id');
        const { parentIds, classId, messageSubject, messageBody, messageType, priority, template } = req.body;

        // Verify admin
        const admin = await verifyAdminSender(req, res, adminId);
        if (!admin) return;

        let recipients = [];

        // Get parents by IDs or class
        if (parentIds && parentIds.length > 0) {
            recipients = await Parent.find({ _id: { $in: parentIds } }).select('_id email phone name school');
        } else if (classId) {
            // Get all parents of students in the class
            const students = await Student.find({ sclassName: classId }).select('_id');
            const studentIdSet = students.map((student) => student._id);
            recipients = await Parent.find({ studentId: { $in: studentIdSet } }).select('_id email phone name school');
        } else {
            return res.status(400).send({ message: 'Provide either parentIds or classId' });
        }

        if (recipients.length === 0) {
            return res.status(404).send({ message: 'No parents found' });
        }

        // Prepare bulk recipients
        const bulkRecipients = recipients.map(parent => ({
            _id: parent._id,
            email: parent.email,
            phone: parent.phone,
            name: parent.name,
        }));

        // Create message record
        const message = new Message({
            sender: adminId,
            senderRole: admin.role,
            recipientType: 'Bulk',
            school: recipients[0].school,
            class: classId || null,
            bulkRecipients,
            messageSubject: messageSubject || 'Message from School',
            messageBody,
            messageType: messageType || 'Email',
            priority: priority || 'Normal',
            template: template || 'Custom',
            status: 'Sent',
            sentAt: new Date(),
        });

        let sentCount = 0;
        let failedCount = 0;

        // Send to all recipients
        for (const recipient of recipients) {
            // Send email if required
            if (messageType === 'Email' || messageType === 'Both') {
                try {
                    await sendEmail(
                        recipient.email,
                        messageSubject || 'Message from School',
                        messageBody
                    );
                    sentCount++;
                } catch (emailErr) {
                    failedCount++;
                    console.error(`Error sending email to ${recipient.email}:`, emailErr.message);
                }
            }

            // Send SMS if required
            if ((messageType === 'SMS' || messageType === 'Both') && recipient.phone) {
                try {
                    const smsResult = await sendSMS(recipient.phone, messageBody);
                    if (smsResult?.success) {
                        sentCount++;
                    } else {
                        failedCount++;
                        console.error(`Error sending SMS to ${recipient.phone}:`, smsResult?.error || 'SMS provider failed');
                    }
                } catch (smsErr) {
                    failedCount++;
                    console.error(`Error sending SMS to ${recipient.phone}:`, smsErr.message);
                }
            }
        }

        // Update status based on delivery
        if (failedCount === 0) {
            message.status = 'Sent';
        } else if (sentCount > 0) {
            message.status = 'Partial';
        } else {
            message.status = 'Failed';
        }

        await message.save();

        res.status(201).json({
            message: 'Bulk message sent to parents',
            data: {
                messageId: message._id,
                totalRecipients: recipients.length,
                sentCount,
                failedCount,
                status: message.status
            }
        });
    } catch (err) {
        res.status(500).send({ message: 'Error sending bulk message', error: err.message });
    }
};

// ==================== GET MESSAGES ====================

// Get sent messages (admin inbox)
const getSentMessages = async (req, res) => {
    try {
        const adminId = req.get('x-admin-id');
        const { page = 1, limit = 10, status, recipientType, startDate, endDate } = req.query;

        // Verify admin
        const admin = await verifyAdminSender(req, res, adminId);
        if (!admin) return;

        let filter = { sender: adminId };
        if (status) filter.status = status;
        if (recipientType) filter.recipientType = recipientType;

        if (startDate || endDate) {
            filter.sentAt = {};
            if (startDate) filter.sentAt.$gte = new Date(startDate);
            if (endDate) filter.sentAt.$lte = new Date(endDate);
        }

        const skip = (page - 1) * limit;
        const messages = await Message.find(filter)
            .populate('sender', 'name email')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ sentAt: -1 });

        const total = await Message.countDocuments(filter);

        res.status(200).json({
            message: 'Messages retrieved successfully',
            data: messages,
            pagination: {
                current: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        res.status(500).send({ message: 'Error retrieving messages', error: err.message });
    }
};

// Get message detail
const getMessageDetail = async (req, res) => {
    try {
        const adminId = req.get('x-admin-id');
        const { messageId } = req.params;

        // Verify admin
        const admin = await verifyAdminSender(req, res, adminId);
        if (!admin) return;

        const message = await Message.findById(messageId)
            .populate('sender', 'name email')
            .populate('recipient', 'name email phone');

        if (!message) {
            return res.status(404).send({ message: 'Message not found' });
        }

        // Only sender can view detailed message
        if (message.sender.toString() !== adminId) {
            return res.status(403).send({ message: 'Forbidden: You can only view your own messages' });
        }

        res.status(200).json({
            message: 'Message retrieved successfully',
            data: message
        });
    } catch (err) {
        res.status(500).send({ message: 'Error retrieving message', error: err.message });
    }
};

// Get message statistics
const getMessageStats = async (req, res) => {
    try {
        const adminId = req.get('x-admin-id');
        const { startDate, endDate } = req.query;

        // Verify admin
        const admin = await verifyAdminSender(req, res, adminId);
        if (!admin) return;

        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.sentAt = {};
            if (startDate) dateFilter.sentAt.$gte = new Date(startDate);
            if (endDate) dateFilter.sentAt.$lte = new Date(endDate);
        }

        const filter = { sender: adminId, ...dateFilter };

        const stats = {
            totalMessages: await Message.countDocuments(filter),
            sentMessages: await Message.countDocuments({ ...filter, status: 'Sent' }),
            failedMessages: await Message.countDocuments({ ...filter, status: 'Failed' }),
            partialMessages: await Message.countDocuments({ ...filter, status: 'Partial' }),
            emailsSent: await Message.countDocuments({
                ...filter,
                'deliveryStatus.email': 'Sent'
            }),
            emailsFailed: await Message.countDocuments({
                ...filter,
                'deliveryStatus.email': 'Failed'
            }),
            smsSent: await Message.countDocuments({
                ...filter,
                'deliveryStatus.sms': 'Sent'
            }),
            smsFailed: await Message.countDocuments({
                ...filter,
                'deliveryStatus.sms': 'Failed'
            }),
            byRecipientType: await Message.aggregate([
                { $match: { sender: require('mongoose').Types.ObjectId(adminId) } },
                { $group: { _id: '$recipientType', count: { $sum: 1 } } }
            ]),
        };

        res.status(200).json({
            message: 'Statistics retrieved successfully',
            data: stats
        });
    } catch (err) {
        res.status(500).send({ message: 'Error retrieving statistics', error: err.message });
    }
};

// Delete message
const deleteMessage = async (req, res) => {
    try {
        const adminId = req.get('x-admin-id');
        const { messageId } = req.params;

        // Verify admin
        const admin = await verifyAdminSender(req, res, adminId);
        if (!admin) return;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).send({ message: 'Message not found' });
        }

        // Only sender can delete
        if (message.sender.toString() !== adminId) {
            return res.status(403).send({ message: 'Forbidden: You can only delete your own messages' });
        }

        await Message.findByIdAndDelete(messageId);

        res.status(200).json({ message: 'Message deleted successfully' });
    } catch (err) {
        res.status(500).send({ message: 'Error deleting message', error: err.message });
    }
};

module.exports = {
    sendMessageToStudent,
    sendMessageToParent,
    sendMessageToAdminUser,
    sendBulkMessageToStudents,
    sendBulkMessageToParents,
    getAdminStudentList,
    getAdminParentList,
    getSentMessages,
    getMessageDetail,
    getMessageStats,
    deleteMessage
};
