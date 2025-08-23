// puls-academy-backend/controllers/authController.js

const User = require("../models/User");
const {
  generateToken,
  generateRefreshToken,
  verifyToken,
} = require("../config/auth");

class AuthController {
  static async register(req, res) {
    try {
      const { name, email, password, college, gender } = req.body;

      if (!name || !email || !password || !college || !gender) {
        return res.status(400).json({ error: "جميع الحقول مطلوبة" });
      }

      const user = await User.create({
        name,
        email,
        password,
        college,
        gender,
      });

      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      res.status(201).json({
        message: "تم إنشاء الحساب بنجاح",
        user,
        token,
        refreshToken,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" });
      }

      const user = await User.login(email, password);
      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      res.json({
        message: "تم تسجيل الدخول بنجاح",
        user,
        token,
        refreshToken,
      });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }

  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({ error: "توكن التحديث مطلوب" });
      }

      const decoded = verifyToken(refreshToken);
      const user = await User.findById(decoded.userId);

      const newToken = generateToken(user);
      const newRefreshToken = generateRefreshToken(user);

      res.json({
        token: newToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      res.status(401).json({ error: "توكن التحديث غير صالح" });
    }
  }

    static async getProfile(req, res) {
        res.json({ user: req.user });
    }

  static async updateProfile(req, res) {
    try {
      const { name, email, college, gender } = req.body;
      const userId = req.user.userId;

      const updatedUser = await User.update(userId, {
        name,
        email,
        college,
        gender,
      });

      res.json({
        message: "تم تحديث البيانات بنجاح",
        user: updatedUser,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.userId;

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
    res.json({ message: "تم تسجيل الخروج بنجاح" });
  }
}

module.exports = AuthController;
