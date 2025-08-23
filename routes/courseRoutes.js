// puls-academy-backend/routes/courseRoutes.js

const express = require('express');
const router = express.Router();
const CourseController = require('../controllers/courseController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { uploadMiddleware } = require('../middlewares/uploadMiddleware');

router.get('/', CourseController.getAllCourses);
router.get('/available', authMiddleware, CourseController.getAvailableCourses);
router.get('/search', CourseController.searchCourses);
router.get('/stats', CourseController.getCourseStats);
router.get('/top-selling', CourseController.getTopSellingCourses);
router.get('/:courseId', CourseController.getCourseById);
router.get('/:courseId/lessons', authMiddleware, CourseController.getCourseLessons);
router.get('/:courseId/preview', CourseController.getPreviewLesson);
router.get('/:courseId/lessons/:lessonId', authMiddleware, CourseController.getLessonById);

router.post('/', authMiddleware, uploadMiddleware.single('preview'), CourseController.createCourse);
router.put('/:courseId', authMiddleware, uploadMiddleware.single('preview'), CourseController.updateCourse);
router.delete('/:courseId', authMiddleware, CourseController.deleteCourse);

module.exports = router;