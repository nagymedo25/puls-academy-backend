// puls-academy-backend/controllers/courseController.js

const Course = require("../models/Course");
const Lesson = require("../models/Lesson");
const Enrollment = require("../models/Enrollment");
const { isValidVideoUrl, convertGoogleDriveLink } = require("../utils/helpers");

class CourseController {
  static async getAllCourses(req, res) {
    try {
      const { category, college_type, min_price, max_price, limit, offset } =
        req.query;

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
    try {
      const { title, description, category, college_type, price, preview_url, thumbnail_url } = req.body;

      // ✨ التعديل: تحويل رابط الفيديو فقط
      const directPreviewUrl = convertGoogleDriveLink(preview_url);

      if (!(await isValidVideoUrl(directPreviewUrl))) {
        return res.status(400).json({ error: "رابط فيديو المعاينة غير صالح أو لا يمكن الوصول إليه" });
      }

      const course = await Course.create({
        title,
        description,
        category,
        college_type,
        price: parseFloat(price),
        preview_url: directPreviewUrl, // استخدام الرابط المحوّل
        thumbnail_url: thumbnail_url,  // استخدام رابط الصورة كما هو
      });

      res.status(201).json({ message: "تم إنشاء الكورس بنجاح", course });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateCourse(req, res) {
    try {
      const { courseId } = req.params;
      const courseDataToUpdate = { ...req.body };

      // ✨ التعديل: إذا كان رابط الفيديو موجودًا في الطلب، قم بتحويله
      if (courseDataToUpdate.preview_url) {
        const directUrl = convertGoogleDriveLink(courseDataToUpdate.preview_url);
        if (!(await isValidVideoUrl(directUrl))) {
          return res.status(400).json({ error: "رابط فيديو المعاينة غير صالح" });
        }
        courseDataToUpdate.preview_url = directUrl;
      }
      
      // رابط الصورة المصغرة يتم تحديثه كما هو بدون تحويل
      if (courseDataToUpdate.price) {
          courseDataToUpdate.price = parseFloat(courseDataToUpdate.price);
      }

      const updatedCourse = await Course.update(courseId, courseDataToUpdate);

      res.json({ message: "تم تحديث الكورس بنجاح", course: updatedCourse });
    } catch (error) {
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
        return res
          .status(404)
          .json({ error: "لا يوجد درس معاينة لهذا الكورس" });
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
        return res.status(400).json({ error: "كلمة البحث مطلوبة" });
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
        try {
            const { courseId } = req.params;
            const { title, order_index, video_url, thumbnail_url } = req.body;

            if (!title || !video_url || !thumbnail_url) {
                return res.status(400).json({ error: "كل الحقول مطلوبة" });
            }
            
            // --- 4. تحويل روابط الدرس تلقائيًا ---
            const directVideoUrl = convertGoogleDriveLink(video_url);
            const directThumbnailUrl = convertGoogleDriveLink(thumbnail_url);

            if (!(await isValidVideoUrl(directVideoUrl))) {
                return res.status(400).json({ error: "رابط الفيديو غير صالح" });
            }
            
            const newLesson = await Lesson.create({
                course_id: parseInt(courseId),
                title,
                video_url: directVideoUrl,
                thumbnail_url: directThumbnailUrl,
                order_index: parseInt(order_index) || 0,
            });

            res.status(201).json({ message: "تمت إضافة الدرس بنجاح", lesson: newLesson });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = CourseController;
