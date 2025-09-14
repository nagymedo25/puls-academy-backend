// --- تهيئة التطبيق ---
const dotenv = require('dotenv');
const express = require('express');

dotenv.config();
const app = express();

// --- استيراد الحزم الأساسية ---
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// --- استيراد المكونات المخصصة ---
const { initializeDatabase } = require('./config/db');
const errorHandler = require('./utils/errorHandler');

// --- استيراد المسارات (Routes) ---
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const messageRoutes = require('./routes/messageRoutes');



// --- إعدادات الأمان والوسيط (Security & Middlewares) ---
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));

// ✨ --- START: Security Update for Cloudinary --- ✨
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "res.cloudinary.com"], // Allow images from self and cloudinary.com
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
// ✨ --- END: Security Update for Cloudinary --- ✨

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'طلبات كثيرة جدًا من هذا الـ IP، يرجى المحاولة مرة أخرى بعد دقيقة واحدة' },
});
app.use('/api/', apiLimiter);

// --- مسارات الـ API الرئيسية ---
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Puls Academy API',
    status: 'Running successfully',
    version: '1.0.0'
  });
});

// --- معالجة الأخطاء (Error Handling) ---
app.use((req, res, next) => {
  res.status(404).json({ error: 'المسار المطلوب غير موجود' });
});

app.use(errorHandler);

// --- تشغيل الخادم ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  try {
    await initializeDatabase();
    console.log('Database is ready for use');
  } catch (error) {
    console.error('Failed to initialize the database:', error);
    process.exit(1);
  }
});

