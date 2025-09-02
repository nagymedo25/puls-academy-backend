// puls-academy-backend/controllers/messageController.js

const Message = require('../models/Message');

class MessageController {
    // جلب محادثة معينة
    static async getConversation(req, res) {
        try {
            // ✨ --- START: التصحيح هنا --- ✨
            const currentUserId = req.user.user_id; // تم التعديل من userId إلى user_id
            // ✨ --- END: التصحيح هنا --- ✨
            const otherUserId = parseInt(req.params.userId, 10);
            
            if (req.user.role === 'student' && otherUserId !== 1) {
                return res.status(403).json({ error: 'غير مصرح لك بالوصول لهذه المحادثة.' });
            }

            await Message.markAsRead(currentUserId, otherUserId);

            const conversation = await Message.getConversation(currentUserId, otherUserId);
            res.json({ conversation });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // إرسال رسالة
    static async sendMessage(req, res) {
        try {
            // ✨ --- START: التصحيح هنا --- ✨
            const sender_id = req.user.user_id; // تم التعديل من userId إلى user_id
            // ✨ --- END: التصحيح هنا --- ✨
            const { receiver_id, message_content } = req.body;

            if (!receiver_id || !message_content) {
                return res.status(400).json({ error: 'المستقبل ونص الرسالة مطلوبان.' });
            }

            if (req.user.role === 'student' && receiver_id !== 1) {
                 return res.status(403).json({ error: 'يمكن للطلاب مراسلة الأدمن فقط.' });
            }

            const message = await Message.create({ sender_id, receiver_id, message_content });
            res.status(201).json({ message });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // جلب كل المحادثات (للأدمن فقط)
    static async getConversations(req, res) {
        try {
            const conversations = await Message.getConversationsForAdmin();
            res.json({ conversations });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    
    // حذف محادثة (للأدمن فقط)
    static async deleteConversation(req, res) {
        try {
            const { studentId } = req.params;
            const result = await Message.deleteConversation(studentId);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = MessageController;