// puls-academy-backend/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Routes for user registration and login
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Routes for user profile and settings (require authentication)
router.get('/profile', authMiddleware, AuthController.getProfile);
router.put('/profile', authMiddleware, AuthController.updateProfile);
router.put('/change-password', authMiddleware, AuthController.changePassword);
router.post('/logout', authMiddleware, AuthController.logout);

module.exports = router;
