// puls-academy-backend/models/Message.js

const { db } = require("../config/db");

class Message {
  // إرسال رسالة جديدة
  static async create({ sender_id, receiver_id, message_content }) {
    const sql = `
            INSERT INTO Messages (sender_id, receiver_id, message_content)
            VALUES (?, ?, ?)
        `;
    return new Promise((resolve, reject) => {
      db.run(sql, [sender_id, receiver_id, message_content], function (err) {
        if (err) return reject(err);
        // ✨ هنا التعديل: بعد إنشاء الرسالة، نبحث عنها لنجلب كل تفاصيلها
        Message.findById(this.lastID).then(resolve).catch(reject);
      });
    });
  }

  // ✨ دالة جديدة لجلب رسالة واحدة بكل تفاصيلها
  static async findById(messageId) {
    const sql = `
            SELECT m.*, sender.name as sender_name
            FROM Messages m
            JOIN Users sender ON m.sender_id = sender.user_id
            WHERE m.message_id = ?
        `;
    return new Promise((resolve, reject) => {
      db.get(sql, [messageId], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  // جلب المحادثة بين مستخدمين
  static async getConversation(userId1, userId2) {
    const sql = `
            SELECT m.*, sender.name as sender_name
            FROM Messages m
            JOIN Users sender ON m.sender_id = sender.user_id
            WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
            ORDER BY m.created_at ASC
        `;
    return new Promise((resolve, reject) => {
      db.all(sql, [userId1, userId2, userId2, userId1], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  // جلب كل المحادثات الخاصة بالمستخدم (للأدمن)
  static async getConversationsForAdmin() {
    const sql = `
            SELECT 
                u.user_id,
                u.name,
                u.email,
                (SELECT message_content FROM Messages 
                 WHERE (sender_id = u.user_id OR receiver_id = u.user_id)
                 ORDER BY created_at DESC LIMIT 1) as last_message,
                (SELECT created_at FROM Messages 
                 WHERE (sender_id = u.user_id OR receiver_id = u.user_id)
                 ORDER BY created_at DESC LIMIT 1) as last_message_date,
                (SELECT COUNT(*) FROM Messages 
                 WHERE receiver_id = 1 AND sender_id = u.user_id AND is_read = 0) as unread_count
            FROM Users u
            WHERE u.role = 'student' AND EXISTS (
                SELECT 1 FROM Messages m WHERE m.sender_id = u.user_id OR m.receiver_id = u.user_id
            )
            ORDER BY last_message_date DESC
        `;
    return new Promise((resolve, reject) => {
      db.all(sql, [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  // حذف محادثة كاملة (للأدمن)
  static async deleteConversation(studentId) {
    const sql = `
            DELETE FROM Messages
            WHERE (sender_id = ? AND receiver_id = 1) OR (sender_id = 1 AND receiver_id = ?)
        `;
    return new Promise((resolve, reject) => {
      db.run(sql, [studentId, studentId], function (err) {
        if (err) return reject(err);
        resolve({
          message: "تم حذف المحادثة بنجاح",
          deletedCount: this.changes,
        });
      });
    });
  }

  // تعليم الرسائل كمقروءة
  static async markAsRead(receiverId, senderId) {
    const sql = `
            UPDATE Messages SET is_read = 1
            WHERE receiver_id = ? AND sender_id = ? AND is_read = 0
        `;
    return new Promise((resolve, reject) => {
      db.run(sql, [receiverId, senderId], function (err) {
        if (err) return reject(err);
        resolve({ markedCount: this.changes });
      });
    });
  }
}

module.exports = Message;
