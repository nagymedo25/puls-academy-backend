// puls-academy-backend/routes/courseRoutes.js

const express = require('express');
const router = express.Router();
const CourseController = require('../controllers/courseController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { adminMiddleware } = require('../middlewares/adminMiddleware');
// لم نعد بحاجة لـ uploadMiddleware هنا
// const { uploadMiddleware } = require('../middlewares/uploadMiddleware');

// --- Public Routes ---
router.get('/', CourseController.getAllCourses);
// ... (باقي المسارات العامة كما هي)
router.get('/:courseId/preview', CourseController.getPreviewLesson);

// --- Student Routes (Authenticated) ---
router.get('/available', authMiddleware, CourseController.getAvailableCourses);
router.get('/:courseId/lessons', authMiddleware, CourseController.getCourseLessons);
router.get('/:courseId/lessons/:lessonId', authMiddleware, CourseController.getLessonById);

// --- Admin Routes (Authenticated & Admin) ---
// <<<--- تعديل: تمت إزالة uploadMiddleware ---
router.post('/', authMiddleware, adminMiddleware, CourseController.createCourse);

// <<<--- تعديل: تمت إزالة uploadMiddleware ---
router.put('/:courseId', authMiddleware, adminMiddleware, CourseController.updateCourse);

router.delete('/:courseId', authMiddleware, adminMiddleware, CourseController.deleteCourse);

// <<<--- تعديل: تمت إزالة uploadMiddleware ---
router.post(
    '/:courseId/lessons',
    authMiddleware,
    adminMiddleware,
    CourseController.addLessonToCourse
);


module.exports = router;