const { db } = require("../config/db");
const { hashPassword, comparePassword, createSafeUserData } = require("../config/auth");
const { v4: uuidv4 } = require('uuid');

class User {
  // ... (دوال create, findById, findByEmail, findByPhone تبقى كما هي)
   static async create(userData) {
    const { name, email, phone, password, college, gender, pharmacy_type } = userData; // Added pharmacy_type
    const password_hash = await hashPassword(password);
    const sql = `
      INSERT INTO Users (name, email, phone, password_hash, college, gender, pharmacy_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING user_id
    `;
    try {
      const result = await db.query(sql, [name, email, phone, password_hash, college, gender, pharmacy_type]); // Added pharmacy_type
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

    if (!user) throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");

    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");

    if (user.status === 'suspended') throw new Error("هذا الحساب معلق.");

    // Admin bypass remains the same
    if (user.role === 'admin') {
      await this.deleteSession(user.user_id);
      const sessionToken = await this.createSession(user.user_id, deviceInfo);
      return { status: 'success', message: 'تم تسجيل دخول الأدمن بنجاح', user: createSafeUserData(user), token: sessionToken };
    }

    // --- Student Security Logic ---
    const isDeviceApproved = await this.isDeviceApproved(user.user_id, deviceInfo.fingerprint);
    if (!isDeviceApproved) {
      await this.createDeviceLoginRequest(user.user_id, deviceInfo);
      return { status: 'pending_approval', message: 'هذا جهاز جديد. تم إرسال طلب للمشرف للموافقة.' };
    }

    // The intelligent violation check starts here
    const existingSession = await this.getActiveSession(user.user_id);

    if (existingSession) {
      // Check if the login attempt is from a DIFFERENT device
      if (existingSession.device_fingerprint !== deviceInfo.fingerprint) {
        // THIS is a real violation (concurrent login from a new device)
        await this.recordViolation(user.user_id, 'concurrent_login', {
          message: `محاولة تسجيل دخول متزامنة من جهاز مختلف.`,
          newDevice: deviceInfo,
          oldDeviceFingerprint: existingSession.device_fingerprint
        });
      }
      // If the fingerprint is the same, it's a simple re-login, so we do nothing and just create a new session.

      // In both cases (violation or not), we terminate the old session.
      await this.deleteSession(user.user_id);
    }

    // Create a new session with the current device fingerprint
    const newSessionToken = await this.createSession(user.user_id, deviceInfo);

    return {
      status: 'success',
      message: 'تم تسجيل الدخول بنجاح',
      user: createSafeUserData(user),
      token: newSessionToken,
    };
  }
  // ✨ --- END: The New Intelligent Login Logic --- ✨

  // ✨ --- Helper methods need to be updated to handle the fingerprint --- ✨
  static async createSession(userId, deviceInfo) {
    const sessionToken = uuidv4();
    const deviceFingerprint = deviceInfo ? deviceInfo.fingerprint : null; // Handle cases where deviceInfo is not available (like admin)

    await db.query(
      'INSERT INTO ActiveSessions (user_id, session_token, device_fingerprint) VALUES ($1, $2, $3)',
      [userId, sessionToken, deviceFingerprint]
    );
    return sessionToken;
  }

  static async getActiveSession(userId) {
    const result = await db.query('SELECT * FROM ActiveSessions WHERE user_id = $1', [userId]);
    return result.rows[0]; // Returns the full session object including the fingerprint
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

      // خطوة جديدة: التحقق من وجود مخالفة مشابهة حديثًا لمنع التكرار الناتج عن حالة السباق
      const recentViolation = await client.query(
        `SELECT 1 FROM Violations 
                 WHERE user_id = $1 AND violation_type = $2 
                 AND created_at > NOW() - INTERVAL '10 seconds'`,
        [userId, type]
      );

      // إذا تم العثور على مخالفة حديثة، نتجاهل الطلب الحالي ونخرج
      if (recentViolation.rowCount > 0) {
        console.log(`Duplicate violation attempt for user ${userId} ignored.`);
        await client.query('COMMIT'); // ننهي المعاملة بنجاح دون فعل أي شيء
        return;
      }

      // إذا لم تكن هناك مخالفة حديثة، نكمل عملية التسجيل كالمعتاد
      await client.query(
        'INSERT INTO Violations (user_id, violation_type, details) VALUES ($1, $2, $3)',
        [userId, type, JSON.stringify(details)]
      );
      const result = await client.query(
        'UPDATE Users SET violation_count = violation_count + 1 WHERE user_id = $1 RETURNING violation_count',
        [userId]
      );

      await client.query('COMMIT');

      // نتأكد من أن هناك نتيجة قبل إرجاعها
      if (result.rows[0]) {
        return result.rows[0].violation_count;
      }

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
