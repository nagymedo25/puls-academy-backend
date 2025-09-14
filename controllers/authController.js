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
      const { emailOrPhone, password } = req.body;

      if (!emailOrPhone || !password) {
        return res
          .status(400)
          .json({ error: "البريد الإلكتروني/رقم الهاتف وكلمة المرور مطلوبان" });
      }

      const user = await User.login(emailOrPhone, password);
      const token = generateToken(user);

      sendTokenCookie(res, token);

      res.json({
        message: "تم تسجيل الدخول بنجاح",
        user,
      });
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
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    };

    res.cookie("token", "loggedout", {
      ...cookieOptions,
      expires: new Date(0), // تعيين تاريخ انتهاء الصلاحية في الماضي
    });

    res.status(200).json({ message: "تم تسجيل الخروج بنجاح" });
  }
}

module.exports = AuthController;
