const User = require("../models/User");
const { generateToken, verifyToken } = require("../config/auth");
const { v4: uuidv4 } = require('uuid');

const sendTokenCookie = (res, token) => {
  const options = {
    httpOnly: true,
    expires: new Date(Date.now() + (process.env.JWT_COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000),
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
  };
  res.cookie('token', token, options);
};

class AuthController {
  // ✨ --- START: الحل النهائي لدالة التسجيل --- ✨
 static async register(req, res) {
    try {
      // 1. إزالة pharmacy_type من الحقول المطلوبة
      const { name, email, phone, password, college, gender, deviceFingerprint } = req.body;

      if (!name || !(email || phone) || !password || !college || !gender) {
        return res.status(400).json({ error: "يرجى ملء الحقول المطلوبة." });
      }
      if (!deviceFingerprint) {
        return res.status(400).json({ error: "لا يمكن تحديد معرّف الجهاز." });
      }
      
      // 2. إنشاء المستخدم بدون pharmacy_type (ستكون NULL تلقائياً في قاعدة البيانات)
      const user = await User.create({
        name,
        email: email || null,
        phone: phone || null,
        password,
        college,
        gender,
        is_verified: true,
      });

      // ... (باقي كود تسجيل الدخول وإنشاء الجلسة يبقى كما هو)
      await User.requestDeviceAccess(user.user_id, deviceFingerprint, req.headers['user-agent'], true);

      const deviceInfo = {
        fingerprint: deviceFingerprint,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      };
      const sessionToken = await User.createSession(user.user_id, deviceInfo);

      const jwtToken = generateToken(user, sessionToken);
      sendTokenCookie(res, jwtToken);

      res.status(201).json({
        message: "تم إنشاء الحساب وتسجيل الدخول بنجاح",
        user: user,
      });

    } catch (error) {
      if (error.message.includes("مسجل بالفعل")) {
        return res.status(409).json({ error: error.message });
      }
      console.error("Registration Error:", error);
      res.status(400).json({ error: "حدث خطأ أثناء إنشاء الحساب." });
    }
  }
  // ✨ --- END: الحل النهائي لدالة التسجيل --- ✨

  static async login(req, res) {
    try {
      const { emailOrPhone, password, deviceFingerprint } = req.body;

      if (!emailOrPhone || !password) {
        return res.status(400).json({ error: "يرجى إدخال البريد الإلكتروني/الهاتف وكلمة المرور." });
      }
      
      if (!deviceFingerprint) {
        return res.status(400).json({ error: "لا يمكن تحديد معرّف الجهاز." });
      }

      const user = await User.findByEmailOrPhone(emailOrPhone);

      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ error: "البيانات المدخلة غير صحيحة." });
      }
      
      const isDeviceAllowed = await User.isDeviceAllowed(user.user_id, deviceFingerprint);
      
      if (!isDeviceAllowed) {
        const hasPendingRequest = await User.hasPendingDeviceRequest(user.user_id, deviceFingerprint);
        if (hasPendingRequest) {
          return res.status(403).json({ 
            error: 'request_pending', 
            message: 'طلب تسجيل هذا الجهاز قيد المراجعة حاليًا.' 
          });
        }
        await User.requestDeviceAccess(user.user_id, deviceFingerprint, req.headers['user-agent']);
        return res.status(403).json({ 
          error: 'device_not_allowed', 
          message: 'هذا الجهاز غير مسجل. تم إرسال طلب للموافقة على الجهاز الجديد.' 
        });
      }

      const deviceInfo = {
        fingerprint: deviceFingerprint,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      };

      const sessionToken = await User.createSession(user.user_id, deviceInfo);
      const jwtToken = generateToken(user, sessionToken);

      sendTokenCookie(res, jwtToken);

      res.status(200).json({ user });
    } catch (error) {
      console.error("Login Error:", error);
      res.status(400).json({ error: "حدث خطأ أثناء تسجيل الدخول." });
    }
  }

   static async updateSpecialization(req, res) {
    try {
      const { userId } = req.user; // الحصول على هوية المستخدم من التوكن
      const { pharmacy_type } = req.body;

      if (!pharmacy_type) {
        return res.status(400).json({ error: "يرجى اختيار التخصص." });
      }

      const updatedUser = await User.updateSpecialization(userId, pharmacy_type);
      
      res.status(200).json({ 
        message: "تم تحديث التخصص بنجاح.",
        user: updatedUser 
      });

    } catch (error) {
      console.error("Update Specialization Error:", error);
      res.status(500).json({ error: "حدث خطأ أثناء تحديث التخصص." });
    }
  }

   static async getProfile(req, res) {
    try {
      // الـ Middleware الخاص بـ authenticateToken يضع هوية المستخدم في req.user.id
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'المستخدم غير موجود.' });
      }
      res.status(200).json({ user });
    } catch (error) {
      console.error("Get Profile Error:", error);
      res.status(500).json({ error: "فشل في جلب بيانات الملف الشخصي." });
    }
  }

  static async logout(req, res) {
    try {
        const { token } = req.cookies;
        if (token) {
            const decoded = verifyToken(token);
            if (decoded && decoded.sessionToken) {
                await User.endSession(decoded.sessionToken);
            }
        }
    } catch (error) {
        console.error("Error during session ending:", error.message);
    } finally {
        res.cookie('token', 'none', {
            expires: new Date(Date.now() + 5 * 1000),
            httpOnly: true,
        });
        res.status(200).json({ success: true, message: 'User logged out successfully' });
    }
  }

  static async checkStatus(req, res) {
    if (req.user) {
        res.status(200).json({ isAuthenticated: true, user: req.user });
    } else {
        res.status(200).json({ isAuthenticated: false, user: null });
    }
  }
}

module.exports = AuthController;