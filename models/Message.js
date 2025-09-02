// puls-academy-backend/models/Message.js

const { db } = require('../config/db');

class Message {
    // ✨ --- START: تم تعديل هذه الدالة بالكامل --- ✨
    static create({ sender_id, receiver_id, message_content }) {
        return new Promise((resolve, reject) => {
            const insertSql = `INSERT INTO Messages (sender_id, receiver_id, message_content) VALUES (?, ?, ?)`;
            
            db.run(insertSql, [sender_id, receiver_id, message_content], function(err) {
                if (err) {
                    return reject(new Error('فشل في إنشاء الرسالة في قاعدة البيانات.'));
                }
                const newMessageId = this.lastID;
                
                // بعد الإضافة، نقوم بجلب الرسالة الكاملة مع اسم المرسل
                const selectSql = `
                    SELECT
                        m.message_id,
                        m.sender_id,
                        u.name as sender_name,
                        m.message_content,
                        m.created_at,
                        m.is_read
                    FROM Messages m
                    JOIN Users u ON m.sender_id = u.user_id
                    WHERE m.message_id = ?
                `;
                
                db.get(selectSql, [newMessageId], (err, row) => {
                    if (err) {
                        return reject(new Error('فشل في جلب الرسالة الجديدة بعد إنشائها.'));
                    }
                    resolve(row); // إرجاع كائن الرسالة كاملاً
                });
            });
        });
    }
    // ✨ --- END: نهاية التعديل --- ✨

    static getConversation(user1Id, user2Id) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    m.message_id, 
                    m.sender_id, 
                    u.name as sender_name,
                    m.message_content, 
                    m.created_at, 
                    m.is_read
                FROM Messages m
                JOIN Users u ON m.sender_id = u.user_id
                WHERE (m.sender_id = ? AND m.receiver_id = ?) 
                   OR (m.sender_id = ? AND m.receiver_id = ?)
                ORDER BY m.created_at ASC
            `;
            db.all(sql, [user1Id, user2Id, user2Id, user1Id], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    static getConversationsForAdmin() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    u.user_id as student_id,
                    u.name as student_name,
                    u.email as student_email,
                    (SELECT message_content FROM Messages 
                     WHERE sender_id = u.user_id OR receiver_id = u.user_id
                     ORDER BY created_at DESC LIMIT 1) as last_message,
                    (SELECT created_at FROM Messages 
                     WHERE sender_id = u.user_id OR receiver_id = u.user_id
                     ORDER BY created_at DESC LIMIT 1) as last_message_date,
                    (SELECT COUNT(*) FROM Messages 
                     WHERE receiver_id = 1 AND sender_id = u.user_id AND is_read = 0) as unread_count
                FROM Users u
                WHERE u.role = 'student'
                ORDER BY last_message_date DESC
            `;
            db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
    
    static markAsRead(receiverId, senderId) {
        return new Promise((resolve, reject) => {
            const sql = 'UPDATE Messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ?';
            db.run(sql, [receiverId, senderId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    static deleteConversation(studentId) {
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM Messages WHERE (sender_id = ? AND receiver_id = 1) OR (sender_id = 1 AND receiver_id = ?)`;
            db.run(sql, [studentId, studentId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ message: 'تم حذف المحادثة بنجاح.', changes: this.changes });
                }
            });
        });
    }
}

module.exports = Message;