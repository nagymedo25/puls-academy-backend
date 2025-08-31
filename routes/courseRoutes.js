// puls-academy-backend/routes/courseRoutes.js

const express = require('express');
const router = express.Router();
const CourseController = require('../controllers/courseController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { adminMiddleware } = require('../middlewares/adminMiddleware');
const { validateCourseCreation } = require('../middlewares/validationMiddleware');

// --- Student Routes (Authenticated) ---
router.get('/available', authMiddleware, CourseController.getAvailableCourses);
router.get('/:courseId/lessons/:lessonId', authMiddleware, CourseController.getLessonById);

// --- Public Routes ---
router.get('/', CourseController.getAllCourses);
router.get('/:courseId', CourseController.getCourseById);
router.get('/:courseId/preview', CourseController.getPreviewLesson);

// ✨ تم تعديل هذا المسار ليكون خاصاً بالطلاب المشتركين فقط ويحتاج لمصادقة
router.get('/:courseId/lessons', authMiddleware, CourseController.getCourseLessons);

// --- Admin Routes (Authenticated & Admin) ---
router.post('/', authMiddleware, adminMiddleware, validateCourseCreation, CourseController.createCourse);
router.put('/:courseId', authMiddleware, adminMiddleware, validateCourseCreation, CourseController.updateCourse);
router.delete('/:courseId', authMiddleware, adminMiddleware, CourseController.deleteCourse);
router.post('/:courseId/lessons', authMiddleware, adminMiddleware, CourseController.addLessonToCourse);
router.get('/:courseId/lessons-admin', authMiddleware, adminMiddleware, CourseController.getAdminCourseLessons);
router.delete('/lessons/:lessonId', authMiddleware, adminMiddleware, CourseController.deleteLesson);

module.exports = router;