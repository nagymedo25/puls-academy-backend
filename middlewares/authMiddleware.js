// puls-academy-backend/middlewares/authMiddleware.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');
// ✨ 1. استيراد المفتاح السري الموحّد من ملف الإعدادات
const { JWT_SECRET } = require('../config/auth');

const authMiddleware = async (req, res, next) => {
    // قراءة التوكن من الـ httpOnly cookie
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'الوصول مرفوض. لا يوجد توكن مصادقة.' });
    }

    try {
        // ✨ 2. استخدام المتغير المستورد للتحقق من التوكن
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // البحث عن المستخدم في قاعدة البيانات للتأكد من أنه لا يزال موجوداً
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ error: 'المستخدم غير موجود.' });
        }
        
        // إرفاق بيانات المستخدم الآمنة في كائن الطلب
        req.user = user;
        
        next(); // الانتقال إلى الخطوة التالية
    } catch (error) {
        // التعامل مع أخطاء التوكن المختلفة
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى.' });
        }
        res.status(400).json({ error: 'التوكن غير صالح.' });
    }
};

module.exports = { authMiddleware };