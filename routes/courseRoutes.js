// puls-academy-backend/routes/courseRoutes.js

const express = require('express');
const router = express.Router();
const CourseController = require('../controllers/courseController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { adminMiddleware } = require('../middlewares/adminMiddleware');
const { validateCourseCreation } = require('../middlewares/validationMiddleware');


// --- Public Routes ---
router.get('/', CourseController.getAllCourses);
router.get('/:courseId', CourseController.getCourseById);
router.get('/:courseId/preview', CourseController.getPreviewLesson);
router.get('/:courseId/lessons', CourseController.getCourseLessons);


// --- Student Routes (Authenticated) ---
router.get('/available', authMiddleware, CourseController.getAvailableCourses);
router.get('/:courseId/lessons/:lessonId', authMiddleware, CourseController.getLessonById);

// --- Admin Routes (Authenticated & Admin) ---
router.post('/', authMiddleware, adminMiddleware, validateCourseCreation, CourseController.createCourse);
router.put('/:courseId', authMiddleware, adminMiddleware, validateCourseCreation, CourseController.updateCourse);
router.delete('/:courseId', authMiddleware, adminMiddleware, CourseController.deleteCourse);

// ✨ START: تعديلات مسارات الدروس ✨
// إضافة درس جديد لكورس
router.post('/:courseId/lessons', authMiddleware, adminMiddleware, CourseController.addLessonToCourse);
// جلب دروس كورس معين (للأدمن)
router.get('/:courseId/lessons-admin', authMiddleware, adminMiddleware, CourseController.getAdminCourseLessons);
// حذف درس معين
router.delete('/lessons/:lessonId', authMiddleware, adminMiddleware, CourseController.deleteLesson);
// ✨ END: نهاية تعديلات مسارات الدروس ✨


module.exports = router;