
const mongoose = require('mongoose');

const legalAcceptanceSchema = new mongoose.Schema({
    user_id: { type: String, required: true, index: true },
    school_id: { type: String, default: null, index: true },
    document_type: {
        type: String,
        enum: ['terms', 'privacy', 'dpa', 'eula'],
        required: true,
    },
    document_version: { type: String, required: true },
    accepted: { type: Boolean, required: true },
    accepted_at: { type: Date, default: Date.now, index: true },
    ip_address: { type: String, required: true },
    user_agent: { type: String, default: '' },
}, { timestamps: true });

legalAcceptanceSchema.index({ user_id: 1, document_type: 1, document_version: 1 }, { unique: true });

module.exports = mongoose.model('legalAcceptance', legalAcceptanceSchema);
