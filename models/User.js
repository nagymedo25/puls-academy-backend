// puls-academy-backend/models/User.js

const { db } = require("../config/db");
const {
  hashPassword,
  comparePassword,
  createSafeUserData,
} = require("../config/auth");

class User {
  // إنشاء مستخدم جديد
  static async create(userData) {
    try {
      const { name, email, password, college, gender } = userData;

      // تشفير كلمة المرور
      const password_hash = await hashPassword(password);

      // إدخال المستخدم في قاعدة البيانات
      const sql = `
                INSERT INTO Users (name, email, password_hash, college, gender)
                VALUES (?, ?, ?, ?, ?)
            `;

      return new Promise((resolve, reject) => {
        db.run(
          sql,
          [name, email, password_hash, college, gender],
          function (err) {
            if (err) {
              if (err.code === "SQLITE_CONSTRAINT") {
                reject(new Error("البريد الإلكتروني مسجل بالفعل"));
              } else {
                reject(err);
              }
            } else {
              // إرجاع بيانات المستخدم الجديد
              User.findById(this.lastID).then(resolve).catch(reject);
            }
          }
        );
      });
    } catch (error) {
      throw error;
    }
  }

  // البحث عن مستخدم بالمعرف
  // puls-academy-backend/models/User.js

  // البحث عن مستخدم بالمعرف
  static async findById(userId) {
    const sql = "SELECT * FROM Users WHERE user_id = ?";

    console.log("Running SQL:", sql, "with userId:", userId);

    return new Promise((resolve, reject) => {
      db.get(sql, [userId], (err, row) => {
        if (err) {
          console.error("SQL Error:", err);
          reject(err);
        } else if (!row) {
          console.warn("No user found for userId:", userId);
          resolve(null); // بدل reject نرجع null عشان نقدر نشوف النتيجة
        } else {
          console.log("SQL Result:", row);
          resolve(createSafeUserData(row));
        }
      });
    });
  }

  // البحث عن مستخدم بالبريد الإلكتروني
  static async findByEmail(email) {
    const sql = "SELECT * FROM Users WHERE email = ?";

    return new Promise((resolve, reject) => {
      db.get(sql, [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // تسجيل الدخول
  static async login(email, password) {
    try {
      // البحث عن المستخدم
      const user = await User.findByEmail(email);

      if (!user) {
        throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      }

      // التحقق من كلمة المرور
      const isPasswordValid = await comparePassword(
        password,
        user.password_hash
      );

      if (!isPasswordValid) {
        throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      }

      // إرجاع بيانات المستخدم الآمنة
      return createSafeUserData(user);
    } catch (error) {
      throw error;
    }
  }

  // تحديث بيانات المستخدم
  static async update(userId, userData) {
    try {
      const { name, email, college, gender } = userData;
      const updates = [];
      const values = [];

      // بناء استعلام التحديث ديناميكياً
      if (name !== undefined) {
        updates.push("name = ?");
        values.push(name);
      }
      if (email !== undefined) {
        updates.push("email = ?");
        values.push(email);
      }
      if (college !== undefined) {
        updates.push("college = ?");
        values.push(college);
      }
      if (gender !== undefined) {
        updates.push("gender = ?");
        values.push(gender);
      }

      if (updates.length === 0) {
        throw new Error("لا توجد بيانات لتحديثها");
      }

      values.push(userId);
      const sql = `UPDATE Users SET ${updates.join(", ")} WHERE user_id = ?`;

      return new Promise((resolve, reject) => {
        db.run(sql, values, function (err) {
          if (err) {
            if (err.code === "SQLITE_CONSTRAINT") {
              reject(new Error("البريد الإلكتروني مسجل بالفعل"));
            } else {
              reject(err);
            }
          } else {
            User.findById(userId).then(resolve).catch(reject);
          }
        });
      });
    } catch (error) {
      throw error;
    }
  }

  // تغيير كلمة المرور
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      // الحصول على بيانات المستخدم الحالية
      const user = await new Promise((resolve, reject) => {
        db.get(
          "SELECT * FROM Users WHERE user_id = ?",
          [userId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!user) {
        throw new Error("المستخدم غير موجود");
      }

      // التحقق من كلمة المرور الحالية
      const isCurrentPasswordValid = await comparePassword(
        currentPassword,
        user.password_hash
      );

      if (!isCurrentPasswordValid) {
        throw new Error("كلمة المرور الحالية غير صحيحة");
      }

      // تشفير وتحديث كلمة المرور الجديدة
      const newPasswordHash = await hashPassword(newPassword);

      const sql = "UPDATE Users SET password_hash = ? WHERE user_id = ?";

      return new Promise((resolve, reject) => {
        db.run(sql, [newPasswordHash, userId], function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({ message: "تم تغيير كلمة المرور بنجاح" });
          }
        });
      });
    } catch (error) {
      throw error;
    }
  }

  // حذف مستخدم
  static async delete(userId) {
    const sql = "DELETE FROM Users WHERE user_id = ?";

    return new Promise((resolve, reject) => {
      db.run(sql, [userId], function (err) {
        if (err) {
          reject(err);
        } else if (this.changes === 0) {
          reject(new Error("المستخدم غير موجود"));
        } else {
          resolve({ message: "تم حذف المستخدم بنجاح" });
        }
      });
    });
  }

  // الحصول على جميع المستخدمين (للأدمن)
  static async getAll(limit = 50, offset = 0) {
    // ✨ تم تعديل الاستعلام هنا لعرض الطلاب فقط
    const sql = `
            SELECT user_id, name, email, role, college, gender, created_at
            FROM Users 
            WHERE role = 'student'
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `;

    return new Promise((resolve, reject) => {
      db.all(sql, [limit, offset], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  // الحصول على عدد المستخدمين (للإحصائيات)
  static async getCount() {
    // ✨ تم إضافة شرط لاستثناء الأدمن من العد
    const sql = "SELECT COUNT(*) as total FROM Users WHERE role = 'student'";

    return new Promise((resolve, reject) => {
      db.get(sql, [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.total);
        }
      });
    });
  }

  // البحث عن مستخدمين (للأدمن)
  static async search(query, limit = 20) {
    const sql = `
            SELECT user_id, name, email, role, college, gender, created_at
            FROM Users 
            WHERE (name LIKE ? OR email LIKE ?) AND role = 'student' -- إضافة شرط role
            ORDER BY created_at DESC 
            LIMIT ?
        `;

    const searchTerm = `%${query}%`;

    return new Promise((resolve, reject) => {
      db.all(sql, [searchTerm, searchTerm, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

module.exports = User;
