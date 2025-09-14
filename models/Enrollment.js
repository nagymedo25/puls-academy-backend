// puls-academy-backend/models/Enrollment.js

const { db } = require("../config/db");

class Enrollment {
  static async create(enrollmentData) {
    const { user_id, course_id, payment_id, status = "active" } = enrollmentData;
    const sql = `
      INSERT INTO Enrollments (user_id, course_id, payment_id, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT(user_id, course_id) DO UPDATE SET
        payment_id = EXCLUDED.payment_id,
        status = EXCLUDED.status,
        enrolled_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const result = await db.query(sql, [user_id, course_id, payment_id, status]);
    return result.rows[0];
  }

  static async findById(enrollmentId) {
    const sql = `
      SELECT e.*, u.name as user_name, u.email as user_email, c.title as course_title
      FROM Enrollments e
      JOIN Users u ON e.user_id = u.user_id
      JOIN Courses c ON e.course_id = c.course_id
      WHERE e.enrollment_id = $1
    `;
    const result = await db.query(sql, [enrollmentId]);
    if (result.rows.length === 0) {
      throw new Error("التسجيل غير موجود");
    }
    return result.rows[0];
  }

  static async findByUserAndCourse(userId, courseId) {
    const sql = `
      SELECT e.*, p.status as payment_status
      FROM Enrollments e
      LEFT JOIN Payments p ON e.payment_id = p.payment_id
      WHERE e.user_id = $1 AND e.course_id = $2
    `;
    const result = await db.query(sql, [userId, courseId]);
    return result.rows[0];
  }

  static async getByUser(userId) {
    const sql = `
      SELECT e.*, c.title as course_title, c.category, c.college_type, c.price
      FROM Enrollments e
      JOIN Courses c ON e.course_id = c.course_id
      WHERE e.user_id = $1
      ORDER BY e.enrolled_at DESC
    `;
    const result = await db.query(sql, [userId]);
    return result.rows;
  }

  static async getByCourse(courseId) {
    const sql = `
      SELECT e.*, u.name as user_name, u.email as user_email
      FROM Enrollments e
      JOIN Users u ON e.user_id = u.user_id
      WHERE e.course_id = $1
      ORDER BY e.enrolled_at DESC
    `;
    const result = await db.query(sql, [courseId]);
    return result.rows;
  }

  static async updateStatus(enrollmentId, status) {
    const sql = "UPDATE Enrollments SET status = $1 WHERE enrollment_id = $2 RETURNING *";
    const result = await db.query(sql, [status, enrollmentId]);
    if (result.rowCount === 0) {
      throw new Error("التسجيل غير موجود");
    }
    return result.rows[0];
  }

  static async getTopStudents(limit = 10) {
    const sql = `
      SELECT u.*, COUNT(e.enrollment_id) as enrollment_count
      FROM Users u
      LEFT JOIN Enrollments e ON u.user_id = e.user_id AND e.status = 'active'
      WHERE u.role = 'student'
      GROUP BY u.user_id
      ORDER BY enrollment_count DESC
      LIMIT $1
    `;
    const result = await db.query(sql, [limit]);
    return result.rows;
  }

  static async delete(enrollmentId) {
    const result = await db.query("DELETE FROM Enrollments WHERE enrollment_id = $1", [enrollmentId]);
    if (result.rowCount === 0) {
        throw new Error("التسجيل غير موجود");
    }
    return { message: "تم حذف التسجيل بنجاح" };
  }

  static async deleteByUser(userId) {
    const result = await db.query("DELETE FROM Enrollments WHERE user_id = $1", [userId]);
    return { message: "تم حذف جميع تسجيلات المستخدم بنجاح", deletedCount: result.rowCount };
  }

  static async deleteByCourse(courseId) {
    const result = await db.query("DELETE FROM Enrollments WHERE course_id = $1", [courseId]);
    return { message: "تم حذف جميع تسجيلات الكورس بنجاح", deletedCount: result.rowCount };
  }
}

module.exports = Enrollment;
