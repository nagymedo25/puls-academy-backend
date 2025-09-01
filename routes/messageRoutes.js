// puls-academy-backend/routes/messageRoutes.js

const express = require('express');
const router = express.Router();
const MessageController = require('../controllers/messageController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { adminMiddleware } = require('../middlewares/adminMiddleware');

// --- Routes for Admin ---
// جلب قائمة بكل المحادثات
router.get('/admin/conversations', authMiddleware, adminMiddleware, MessageController.getConversations);
// حذف محادثة معينة
router.delete('/admin/conversations/:studentId', authMiddleware, adminMiddleware, MessageController.deleteConversation);

// --- Common Routes ---
// إرسال رسالة
router.post('/', authMiddleware, MessageController.sendMessage);
// جلب محادثة مع مستخدم معين
router.get('/conversation/:userId', authMiddleware, MessageController.getConversation);

module.exports = router;