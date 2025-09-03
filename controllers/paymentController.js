// puls-academy-backend/controllers/paymentController.js

const Payment = require('../models/Payment');
const Enrollment = require('../models/Enrollment');
const Notification = require('../models/Notification');
const Course = require('../models/Course'); 
const path = require('path');
const fs = require('fs');

class PaymentController {
    // Create a new payment request
    static async createPayment(req, res) {
        try {
            const user_id = req.user.user_id;
            const { course_id, amount, method } = req.body;
            
            if (!req.file) {
                return res.status(400).json({ error: 'صورة إثبات الدفع مطلوبة.' });
            }
            
            // ✅ FIX: The path stored in the database should be a URL path, not a local file system path.
            const screenshot_path = `/uploads/${req.file.filename}`;

            // The rest of your validation logic...
            const existingEnrollment = await Enrollment.findByUserAndCourse(user_id, course_id);
            if (existingEnrollment) {
                 fs.unlinkSync(req.file.path); // Use req.file.path to delete the temporary local file
                 return res.status(400).json({ error: 'أنت مسجل بالفعل في هذا الكورس.' });
            }

            const paymentData = { user_id, course_id, amount, method, screenshot_path };
            const payment = await Payment.create(paymentData);

            // Notification logic...
            await Notification.create({
                user_id: 1, // Admin's ID
                message: `طلب دفع جديد من الطالب ${req.user.name} لكورس رقم ${course_id}`
            });

            res.status(201).json(payment);
        } catch (error) {
            console.error('Error creating payment:', error);
            if (req.file) {
                 fs.unlinkSync(req.file.path);
            }
            res.status(500).json({ error: 'حدث خطأ أثناء معالجة طلب الدفع.' });
        }
    }


    // Get all payments (for admin)
    static async getAllPayments(req, res) {
        try {
            // FIX: Changed from findAll to getAll to match the model
            const payments = await Payment.getAll();
            res.json(payments);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    
    // Get pending payments (for admin)
    static async getPendingPayments(req, res) {
        try {
            // FIX: Changed from findPending to getPending to match the model
            const payments = await Payment.getPending();
            res.json({ payments }); // FIX: Wrap response in an object as the frontend expects
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    
    // ✨ --- START: THIS IS THE CORRECTED FUNCTION --- ✨
    // Get payments for the currently logged-in student
    static async getStudentPayments(req, res) {
        try {
            const studentId = req.user.user_id; // Get ID from the authenticated user
            // Corrected function call from findByUserId to getByUser
            const payments = await Payment.getByUser(studentId);
            res.json({ payments }); // The response now correctly wraps the array in an object
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    // ✨ --- END: THE FUNCTION IS NOW CORRECT --- ✨

    // Update payment status (for admin)
    static async updatePaymentStatus(req, res) {
        try {
            const { paymentId } = req.params;
            const { status } = req.body;
            
            const updatedPayment = await Payment.updateStatus(paymentId, status);
            const payment = await Payment.findById(paymentId);
            
            if (status === 'approved') {
                 await Enrollment.create({
                    user_id: payment.user_id,
                    course_id: payment.course_id,
                    payment_id: paymentId,
                    status: 'active'
                });
                await Notification.create({
                    user_id: payment.user_id,
                    message: 'تم قبول طلب الدفع الخاص بك. يمكنك الآن الوصول للكورس.'
                });
            } else if (status === 'rejected') {
                 await Notification.create({
                    user_id: payment.user_id,
                    message: 'تم رفض طلب الدفع الخاص بك. يرجى مراجعة البيانات وإعادة المحاولة.'
                });
            }
            
            res.json(updatedPayment);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = PaymentController;