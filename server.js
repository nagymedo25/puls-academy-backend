// استيراد الحزم الأساسية
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// استيراد المسارات
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const messageRoutes = require('./routes/messageRoutes'); // ✨ إضافة مسارات الرسائل


// استيراد إعدادات قاعدة البيانات
const { initializeDatabase } = require('./config/db');

// تحميل متغيرات البيئة
dotenv.config();

// إنشاء تطبيق Express
const app = express();

// إعدادات الوسيط (Middleware)
app.use(cors()); // للسماح بالطلبات من الواجهة الأمامية
app.use(express.json()); // لتحليل JSON في الطلبات
app.use(express.urlencoded({ extended: true })); // لتحليل بيانات النماذج

// خدمة الملفات الثابتة (مثل الصور والفيديوهات من Google Cloud)
app.use('/uploads', express.static(path.join(__dirname, 'temp_uploads')));

// مسارات API
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes); // ✨ استخدام مسارات الرسائل

// مسار رئيسي لاختبار الخادم
app.get('/', (req, res) => {
    res.json({ 
        message: 'Welcome to Puls Academy API',
        status: 'Running successfully',
        version: '1.0.0'
    });
});

// معالجة الأخطاء 404
app.use((req, res, next) => {
    res.status(404).json({ error: 'Page not found' });
});

// معالجة الأخطاء العامة
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Server error occurred' });
});

// منفذ الخادم
const PORT = process.env.PORT || 5000;

// بدء الخادم
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    
    // تهيئة قاعدة البيانات
    try {
        await initializeDatabase();
        console.log('Database is ready for use');
    } catch (error) {
        console.error('Failed to initialize the database:', error);
    }
});