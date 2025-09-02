const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    // ✅ [FIX] Read the token from the httpOnly cookie instead of the Authorization header.
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'الوصول مرفوض. لا يوجد توكن مصادقة.' });
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find the user from the database to ensure they still exist
        // This also attaches the most up-to-date user info to the request object
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ error: 'المستخدم غير موجود.' });
        }
        
        // Attach the safe user data to the request object
        req.user = user;
        
        next(); // Proceed to the next middleware or the route handler
    } catch (error) {
        // Handle various token errors (expired, invalid, etc.)
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى.' });
        }
        res.status(400).json({ error: 'التوكن غير صالح.' });
    }
};

module.exports = { authMiddleware };