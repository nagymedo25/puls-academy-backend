// puls-academy-backend/utils/errorHandler.js

const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'خطأ في التحقق من البيانات',
            details: err.message
        });
    }

    //
    // ✨ التعديل الرئيسي: التعامل مع أخطاء PostgreSQL
    //
    if (err.code === '23505') { // 23505 is the code for unique_violation in PostgreSQL
        return res.status(400).json({
            error: 'هذه البيانات موجودة بالفعل'
        });
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
