// puls-academy-backend/models/Lesson.js

const { db } = require('../config/db');

class Lesson {
    // إنشاء درس جديد
    static async create(lessonData) {
        try {
            const { course_id, title, video_url, is_preview = false, order_index = 0 } = lessonData;
            
            // التحقق من وجود الكورس
            const courseExists = await new Promise((resolve, reject) => {
                db.get('SELECT course_id FROM Courses WHERE course_id = ?', [course_id], (err, row) => {
                    if (err) reject(err);
                    else resolve(!!row);
                });
            });
            
            if (!courseExists) {
                throw new Error('الكورس غير موجود');
            }
            
            const sql = `
                INSERT INTO Lessons (course_id, title, video_url, is_preview, order_index)
                VALUES (?, ?, ?, ?, ?)
            `;
            
            return new Promise((resolve, reject) => {
                db.run(sql, [course_id, title, video_url, is_preview, order_index], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        Lesson.findById(this.lastID)
                            .then(resolve)
                            .catch(reject);
                    }
                });
            });
            
        } catch (error) {
            throw error;
        }
    }
    
    // البحث عن درس بالمعرف
    static async findById(lessonId) {
        const sql = `
            SELECT l.*, c.title as course_title, c.category as course_category, c.college_type as course_college_type
            FROM Lessons l
            JOIN Courses c ON l.course_id = c.course_id
            WHERE l.lesson_id = ?
        `;
        
        return new Promise((resolve, reject) => {
            db.get(sql, [lessonId], (err, row) => {
                if (err) {
                    reject(err);
                } else if (!row) {
                    reject(new Error('الدرس غير موجود'));
                } else {
                    resolve(row);
                }
            });
        });
    }
    
    // الحصول على جميع دروس كورس معين
    static async getByCourseId(courseId, user = null) {
        try {
            let sql = `
                SELECT l.*, 
                       CASE 
                           WHEN l.is_preview = 1 THEN true
                           WHEN ? IS NOT NULL THEN 
                               EXISTS (
                                   SELECT 1 FROM Enrollments e 
                                   WHERE e.user_id = ? AND e.course_id = l.course_id AND e.status = 'active'
                               )
                           ELSE false
                       END as is_accessible
                FROM Lessons l
                WHERE l.course_id = ?
                ORDER BY l.order_index ASC, l.lesson_id ASC
            `;
            
            const params = user ? [user.userId, user.userId, courseId] : [null, null, courseId];
            
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
    
    // الحصول على الدرس الأول (المعاينة) لكورس معين
    static async getPreviewLesson(courseId) {
        const sql = `
            SELECT l.*, c.title as course_title
            FROM Lessons l
            JOIN Courses c ON l.course_id = c.course_id
            WHERE l.course_id = ? AND l.is_preview = 1
            ORDER BY l.order_index ASC
            LIMIT 1
        `;
        
        return new Promise((resolve, reject) => {
            db.get(sql, [courseId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }
    
    // تحديث درس
    static async update(lessonId, lessonData) {
        try {
            const { title, video_url, is_preview, order_index } = lessonData;
            const updates = [];
            const values = [];
            
            // بناء استعلام التحديث ديناميكياً
            if (title !== undefined) {
                updates.push('title = ?');
                values.push(title);
            }
            if (video_url !== undefined) {
                updates.push('video_url = ?');
                values.push(video_url);
            }
            if (is_preview !== undefined) {
                updates.push('is_preview = ?');
                values.push(is_preview);
            }
            if (order_index !== undefined) {
                updates.push('order_index = ?');
                values.push(order_index);
            }
            
            if (updates.length === 0) {
                throw new Error('لا توجد بيانات لتحديثها');
            }
            
            values.push(lessonId);
            const sql = `UPDATE Lessons SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE lesson_id = ?`;
            
            return new Promise((resolve, reject) => {
                db.run(sql, values, function(err) {
                    if (err) {
                        reject(err);
                    } else if (this.changes === 0) {
                        reject(new Error('الدرس غير موجود'));
                    } else {
                        Lesson.findById(lessonId)
                            .then(resolve)
                            .catch(reject);
                    }
                });
            });
            
        } catch (error) {
            throw error;
        }
    }
    
    // حذف درس
    static async delete(lessonId) {
        try {
            // التحقق من وجود الدرس
            await Lesson.findById(lessonId);
            
            const sql = 'DELETE FROM Lessons WHERE lesson_id = ?';
            
            return new Promise((resolve, reject) => {
                db.run(sql, [lessonId], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ message: 'تم حذف الدرس بنجاح' });
                    }
                });
            });
            
        } catch (error) {
            throw error;
        }
    }
    
    // حذف جميع دروس كورس معين
    static async deleteByCourseId(courseId) {
        const sql = 'DELETE FROM Lessons WHERE course_id = ?';
        
        return new Promise((resolve, reject) => {
            db.run(sql, [courseId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ 
                        message: 'تم حذف جميع الدروس بنجاح',
                        deletedCount: this.changes
                    });
                }
            });
        });
    }
    
    // إعادة ترتيب الدروس
    static async reorderLessons(courseId, lessonOrders) {
        try {
            // التحقق من أن جميع الدروس تنتمي للكورس المحدد
            const lessonIds = lessonOrders.map(lo => lo.lesson_id);
            const placeholders = lessonIds.map(() => '?').join(',');
            
            const validLessons = await new Promise((resolve, reject) => {
                db.all(
                    `SELECT lesson_id FROM Lessons WHERE course_id = ? AND lesson_id IN (${placeholders})`,
                    [courseId, ...lessonIds],
                    (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows.map(r => r.lesson_id));
                    }
                );
            });
            
            if (validLessons.length !== lessonIds.length) {
                throw new Error('بعض الدروس غير موجودة في هذا الكورس');
            }
            
            // تحديث ترتيب الدروس
            const updatePromises = lessonOrders.map(({ lesson_id, order_index }) => {
                return new Promise((resolve, reject) => {
                    db.run(
                        'UPDATE Lessons SET order_index = ? WHERE lesson_id = ?',
                        [order_index, lesson_id],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            });
            
            await Promise.all(updatePromises);
            
            return { message: 'تم إعادة ترتيب الدروس بنجاح' };
            
        } catch (error) {
            throw error;
        }
    }
    
    // البحث عن دروس
    static async search(query, courseId = null) {
        try {
            let sql = `
                SELECT l.*, c.title as course_title
                FROM Lessons l
                JOIN Courses c ON l.course_id = c.course_id
                WHERE l.title LIKE ?
            `;
            
            const params = [`%${query}%`];
            
            if (courseId) {
                sql += ' AND l.course_id = ?';
                params.push(courseId);
            }
            
            sql += ' ORDER BY l.order_index ASC, l.lesson_id ASC LIMIT 50';
            
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
    
    // الحصول على إحصائيات الدروس
    static async getStats(courseId = null) {
        try {
            let sql = `
                SELECT 
                    COUNT(*) as total_lessons,
                    COUNT(CASE WHEN is_preview = 1 THEN 1 END) as preview_lessons,
                    COUNT(CASE WHEN is_preview = 0 THEN 1 END) as paid_lessons
                FROM Lessons
            `;
            
            const params = [];
            
            if (courseId) {
                sql += ' WHERE course_id = ?';
                params.push(courseId);
            }
            
            return new Promise((resolve, reject) => {
                db.get(sql, params, (err, row) => {
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
    
    // التحقق من أن المستخدم يمكنه الوصول للدرس
    static async checkAccess(user, lessonId) {
        try {
            const lesson = await Lesson.findById(lessonId);
            
            // إذا كان الدرس معاينة، يمكن الوصول له دائماً
            if (lesson.is_preview) {
                return lesson;
            }
            
            // التحقق من أن المستخدم مسجل في الكورس
            const isEnrolled = await new Promise((resolve, reject) => {
                db.get(
                    'SELECT 1 FROM Enrollments WHERE user_id = ? AND course_id = ? AND status = "active"',
                    [user.userId, lesson.course_id],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(!!row);
                    }
                );
            });
            
            if (!isEnrolled) {
                throw new Error('يجب التسجيل في الكورس لمشاهدة هذا الدرس');
            }
            
            return lesson;
            
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Lesson;