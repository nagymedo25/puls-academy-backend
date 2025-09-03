// puls-academy-backend/controllers/notificationController.js

const Notification = require('../models/Notification');

class NotificationController {
    static async getUserNotifications(req, res) {
        try {
            const userId = req.user.user_id; 
            const { limit, offset, is_read } = req.query;
            
            const filters = {};
            if (limit) filters.limit = parseInt(limit);
            if (offset) filters.offset = parseInt(offset);
            if (is_read !== undefined) filters.is_read = is_read === 'true';
            
            const notifications = await Notification.getByUser(userId, filters);
            res.json({ notifications });
            
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    
    static async getUnreadCount(req, res) {
        try {
            const userId = req.user.user_id;
            const count = await Notification.getUnreadCount(userId);
            res.json({ unreadCount: count });
            
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    
    static async markAsRead(req, res) {
        try {
            const { notificationId } = req.params;
            const notification = await Notification.markAsRead(notificationId);
            res.json({ notification });
            
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    
    static async markAllAsRead(req, res) {
        try {
            const userId = req.user.user_id;
            const result = await Notification.markAllAsRead(userId);
            res.json(result);
            
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    
    static async deleteNotification(req, res) {
        try {
            const { notificationId } = req.params;
            const result = await Notification.delete(notificationId);
            res.json(result);
            
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    
    static async createNotification(req, res) {
        try {
            const { user_id, message, is_read } = req.body;
            
            if (!user_id || !message) {
                return res.status(400).json({ error: 'المستخدم والرسالة مطلوبان' });
            }
            
            const notification = await Notification.create({
                user_id,
                message,
                is_read: is_read || false
            });
            
            res.status(201).json({
                message: 'تم إنشاء الإشعار بنجاح',
                notification
            });
            
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    
    static async bulkCreateNotifications(req, res) {
        try {
            const { notifications } = req.body;
            
            if (!Array.isArray(notifications) || notifications.length === 0) {
                return res.status(400).json({ error: 'قائمة الإشعارات مطلوبة' });
            }
            
            const createdNotifications = await Notification.bulkCreate(notifications);
            
            res.status(201).json({
                message: `تم إنشاء ${createdNotifications.length} إشعار بنجاح`,
                notifications: createdNotifications
            });
            
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    
    static async getNotificationStats(req, res) {
        try {
            const stats = await Notification.getStats();
            res.json({ stats });
            
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    
    static async deleteAllUserNotifications(req, res) {
        try {
            const userId = req.user.user_id;
            const result = await Notification.deleteByUser(userId);
            res.json(result);
            
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = NotificationController;