// puls-academy-backend/models/Payment.js

const { db } = require("../config/db");

class Payment {
  static async create(paymentData) {
    try {
      const { user_id, course_id, amount, method, screenshot_path } =
        paymentData;

      const sql = `
                INSERT INTO Payments (user_id, course_id, amount, method, screenshot_path, status)
                VALUES (?, ?, ?, ?, ?, 'pending')
            `;

      return new Promise((resolve, reject) => {
        db.run(
          sql,
          [user_id, course_id, amount, method, screenshot_path],
          function (err) {
            if (err) {
              reject(err);
            } else {
              Payment.findById(this.lastID).then(resolve).catch(reject);
            }
          }
        );
      });
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
            WHERE p.payment_id = ?
        `;

    return new Promise((resolve, reject) => {
      db.get(sql, [paymentId], (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          reject(new Error("الدفعة غير موجودة"));
        } else {
          resolve(row);
        }
      });
    });
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

      if (filters.status) {
        sql += " AND p.status = ?";
        params.push(filters.status);
      }

      if (filters.user_id) {
        sql += " AND p.user_id = ?";
        params.push(filters.user_id);
      }

      if (filters.course_id) {
        sql += " AND p.course_id = ?";
        params.push(filters.course_id);
      }

      if (filters.method) {
        sql += " AND p.method = ?";
        params.push(filters.method);
      }

      sql += " ORDER BY p.created_at DESC";

      if (filters.limit) {
        sql += " LIMIT ?";
        params.push(filters.limit);
      }

      if (filters.offset) {
        sql += " OFFSET ?";
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

  static async getPending() {
    const sql = `
            SELECT p.*, u.name as user_name, u.email as user_email, c.title as course_title
            FROM Payments p
            JOIN Users u ON p.user_id = u.user_id
            JOIN Courses c ON p.course_id = c.course_id
            WHERE p.status = 'pending'
            ORDER BY p.created_at ASC
        `;

    return new Promise((resolve, reject) => {
      db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async deleteAll() {
    const sql = "DELETE FROM Payments";
    return new Promise((resolve, reject) => {
      db.run(sql, [], function (err) {
        if (err) {
          return reject(err);
        }
        resolve({
          message: "تم حذف جميع المدفوعات بنجاح",
          deletedCount: this.changes,
        });
      });
    });
  }

  static async updateStatus(paymentId, status) {
    try {
      const validStatuses = ["pending", "approved", "rejected"];
      if (!validStatuses.includes(status)) {
        throw new Error("حالة الدفع غير صالحة");
      }

      const sql = "UPDATE Payments SET status = ? WHERE payment_id = ?";

      return new Promise((resolve, reject) => {
        db.run(sql, [status, paymentId], function (err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new Error("الدفعة غير موجودة"));
          } else {
            Payment.findById(paymentId).then(resolve).catch(reject);
          }
        });
      });
    } catch (error) {
      throw error;
    }
  }

  static async approve(paymentId) {
    try {
      const payment = await Payment.findById(paymentId);

      if (payment.status === "approved") {
        throw new Error("الدفعة معتمدة بالفعل");
      }

      await Payment.updateStatus(paymentId, "approved");

      return payment;
    } catch (error) {
      throw error;
    }
  }

  static async reject(paymentId) {
    try {
      const payment = await Payment.findById(paymentId);

      if (payment.status === "rejected") {
        throw new Error("الدفعة مرفوضة بالفعل");
      }

      await Payment.updateStatus(paymentId, "rejected");

      return payment;
    } catch (error) {
      throw error;
    }
  }

  static async getByUser(userId) {
    const sql = `
            SELECT p.*, c.title as course_title
            FROM Payments p
            JOIN Courses c ON p.course_id = c.course_id
            WHERE p.user_id = ?
            ORDER BY p.created_at DESC
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
            SELECT p.*, u.name as user_name, u.email as user_email
            FROM Payments p
            JOIN Users u ON p.user_id = u.user_id
            WHERE p.course_id = ?
            ORDER BY p.created_at DESC
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

  static async getStats() {
    try {
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

  static async delete(paymentId) {
    try {
      await Payment.findById(paymentId);

      const sql = "DELETE FROM Payments WHERE payment_id = ?";

      return new Promise((resolve, reject) => {
        db.run(sql, [paymentId], function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({ message: "تم حذف الدفعة بنجاح" });
          }
        });
      });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Payment;
