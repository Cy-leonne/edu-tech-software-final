const Communication = require('../models/hrAccountantCommunicationSchema.js');
const Admin = require('../models/adminSchema.js');
const { getAdminIdFromReq } = require('../middleware/schoolAccess.js');

// Send a message between HR and Accountant
const sendMessage = async (req, res) => {
    try {
        const { recipientId, subject, message, messageType = 'general', priority = 'medium', relatedTeacherId } = req.body;
        const senderId = getAdminIdFromReq(req);
        const schoolId = senderId;

        if (!senderId || !recipientId) {
            return res.status(400).json({ message: 'Sender and recipient are required' });
        }

        const sender = await Admin.findById(senderId).select('name role');
        const recipient = await Admin.findById(recipientId).select('name role');

        if (!sender || !recipient) {
            return res.status(404).json({ message: 'Sender or recipient not found' });
        }

        const communication = new Communication({
            school: schoolId,
            sender: senderId,
            senderRole: sender.role,
            senderName: sender.name,
            recipient: recipientId,
            recipientRole: recipient.role,
            subject,
            message,
            messageType,
            priority,
            relatedTeacherId,
        });

        await communication.save();

        res.status(201).json({ message: 'Message sent successfully', communication });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Failed to send message', error: error.message });
    }
};

// Get messages for current user (inbox)
const getInbox = async (req, res) => {
    try {
        const userId = getAdminIdFromReq(req);
        const schoolId = userId;
        const { messageType, status } = req.query;

        let query = {
            school: schoolId,
            $or: [{ recipient: userId }, { sender: userId }],
        };

        if (messageType) query.messageType = messageType;
        if (status) query.status = status;

        const messages = await Communication.find(query)
            .populate('sender', 'name email role')
            .populate('recipient', 'name email role')
            .populate('responses.responder', 'name email role')
            .sort({ createdAt: -1 })
            .limit(100);

        res.json(messages);
    } catch (error) {
        console.error('Error fetching inbox:', error);
        res.status(500).json({ message: 'Failed to fetch messages', error: error.message });
    }
};

// Get unread message count
const getUnreadCount = async (req, res) => {
    try {
        const userId = getAdminIdFromReq(req);
        const schoolId = userId;

        const unreadCount = await Communication.countDocuments({
            school: schoolId,
            recipient: userId,
            status: 'unread',
        });

        res.json({ unreadCount });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ message: 'Failed to fetch unread count', error: error.message });
    }
};

// Mark message as read
const markAsRead = async (req, res) => {
    try {
        const { messageId } = req.params;

        const message = await Communication.findByIdAndUpdate(
            messageId,
            { status: 'read' },
            { new: true }
        );

        res.json({ message: 'Message marked as read', communication: message });
    } catch (error) {
        console.error('Error marking as read:', error);
        res.status(500).json({ message: 'Failed to mark as read', error: error.message });
    }
};

// Add a response to a communication thread
const addResponse = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { message } = req.body;
        const responderId = getAdminIdFromReq(req);

        const responder = await Admin.findById(responderId).select('name role');
        if (!responder) {
            return res.status(404).json({ message: 'Responder not found' });
        }

        const communication = await Communication.findByIdAndUpdate(
            messageId,
            {
                $push: {
                    responses: {
                        responder: responderId,
                        responderRole: responder.role,
                        responderName: responder.name,
                        message,
                    },
                },
                updatedAt: new Date(),
            },
            { new: true }
        ).populate('responses.responder', 'name email role');

        res.json({ message: 'Response added successfully', communication });
    } catch (error) {
        console.error('Error adding response:', error);
        res.status(500).json({ message: 'Failed to add response', error: error.message });
    }
};

// Resolve a communication issue
const resolveCommunication = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = getAdminIdFromReq(req);

        const communication = await Communication.findByIdAndUpdate(
            messageId,
            {
                status: 'resolved',
                resolvedAt: new Date(),
                resolvedBy: userId,
            },
            { new: true }
        );

        res.json({ message: 'Communication marked as resolved', communication });
    } catch (error) {
        console.error('Error resolving communication:', error);
        res.status(500).json({ message: 'Failed to resolve communication', error: error.message });
    }
};

// Broadcast a notification to all HR or Accountant staff
const broadcastNotification = async (req, res) => {
    try {
        const { targetRole, subject, message, messageType = 'notification' } = req.body;
        const senderId = getAdminIdFromReq(req);
        const schoolId = senderId;

        if (!['HR', 'Accountant'].includes(targetRole)) {
            return res.status(400).json({ message: 'Invalid target role' });
        }

        // Find all recipients with the target role
        const recipients = await Admin.find({
            school: schoolId,
            role: targetRole,
            _id: { $ne: senderId },
        }).select('_id name');

        const sender = await Admin.findById(senderId).select('name role');

        const communications = [];
        for (const recipient of recipients) {
            const comm = new Communication({
                school: schoolId,
                sender: senderId,
                senderRole: sender.role,
                senderName: sender.name,
                recipient: recipient._id,
                recipientRole: targetRole,
                subject,
                message,
                messageType,
                priority: 'high',
            });
            await comm.save();
            communications.push(comm);
        }

        res.status(201).json({ message: `Notification sent to ${communications.length} ${targetRole} staff members`, communications });
    } catch (error) {
        console.error('Error broadcasting notification:', error);
        res.status(500).json({ message: 'Failed to broadcast notification', error: error.message });
    }
};

// Get communication statistics
const getCommunicationStats = async (req, res) => {
    try {
        const userId = getAdminIdFromReq(req);
        const schoolId = userId;

        const stats = {
            unreadCount: await Communication.countDocuments({
                school: schoolId,
                recipient: userId,
                status: 'unread',
            }),
            totalMessages: await Communication.countDocuments({
                school: schoolId,
                $or: [{ sender: userId }, { recipient: userId }],
            }),
            unresolvedIssues: await Communication.countDocuments({
                school: schoolId,
                messageType: { $in: ['query', 'payment_alert'] },
                status: { $ne: 'resolved' },
                $or: [{ sender: userId }, { recipient: userId }],
            }),
            pendingResponses: await Communication.countDocuments({
                school: schoolId,
                recipient: userId,
                responses: { $size: 0 },
                status: 'read',
            }),
        };

        res.json(stats);
    } catch (error) {
        console.error('Error fetching communication stats:', error);
        res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
    }
};

module.exports = {
    sendMessage,
    getInbox,
    getUnreadCount,
    markAsRead,
    addResponse,
    resolveCommunication,
    broadcastNotification,
    getCommunicationStats,
};