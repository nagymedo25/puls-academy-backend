// puls-academy-backend/controllers/adminController.js

const User = require('../models/User');
const Course = require('../models/Course');
const Payment = require('../models/Payment');
const Enrollment = require('../models/Enrollment');
const Notification = require('../models/Notification');
const Lesson = require('../models/Lesson'); // استيراد Lesson model
const { db } = require('../config/db');

class AdminController {
    static async getDashboardStats(req, res) {
        try {
            const [
                studentCountResult,
                courseStatsResult,
                paymentStatsResult,
                pendingPaymentsResult
            ] = await Promise.all([
                User.getCount(),
                Course.getStats(),
                Payment.getStats(),
                Payment.countByStatus('pending')
            ]);

            res.json({
                users: {
                    total: studentCountResult || 0,
                },
                courses: {
                    total_courses: courseStatsResult.total_courses || 0,
                },
                payments: {
                    total_revenue: paymentStatsResult.total_revenue || 0,
                    pending_count: pendingPaymentsResult.count || 0
                }
            });

        } catch (error) {
            res.status(500).json({ error: "فشل في جلب إحصائيات لوحة التحكم: " + error.message });
        }
    }


      static async updateStudentStatus(req, res) {
        const { studentId } = req.params;
        const { status } = req.body;

        // A simple validation to ensure the status is one of the allowed values.
        if (!['active', 'suspended'].includes(status)) {
            return res.status(400).json({ error: 'الحالة غير صالحة.' });
        }

        try {
            const updatedUser = await User.updateStatus(studentId, status);
            
            // Also, terminate any active sessions if the user is suspended.
            if (status === 'suspended') {
                await User.deleteSession(studentId);
            }

            res.json({ 
                message: `تم تحديث حالة الطالب بنجاح إلى '${status}'.`,
                user: updatedUser 
            });
        } catch (error) {
            res.status(500).json({ error: 'حدث خطأ أثناء تحديث حالة الطالب.' });
        }
    }


        static async deleteStudent(req, res) {
        // This function now correctly handles only the deletion.
        const { studentId } = req.params;
        try {
            await User.delete(studentId);
            res.json({ message: 'تم حذف الطالب بنجاح.' });
        } catch (error) {
            res.status(500).json({ error: 'حدث خطأ أثناء حذف الطالب.' });
        }
    }

    static async getAllUsers(req, res) {
        try {
            const { limit = 50, offset = 0 } = req.query;
            const users = await User.getAll(parseInt(limit), parseInt(offset));
            res.json({ users });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async searchUsers(req, res) {
        try {
            const { q, limit = 20 } = req.query;

            if (!q) {
                return res.status(400).json({ error: 'كلمة البحث مطلوبة' });
            }

            const users = await User.search(q, parseInt(limit));
            res.json({ users });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getUserDetails(req, res) {
        try {
            const { userId } = req.params;
            const user = await User.findById(userId);

            const [payments, enrollments, notifications] = await Promise.all([
                Payment.getByUser(userId),
                Enrollment.getByUser(userId),
                Notification.getByUser(userId)
            ]);

            res.json({
                user,
                payments,
                enrollments,
                notifications
            });

        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    }

    static async deleteUser(req, res) {
        try {
            const { userId } = req.params;

            await Promise.all([
                Enrollment.deleteByUser(userId),
                Payment.deleteByUser(userId),
                Notification.deleteByUser(userId)
            ]);

            const result = await User.delete(userId);
            res.json(result);

        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async getAllCourses(req, res) {
        try {
            const { limit, offset, category, college_type } = req.query;

            const filters = {};
            if (limit) filters.limit = parseInt(limit);
            if (offset) filters.offset = parseInt(offset);
            if (category) filters.category = category;
            if (college_type) filters.college_type = college_type;

            const courses = await Course.getAll(filters);
            res.json({ courses });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getCourseEnrollments(req, res) {
        try {
            const { courseId } = req.params;
            const enrollments = await Enrollment.getByCourse(courseId);
            res.json({ enrollments });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getCoursePayments(req, res) {
        try {
            const { courseId } = req.params;
            const payments = await Payment.getByCourse(courseId);
            res.json({ payments });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getTopCourses(req, res) {
        try {
            const { limit = 10 } = req.query;
            const courses = await Course.getTopSelling(parseInt(limit));
            res.json({ courses });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getTopStudents(req, res) {
        try {
            const { limit = 10 } = req.query;
            const students = await Enrollment.getTopStudents(parseInt(limit));
            res.json({ students });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getRevenueReport(req, res) {
        try {
            const { period = 'monthly' } = req.query;

            let sql;
            if (period === 'daily') {
                sql = `
                    SELECT
                        DATE(created_at) as date,
                        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as revenue,
                        COUNT(CASE WHEN status = 'approved' THEN 1 END) as payments
                    FROM Payments
                    WHERE created_at >= NOW() - INTERVAL '30 days'
                    GROUP BY DATE(created_at)
                    ORDER BY date DESC
                `;
            } else if (period === 'monthly') {
                sql = `
                    SELECT
                        TO_CHAR(created_at, 'YYYY-MM') as month,
                        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as revenue,
                        COUNT(CASE WHEN status = 'approved' THEN 1 END) as payments
                    FROM Payments
                    GROUP BY TO_CHAR(created_at, 'YYYY-MM')
                    ORDER BY month DESC
                    LIMIT 12
                `;
            } else {
                return res.status(400).json({ error: 'الفترة غير صالحة' });
            }

            const result = await db.query(sql);
            res.json({ report: result.rows });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getApprovedPayments(req, res) {
        try {
            const payments = await Payment.getAll({ status: 'approved' });
            res.json({ payments });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async resetRevenue(req, res) {
        try {
            await Payment.deleteAll();
            res.json({ message: 'تمت إعادة تصفير الإيرادات وجميع التسجيلات بنجاح.' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async bulkDeleteUsers(req, res) {
        try {
            const { userIds } = req.body;

            if (!Array.isArray(userIds) || userIds.length === 0) {
                return res.status(400).json({ error: 'قائمة المستخدمين مطلوبة' });
            }

            const deletePromises = userIds.map(userId => {
                return Promise.all([
                    Enrollment.deleteByUser(userId),
                    Payment.deleteByUser(userId),
                    Notification.deleteByUser(userId),
                    User.delete(userId)
                ]);
            });

            await Promise.all(deletePromises);

            res.json({ message: `تم حذف ${userIds.length} مستخدم بنجاح` });

        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async bulkDeleteCourses(req, res) {
        try {
            const { courseIds } = req.body;

            if (!Array.isArray(courseIds) || courseIds.length === 0) {
                return res.status(400).json({ error: 'قائمة الكورسات مطلوبة' });
            }

            const deletePromises = courseIds.map(courseId => {
                return Promise.all([
                    Lesson.deleteByCourseId(courseId),
                    Enrollment.deleteByCourse(courseId),
                    Course.delete(courseId)
                ]);
            });

            await Promise.all(deletePromises);

            res.json({ message: `تم حذف ${courseIds.length} كورس بنجاح` });

        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async updateUser(req, res) {
        try {
            const { userId } = req.params;
            const dataToUpdate = { ...req.body };
            Object.keys(dataToUpdate).forEach(key => {
                if (dataToUpdate[key] === '' || dataToUpdate[key] === null || dataToUpdate[key] === undefined) {
                    delete dataToUpdate[key];
                }
            });

            const updatedUser = await User.update(userId, dataToUpdate);

            res.json({
                message: "تم تحديث بيانات الطالب بنجاح",
                user: updatedUser,
            });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async getDeviceRequests(req, res) {
        try {
            const result = await db.query(
                `SELECT dr.*, u.name as user_name, u.email as user_email 
                 FROM DeviceLoginRequests dr
                 JOIN Users u ON dr.user_id = u.user_id
                 WHERE dr.status = 'pending'
                 ORDER BY dr.created_at ASC`
            );
            res.json({ requests: result.rows });
        } catch (error) {
            res.status(500).json({ error: "فشل في جلب طلبات الأجهزة: " + error.message });
        }
    }

    static async approveDeviceRequest(req, res) {
        const { requestId } = req.params;
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            // الحصول على معلومات الطلب
            const requestResult = await client.query('SELECT * FROM DeviceLoginRequests WHERE request_id = $1', [requestId]);
            if (requestResult.rowCount === 0) {
                throw new Error('الطلب غير موجود');
            }
            const request = requestResult.rows[0];

            // ✨ --- START: The Fix --- ✨
            // خطوة جديدة: إنهاء جميع الجلسات النشطة الأخرى لهذا المستخدم
            // هذا يمنع تسجيل مخالفة عند أول دخول من الجهاز الجديد
            await User.deleteSession(request.user_id);
            // ✨ --- END: The Fix --- ✨

            // إضافة الجهاز إلى قائمة الأجهزة المعتمدة
            await client.query(
                'INSERT INTO UserDevices (user_id, device_fingerprint, user_agent) VALUES ($1, $2, $3)',
                [request.user_id, request.device_fingerprint, request.user_agent]
            );

            // تحديث حالة الطلب
            await client.query("UPDATE DeviceLoginRequests SET status = 'approved' WHERE request_id = $1", [requestId]);

            // (اختياري) إرسال إشعار للطالب
            // await Notification.create({ user_id: request.user_id, message: 'تمت الموافقة على جهازك الجديد. يمكنك الآن تسجيل الدخول منه.' });

            await client.query('COMMIT');
            res.json({ message: 'تمت الموافقة على الجهاز بنجاح وتم إنهاء أي جلسات أخرى نشطة.' });
        } catch (error) {
            await client.query('ROLLBACK');
            res.status(400).json({ error: error.message });
        } finally {
            client.release();
        }
    }

    static async rejectDeviceRequest(req, res) {
        const { requestId } = req.params;
        try {
            const result = await db.query(
                "UPDATE DeviceLoginRequests SET status = 'rejected' WHERE request_id = $1 RETURNING user_id", 
                [requestId]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'الطلب غير موجود' });
            }

            res.json({ message: 'تم رفض الطلب بنجاح.' });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async getViolators(req, res) {
        try {
            const users = await User.getViolators();
            res.json({ users });
        } catch (error) {
            res.status(500).json({ error: "فشل في جلب الطلاب المخالفين: " + error.message });
        }
    }

    static async suspendUser(req, res) {
        try {
            const { userId } = req.params;
            const result = await User.suspend(userId);
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async reactivateUser(req, res) {
        try {
            const { userId } = req.params;
            const result = await User.reactivate(userId);
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async getConversations(req, res) {
        try {
            const conversations = await Message.getConversations();
            res.json({ conversations });
        } catch (error) {
            res.status(500).json({ error: "فشل في جلب المحادثات: " + error.message });
        }
    }

    static async getMessagesWithUser(req, res) {
        try {
            const { userId } = req.params;
            const adminId = req.user.user_id; // نفترض أن الأدمن هو المستخدم المسجل دخوله
            const messages = await Message.getMessagesBetweenUsers(adminId, userId);
            res.json({ messages });
        } catch (error) {
            res.status(500).json({ error: "فشل في جلب الرسائل: " + error.message });
        }
    }

    static async sendMessageToUser(req, res) {
        try {
            const { receiver_id, message_content } = req.body;
            const sender_id = req.user.user_id; // الأدمن هو المرسل
            const newMessage = await Message.create({ sender_id, receiver_id, message_content });
            res.status(201).json({ message: "تم إرسال الرسالة بنجاح", newMessage });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = AdminController;
