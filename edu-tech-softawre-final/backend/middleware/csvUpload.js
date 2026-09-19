
const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowed = /\.csv$/i;
    const ext = file.originalname.toLowerCase();
    if (allowed.test(ext)) cb(null, true);
    else cb(new Error('Only CSV files are allowed'), false);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = upload;
