// puls-academy-backend/config/auth.js

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const JWT_SECRET = process.env.JWT_SECRET || 'puls-academy-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// دالة لتشفير كلمة المرور
const hashPassword = async (password) => {
    try {
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        return hashedPassword;
    } catch (error) {
        console.error('خطأ في تشفير كلمة المرور:', error);
        throw error;
    }
};



// دالة للتحقق من كلمة المرور
const comparePassword = async (password, hashedPassword) => {
    try {
        const isMatch = await bcrypt.compare(password, hashedPassword);
        return isMatch;
    } catch (error) {
        console.error('خطأ في التحقق من كلمة المرور:', error);
        throw error;
    }
};

// دالة لإنشاء توكن JWT
const generateToken = (user, sessionId) => {
       try {
        const payload = {
            userId: user.user_id,
            email: user.email,
            role: user.role,
            college: user.college,
            gender: user.gender,
            pharmacy_type: user.pharmacy_type, // <-- تمت الإضافة هنا
            sessionId: sessionId,
        };
        
        const token = jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN
        });
        
        return token;
    } catch (error) {
        console.error('خطأ في إنشاء التوكن:', error);
        throw error;
    }
};

// دالة للتحقق من توكن JWT
// دالة للتحقق من توكن JWT
const verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    } catch (error) {
        console.error('خطأ في التحقق من التوكن:', error);
        throw error;
    }
};

// دالة لإنشاء توكن تحديث (Refresh Token)
const generateRefreshToken = (user) => {
    try {
        const payload = {
            userId: user.user_id,
            email: user.email
        };
        
        const refreshToken = jwt.sign(payload, JWT_SECRET, {
            expiresIn: '30d' // توكن تحديث صالح لمدة 30 يوم
        });
        
        return refreshToken;
    } catch (error) {
        console.error('خطأ في إنشاء توكن التحديث:', error);
        throw error;
    }
};

// دالة للتحقق من صلاحيات الأدمن
const isAdmin = (user) => {
    return user.role === 'admin';
};

// دالة للتحقق من صلاحيات الطالب
const isStudent = (user) => {
    return user.role === 'student';
};

// دالة للتحقق من أن المستخدم لديه صلاحية الوصول لكورس معين
const canAccessCourse = (user, course) => {
    // الأدمن يمكنه الوصول لجميع الكورسات
    if (user.role === 'admin') {
        return true;
    }
    
    // الطالب يمكنه الوصول فقط لكورسات كليته ونوعه
    return user.college === course.category && 
           user.gender === course.college_type;
};

// دالة للتحقق من أن المستخدم لديه صلاحية التعديل على بيانات مستخدم آخر
const canModifyUser = (currentUser, targetUserId) => {
    // الأدمن يمكنه تعديل جميع المستخدمين
    if (currentUser.role === 'admin') {
        return true;
    }
    
    // المستخدم العادي يمكنه تعديل بياناته فقط
    return currentUser.userId === targetUserId;
};

// دالة لإنشاء بيانات المستخدم الآمنة (بدءاً من كلمة المرور)
const createSafeUserData = (user) => {
    return {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone, 
        role: user.role,
        college: user.college,
        gender: user.gender,
        pharmacy_type: user.pharmacy_type, // <-- تمت الإضافة هنا
        created_at: user.created_at
    };
};

// دالة للتحقق من قوة كلمة المرور
const validatePasswordStrength = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (password.length < minLength) {
        return {
            isValid: false,
            message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
        };
    }
    
    if (!hasUpperCase || !hasLowerCase) {
        return {
            isValid: false,
            message: 'كلمة المرور يجب أن تحتوي على أحرف كبيرة وصغيرة'
        };
    }
    
    if (!hasNumbers) {
        return {
            isValid: false,
            message: 'كلمة المرور يجب أن تحتوي على أرقام'
        };
    }
    
    if (!hasSpecialChar) {
        return {
            isValid: false,
            message: 'كلمة المرور يجب أن تحتوي على رموز خاصة'
        };
    }
    
    return {
        isValid: true,
        message: 'كلمة المرور قوية'
    };
};

// تصدير جميع الدوال
module.exports = {
    hashPassword,
    comparePassword,
    generateToken,
    verifyToken,
    generateRefreshToken,
    isAdmin,
    isStudent,
    canAccessCourse,
    canModifyUser,
    createSafeUserData,
    validatePasswordStrength,
    JWT_SECRET,
    JWT_EXPIRES_IN
};