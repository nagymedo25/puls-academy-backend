// puls-academy-backend/middlewares/uploadMiddleware.js

const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|mkv/;

    const extension = path.extname(file.originalname).toLowerCase().slice(1);

    // FIX: We will now rely only on the file extension for validation,
    // as the MIME type can be unreliable (e.g., 'application/octet-stream').
    if (allowedTypes.test(extension)) {
        // Extension is valid, accept the file.
        return cb(null, true);
    } else {
        // Extension is not valid, reject the file.
        console.error(`File rejected based on extension. Filename: ${file.originalname}, Extension: ${extension}`);
        cb(new Error('نوع الملف غير مدعوم'));
    }
};

const uploadMiddleware = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
    },
    fileFilter: fileFilter,
});

module.exports = { uploadMiddleware };