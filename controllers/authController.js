// puls-academy-backend/controllers/authController.js

const User = require("../models/User");
const { generateToken } = require("../config/auth");

const sendTokenCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
  res.cookie("token", token, cookieOptions);
};

class AuthController {
  static async register(req, res) {
    try {
      const { name, email, phone, password, college, gender } = req.body;

      if (!name || !(email || phone) || !password || !college || !gender) {
        return res.status(400).json({ error: "يرجى ملء الحقول المطلوبة." });
      }

      const user = await User.create({
        name,
        email: email || null,
        phone: phone || null,
        password,
        college,
        gender,
        is_verified: true,
      });

      const token = generateToken(user);
      sendTokenCookie(res, token);

      res.status(201).json({
        message: "تم إنشاء الحساب بنجاح",
        user,
        token,
      });
    } catch (error) {
      if (error.message.includes("مسجل بالفعل")) {
        return res.status(409).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }

  static async login(req, res) {
    try {
      const { emailOrPhone, password, deviceFingerprint } = req.body;

      if (!emailOrPhone || !password || !deviceFingerprint) {
        return res
          .status(400)
          .json({ error: "البيانات المطلوبة غير كاملة" });
      }

      const deviceInfo = {
        fingerprint: deviceFingerprint,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      };

      const result = await User.login(emailOrPhone, password, deviceInfo);

      if (result.status === 'pending_approval') {
        return res.status(403).json({ error: result.message });
      }

      if (result.status === 'success') {
        const jwtToken = generateToken(result.user, result.token); // نمرر session_token
        sendTokenCookie(res, jwtToken);
        return res.json({
          message: result.message,
          user: result.user,
        });
      }

    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }

  static async getProfile(req, res) {
    res.json({ user: req.user });
  }

  static async updateProfile(req, res) {
    try {
      const { name, email, phone, college, gender } = req.body;
      const userId = req.user.user_id;

      const updatedUser = await User.update(userId, {
        name,
        email,
        phone,
        college,
        gender,
      });

      res.json({
        message: "تم تحديث البيانات بنجاح",
        user: updatedUser,
      });
    } catch (error) {
      if (error.message.includes("مسجل بالفعل")) {
        return res.status(409).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }

  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.user_id;

      if (!currentPassword || !newPassword) {
        return res
          .status(400)
          .json({ error: "كلمة المرور الحالية والجديدة مطلوبة" });
      }

      const result = await User.changePassword(
        userId,
        currentPassword,
        newPassword
      );

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async logout(req, res) {
    try {
        const token = req.cookies.token;

        // الخطوة 1: حذف الجلسة من قاعدة البيانات
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (decoded.sessionId) {
                    await db.query('DELETE FROM ActiveSessions WHERE session_token = $1', [decoded.sessionId]);
                }
            } catch (err) {
                // تجاهل الأخطاء إذا كان التوكن غير صالح، المهم هو حذف الكوكي
                console.error("Error decoding token on logout, proceeding to clear cookie:", err.message);
            }
        }

        // الخطوة 2: حذف الكوكي من المتصفح
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        };
        res.clearCookie('token', cookieOptions);

        res.json({ message: 'تم تسجيل الخروج بنجاح' });
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الخروج' });
    }
  }
}

module.exports = AuthController;
