// puls-academy-backend/models/Lesson.js

const { db } = require("../config/db");

class Lesson {
  static async create(lessonData) {
    const {
      course_id,
      title,
      description,
      video_url,
      is_preview = false,
      order_index = 0,
    } = lessonData;
    const sql = `
      INSERT INTO Lessons (course_id, title, description, video_url, is_preview, order_index)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await db.query(sql, [course_id, title, description, video_url, is_preview, order_index]);
    return result.rows[0];
  }

    static async update(lessonId, lessonData) {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    // Fields that can be updated
    for (const key of ['title', 'description', 'video_url']) {
        if (lessonData[key] !== undefined) {
            updates.push(`${key} = $${paramIndex++}`);
            values.push(lessonData[key]);
        }
    }

    if (updates.length === 0) {
      throw new Error("لا توجد بيانات لتحديثها");
    }

    values.push(lessonId);
    const sql = `UPDATE Lessons SET ${updates.join(", ")} WHERE lesson_id = $${paramIndex} RETURNING *`;
    const result = await db.query(sql, values);

    if (result.rowCount === 0) {
      throw new Error("الدرس غير موجود");
    }
    return result.rows[0];
  }

  static async findById(lessonId) {
    const sql = `
      SELECT l.*, c.title as course_title, c.category as course_category, c.college_type as course_college_type
      FROM Lessons l
      JOIN Courses c ON l.course_id = c.course_id
      WHERE l.lesson_id = $1
    `;
    const result = await db.query(sql, [lessonId]);
    if (result.rows.length === 0) {
      throw new Error("الدرس غير موجود");
    }
    return result.rows[0];
  }

  static async getByCourseId(courseId, user = null) {
    const sql = `
      SELECT l.*,
             CASE
                 WHEN l.is_preview = true THEN true
                 WHEN $1::integer IS NOT NULL THEN
                     EXISTS (
                         SELECT 1 FROM Enrollments e
                         WHERE e.user_id = $1 AND e.course_id = l.course_id AND e.status = 'active'
                     )
                 ELSE false
             END as is_accessible
      FROM Lessons l
      WHERE l.course_id = $2
      ORDER BY l.order_index ASC, l.lesson_id ASC
    `;
    const params = [user ? user.user_id : null, courseId];
    const result = await db.query(sql, params);
    return result.rows;
  }

  static async getPreviewLesson(courseId) {
    const sql = `
      SELECT l.*, c.title as course_title
      FROM Lessons l
      JOIN Courses c ON l.course_id = c.course_id
      WHERE l.course_id = $1 AND l.is_preview = true
      ORDER BY l.order_index ASC
      LIMIT 1
    `;
    const result = await db.query(sql, [courseId]);
    return result.rows[0];
  }

  static async update(lessonId, lessonData) {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const key of ['title', 'description', 'video_url', 'is_preview', 'order_index']) {
        if (lessonData[key] !== undefined) {
            updates.push(`${key} = $${paramIndex++}`);
            values.push(lessonData[key]);
        }
    }

    if (updates.length === 0) {
      throw new Error("لا توجد بيانات لتحديثها");
    }

    values.push(lessonId);
    const sql = `UPDATE Lessons SET ${updates.join(", ")} WHERE lesson_id = $${paramIndex} RETURNING *`;
    const result = await db.query(sql, values);

    if (result.rowCount === 0) {
      throw new Error("الدرس غير موجود");
    }
    return result.rows[0];
  }

  static async delete(lessonId) {
    const result = await db.query("DELETE FROM Lessons WHERE lesson_id = $1", [lessonId]);
    if (result.rowCount === 0) {
      throw new Error("الدرس غير موجود");
    }
    return { message: "تم حذف الدرس بنجاح" };
  }

  static async deleteByCourseId(courseId) {
    const result = await db.query("DELETE FROM Lessons WHERE course_id = $1", [courseId]);
    return { message: "تم حذف جميع الدروس بنجاح", deletedCount: result.rowCount };
  }

  static async checkAccess(user, lessonId) {
    const lesson = await Lesson.findById(lessonId);
    if (lesson.is_preview) {
      return lesson;
    }
    const result = await db.query(
      'SELECT 1 FROM Enrollments WHERE user_id = $1 AND course_id = $2 AND status = $3',
      [user.user_id, lesson.course_id, "active"]
    );
    if (result.rowCount === 0) {
      throw new Error("يجب التسجيل في الكورس لمشاهدة هذا الدرس");
    }
    return lesson;
  }
}

module.exports = Lesson;
