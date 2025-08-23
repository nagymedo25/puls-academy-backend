// puls-academy-backend/middlewares/authMiddleware.js

const { verifyToken } = require('../config/auth');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'التوكن مطلوب' });
        }
        
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ error: 'المستخدم غير موجود' });
        }
        
        // هنا بنضيف userId من التوكن عشان يبقى متاح بعدين
        req.user = { userId: decoded.userId, ...user };
        next();
        
    } catch (error) {
        res.status(401).json({ error: 'توكن غير صالح' });
    }
};

module.exports = { authMiddleware };
