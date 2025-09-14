// puls-academy-backend/models/Payment.js

const { db } = require("../config/db");

class Payment {
  static async create(paymentData) {
    try {
      // Added screenshot_public_id
      const { user_id, course_id, amount, method, screenshot_url, screenshot_public_id } =
        paymentData;

      const sql = `
        INSERT INTO Payments (user_id, course_id, amount, method, screenshot_url, screenshot_public_id, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        RETURNING payment_id
      `;

      const result = await db.query(sql, [user_id, course_id, amount, method, screenshot_url, screenshot_public_id]);
      return Payment.findById(result.rows[0].payment_id);

    } catch (error) {
      throw error;
    }
  }

  static async findById(paymentId) {
    const sql = `
      SELECT p.*, u.name as user_name, u.email as user_email, c.title as course_title
      FROM Payments p
      JOIN Users u ON p.user_id = u.user_id
      JOIN Courses c ON p.course_id = c.course_id
      WHERE p.payment_id = $1
    `;
    const result = await db.query(sql, [paymentId]);
    if (result.rows.length === 0) {
      throw new Error("الدفعة غير موجودة");
    }
    return result.rows[0];
  }

  static async getAll(filters = {}) {
    try {
      let sql = `
        SELECT p.*, u.name as user_name, u.email as user_email, c.title as course_title
        FROM Payments p
        JOIN Users u ON p.user_id = u.user_id
        JOIN Courses c ON p.course_id = c.course_id
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      if (filters.status) {
        sql += ` AND p.status = $${paramIndex++}`;
        params.push(filters.status);
      }
      if (filters.user_id) {
        sql += ` AND p.user_id = $${paramIndex++}`;
        params.push(filters.user_id);
      }
      if (filters.course_id) {
        sql += ` AND p.course_id = $${paramIndex++}`;
        params.push(filters.course_id);
      }
      if (filters.method) {
        sql += ` AND p.method = $${paramIndex++}`;
        params.push(filters.method);
      }

      sql += " ORDER BY p.created_at DESC";

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
    } catch (error) {
      throw error;
    }
  }

  static async getPending() {
    const sql = `
      SELECT p.*, u.name as user_name, u.email as user_email, c.title as course_title
      FROM Payments p
      JOIN Users u ON p.user_id = u.user_id
      JOIN Courses c ON p.course_id = c.course_id
      WHERE p.status = 'pending'
      ORDER BY p.created_at ASC
    `;
    const result = await db.query(sql);
    return result.rows;
  }
  
  static async deleteAll() {
    const sql = "DELETE FROM Payments WHERE status = 'approved'";
    const result = await db.query(sql);
    return {
      message: "تم حذف المدفوعات المعتمدة بنجاح",
      deletedCount: result.rowCount,
    };
  }

  static async updateStatus(paymentId, status) {
    const validStatuses = ["pending", "approved", "rejected"];
    if (!validStatuses.includes(status)) {
      throw new Error("حالة الدفع غير صالحة");
    }
    const sql = "UPDATE Payments SET status = $1 WHERE payment_id = $2";
    const result = await db.query(sql, [status, paymentId]);
    if (result.rowCount === 0) {
      throw new Error("الدفعة غير موجودة");
    }
    return Payment.findById(paymentId);
  }

  static async approve(paymentId) {
    const payment = await Payment.findById(paymentId);
    if (payment.status === "approved") {
      throw new Error("الدفعة معتمدة بالفعل");
    }
    return Payment.updateStatus(paymentId, "approved");
  }

  static async reject(paymentId) {
    const payment = await Payment.findById(paymentId);
    if (payment.status === "rejected") {
      throw new Error("الدفعة مرفوضة بالفعل");
    }
    return Payment.updateStatus(paymentId, "rejected");
  }

  static async getByUser(userId) {
    const sql = `
      SELECT p.*, c.title as course_title
      FROM Payments p
      JOIN Courses c ON p.course_id = c.course_id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
    `;
    const result = await db.query(sql, [userId]);
    return result.rows;
  }

  static async getByCourse(courseId) {
    const sql = `
      SELECT p.*, u.name as user_name, u.email as user_email
      FROM Payments p
      JOIN Users u ON p.user_id = u.user_id
      WHERE p.course_id = $1
      ORDER BY p.created_at DESC
    `;
    const result = await db.query(sql, [courseId]);
    return result.rows;
  }

  static async getStats() {
    const sql = `
      SELECT 
          COUNT(*) as total_payments,
          SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as total_revenue,
          SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
          AVG(CASE WHEN status = 'approved' THEN amount END) as average_payment
      FROM Payments
    `;
    const result = await db.query(sql);
    return result.rows[0];
  }

  static async deleteByUser(userId) {
    const sql = "DELETE FROM Payments WHERE user_id = $1";
    const result = await db.query(sql, [userId]);
    return {
      message: "تم حذف جميع مدفوعات المستخدم بنجاح",
      deletedCount: result.rowCount,
    };
  }

  static async countByStatus(status) {
    const sql = "SELECT COUNT(*) as count FROM Payments WHERE status = $1";
    const result = await db.query(sql, [status]);
    return result.rows[0] || { count: 0 };
  }

  static async delete(paymentId) {
    await Payment.findById(paymentId);
    const sql = "DELETE FROM Payments WHERE payment_id = $1";
    await db.query(sql, [paymentId]);
    return { message: "تم حذف الدفعة بنجاح" };
  }
}

module.exports = Payment;