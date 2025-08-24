// puls-academy-backend/controllers/courseController.js

const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Enrollment = require('../models/Enrollment');
const { uploadFile } = require('../config/storage');

class CourseController {
    // ... (keep all existing functions like getAllCourses, createCourse, etc.) ...

    static async getAllCourses(req, res) {
        // ... (existing code)
    }

    static async getCourseById(req, res) {
        // ... (existing code)
    }

    static async getAvailableCourses(req, res) {
        // ... (existing code)
    }

    static async createCourse(req, res) {
        // ... (existing code)
    }

    static async updateCourse(req, res) {
        // ... (existing code)
    }

    static async deleteCourse(req, res) {
        // ... (existing code)
    }

    static async getCourseLessons(req, res) {
        // ... (existing code)
    }

    static async getPreviewLesson(req, res) {
        // ... (existing code)
    }

    static async getLessonById(req, res) {
        // ... (existing code)
    }

    static async searchCourses(req, res) {
        // ... (existing code)
    }

    static async getCourseStats(req, res) {
        // ... (existing code)
    }

    static async getTopSellingCourses(req, res) {
        // ... (existing code)
    }


    // --- NEW FUNCTION TO ADD ---
    /**
     * Handles adding a new lesson to an existing course.
     * Requires admin authentication.
     */
    static async addLessonToCourse(req, res) {
        try {
            const { courseId } = req.params;
            const { title, order_index } = req.body;

            // FIX: Check for req.files instead of req.file
            // req.files will contain { video: [...], thumbnail: [...] }
            if (!title || !req.files || !req.files.video || !req.files.thumbnail) {
                return res.status(400).json({ error: 'عنوان الدرس، ملف الفيديو، والصورة المصغرة مطلوبان' });
            }

            // 1. Upload both the video and the thumbnail to MEGA
            const videoFile = req.files.video[0];
            const thumbnailFile = req.files.thumbnail[0];

            const videoUploadResult = await uploadFile(videoFile);
            const thumbnailUploadResult = await uploadFile(thumbnailFile);
            
            const video_url = videoUploadResult.url;
            const thumbnail_url = thumbnailUploadResult.url;

            // 2. Create the lesson record in the database with both URLs
            const newLesson = await Lesson.create({
                course_id: parseInt(courseId),
                title,
                video_url,
                thumbnail_url, // Save the new thumbnail URL
                order_index: parseInt(order_index) || 0,
                is_preview: false
            });

            res.status(201).json({
                message: 'تمت إضافة الدرس بنجاح',
                lesson: newLesson
            });

        } catch (error) {
            console.error('Error adding lesson to course:', error);
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = CourseController;
