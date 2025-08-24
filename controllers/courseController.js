// puls-academy-backend/controllers/courseController.js

const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Enrollment = require('../models/Enrollment');
const Payment = require('../models/Payment');
const { uploadFile } = require('../config/storage');
const fs = require('fs');
const util = require('util');

// Promisify fs functions to use them with async/await
const readFile = util.promisify(fs.readFile);
const unlinkFile = util.promisify(fs.unlink);

class CourseController {
    static async getAllCourses(req, res) {
        try {
            const { category, college_type, min_price, max_price, limit, offset } = req.query;
            
            const filters = {};
            if (category) filters.category = category;
            if (college_type) filters.college_type = college_type;
            if (min_price) filters.min_price = parseFloat(min_price);
            if (max_price) filters.max_price = parseFloat(max_price);
            if (limit) filters.limit = parseInt(limit);
            if (offset) filters.offset = parseInt(offset);
            
            const courses = await Course.getAll(filters);
            res.json({ courses });
            
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    
    static async getCourseById(req, res) {
        try {
            const { courseId } = req.params;
            const course = await Course.findById(courseId);
            res.json({ course });
            
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    }
    
    static async getAvailableCourses(req, res) {
        try {
            const courses = await Course.getAvailableForUser(req.user);
            res.json({ courses });
            
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    
    static async createCourse(req, res) {
        let tempFilePath = null;
        try {
            const { title, description, category, college_type, price } = req.body;
            let preview_url = null;

            if (req.file) {
                tempFilePath = req.file.path;
                const buffer = await readFile(tempFilePath);
                const fileToUpload = { originalname: req.file.originalname, buffer };
                
                const uploadResult = await uploadFile(fileToUpload);
                preview_url = uploadResult.url;

                await unlinkFile(tempFilePath); // Clean up the temporary file
                tempFilePath = null;
            }
            
            const course = await Course.create({ title, description, category, college_type, price: parseFloat(price), preview_url });
            
            res.status(201).json({ message: 'تم إنشاء الكورس بنجاح', course });
            
        } catch (error) {
            if (tempFilePath) {
                try { await unlinkFile(tempFilePath); } catch (e) { console.error("Error cleaning up temp file:", e); }
            }
            res.status(400).json({ error: error.message });
        }
    }
    
    static async updateCourse(req, res) {
        let tempFilePath = null;
        try {
            const { courseId } = req.params;
            const { title, description, category, college_type, price } = req.body;
            
            const courseData = {};
            if (title !== undefined) courseData.title = title;
            if (description !== undefined) courseData.description = description;
            if (category !== undefined) courseData.category = category;
            if (college_type !== undefined) courseData.college_type = college_type;
            if (price !== undefined) courseData.price = parseFloat(price);
            
            if (req.file) {
                tempFilePath = req.file.path;
                const buffer = await readFile(tempFilePath);
                const fileToUpload = { originalname: req.file.originalname, buffer };

                const uploadResult = await uploadFile(fileToUpload);
                courseData.preview_url = uploadResult.url;

                await unlinkFile(tempFilePath);
                tempFilePath = null;
            }
            
            const updatedCourse = await Course.update(courseId, courseData);
            
            res.json({
                message: 'تم تحديث الكورس بنجاح',
                course: updatedCourse
            });
            
        } catch (error) {
            if (tempFilePath) {
                try { await unlinkFile(tempFilePath); } catch (e) { console.error("Error cleaning up temp file:", e); }
            }
            res.status(400).json({ error: error.message });
        }
    }
    
    static async deleteCourse(req, res) {
        try {
            const { courseId } = req.params;
            await Lesson.deleteByCourseId(courseId);
            await Enrollment.deleteByCourse(courseId);
            const result = await Course.delete(courseId);
            
            res.json(result);
            
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    
    static async getCourseLessons(req, res) {
        try {
            const { courseId } = req.params;
            const user = req.user;
            
            const lessons = await Lesson.getByCourseId(courseId, user);
            res.json({ lessons });
            
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    
    static async getPreviewLesson(req, res) {
        try {
            const { courseId } = req.params;
            const lesson = await Lesson.getPreviewLesson(courseId);
            
            if (!lesson) {
                return res.status(404).json({ error: 'لا يوجد درس معاينة لهذا الكورس' });
            }
            
            res.json({ lesson });
            
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    }
    
    static async getLessonById(req, res) {
        try {
            const { lessonId } = req.params;
            const lesson = await Lesson.checkAccess(req.user, lessonId);
            res.json({ lesson });
            
        } catch (error) {
            res.status(403).json({ error: error.message });
        }
    }
    
    static async searchCourses(req, res) {
        try {
            const { q, category, college_type, limit } = req.query;
            
            if (!q) {
                return res.status(400).json({ error: 'كلمة البحث مطلوبة' });
            }
            
            const filters = {};
            if (category) filters.category = category;
            if (college_type) filters.college_type = college_type;
            if (limit) filters.limit = parseInt(limit);
            
            const courses = await Course.search(q, filters);
            res.json({ courses });
            
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    
    static async getCourseStats(req, res) {
        try {
            const stats = await Course.getStats();
            res.json({ stats });
            
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    
    static async getTopSellingCourses(req, res) {
        try {
            const { limit = 10 } = req.query;
            const courses = await Course.getTopSelling(parseInt(limit));
            res.json({ courses });
            
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async addLessonToCourse(req, res) {
        let tempVideoPath = null;
        let tempThumbnailPath = null;
        try {
            const { courseId } = req.params;
            const { title, order_index } = req.body;

            if (!title || !req.files || !req.files.video || !req.files.thumbnail) {
                return res.status(400).json({ error: 'عنوان الدرس، ملف الفيديو، والصورة المصغرة مطلوبان' });
            }

            const videoFile = req.files.video[0];
            const thumbnailFile = req.files.thumbnail[0];
            tempVideoPath = videoFile.path;
            tempThumbnailPath = thumbnailFile.path;

            // Process video
            const videoBuffer = await readFile(tempVideoPath);
            const videoToUpload = { originalname: videoFile.originalname, buffer: videoBuffer };
            const videoUploadResult = await uploadFile(videoToUpload);
            await unlinkFile(tempVideoPath);
            tempVideoPath = null;

            // Process thumbnail
            const thumbnailBuffer = await readFile(tempThumbnailPath);
            const thumbnailToUpload = { originalname: thumbnailFile.originalname, buffer: thumbnailBuffer };
            const thumbnailUploadResult = await uploadFile(thumbnailToUpload);
            await unlinkFile(tempThumbnailPath);
            tempThumbnailPath = null;

            const newLesson = await Lesson.create({
                course_id: parseInt(courseId),
                title,
                video_url: videoUploadResult.url,
                thumbnail_url: thumbnailUploadResult.url,
                order_index: parseInt(order_index) || 0,
                is_preview: false
            });

            res.status(201).json({ message: 'تمت إضافة الدرس بنجاح', lesson: newLesson });

        } catch (error) {
            if (tempVideoPath) { try { await unlinkFile(tempVideoPath); } catch(e) {} }
            if (tempThumbnailPath) { try { await unlinkFile(tempThumbnailPath); } catch(e) {} }
            console.error('Error adding lesson to course:', error);
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = CourseController;
