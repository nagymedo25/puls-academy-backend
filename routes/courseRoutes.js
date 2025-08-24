// puls-academy-backend/routes/courseRoutes.js

const express = require('express');
const router = express.Router();
const CourseController = require('../controllers/courseController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { adminMiddleware } = require('../middlewares/adminMiddleware'); // Make sure this is imported
const { uploadMiddleware } = require('../middlewares/uploadMiddleware');

// --- Public Routes ---
router.get('/', CourseController.getAllCourses);
router.get('/search', CourseController.searchCourses);
router.get('/stats', CourseController.getCourseStats);
router.get('/top-selling', CourseController.getTopSellingCourses);
router.get('/:courseId', CourseController.getCourseById);
router.get('/:courseId/preview', CourseController.getPreviewLesson);

// --- Student Routes (Authenticated) ---
router.get('/available', authMiddleware, CourseController.getAvailableCourses);
router.get('/:courseId/lessons', authMiddleware, CourseController.getCourseLessons);
router.get('/:courseId/lessons/:lessonId', authMiddleware, CourseController.getLessonById);

// --- Admin Routes (Authenticated & Admin) ---
// تم إزالة uploadMiddleware من هنا، حيث سيتم إدخال الرابط يدويًا
router.post('/', authMiddleware, adminMiddleware, CourseController.createCourse);
// تم إزالة uploadMiddleware من هنا، حيث سيتم إدخال الرابط يدويًا
router.put('/:courseId', authMiddleware, adminMiddleware, CourseController.updateCourse);
router.delete('/:courseId', authMiddleware, adminMiddleware, CourseController.deleteCourse);

// --- NEW ROUTE TO ADD ---
// تم تعديل هذا المسار ليقبل صورة مصغرة فقط
router.post(
    '/:courseId/lessons',
    authMiddleware,
    adminMiddleware,
    // تغيير fields إلى single وقبول الصورة المصغرة فقط
    uploadMiddleware.single('thumbnail'),
    CourseController.addLessonToCourse
);


module.exports = router;