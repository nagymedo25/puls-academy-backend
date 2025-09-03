// puls-academy-backend/middlewares/uploadMiddleware.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../temp_uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|mkv/;
    const extension = path.extname(file.originalname).toLowerCase().slice(1);

    if (allowedTypes.test(extension)) {
        return cb(null, true);
    } else {
        cb(new Error('نوع الملف غير مدعوم'));
    }
};

const uploadMiddleware = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: fileFilter,
});

// ✨ FIX: Export the middleware correctly. This was already correct but is confirmed here.
module.exports = { upload: uploadMiddleware };