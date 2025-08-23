// puls-academy-backend/models/Course.js

const { db } = require('../config/db');
const { canAccessCourse } = require('../config/auth');

class Course {
    // إنشاء كورس جديد
    static async create(courseData) {
        try {
            const { title, description, category, college_type, price, preview_url } = courseData;
            
            const sql = `
                INSERT INTO Courses (title, description, category, college_type, price, preview_url)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            return new Promise((resolve, reject) => {
                db.run(sql, [title, description, category, college_type, price, preview_url], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        Course.findById(this.lastID)
                            .then(resolve)
                            .catch(reject);
                    }
                });
            });
            
        } catch (error) {
            throw error;
        }
    }
    
    // البحث عن كورس بالمعرف
    static async findById(courseId) {
        const sql = 'SELECT * FROM Courses WHERE course_id = ?';
        
        return new Promise((resolve, reject) => {
            db.get(sql, [courseId], (err, row) => {
                if (err) {
                    reject(err);
                } else if (!row) {
                    reject(new Error('الكورس غير موجود'));
                } else {
                    resolve(row);
                }
            });
        });
    }
    
    // الحصول على جميع الكورسات
    static async getAll(filters = {}) {
        try {
            let sql = `
                SELECT c.*, 
                       (SELECT COUNT(*) FROM Lessons WHERE course_id = c.course_id) as lessons_count
                FROM Courses c
                WHERE 1=1
            `;
            
            const params = [];
            
            // إضافة الفلاتر
            if (filters.category) {
                sql += ' AND c.category = ?';
                params.push(filters.category);
            }
            
            if (filters.college_type) {
                sql += ' AND c.college_type = ?';
                params.push(filters.college_type);
            }
            
            if (filters.min_price !== undefined) {
                sql += ' AND c.price >= ?';
                params.push(filters.min_price);
            }
            
            if (filters.max_price !== undefined) {
                sql += ' AND c.price <= ?';
                params.push(filters.max_price);
            }
            
            sql += ' ORDER BY c.created_at DESC';
            
            // إضافة التصفح
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
    
    // الحصول على الكورسات المتاحة للطالب
    static async getAvailableForUser(user) {
        try {
            const sql = `
                SELECT c.*, 
                       (SELECT COUNT(*) FROM Lessons WHERE course_id = c.course_id) as lessons_count,
                       CASE 
                           WHEN e.status = 'active' THEN 'enrolled'
                           WHEN p.status = 'pending' THEN 'pending'
                           ELSE 'available'
                       END as enrollment_status
                FROM Courses c
                LEFT JOIN Enrollments e ON c.course_id = e.course_id AND e.user_id = ?
                LEFT JOIN Payments p ON c.course_id = p.course_id AND p.user_id = ? AND p.status = 'pending'
                WHERE c.category = ? AND c.college_type = ?
                ORDER BY c.created_at DESC
            `;
            
            const params = [user.userId, user.userId, user.college, user.gender];
            
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
    
    // تحديث كورس
    static async update(courseId, courseData) {
        try {
            const { title, description, category, college_type, price, preview_url } = courseData;
            const updates = [];
            const values = [];
            
            // بناء استعلام التحديث ديناميكياً
            if (title !== undefined) {
                updates.push('title = ?');
                values.push(title);
            }
            if (description !== undefined) {
                updates.push('description = ?');
                values.push(description);
            }
            if (category !== undefined) {
                updates.push('category = ?');
                values.push(category);
            }
            if (college_type !== undefined) {
                updates.push('college_type = ?');
                values.push(college_type);
            }
            if (price !== undefined) {
                updates.push('price = ?');
                values.push(price);
            }
            if (preview_url !== undefined) {
                updates.push('preview_url = ?');
                values.push(preview_url);
            }
            
            if (updates.length === 0) {
                throw new Error('لا توجد بيانات لتحديثها');
            }
            
            values.push(courseId);
            const sql = `UPDATE Courses SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE course_id = ?`;
            
            return new Promise((resolve, reject) => {
                db.run(sql, values, function(err) {
                    if (err) {
                        reject(err);
                    } else if (this.changes === 0) {
                        reject(new Error('الكورس غير موجود'));
                    } else {
                        Course.findById(courseId)
                            .then(resolve)
                            .catch(reject);
                    }
                });
            });
            
        } catch (error) {
            throw error;
        }
    }
    
    // حذف كورس
    static async delete(courseId) {
        try {
            // التحقق من وجود الكورس
            await Course.findById(courseId);
            
            const sql = 'DELETE FROM Courses WHERE course_id = ?';
            
            return new Promise((resolve, reject) => {
                db.run(sql, [courseId], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ message: 'تم حذف الكورس بنجاح' });
                    }
                });
            });
            
        } catch (error) {
            throw error;
        }
    }
    
    // البحث عن كورسات
    static async search(query, filters = {}) {
        try {
            let sql = `
                SELECT c.*, 
                       (SELECT COUNT(*) FROM Lessons WHERE course_id = c.course_id) as lessons_count
                FROM Courses c
                WHERE (c.title LIKE ? OR c.description LIKE ?)
            `;
            
            const params = [`%${query}%`, `%${query}%`];
            
            // إضافة الفلاتر
            if (filters.category) {
                sql += ' AND c.category = ?';
                params.push(filters.category);
            }
            
            if (filters.college_type) {
                sql += ' AND c.college_type = ?';
                params.push(filters.college_type);
            }
            
            sql += ' ORDER BY c.created_at DESC';
            
            // إضافة التصفح
            if (filters.limit) {
                sql += ' LIMIT ?';
                params.push(filters.limit);
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
    
    // الحصول على إحصائيات الكورسات
    static async getStats() {
        try {
            const sql = `
                SELECT 
                    COUNT(*) as total_courses,
                    SUM(price) as total_value,
                    AVG(price) as average_price,
                    COUNT(CASE WHEN category = 'pharmacy' THEN 1 END) as pharmacy_courses,
                    COUNT(CASE WHEN category = 'dentistry' THEN 1 END) as dentistry_courses,
                    COUNT(CASE WHEN college_type = 'male' THEN 1 END) as male_courses,
                    COUNT(CASE WHEN college_type = 'female' THEN 1 END) as female_courses
                FROM Courses
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
    
    // الحصول على الكورسات الأكثر مبيعاً
    static async getTopSelling(limit = 10) {
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
    
    // التحقق من أن المستخدم يمكنه الوصول للكورس
    static async checkAccess(user, courseId) {
        try {
            const course = await Course.findById(courseId);
            
            if (!canAccessCourse(user, course)) {
                throw new Error('ليس لديك صلاحية الوصول لهذا الكورس');
            }
            
            return course;
            
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Course;