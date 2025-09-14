// puls-academy-backend/models/Notification.js

const { db } = require('../config/db');

class Notification {
    static async create(notificationData) {
        const { user_id, message, is_read = false } = notificationData;
        const sql = `
            INSERT INTO Notifications (user_id, message, is_read)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const result = await db.query(sql, [user_id, message, is_read]);
        return result.rows[0];
    }

    static async findById(notificationId) {
        const sql = `
            SELECT n.*, u.name as user_name, u.email as user_email
            FROM Notifications n
            JOIN Users u ON n.user_id = u.user_id
            WHERE n.notification_id = $1
        `;
        const result = await db.query(sql, [notificationId]);
        if (result.rows.length === 0) {
            throw new Error('الإشعار غير موجود');
        }
        return result.rows[0];
    }

    static async getByUser(userId, filters = {}) {
        let sql = `
            SELECT n.*
            FROM Notifications n
            WHERE n.user_id = $1
        `;
        const params = [userId];
        let paramIndex = 2;

        if (filters.is_read !== undefined) {
            sql += ` AND n.is_read = $${paramIndex++}`;
            params.push(filters.is_read);
        }

        sql += ' ORDER BY n.created_at DESC';

        if (filters.limit) {
            sql += ` LIMIT $${paramIndex++}`;
            params.push(filters.limit);
        }
        if (filters.offset) {
            sql += ` OFFSET $${paramIndex++}`;
            params.push(filters.offset);
        }

        const result = await db.query(sql, params);
        return result.rows;
    }

    static async getUnreadCount(userId) {
        const sql = `
            SELECT COUNT(*) as unread_count
            FROM Notifications
            WHERE user_id = $1 AND is_read = false
        `;
        const result = await db.query(sql, [userId]);
        return parseInt(result.rows[0].unread_count, 10);
    }

    static async markAsRead(notificationId) {
        const sql = 'UPDATE Notifications SET is_read = true WHERE notification_id = $1 RETURNING *';
        const result = await db.query(sql, [notificationId]);
        if (result.rowCount === 0) {
            throw new Error('الإشعار غير موجود');
        }
        return result.rows[0];
    }

    static async markAllAsRead(userId) {
        const sql = 'UPDATE Notifications SET is_read = true WHERE user_id = $1 AND is_read = false';
        const result = await db.query(sql, [userId]);
        return {
            message: 'تم تعليم جميع الإشعارات كمقروءة',
            markedCount: result.rowCount
        };
    }

    static async delete(notificationId) {
        const result = await db.query("DELETE FROM Notifications WHERE notification_id = $1", [notificationId]);
        if (result.rowCount === 0) {
            throw new Error('الإشعار غير موجود');
        }
        return { message: 'تم حذف الإشعار بنجاح' };
    }

    static async deleteByUser(userId) {
        const result = await db.query("DELETE FROM Notifications WHERE user_id = $1", [userId]);
        return {
            message: 'تم حذف جميع إشعارات المستخدم بنجاح',
            deletedCount: result.rowCount
        };
    }

    static async createPaymentPending(userId, courseTitle) {
        const message = `دفعك قيد المراجعة لكورس: ${courseTitle}`;
        return Notification.create({ user_id: userId, message });
    }

    static async createPaymentApproved(userId, courseTitle) {
        const message = `تم فتح الكورس: ${courseTitle}!`;
        return Notification.create({ user_id: userId, message });
    }

    static async createPaymentRejected(userId, courseTitle) {
        const message = `تم رفض الدفع لكورس: ${courseTitle}`;
        return Notification.create({ user_id: userId, message });
    }
}

module.exports = Notification;
