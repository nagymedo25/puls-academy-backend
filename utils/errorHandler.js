// puls-academy-backend/utils/errorHandler.js

const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'خطأ في التحقق من البيانات',
            details: err.message
        });
    }

    if (err.code === 'SQLITE_CONSTRAINT') {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({
                error: 'هذه البيانات موجودة بالفعل'
            });
        }
    }

    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'حجم الملف يتجاوز الحد الأقصى المسموح به (100MB)'
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                error: 'نوع الملف غير متوقع'
            });
        }
    }

    if (err.message.includes('نوع الملف غير مدعوم')) {
        return res.status(400).json({
            error: 'نوع الملف غير مدعوم'
        });
    }

    res.status(500).json({
        error: 'حدث خطأ في الخادم'
    });
};

module.exports = errorHandler;