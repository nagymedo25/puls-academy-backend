// puls-academy-backend/middlewares/uploadMiddleware.js

const multer = require('multer');
const path = require('path');

// ✨  تغيير رئيسي: استخدام التخزين في الذاكرة بدلاً من القرص الصلب
// This holds the file as a buffer in memory, ready for uploading to MEGA.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
        return cb(null, true);
    }
    cb(new Error('نوع الملف غير مدعوم. يرجى رفع صورة فقط.'));
};

const uploadMiddleware = multer({
    storage: storage, // Use memory storage
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit for screenshots
    },
    fileFilter: fileFilter,
});

module.exports = { uploadMiddleware };