// puls-academy-backend/models/Lesson.js

const { db } = require("../config/db");

class Lesson {
  // إنشاء درس جديد
  static async create(lessonData) {
    try {
      // ✨ تم التعديل: إزالة thumbnail_url والاعتماد فقط على العنوان والفيديو
      const {
        course_id,
        title,
        video_url,
        is_preview = false,
        order_index = 0,
      } = lessonData;

      const sql = `
                INSERT INTO Lessons (course_id, title, video_url, is_preview, order_index)
                VALUES (?, ?, ?, ?, ?)
            `;

      return new Promise((resolve, reject) => {
        db.run(
          sql,
          [course_id, title, video_url, is_preview, order_index],
          function (err) {
            if (err) {
              reject(err);
            } else {
              Lesson.findById(this.lastID).then(resolve).catch(reject);
            }
          }
        );
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
          reject(new Error("الدرس غير موجود"));
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

      // ✨ FIX: Changed `user.userId` to `user.user_id`
      const params = user
        ? [user.user_id, user.user_id, courseId]
        : [null, null, courseId];

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

      if (title !== undefined) {
        updates.push("title = ?");
        values.push(title);
      }
      if (video_url !== undefined) {
        updates.push("video_url = ?");
        values.push(video_url);
      }
      if (is_preview !== undefined) {
        updates.push("is_preview = ?");
        values.push(is_preview);
      }
      if (order_index !== undefined) {
        updates.push("order_index = ?");
        values.push(order_index);
      }

      if (updates.length === 0) {
        throw new Error("لا توجد بيانات لتحديثها");
      }

      values.push(lessonId);
      const sql = `UPDATE Lessons SET ${updates.join(
        ", "
      )} WHERE lesson_id = ?`;

      return new Promise((resolve, reject) => {
        db.run(sql, values, function (err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new Error("الدرس غير موجود"));
          } else {
            Lesson.findById(lessonId).then(resolve).catch(reject);
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
      await Lesson.findById(lessonId);

      const sql = "DELETE FROM Lessons WHERE lesson_id = ?";

      return new Promise((resolve, reject) => {
        db.run(sql, [lessonId], function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({ message: "تم حذف الدرس بنجاح" });
          }
        });
      });
    } catch (error) {
      throw error;
    }
  }

  // حذف جميع دروس كورس معين
  static async deleteByCourseId(courseId) {
    const sql = "DELETE FROM Lessons WHERE course_id = ?";

    return new Promise((resolve, reject) => {
      db.run(sql, [courseId], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            message: "تم حذف جميع الدروس بنجاح",
            deletedCount: this.changes,
          });
        }
      });
    });
  }

  // التحقق من أن المستخدم يمكنه الوصول للدرس
   static async checkAccess(user, lessonId) {
    try {
      const lesson = await Lesson.findById(lessonId);
      
      if (lesson.is_preview) {
        return lesson;
      }
      
      const isEnrolled = await new Promise((resolve, reject) => {
        db.get(
          'SELECT 1 FROM Enrollments WHERE user_id = ? AND course_id = ? AND status = "active"',
          [user.user_id, lesson.course_id], // ✨ تصحيح هنا
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
