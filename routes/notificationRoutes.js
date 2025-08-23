// puls-academy-backend/routes/notificationRoutes.js

const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { adminMiddleware } = require('../middlewares/adminMiddleware');

router.get('/', authMiddleware, NotificationController.getUserNotifications);
router.get('/unread-count', authMiddleware, NotificationController.getUnreadCount);
router.get('/stats', authMiddleware, adminMiddleware, NotificationController.getNotificationStats);

router.post('/', authMiddleware, adminMiddleware, NotificationController.createNotification);
router.post('/bulk', authMiddleware, adminMiddleware, NotificationController.bulkCreateNotifications);

router.put('/:notificationId/read', authMiddleware, NotificationController.markAsRead);
router.put('/mark-all-read', authMiddleware, NotificationController.markAllAsRead);

router.delete('/:notificationId', authMiddleware, NotificationController.deleteNotification);
router.delete('/all', authMiddleware, NotificationController.deleteAllUserNotifications);

module.exports = router;