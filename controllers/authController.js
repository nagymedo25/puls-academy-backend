// puls-academy-backend/controllers/authController.js

const User = require("../models/User");
const { generateToken } = require("../config/auth");

/**
 * Sets the JWT token as an httpOnly cookie in the response.
 * This is a secure way to handle authentication tokens.
 * @param {object} res - The Express response object.
 * @param {string} token - The JWT token.
 */
const sendTokenCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true, // The cookie only accessible by the web server
    secure: process.env.NODE_ENV === "production", // Makes sure cookie is sent only over HTTPS
    sameSite: "strict", // Protects against CSRF attacks
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiration
  };
  res.cookie("token", token, cookieOptions);
};

class AuthController {
  static async register(req, res) {
    try {
      const { name, email, password, college, gender } = req.body;

      if (!name || !email || !password || !college || !gender) {
        return res.status(400).json({ error: "جميع الحقول مطلوبة" });
      }

      // Create user and mark as verified immediately
      const user = await User.create({
        name,
        email,
        password,
        college,
        gender,
        is_verified: true,
      });

      // Generate token for the new user
      const token = generateToken(user);

      // Send token as a secure httpOnly cookie
      sendTokenCookie(res, token);

      res.status(201).json({
        message: "تم إنشاء الحساب بنجاح",
        user, // Send user data for the frontend
        token, // Also send token in body for immediate use by frontend state
      });
    } catch (error) {
      // Handle cases like "email already exists"
      if (error.message.includes("البريد الإلكتروني مسجل بالفعل")) {
        return res.status(409).json({ error: error.message }); // 409 Conflict
      }
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

      // This part correctly SETS the cookie
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      };
      res.cookie("token", token, cookieOptions);

      res.json({
        message: "تم تسجيل الدخول بنجاح",
        user,
      });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }

  static async getProfile(req, res) {
    // The user object is attached to req.user by the authMiddleware
    res.json({ user: req.user });
  }

  static async updateProfile(req, res) {
    try {
      const { name, email, college, gender } = req.body;
      const userId = req.user.user_id;

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
      if (error.message.includes("البريد الإلكتروني مسجل بالفعل")) {
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
    // Clear the secure cookie to log the user out
    res.cookie("token", "loggedout", {
      expires: new Date(Date.now() + 10 * 1000), // Expire in 10 seconds
      httpOnly: true,
    });
    res.status(200).json({ message: "تم تسجيل الخروج بنجاح" });
  }
}

module.exports = AuthController;
