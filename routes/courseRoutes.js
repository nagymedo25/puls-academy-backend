// puls-academy-backend/routes/courseRoutes.js// puls-academy-backend/routes/courseRoutes.js

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
router.post('/', authMiddleware, adminMiddleware, uploadMiddleware.single('preview'), CourseController.createCourse);
router.put('/:courseId', authMiddleware, adminMiddleware, uploadMiddleware.single('preview'), CourseController.updateCourse);
router.delete('/:courseId', authMiddleware, adminMiddleware, CourseController.deleteCourse);

// --- NEW ROUTE TO ADD ---
// This route handles adding a new lesson to a specific course.
router.post(
    '/:courseId/lessons',
    authMiddleware,
    adminMiddleware,
    uploadMiddleware.fields([
        { name: 'video', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 }
    ]),
    CourseController.addLessonToCourse
);


module.exports = router;
