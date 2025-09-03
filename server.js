// --- استيراد الحزم الأساسية ---
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// --- استيراد المكونات المخصصة ---
const { initializeDatabase } = require('./config/db');
const errorHandler = require('./utils/errorHandler'); // استيراد معالج الأخطاء المخصص

// --- استيراد المسارات (Routes) ---
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const messageRoutes = require('./routes/messageRoutes');

// --- تهيئة التطبيق ---
dotenv.config();
const app = express();

// --- إعدادات الأمان والوسيط (Security & Middlewares) ---

// ١. إعدادات سياسة مشاركة الموارد عبر المصادر (CORS)
const corsOptions = {
  // تحديد مصدر الواجهة الأمامية الموثوق به
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  // السماح بإرسال بيانات الاعتماد (مثل الكوكيز)
  credentials: true,
};
app.use(cors(corsOptions));

// ٢. تطبيق حماية Helmet (يضيف هيدرات أمان مهمة)
app.use(
  helmet({
    // ✨ التعديل الرئيسي هنا
    // هذا الإعداد يسمح للواجهة الأمامية بتحميل الصور من هذا الخادم
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// ٣. تحليل جسم الطلبات (JSON و URL-encoded)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ٤. تحليل الكوكيز القادمة مع الطلبات
app.use(cookieParser());

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // ✨ تم التعديل: نافذة زمنية لدقيقة واحدة
  max: 150, 
  standardHeaders: true, 
  legacyHeaders: false, 
  message: { error: 'طلبات كثيرة جدًا من هذا الـ IP، يرجى المحاولة مرة أخرى بعد دقيقة واحدة' }, // ✨ تم تعديل الرسالة
});
// تطبيق المحدد على جميع المسارات التي تبدأ بـ /api/
app.use('/api/', apiLimiter);


// --- خدمة الملفات الثابتة ---
// لخدمة الصور المرفوعة (مثل إيصالات الدفع)
app.use('/uploads', express.static(path.join(__dirname, 'temp_uploads')));

// --- مسارات الـ API الرئيسية ---
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);

// --- مسار افتراضي لاختبار حالة الخادم ---
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Puls Academy API',
    status: 'Running successfully',
    version: '1.0.0'
  });
});

// --- معالجة الأخطاء (Error Handling) ---

// معالج الأخطاء 404 (يجب أن يكون بعد جميع المسارات)
app.use((req, res, next) => {
  res.status(404).json({ error: 'المسار المطلوب غير موجود' });
});

// معالج الأخطاء العام (يجب أن يكون آخر middleware)
app.use(errorHandler);


// --- تشغيل الخادم ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);

  // تهيئة قاعدة البيانات عند بدء التشغيل
  try {
    await initializeDatabase();
    console.log('Database is ready for use');
  } catch (error) {
    console.error('Failed to initialize the database:', error);
    // إنهاء العملية إذا فشلت تهيئة قاعدة البيانات
    process.exit(1);
  }
});

