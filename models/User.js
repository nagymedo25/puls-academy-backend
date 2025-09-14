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
    const { name, email, phone, password, college, gender } = userData;
    const password_hash = await hashPassword(password);
    const sql = `
      INSERT INTO Users (name, email, phone, password_hash, college, gender)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING user_id
    `;
    try {
      const result = await db.query(sql, [name, email, phone, password_hash, college, gender]);
      return User.findById(result.rows[0].user_id);
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error("البريد الإلكتروني أو رقم الهاتف مسجل بالفعل");
      }
      throw error;
    }
  }

  // البحث عن مستخدم بالمعرف
  static async findById(userId) {
    const sql = "SELECT * FROM Users WHERE user_id = $1";
    const result = await db.query(sql, [userId]);
    if (result.rows.length === 0) {
      return null;
    }
    return createSafeUserData(result.rows[0]);
  }

  // البحث عن مستخدم بالبريد الإلكتروني
  static async findByEmail(email) {
    const sql = "SELECT * FROM Users WHERE email = $1";
    const result = await db.query(sql, [email]);
    return result.rows[0];
  }

  // البحث عن مستخدم برقم الهاتف
  static async findByPhone(phone) {
    const sql = "SELECT * FROM Users WHERE phone = $1";
    const result = await db.query(sql, [phone]);
    return result.rows[0];
  }

  // تسجيل الدخول
  static async login(emailOrPhone, password) {
    const user = emailOrPhone.includes('@')
      ? await User.findByEmail(emailOrPhone)
      : await User.findByPhone(emailOrPhone);

    if (!user) {
      throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
    }

    const isPasswordValid = await comparePassword(
      password,
      user.password_hash
    );

    if (!isPasswordValid) {
      throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
    }

    return createSafeUserData(user);
  }

  // تحديث بيانات المستخدم
  static async update(userId, userData) {
    const { name, email, phone, password, college, gender } = userData;
    const updates = [];
    const values = [];
    let queryIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${queryIndex++}`);
      values.push(name);
    }
    if (email !== undefined) {
      updates.push(`email = $${queryIndex++}`);
      values.push(email);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${queryIndex++}`);
      values.push(phone);
    }
    if (college !== undefined) {
      updates.push(`college = $${queryIndex++}`);
      values.push(college);
    }
    if (gender !== undefined) {
      updates.push(`gender = $${queryIndex++}`);
      values.push(gender);
    }
    if (password) {
      const password_hash = await hashPassword(password);
      updates.push(`password_hash = $${queryIndex++}`);
      values.push(password_hash);
    }

    if (updates.length === 0) {
      throw new Error("لا توجد بيانات لتحديثها");
    }

    values.push(userId);
    const sql = `UPDATE Users SET ${updates.join(", ")} WHERE user_id = $${queryIndex} RETURNING user_id`;

    try {
      const result = await db.query(sql, values);
      if (result.rows.length === 0) {
          throw new Error("المستخدم غير موجود");
      }
      return User.findById(result.rows[0].user_id);
    } catch (error) {
        if (error.code === '23505') {
            throw new Error("البريد الإلكتروني أو رقم الهاتف مسجل بالفعل");
        }
        throw error;
    }
  }

  // تغيير كلمة المرور
  static async changePassword(userId, currentPassword, newPassword) {
    const userResult = await db.query("SELECT * FROM Users WHERE user_id = $1", [userId]);
    if (userResult.rows.length === 0) {
      throw new Error("المستخدم غير موجود");
    }
    const user = userResult.rows[0];

    const isCurrentPasswordValid = await comparePassword(
      currentPassword,
      user.password_hash
    );

    if (!isCurrentPasswordValid) {
      throw new Error("كلمة المرور الحالية غير صحيحة");
    }

    const newPasswordHash = await hashPassword(newPassword);
    const sql = "UPDATE Users SET password_hash = $1 WHERE user_id = $2";
    await db.query(sql, [newPasswordHash, userId]);
    return { message: "تم تغيير كلمة المرور بنجاح" };
  }

  // حذف مستخدم
  static async delete(userId) {
    const sql = "DELETE FROM Users WHERE user_id = $1";
    const result = await db.query(sql, [userId]);
    if (result.rowCount === 0) {
        throw new Error("المستخدم غير موجود");
    }
    return { message: "تم حذف المستخدم بنجاح" };
  }

  // الحصول على جميع المستخدمين (للأدمن)
  static async getAll(limit = 50, offset = 0) {
    const sql = `
      SELECT user_id, name, email, phone, role, college, gender, created_at
      FROM Users
      WHERE role = 'student'
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await db.query(sql, [limit, offset]);
    return result.rows;
  }

  // الحصول على عدد المستخدمين (للإحصائيات)
  static async getCount() {
    const sql = "SELECT COUNT(*) as total FROM Users WHERE role = 'student'";
    const result = await db.query(sql);
    return parseInt(result.rows[0].total, 10);
  }

  // البحث عن مستخدمين (للأدمن)
  static async search(query, limit = 20) {
    const sql = `
      SELECT user_id, name, email, phone, role, college, gender, created_at
      FROM Users
      WHERE (name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1) AND role = 'student'
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const searchTerm = `%${query}%`;
    const result = await db.query(sql, [searchTerm, limit]);
    return result.rows;
  }
}

module.exports = User;
