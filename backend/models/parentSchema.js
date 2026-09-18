
const mongoose = require('mongoose');
const { encryptText, decryptText } = require('../utils/encryption');

const parentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        set: encryptText,
        get: decryptText
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        default: '',
        set: encryptText,
        get: decryptText
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'student',
        required: true
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true
    },
    role: {
        type: String,
        default: 'Parent'
    },
    acceptedTerms: {
        type: Boolean,
        default: false
    },
    acceptedPrivacyPolicy: {
        type: Boolean,
        default: false
    },
    acceptedTermsAt: {
        type: Date,
        default: null
    },
    acceptedPrivacyPolicyAt: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

parentSchema.set('toJSON', { getters: true });
parentSchema.set('toObject', { getters: true });

parentSchema.index({ school: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('parent', parentSchema);
