// puls-academy-backend/routes/courseRoutes.js

const express = require('express');
const router = express.Router();
const CourseController = require('../controllers/courseController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { adminMiddleware } = require('../middlewares/adminMiddleware');
const { validateCourseCreation } = require('../middlewares/validationMiddleware');


// --- Public Routes ---
router.get('/', CourseController.getAllCourses);
router.get('/:courseId', CourseController.getCourseById); // <-- ✨ (يفضل إضافة هذا المسار ليعمل الكود بشكل صحيح)
router.get('/:courseId/preview', CourseController.getPreviewLesson);
// ✨ الخطوة 1: انقل هذا السطر إلى هنا واجعل المسار عامًا
router.get('/:courseId/lessons', CourseController.getCourseLessons);


// --- Student Routes (Authenticated) ---
router.get('/available', authMiddleware, CourseController.getAvailableCourses);
// ✨ الخطوة 2: تم حذف السطر من هنا
router.get('/:courseId/lessons/:lessonId', authMiddleware, CourseController.getLessonById);

// --- Admin Routes (Authenticated & Admin) ---
router.post('/', authMiddleware, adminMiddleware, validateCourseCreation, CourseController.createCourse);
router.put('/:courseId', authMiddleware, adminMiddleware, CourseController.updateCourse);
router.delete('/:courseId', authMiddleware, adminMiddleware, CourseController.deleteCourse);
router.post(
    '/:courseId/lessons',
    authMiddleware,
    adminMiddleware,
    CourseController.addLessonToCourse
);


module.exports = router;