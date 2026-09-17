const LegalAcceptance = require('../models/legalAcceptanceSchema.js');

const saveLegalAcceptance = async (req, res) => {
    try {
        const requesterId = req.get('x-user-id') || req.get('x-admin-id');
        const { user_id, school_id, document_type, document_version = '1.0', accepted } = req.body;

        if (!requesterId || String(requesterId) !== String(user_id)) {
            return res.status(403).json({ message: 'Authenticated user does not match acceptance record' });
        }
        if (!['terms', 'privacy', 'dpa', 'eula'].includes(document_type)) {
            return res.status(400).json({ message: 'Invalid document type' });
        }
        if (accepted !== true) {
            return res.status(400).json({ message: 'Document must be accepted' });
        }

        const acceptance = await LegalAcceptance.findOneAndUpdate(
            { user_id, document_type, document_version },
            {
                user_id,
                school_id: school_id || null,
                document_type,
                document_version,
                accepted: true,
                accepted_at: new Date(),
                ip_address: req.clientIP || req.ip || 'Unknown',
                user_agent: req.get('user-agent') || '',
            },
            { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
        );

        return res.status(200).json({ message: 'Legal acceptance recorded', acceptance });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to record legal acceptance', error: error.message });
    }
};

module.exports = { saveLegalAcceptance };