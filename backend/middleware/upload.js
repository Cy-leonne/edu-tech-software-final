
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsRoot = path.join(__dirname, '../uploads/assignments');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true });
            cb(null, uploadsRoot);
        } catch (err) {
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const base = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${base}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = /\.pdf|\.doc|\.docx|\.ppt|\.pptx|\.jpg|\.jpeg|\.png|\.zip|\.txt/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.test(ext)) cb(null, true);
    else cb(null, false);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

module.exports = upload;
