const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

console.log('DATABASE_URL from environment:', process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Add SSL configuration for production environments like Neon, Heroku, etc.
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const createTables = async () => {
  const client = await pool.connect();
  try {
    // === START: تعديلات وتحديثات ===
    // 1. تحديث جدول المستخدمين
    await client.query(`
      CREATE TABLE IF NOT EXISTS Users (
          user_id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE,
          phone TEXT UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'student' CHECK(role IN ('student', 'admin')),
          college TEXT NOT NULL CHECK(college IN ('pharmacy', 'dentistry')),
          gender TEXT NOT NULL CHECK(gender IN ('male', 'female')),
          pharmacy_type TEXT CHECK(pharmacy_type IN ('clinical', 'pharm-d')), -- Added this line
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          violation_count INTEGER DEFAULT 0,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended'))
      )
    `);

    // 2. إنشاء جدول الأجهزة المعتمدة
    await client.query(`
      CREATE TABLE IF NOT EXISTS UserDevices (
        device_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
        device_fingerprint TEXT NOT NULL,
        user_agent TEXT,
        approved_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, device_fingerprint)
      )
    `);

    // 3. إنشاء جدول طلبات الدخول من الأجهزة الجديدة
    await client.query(`
      CREATE TABLE IF NOT EXISTS DeviceLoginRequests (
        request_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
        device_fingerprint TEXT NOT NULL,
        user_agent TEXT,
        ip_address TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. إنشاء جدول الجلسات النشطة
    await client.query(`
      CREATE TABLE IF NOT EXISTS ActiveSessions (
        session_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
        session_token TEXT NOT NULL UNIQUE,
        last_seen TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. إنشاء جدول المخالفات
    await client.query(`
      CREATE TABLE IF NOT EXISTS Violations (
        violation_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
        violation_type TEXT NOT NULL,
        details TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // === END: تعديلات وتحديثات ===

    // الجداول الأخرى تبقى كما هي
    await client.query(`
      CREATE TABLE IF NOT EXISTS Courses (
          course_id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          category TEXT NOT NULL CHECK(category IN ('pharmacy', 'dentistry')),
          college_type TEXT NOT NULL CHECK(college_type IN ('male', 'female')),
          pharmacy_type TEXT CHECK(pharmacy_type IN ('clinical', 'pharm-d')), -- This column was missing
          price REAL NOT NULL,
          thumbnail_url TEXT,
          preview_url TEXT,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS Lessons (
          lesson_id SERIAL PRIMARY KEY,
          course_id INTEGER NOT NULL REFERENCES Courses(course_id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT,
          video_url TEXT NOT NULL,
          is_preview BOOLEAN DEFAULT FALSE,
          order_index INTEGER DEFAULT 0
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS Payments (
          payment_id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
          course_id INTEGER NOT NULL REFERENCES Courses(course_id) ON DELETE CASCADE,
          amount REAL NOT NULL,
          method TEXT NOT NULL CHECK(method IN ('vodafone_cash', 'instapay')),
          screenshot_url TEXT,
          screenshot_public_id TEXT,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS Enrollments (
          enrollment_id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
          course_id INTEGER NOT NULL REFERENCES Courses(course_id) ON DELETE CASCADE,
          payment_id INTEGER REFERENCES Payments(payment_id) ON DELETE SET NULL,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
          enrolled_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, course_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS Notifications (
          notification_id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS Messages (
          message_id SERIAL PRIMARY KEY,
          sender_id INTEGER NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
          receiver_id INTEGER NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
          message_content TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          is_read BOOLEAN DEFAULT FALSE
      )
    `);

  } finally {
    client.release();
  }
};

const initializeDatabase = async () => {
  try {
    await createTables();
    console.log('تم إنشاء جميع الجداول بنجاح');

    const bcrypt = require('bcrypt');
    const adminEmail = 'admin@pulsacademy.com';
    const adminPassword = await bcrypt.hash(process.env.ADMIN_DEFAULT_PASSWORD || 'admin123', 10);

    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO Users (name, email, password_hash, role, college, gender)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO NOTHING`,
        ['Admin', adminEmail, adminPassword, 'admin', 'pharmacy', 'male']
      );
    } finally {
      client.release();
    }

    console.log('تم تهيئة قاعدة البيانات بنجاح');
  } catch (error) {
    console.error('خطأ في تهيئة قاعدة البيانات:', error);
    throw error;
  }
};

module.exports = {
  db: pool,
  initializeDatabase,
  generateSessionToken: () => uuidv4(),
};