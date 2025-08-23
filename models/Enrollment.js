// puls-academy-backend/models/Enrollment.js

const { db } = require('../config/db');

class Enrollment {
    static async create(enrollmentData) {
        try {
            const { user_id, course_id, payment_id, status = 'active' } = enrollmentData;
            
            const sql = `
                INSERT OR IGNORE INTO Enrollments (user_id, course_id, payment_id, status)
                VALUES (?, ?, ?, ?)
            `;
            
            return new Promise((resolve, reject) => {
                db.run(sql, [user_id, course_id, payment_id, status], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        Enrollment.findById(this.lastID)
                            .then(resolve)
                            .catch(reject);
                    }
                });
            });
            
        } catch (error) {
            throw error;
        }
    }
    
    static async findById(enrollmentId) {
        const sql = `
            SELECT e.*, u.name as user_name, u.email as user_email, c.title as course_title
            FROM Enrollments e
            JOIN Users u ON e.user_id = u.user_id
            JOIN Courses c ON e.course_id = c.course_id
            WHERE e.enrollment_id = ?
        `;
        
        return new Promise((resolve, reject) => {
            db.get(sql, [enrollmentId], (err, row) => {
                if (err) {
                    reject(err);
                } else if (!row) {
                    reject(new Error('التسجيل غير موجود'));
                } else {
                    resolve(row);
                }
            });
        });
    }
    
    static async findByUserAndCourse(userId, courseId) {
        const sql = `
            SELECT e.*, p.status as payment_status
            FROM Enrollments e
            LEFT JOIN Payments p ON e.payment_id = p.payment_id
            WHERE e.user_id = ? AND e.course_id = ?
        `;
        
        return new Promise((resolve, reject) => {
            db.get(sql, [userId, courseId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }
    
    static async getByUser(userId) {
        const sql = `
            SELECT e.*, c.title as course_title, c.category, c.college_type, c.price
            FROM Enrollments e
            JOIN Courses c ON e.course_id = c.course_id
            WHERE e.user_id = ?
            ORDER BY e.enrolled_at DESC
        `;
        
        return new Promise((resolve, reject) => {
            db.all(sql, [userId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
    
    static async getByCourse(courseId) {
        const sql = `
            SELECT e.*, u.name as user_name, u.email as user_email
            FROM Enrollments e
            JOIN Users u ON e.user_id = u.user_id
            WHERE e.course_id = ?
            ORDER BY e.enrolled_at DESC
        `;
        
        return new Promise((resolve, reject) => {
            db.all(sql, [courseId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
    
    static async updateStatus(enrollmentId, status) {
        try {
            const validStatuses = ['active', 'inactive'];
            if (!validStatuses.includes(status)) {
                throw new Error('حالة التسجيل غير صالحة');
            }
            
            const sql = 'UPDATE Enrollments SET status = ? WHERE enrollment_id = ?';
            
            return new Promise((resolve, reject) => {
                db.run(sql, [status, enrollmentId], function(err) {
                    if (err) {
                        reject(err);
                    } else if (this.changes === 0) {
                        reject(new Error('التسجيل غير موجود'));
                    } else {
                        Enrollment.findById(enrollmentId)
                            .then(resolve)
                            .catch(reject);
                    }
                });
            });
            
        } catch (error) {
            throw error;
        }
    }
    
    static async activate(enrollmentId) {
        return await Enrollment.updateStatus(enrollmentId, 'active');
    }
    
    static async deactivate(enrollmentId) {
        return await Enrollment.updateStatus(enrollmentId, 'inactive');
    }
    
    static async getStats() {
        try {
            const sql = `
                SELECT 
                    COUNT(*) as total_enrollments,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_enrollments,
                    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_enrollments,
                    COUNT(DISTINCT user_id) as unique_students,
                    COUNT(DISTINCT course_id) as courses_with_enrollments
                FROM Enrollments
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
    
    static async getTopCourses(limit = 10) {
        try {
            const sql = `
                SELECT c.*, COUNT(e.enrollment_id) as enrollment_count
                FROM Courses c
                LEFT JOIN Enrollments e ON c.course_id = e.course_id AND e.status = 'active'
                GROUP BY c.course_id
                ORDER BY enrollment_count DESC
                LIMIT ?
            `;
            
            return new Promise((resolve, reject) => {
                db.all(sql, [limit], (err, rows) => {
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
    
    static async getTopStudents(limit = 10) {
        try {
            const sql = `
                SELECT u.*, COUNT(e.enrollment_id) as enrollment_count
                FROM Users u
                LEFT JOIN Enrollments e ON u.user_id = e.user_id AND e.status = 'active'
                WHERE u.role = 'student'
                GROUP BY u.user_id
                ORDER BY enrollment_count DESC
                LIMIT ?
            `;
            
            return new Promise((resolve, reject) => {
                db.all(sql, [limit], (err, rows) => {
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
    
    static async delete(enrollmentId) {
        try {
            await Enrollment.findById(enrollmentId);
            
            const sql = 'DELETE FROM Enrollments WHERE enrollment_id = ?';
            
            return new Promise((resolve, reject) => {
                db.run(sql, [enrollmentId], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ message: 'تم حذف التسجيل بنجاح' });
                    }
                });
            });
            
        } catch (error) {
            throw error;
        }
    }
    
    static async deleteByUser(userId) {
        const sql = 'DELETE FROM Enrollments WHERE user_id = ?';
        
        return new Promise((resolve, reject) => {
            db.run(sql, [userId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ 
                        message: 'تم حذف جميع تسجيلات المستخدم بنجاح',
                        deletedCount: this.changes
                    });
                }
            });
        });
    }
    
    static async deleteByCourse(courseId) {
        const sql = 'DELETE FROM Enrollments WHERE course_id = ?';
        
        return new Promise((resolve, reject) => {
            db.run(sql, [courseId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ 
                        message: 'تم حذف جميع تسجيلات الكورس بنجاح',
                        deletedCount: this.changes
                    });
                }
            });
        });
    }
}

module.exports = Enrollment;