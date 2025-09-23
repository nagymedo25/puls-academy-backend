const { db } = require("../config/db");
const { hashPassword, comparePassword, createSafeUserData } = require("../config/auth");
const { v4: uuidv4 } = require('uuid');

class User {
  // ... (دوال create, findById, findByEmail, findByPhone تبقى كما هي)
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

  static async findById(userId) {
    const sql = "SELECT * FROM Users WHERE user_id = $1";
    const result = await db.query(sql, [userId]);
    if (result.rows.length === 0) {
      return null;
    }
    return createSafeUserData(result.rows[0]);
  }

  static async findByEmail(email) {
    const sql = "SELECT * FROM Users WHERE email = $1";
    const result = await db.query(sql, [email]);
    return result.rows[0];
  }

  static async findByPhone(phone) {
    const sql = "SELECT * FROM Users WHERE phone = $1";
    const result = await db.query(sql, [phone]);
    return result.rows[0];
  }

  // ✨ --- START: تعديل دالة تسجيل الدخول لإعفاء الأدمن --- ✨
  static async login(emailOrPhone, password, deviceInfo) {
    const user = emailOrPhone.includes('@')
      ? await this.findByEmail(emailOrPhone)
      : await this.findByPhone(emailOrPhone);

    if (!user) {
      throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
    }

    if (user.status === 'suspended') {
      throw new Error("هذا الحساب معلق. يرجى التواصل مع الدعم الفني.");
    }

    // -->> New Condition: Check if the user is an admin <<--
    if (user.role === 'admin') {
      console.log("Admin login attempt detected. Bypassing security checks.");
      // Clean up any old sessions for the admin for hygiene and create a new one
      await this.deleteSession(user.user_id);
      const sessionToken = await this.createSession(user.user_id);
      return {
        status: 'success',
        message: 'تم تسجيل دخول الأدمن بنجاح',
        user: createSafeUserData(user),
        token: sessionToken,
      };
    }

    // --- Security logic for students (remains as is) ---
    const isDeviceApproved = await this.isDeviceApproved(user.user_id, deviceInfo.fingerprint, deviceInfo.userAgent);
    if (!isDeviceApproved) {
      await this.createDeviceLoginRequest(user.user_id, deviceInfo);
      return {
        status: 'pending_approval',
        message: 'هذا جهاز جديد. تم إرسال طلب للمشرف للموافقة على تسجيل دخولك.'
      };
    }

    const existingSession = await this.getActiveSession(user.user_id);
    if (existingSession) {
      await this.recordViolation(user.user_id, 'concurrent_login', {
        message: `محاولة تسجيل دخول متزامنة. تم إنهاء الجلسة القديمة.`,
        newDevice: deviceInfo
      });
      await this.deleteSession(user.user_id);
    }

    const sessionToken = await this.createSession(user.user_id);
    return {
      status: 'success',
      message: 'تم تسجيل الدخول بنجاح',
      user: createSafeUserData(user),
      token: sessionToken,
    };
  }
  // ✨ --- END: تعديل دالة تسجيل الدخول --- ✨

  static async isDeviceApproved(userId, fingerprint, userAgent) {
    const client = await db.connect();
    try {
      const approvedDevicesResult = await client.query('SELECT 1 FROM UserDevices WHERE user_id = $1 LIMIT 1', [userId]);
      if (approvedDevicesResult.rowCount === 0) {
        await client.query(
          'INSERT INTO UserDevices (user_id, device_fingerprint, user_agent) VALUES ($1, $2, $3)',
          [userId, fingerprint, userAgent]
        );
        return true;
      }
      const deviceResult = await client.query(
        'SELECT 1 FROM UserDevices WHERE user_id = $1 AND device_fingerprint = $2',
        [userId, fingerprint]
      );
      return deviceResult.rowCount > 0;
    } finally {
      client.release();
    }
  }

  // ... (باقي الدوال المساعدة تبقى كما هي)
  static async createDeviceLoginRequest(userId, deviceInfo) {
    await db.query(
      'INSERT INTO DeviceLoginRequests (user_id, device_fingerprint, user_agent, ip_address) VALUES ($1, $2, $3, $4)',
      [userId, deviceInfo.fingerprint, deviceInfo.userAgent, deviceInfo.ipAddress]
    );
  }

  static async getActiveSession(userId) {
    const result = await db.query('SELECT * FROM ActiveSessions WHERE user_id = $1', [userId]);
    return result.rows[0];
  }

  static async createSession(userId) {
    const sessionToken = uuidv4();
    await db.query(
      'INSERT INTO ActiveSessions (user_id, session_token) VALUES ($1, $2)',
      [userId, sessionToken]
    );
    return sessionToken;
  }

  static async deleteSession(userId) {
    await db.query('DELETE FROM ActiveSessions WHERE user_id = $1', [userId]);
  }

  static async recordViolation(userId, type, details) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'INSERT INTO Violations (user_id, violation_type, details) VALUES ($1, $2, $3)',
        [userId, type, JSON.stringify(details)]
      );
      const result = await client.query(
        'UPDATE Users SET violation_count = violation_count + 1 WHERE user_id = $1 RETURNING violation_count',
        [userId]
      );
      await client.query('COMMIT');
      return result.rows[0].violation_count;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  static async getViolators() {
    const result = await db.query("SELECT user_id, name, email, phone, violation_count, status FROM Users WHERE violation_count >= 2 ORDER BY violation_count DESC");
    return result.rows;
  }

  static async suspend(userId) {
    await db.query("UPDATE Users SET status = 'suspended' WHERE user_id = $1", [userId]);
    return { message: 'تم تعليق حساب المستخدم بنجاح' };
  }

  static async reactivate(userId) {
    await db.query("UPDATE Users SET status = 'active', violation_count = 0 WHERE user_id = $1", [userId]);
    return { message: 'تمت إعادة تفعيل حساب المستخدم وإعادة تعيين المخالفات' };
  }

  // ... (باقي الدوال مثل update, changePassword, delete, getAll تبقى كما هي)
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

  static async delete(userId) {
    const sql = "DELETE FROM Users WHERE user_id = $1";
    const result = await db.query(sql, [userId]);
    if (result.rowCount === 0) {
      throw new Error("المستخدم غير موجود");
    }
    return { message: "تم حذف المستخدم بنجاح" };
  }

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

  static async getCount() {
    const sql = "SELECT COUNT(*) as total FROM Users WHERE role = 'student'";
    const result = await db.query(sql);
    return parseInt(result.rows[0].total, 10);
  }

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
