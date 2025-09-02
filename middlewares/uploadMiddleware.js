// puls-academy-backend/middlewares/uploadMiddleware.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define a directory for temporary uploads
const uploadDir = path.join(__dirname, '../temp_uploads');

// Ensure the temporary directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// --- Use diskStorage to save files to a temporary folder first ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // Save files to the temp_uploads directory
    },
    filename: function (req, file, cb) {
        // Use a unique filename to avoid conflicts
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
    storage: storage, // Use the new disk storage engine
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
    },
    fileFilter: fileFilter,
});

// ✨ --- START: THIS IS THE FIX --- ✨
// We are exporting an object with a key named 'upload' that holds our middleware.
// This matches the import `const { upload } = require(...)` in paymentRoutes.js
module.exports = { upload: uploadMiddleware };
// ✨ --- END: THE FIX IS APPLIED --- ✨