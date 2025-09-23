// puls-academy-backend/models/Course.js

const { db } = require("../config/db");

class Course {
  // ... (create, findById, getAll methods remain the same as the previous correct version) ...

  static async create(courseData) {
    const {
      title,
      description,
      category,
      college_type,
      pharmacy_type,
      price,
      preview_url,
      thumbnail_url,
    } = courseData;
    const sql = `
      INSERT INTO Courses (title, description, category, college_type, pharmacy_type, price, preview_url, thumbnail_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const result = await db.query(sql, [
      title,
      description,
      category,
      college_type,
      pharmacy_type,
      price,
      preview_url,
      thumbnail_url,
    ]);
    return result.rows[0];
  }

  static async findById(courseId) {
    const sql = "SELECT * FROM Courses WHERE course_id = $1";
    const result = await db.query(sql, [courseId]);
    if (result.rows.length === 0) {
      throw new Error("الكورس غير موجود");
    }
    return result.rows[0];
  }

  static async getAll(filters = {}) {
    let sql = `
      SELECT c.*,
             (SELECT COUNT(*) FROM Lessons WHERE course_id = c.course_id) as lessons_count
      FROM Courses c
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (filters.category) {
      sql += ` AND c.category = $${paramIndex++}`;
      params.push(filters.category);
    }
    if (filters.college_type) {
      sql += ` AND c.college_type = $${paramIndex++}`;
      params.push(filters.college_type);
    }
    if (filters.pharmacy_type) {
      sql += ` AND c.pharmacy_type = $${paramIndex++}`;
      params.push(filters.pharmacy_type);
    }
    if (filters.min_price !== undefined) {
      sql += ` AND c.price >= $${paramIndex++}`;
      params.push(filters.min_price);
    }
    if (filters.max_price !== undefined) {
      sql += ` AND c.price <= $${paramIndex++}`;
      params.push(filters.max_price);
    }

    sql += " ORDER BY c.created_at DESC";

    if (filters.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }
    if (filters.offset) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(filters.offset);
    }

    const result = await db.query(sql, params);
    return result.rows;
  }

  // ✨ --- START: THE FIX FOR LOGGED-IN USERS --- ✨
  static async getAvailableForUser(user) {
    // This function now correctly filters courses for logged-in students
    // based on their college, gender, and pharmacy specialization.
    const sql = `
        SELECT * FROM (
            SELECT
                c.*,
                (SELECT COUNT(*) FROM Lessons WHERE course_id = c.course_id) as lessons_count,
                COALESCE(
                    (SELECT status FROM Enrollments WHERE user_id = $1 AND course_id = c.course_id AND status = 'active'),
                    (SELECT status FROM Payments WHERE user_id = $2 AND course_id = c.course_id ORDER BY created_at DESC LIMIT 1),
                    'available'
                ) as enrollment_status
            FROM Courses c
            WHERE 
                c.category = $3 
                AND c.college_type = $4
                AND (c.category <> 'pharmacy' OR c.pharmacy_type = $5)
        ) AS courses_with_status
        ORDER BY
            CASE courses_with_status.enrollment_status
                WHEN 'active' THEN 1
                WHEN 'pending' THEN 2
                WHEN 'rejected' THEN 3
                ELSE 4
            END,
            courses_with_status.created_at DESC;
    `;
    const params = [user.user_id, user.user_id, user.college, user.gender, user.pharmacy_type];
    const result = await db.query(sql, params);
    return result.rows;
  }
  // ✨ --- END: THE FIX FOR LOGGED-IN USERS --- ✨


  static async update(courseId, courseData) {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const key of ['title', 'description', 'category', 'college_type', 'pharmacy_type', 'price', 'preview_url', 'thumbnail_url']) {
        if (courseData[key] !== undefined) {
            updates.push(`${key} = $${paramIndex++}`);
            values.push(courseData[key]);
        }
    }

    if (updates.length === 0) {
      throw new Error("لا توجد بيانات لتحديثها");
    }

    values.push(courseId);
    const sql = `UPDATE Courses SET ${updates.join(", ")} WHERE course_id = $${paramIndex} RETURNING *`;
    const result = await db.query(sql, values);

    if (result.rowCount === 0) {
      throw new Error("الكورس غير موجود");
    }
    return result.rows[0];
  }

  // ... (rest of the file remains the same) ...
  static async delete(courseId) {
    const result = await db.query("DELETE FROM Courses WHERE course_id = $1", [courseId]);
    if (result.rowCount === 0) {
        throw new Error("الكورس غير موجود");
    }
    return { message: "تم حذف الكورس بنجاح" };
  }

  static async search(query, filters = {}) {
    let sql = `
      SELECT c.*,
             (SELECT COUNT(*) FROM Lessons WHERE course_id = c.course_id) as lessons_count
      FROM Courses c
      WHERE (c.title ILIKE $1 OR c.description ILIKE $1)
    `;
    const params = [`%${query}%`];
    let paramIndex = 2;

    if (filters.category) {
      sql += ` AND c.category = $${paramIndex++}`;
      params.push(filters.category);
    }
    if (filters.college_type) {
      sql += ` AND c.college_type = $${paramIndex++}`;
      params.push(filters.college_type);
    }

    sql += " ORDER BY c.created_at DESC";

    if (filters.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }

    const result = await db.query(sql, params);
    return result.rows;
  }

  static async getStats() {
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
    const result = await db.query(sql);
    return result.rows[0];
  }

  static async getTopSelling(limit = 10) {
    const sql = `
      SELECT c.*, COUNT(e.enrollment_id) as enrollment_count
      FROM Courses c
      LEFT JOIN Enrollments e ON c.course_id = e.course_id AND e.status = 'active'
      GROUP BY c.course_id
      ORDER BY enrollment_count DESC
      LIMIT $1
    `;
    const result = await db.query(sql, [limit]);
    return result.rows;
  }
}

module.exports = Course;