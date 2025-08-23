// puls-academy-backend/models/Notification.js

const { db } = require('../config/db');

class Notification {
    static async create(notificationData) {
        try {
            const { user_id, message, is_read = false } = notificationData;
            
            const sql = `
                INSERT INTO Notifications (user_id, message, is_read)
                VALUES (?, ?, ?)
            `;
            
            return new Promise((resolve, reject) => {
                db.run(sql, [user_id, message, is_read], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        Notification.findById(this.lastID)
                            .then(resolve)
                            .catch(reject);
                    }
                });
            });
            
        } catch (error) {
            throw error;
        }
    }
    
    static async findById(notificationId) {
        const sql = `
            SELECT n.*, u.name as user_name, u.email as user_email
            FROM Notifications n
            JOIN Users u ON n.user_id = u.user_id
            WHERE n.notification_id = ?
        `;
        
        return new Promise((resolve, reject) => {
            db.get(sql, [notificationId], (err, row) => {
                if (err) {
                    reject(err);
                } else if (!row) {
                    reject(new Error('الإشعار غير موجود'));
                } else {
                    resolve(row);
                }
            });
        });
    }
    
    static async getByUser(userId, filters = {}) {
        try {
            let sql = `
                SELECT n.*
                FROM Notifications n
                WHERE n.user_id = ?
            `;
            
            const params = [userId];
            
            if (filters.is_read !== undefined) {
                sql += ' AND n.is_read = ?';
                params.push(filters.is_read);
            }
            
            sql += ' ORDER BY n.created_at DESC';
            
            if (filters.limit) {
                sql += ' LIMIT ?';
                params.push(filters.limit);
            }
            
            if (filters.offset) {
                sql += ' OFFSET ?';
                params.push(filters.offset);
            }
            
            return new Promise((resolve, reject) => {
                db.all(sql, params, (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            });
            
        } catch (error) {
            throw error;
        }
    }
    
    static async getUnreadCount(userId) {
        const sql = `
            SELECT COUNT(*) as unread_count
            FROM Notifications
            WHERE user_id = ? AND is_read = 0
        `;
        
        return new Promise((resolve, reject) => {
            db.get(sql, [userId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row.unread_count);
                }
            });
        });
    }
    
    static async markAsRead(notificationId) {
        try {
            const sql = 'UPDATE Notifications SET is_read = 1 WHERE notification_id = ?';
            
            return new Promise((resolve, reject) => {
                db.run(sql, [notificationId], function(err) {
                    if (err) {
                        reject(err);
                    } else if (this.changes === 0) {
                        reject(new Error('الإشعار غير موجود'));
                    } else {
                        Notification.findById(notificationId)
                            .then(resolve)
                            .catch(reject);
                    }
                });
            });
            
        } catch (error) {
            throw error;
        }
    }
    
    static async markAllAsRead(userId) {
        const sql = 'UPDATE Notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0';
        
        return new Promise((resolve, reject) => {
            db.run(sql, [userId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ 
                        message: 'تم تعليم جميع الإشعارات كمقروءة',
                        markedCount: this.changes
                    });
                }
            });
        });
    }
    
    static async delete(notificationId) {
        try {
            await Notification.findById(notificationId);
            
            const sql = 'DELETE FROM Notifications WHERE notification_id = ?';
            
            return new Promise((resolve, reject) => {
                db.run(sql, [notificationId], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ message: 'تم حذف الإشعار بنجاح' });
                    }
                });
            });
            
        } catch (error) {
            throw error;
        }
    }
    
    static async deleteByUser(userId) {
        const sql = 'DELETE FROM Notifications WHERE user_id = ?';
        
        return new Promise((resolve, reject) => {
            db.run(sql, [userId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ 
                        message: 'تم حذف جميع إشعارات المستخدم بنجاح',
                        deletedCount: this.changes
                    });
                }
            });
        });
    }
    
    static async getStats() {
        try {
            const sql = `
                SELECT 
                    COUNT(*) as total_notifications,
                    COUNT(CASE WHEN is_read = 0 THEN 1 END) as unread_notifications,
                    COUNT(CASE WHEN is_read = 1 THEN 1 END) as read_notifications,
                    COUNT(DISTINCT user_id) as users_with_notifications
                FROM Notifications
            `;
            
            return new Promise((resolve, reject) => {
                db.get(sql, [], (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                });
            });
            
        } catch (error) {
            throw error;
        }
    }
    
    static async createPaymentPending(userId, courseTitle) {
        const message = `دفعك قيد المراجعة لكورس: ${courseTitle}`;
        return await Notification.create({ user_id: userId, message });
    }
    
    static async createPaymentApproved(userId, courseTitle) {
        const message = `تم فتح الكورس: ${courseTitle}!`;
        return await Notification.create({ user_id: userId, message });
    }
    
    static async createPaymentRejected(userId, courseTitle) {
        const message = `تم رفض الدفع لكورس: ${courseTitle}`;
        return await Notification.create({ user_id: userId, message });
    }
    
    static async bulkCreate(notificationsData) {
        try {
            const sql = `
                INSERT INTO Notifications (user_id, message, is_read)
                VALUES (?, ?, ?)
            `;
            
            const promises = notificationsData.map(data => {
                return new Promise((resolve, reject) => {
                    db.run(sql, [data.user_id, data.message, data.is_read || false], function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            Notification.findById(this.lastID)
                                .then(resolve)
                                .catch(reject);
                        }
                    });
                });
            });
            
            return await Promise.all(promises);
            
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Notification;