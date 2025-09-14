// puls-academy-backend/models/Message.js

const { db } = require('../config/db');

class Message {
    static async create({ sender_id, receiver_id, message_content }) {
        const insertSql = `
            INSERT INTO Messages (sender_id, receiver_id, message_content)
            VALUES ($1, $2, $3)
            RETURNING message_id
        `;
        const insertResult = await db.query(insertSql, [sender_id, receiver_id, message_content]);
        const newMessageId = insertResult.rows[0].message_id;

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
            WHERE m.message_id = $1
        `;
        const selectResult = await db.query(selectSql, [newMessageId]);
        return selectResult.rows[0];
    }

    static async getConversation(user1Id, user2Id) {
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
            WHERE (m.sender_id = $1 AND m.receiver_id = $2)
               OR (m.sender_id = $2 AND m.receiver_id = $1)
            ORDER BY m.created_at ASC
        `;
        const result = await db.query(sql, [user1Id, user2Id]);
        return result.rows;
    }

    static async getConversationsForAdmin() {
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
                 WHERE receiver_id = 1 AND sender_id = u.user_id AND is_read = false) as unread_count
            FROM Users u
            WHERE u.role = 'student'
            ORDER BY last_message_date DESC
        `;
        const result = await db.query(sql);
        return result.rows;
    }

    static async markAsRead(receiverId, senderId) {
        const sql = 'UPDATE Messages SET is_read = true WHERE receiver_id = $1 AND sender_id = $2';
        await db.query(sql, [receiverId, senderId]);
    }

    static async deleteConversation(studentId) {
        const sql = `DELETE FROM Messages WHERE (sender_id = $1 AND receiver_id = 1) OR (sender_id = 1 AND receiver_id = $1)`;
        const result = await db.query(sql, [studentId]);
        return { message: 'تم حذف المحادثة بنجاح.', changes: result.rowCount };
    }
}

module.exports = Message;
