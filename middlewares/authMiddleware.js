// puls-academy-backend/middlewares/authMiddleware.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');
// ✨ 1. استيراد المفتاح السري الموحّد من ملف الإعدادات
const { JWT_SECRET } = require('../config/auth');
const { db } = require('../config/db');

const authMiddleware = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'الوصول مرفوض. لا يوجد توكن مصادقة.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // === START: التحقق من الجلسة النشطة ===
        const sessionResult = await db.query(
            'SELECT * FROM ActiveSessions WHERE user_id = $1 AND session_token = $2',
            [decoded.userId, decoded.sessionId]
        );

        if (sessionResult.rowCount === 0) {
            // إذا لم يتم العثور على الجلسة، فهذا يعني أنه تم تسجيل الخروج أو تسجيل الدخول من جهاز آخر
            return res.status(401).json({ error: 'الجلسة غير صالحة. قد يكون تم تسجيل الدخول من جهاز آخر.' });
        }
        
        // تحديث آخر ظهور للجلسة
        await db.query('UPDATE ActiveSessions SET last_seen = CURRENT_TIMESTAMP WHERE session_id = $1', [sessionResult.rows[0].session_id]);
        // === END: التحقق من الجلسة النشطة ===

        const user = await User.findById(decoded.userId);
        
        if (!user || user.status === 'suspended') {
            return res.status(401).json({ error: 'المستخدم غير موجود أو حسابه معلق.' });
        }
        
        req.user = user;
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى.' });
        }
        res.status(400).json({ error: 'التوكن غير صالح.' });
    }
};


module.exports = { authMiddleware };