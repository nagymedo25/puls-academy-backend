// puls-academy-backend/routes/authRoutes.js

const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/authController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const {
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
} = require("../middlewares/validationMiddleware");

// Routes for user registration and login
router.post("/register", validateRegistration, AuthController.register);
router.post("/login", validateLogin, AuthController.login);

// Routes for user profile and settings (require authentication)
router.get("/profile", authMiddleware, AuthController.getProfile);
router.put(
  "/profile",
  authMiddleware,
  validateProfileUpdate,
  AuthController.updateProfile
);
router.put("/change-password", authMiddleware, AuthController.changePassword);
router.post("/logout", authMiddleware, AuthController.logout);

module.exports = router;
