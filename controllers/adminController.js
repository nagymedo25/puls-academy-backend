// puls-academy-backend/controllers/adminController.js

const User = require('../models/User');
const Course = require('../models/Course');
const Payment = require('../models/Payment');
const Enrollment = require('../models/Enrollment');
const Notification = require('../models/Notification');
const { db } = require('../config/db'); // استيراد قاعدة البيانات مباشرة

class AdminController {
    static async getDashboardStats(req, res) {
        try {
            const [
                studentCountResult, 
                courseCountResult, 
                paymentStatsResult, 
                pendingPaymentsResult
            ] = await Promise.all([
                User.getCount(), 
                Course.getStats(),
                Payment.getStats(),
                Payment.countByStatus('pending')
            ]);
            
            res.json({
                totalStudents: studentCountResult || 0,
                totalCourses: courseCountResult.totalCourses || 0,
                totalRevenue: paymentStatsResult.totalRevenue || 0,
                pendingPaymentsCount: pendingPaymentsResult.count || 0
            });
            
        } catch (error) {
            // Provide a more descriptive error message for debugging
            res.status(500).json({ error: "فشل في جلب إحصائيات لوحة التحكم: " + error.message });
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
                    WHERE created_at >= date('now', '-30 days')
                    GROUP BY DATE(created_at)
                    ORDER BY date DESC
                `;
            } else if (period === 'monthly') {
                sql = `
                    SELECT 
                        strftime('%Y-%m', created_at) as month,
                        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as revenue,
                        COUNT(CASE WHEN status = 'approved' THEN 1 END) as payments
                    FROM Payments
                    GROUP BY strftime('%Y-%m', created_at)
                    ORDER BY month DESC
                    LIMIT 12
                `;
            } else {
                return res.status(400).json({ error: 'الفترة غير صالحة' });
            }
            
            // ✨ هنا كان الخطأ، تم التعديل لاستخدام `db` المستورد مباشرة
            const report = await new Promise((resolve, reject) => {
                db.all(sql, [], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            
            res.json({ report });
            
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
            await Enrollment.deleteAll(); 
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
}

module.exports = AdminController;