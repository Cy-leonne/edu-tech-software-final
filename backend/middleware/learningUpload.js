
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsRoot = path.join(__dirname, '../uploads/learning');

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
    },
});

const fileFilter = (req, file, cb) => {
    const allowed = /\.pdf|\.doc|\.docx|\.ppt|\.pptx|\.mp4|\.mov|\.webm|\.m4v|\.jpg|\.jpeg|\.png|\.txt/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.test(ext)) cb(null, true);
    else cb(null, false);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 },
});

module.exports = upload;
