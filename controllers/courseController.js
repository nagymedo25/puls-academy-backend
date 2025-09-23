// puls-academy-backend/controllers/courseController.js

const Course = require("../models/Course");
const Lesson = require("../models/Lesson");
const Enrollment = require("../models/Enrollment");
// تم حذف الدوال الخاصة بـ Google Drive لأنها لم تعد ضرورية

class CourseController {
 static async getAllCourses(req, res) {
    try {
      // ✨ --- START: THE FIX --- ✨
      // تم تجاهل college_type هنا عمداً
      const { category, pharmacy_type, min_price, max_price, limit, offset } = req.query;

      const filters = {};
      if (category) filters.category = category;
      if (pharmacy_type) filters.pharmacy_type = pharmacy_type;
      // ✨ --- END: THE FIX --- ✨
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
      // ✨ --- START: THE FIX --- ✨
      const {
        title,
        description,
        category,
        college_type,
        pharmacy_type, // This was missing
        price,
        preview_url,
        thumbnail_url,
      } = req.body;

      const course = await Course.create({
        title,
        description,
        category,
        college_type,
        pharmacy_type, // Added it here
        price: parseFloat(price),
        preview_url: preview_url,
        thumbnail_url: thumbnail_url,
      });
      // ✨ --- END: THE FIX --- ✨

      res.status(201).json({ message: "تم إنشاء الكورس بنجاح", course });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateCourse(req, res) {
    try {
      const { courseId } = req.params;
      const courseDataToUpdate = { ...req.body };

      // ✨ تعديل: التحقق من وجود السعر بشكل صحيح للسماح بالقيمة 0
      if (
        courseDataToUpdate.price !== undefined &&
        courseDataToUpdate.price !== ""
      ) {
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

      if (!user) {
        return res.status(401).json({ error: "المستخدم غير مصادق عليه." });
      }

      const enrollment = await Enrollment.findByUserAndCourse(
        user.user_id, // <-- هذا هو الاستخدام الصحيح
        courseId
      );
      if (!enrollment || enrollment.status !== "active") {
        return res
          .status(403)
          .json({ error: "ليس لديك صلاحية الوصول لدروس هذا الكورس." });
      }

      const lessons = await Lesson.getByCourseId(courseId, user);
      res.json({ lessons });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

    static async updateLesson(req, res) {
    try {
      const { lessonId } = req.params;
      const lessonDataToUpdate = { ...req.body };

      const updatedLesson = await Lesson.update(lessonId, lessonDataToUpdate);

      res.json({ message: "تم تحديث الدرس بنجاح", lesson: updatedLesson });
    } catch (error) {
      res.status(400).json({ error: error.message });
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
      const { title, description, video_url } = req.body; // ✨ إضافة

      if (!title || !video_url) { /* ... */ }

      const newLesson = await Lesson.create({
        course_id: parseInt(courseId),
        title,
        description, // ✨ إضافة
        video_url: video_url,
      });

      res
        .status(201)
        .json({ message: "تمت إضافة الدرس بنجاح", lesson: newLesson });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
  // ✨ دالة جديدة لجلب دروس كورس معين للأدمن ✨
  static async getAdminCourseLessons(req, res) {
    try {
      const { courseId } = req.params;
      // لا نحتاج لتمرير المستخدم لأن الأدمن يمكنه رؤية كل الدروس
      const lessons = await Lesson.getByCourseId(courseId);
      res.json({ lessons });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // ✨ دالة جديدة لحذف درس معين ✨
  static async deleteLesson(req, res) {
    try {
      const { lessonId } = req.params;
      const result = await Lesson.delete(lessonId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = CourseController;
