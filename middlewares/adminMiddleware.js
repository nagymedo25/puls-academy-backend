// puls-academy-backend/middlewares/adminMiddleware.js

const { isAdmin } = require('../config/auth');

const adminMiddleware = (req, res, next) => {
    try {
        if (!isAdmin(req.user)) {
            return res.status(403).json({ error: 'غير مصرح لك بالوصول' });
        }
        next();
    } catch (error) {
        res.status(500).json({ error: 'خطأ في التحقق من الصلاحيات' });
    }
};

module.exports = { adminMiddleware };