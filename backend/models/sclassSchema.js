const mongoose = require("mongoose");

const sclassSchema = new mongoose.Schema({
    sclassName: {
        type: String,
        required: true,
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true
    },
}, { timestamps: true });

sclassSchema.index({ school: 1, sclassName: 1 }, { unique: true });

module.exports = mongoose.model("sclass", sclassSchema);