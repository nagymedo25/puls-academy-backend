const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// مسار قاعدة البيانات
const dbPath = path.join(__dirname, '../database.sqlite');

// إنشاء اتصال بقاعدة البيانات
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('خطأ في فتح قاعدة البيانات:', err.message);
    } else {
        console.log('تم الاتصال بقاعدة بيانات SQLite');
    }
});

// دالة لإنشاء الجداول
const createTables = () => {
    return new Promise((resolve, reject) => {
        // جدول المستخدمين
        db.run(`CREATE TABLE IF NOT EXISTS Users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'student' CHECK(role IN ('student', 'admin')),
            college TEXT NOT NULL CHECK(college IN ('pharmacy', 'dentistry')),
            gender TEXT NOT NULL CHECK(gender IN ('male', 'female')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // جدول الكورسات
        db.run(`CREATE TABLE IF NOT EXISTS Courses (
            course_id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            category TEXT NOT NULL CHECK(category IN ('pharmacy', 'dentistry')),
            college_type TEXT NOT NULL CHECK(college_type IN ('male', 'female')),
            price REAL NOT NULL,
            thumbnail_url TEXT, -- <<<--- تمت إضافة هذا الحقل
            preview_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS Lessons (
            lesson_id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            video_url TEXT NOT NULL,
            is_preview BOOLEAN DEFAULT FALSE,
            order_index INTEGER DEFAULT 0,
            FOREIGN KEY (course_id) REFERENCES Courses(course_id) ON DELETE CASCADE
        )`);

        // جدول المدفوعات
        db.run(`CREATE TABLE IF NOT EXISTS Payments (
            payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            course_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            method TEXT NOT NULL CHECK(method IN ('vodafone_cash', 'instapay')),
            screenshot_path TEXT,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES Users(user_id),
            FOREIGN KEY (course_id) REFERENCES Courses(course_id)
        )`);

        // جدول التسجيلات
        db.run(`CREATE TABLE IF NOT EXISTS Enrollments (
            enrollment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            course_id INTEGER NOT NULL,
            payment_id INTEGER,
            status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
            enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES Users(user_id),
            FOREIGN KEY (course_id) REFERENCES Courses(course_id),
            FOREIGN KEY (payment_id) REFERENCES Payments(payment_id),
            UNIQUE(user_id, course_id)
        )`);

        // جدول الإشعارات
        db.run(`CREATE TABLE IF NOT EXISTS Notifications (
            notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
        )`);

        // ✨ جدول جديد للرسائل
        db.run(`CREATE TABLE IF NOT EXISTS Messages (
            message_id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            message_content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_read BOOLEAN DEFAULT FALSE,
            FOREIGN KEY (sender_id) REFERENCES Users(user_id) ON DELETE CASCADE,
            FOREIGN KEY (receiver_id) REFERENCES Users(user_id) ON DELETE CASCADE
        )`, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

// دالة تهيئة قاعدة البيانات
const initializeDatabase = async () => {
    try {
        await createTables();
        console.log('تم إنشاء جميع الجداول بنجاح');
        
        // إنشاء أدمن افتراضي إذا لم يكن موجوداً
        const bcrypt = require('bcrypt');
        const adminEmail = 'admin@pulsacademy.com';
        // FIX: Added the second argument (salt rounds) to bcrypt.hash
        const adminPassword = await bcrypt.hash(process.env.ADMIN_DEFAULT_PASSWORD, 10);
        
        db.run(`INSERT OR IGNORE INTO Users (name, email, password_hash, role, college, gender) 
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Admin', adminEmail, adminPassword, 'admin', 'pharmacy', 'male']);
        
        console.log('تم تهيئة قاعدة البيانات بنجاح');
    } catch (error) {
        console.error('خطأ في تهيئة قاعدة البيانات:', error);
        throw error;
    }
};


// تصدير قاعدة البيانات ودالة التهيئة
module.exports = {
    db,
    initializeDatabase,
};
