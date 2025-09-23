// puls-academy-backend/middlewares/authMiddleware.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/auth');
const { db } = require('../config/db');

const authMiddleware = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'الوصول مرفوض. لا يوجد توكن مصادقة.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ error: 'المستخدم المرتبط بهذا التوكن غير موجود.' });
        }
        if (user.status === 'suspended') {
            return res.status(403).json({ error: 'هذا الحساب معلق.' });
        }
        
        // ✨ --- START: The Fix --- ✨
        // If the user is an admin, bypass the session check entirely.
        if (user.role === 'admin') {
            req.user = user;
            return next();
        }
        // ✨ --- END: The Fix --- ✨
        
        // This logic now only applies to students
        const sessionResult = await db.query(
            'SELECT * FROM ActiveSessions WHERE user_id = $1 AND session_token = $2',
            [decoded.userId, decoded.sessionId] // Assuming sessionId is in the token for students
        );

        if (sessionResult.rowCount === 0) {
            return res.status(401).json({ error: 'الجلسة غير صالحة. قد يكون تم تسجيل الدخول من جهاز آخر.' });
        }
        
        await db.query('UPDATE ActiveSessions SET last_seen = CURRENT_TIMESTAMP WHERE session_id = $1', [sessionResult.rows[0].session_id]);
        
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