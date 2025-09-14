// puls-academy-backend/controllers/paymentController.js

const Payment = require("../models/Payment");
const Enrollment = require("../models/Enrollment");
const Notification = require("../models/Notification");
const Course = require("../models/Course");
const { deleteFile } = require('../config/storage'); // Import the new delete function

class PaymentController {
  static async createPayment(req, res) {
    try {
      const { course_id, amount, method } = req.body;
      const user_id = req.user.user_id;

      if (!course_id || !amount || !method) {
        return res.status(400).json({ error: "جميع الحقول مطلوبة" });
      }

      // Check if a file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: "صورة الإيصال مطلوبة" });
      }

      // Get the secure URL and public ID from the uploaded file (provided by Cloudinary)
      const screenshot_url = req.file.path;
      const screenshot_public_id = req.file.filename;

      const payment = await Payment.create({
        user_id,
        course_id: parseInt(course_id),
        amount: parseFloat(amount),
        method,
        screenshot_url,
        screenshot_public_id, // Save the public ID
      });

      const course = await Course.findById(course_id);
      await Notification.createPaymentPending(user_id, course.title);

      res.status(201).json({ message: "تم إرسال طلب الدفع بنجاح", payment });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
  static async approvePayment(req, res) {
    try {
      const { paymentId } = req.params;
      
      const paymentToProcess = await Payment.findById(paymentId);
      if (!paymentToProcess) {
          return res.status(404).json({ error: "طلب الدفع غير موجود" });
      }

      await Payment.approve(paymentId);
      const updatedPayment = await Payment.findById(paymentId);

      await Enrollment.create({
        user_id: updatedPayment.user_id,
        course_id: updatedPayment.course_id,
        payment_id: updatedPayment.payment_id,
        status: "active",
      });
      await Notification.createPaymentApproved(
        updatedPayment.user_id,
        updatedPayment.course_title
      );

      // Delete the image from Cloudinary using its public ID
      if (paymentToProcess.screenshot_public_id) {
        await deleteFile(paymentToProcess.screenshot_public_id);
      }

      res.json({
        message: "تم اعتماد الدفع بنجاح",
        payment: updatedPayment,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async rejectPayment(req, res) {
    try {
      const { paymentId } = req.params;
      
      const paymentToProcess = await Payment.findById(paymentId);
      if (!paymentToProcess) {
        return res.status(404).json({ error: "طلب الدفع غير موجود" });
      }

      const payment = await Payment.reject(paymentId);

      await Notification.createPaymentRejected(
        payment.user_id,
        payment.course_title
      );

      // Delete the image from Cloudinary using its public ID
      if (paymentToProcess.screenshot_public_id) {
        await deleteFile(paymentToProcess.screenshot_public_id);
      }

      res.json({
        message: "تم رفض الدفع",
        payment,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

    static async getPayments(req, res) {
    try {
      const { status, user_id, course_id, method, limit, offset } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (user_id) filters.user_id = parseInt(user_id);
      if (course_id) filters.course_id = parseInt(course_id);
      if (method) filters.method = method;
      if (limit) filters.limit = parseInt(limit);
      if (offset) filters.offset = parseInt(offset);

      const payments = await Payment.getAll(filters);
      res.json({ payments });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getPaymentById(req, res) {
    try {
      const { paymentId } = req.params;
      const payment = await Payment.findById(paymentId);
      res.json({ payment });
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  static async getUserPayments(req, res) {
    try {
      const userId = req.user.user_id;
      const payments = await Payment.getByUser(userId);
      res.json({ payments });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getPendingPayments(req, res) {
    try {
      const payments = await Payment.getPending();
      res.json({ payments });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
    static async getPaymentStats(req, res) {
    try {
      const stats = await Payment.getStats();
      res.json({ stats });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deletePayment(req, res) {
    try {
      const { paymentId } = req.params;
      const paymentToDelete = await Payment.findById(paymentId);
      if (paymentToDelete && paymentToDelete.screenshot_public_id) {
          await deleteFile(paymentToDelete.screenshot_public_id);
      }
      const result = await Payment.delete(paymentId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = PaymentController;