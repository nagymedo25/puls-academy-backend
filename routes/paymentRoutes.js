// puls-academy-backend/routes/paymentRoutes.js

const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { adminMiddleware } = require('../middlewares/adminMiddleware');
const { uploadMiddleware } = require('../middlewares/uploadMiddleware');

// ✨ --- START: التعديل الرئيسي هنا --- ✨
// تم نقل هذا السطر للأعلى ليتم التعرف عليه أولاً
router.get('/my-payments', authMiddleware, PaymentController.getUserPayments);
// ✨ --- END: التعديل الرئيسي هنا --- ✨

// Admin routes
router.get('/', authMiddleware, adminMiddleware, PaymentController.getPayments);
router.get('/pending', authMiddleware, adminMiddleware, PaymentController.getPendingPayments);
router.get('/stats', authMiddleware, adminMiddleware, PaymentController.getPaymentStats);
router.get('/:paymentId', authMiddleware, adminMiddleware, PaymentController.getPaymentById); // هذا المسار يجب أن يكون بعد المسارات المحددة
router.put('/:paymentId/approve', authMiddleware, adminMiddleware, PaymentController.approvePayment);
router.put('/:paymentId/reject', authMiddleware, adminMiddleware, PaymentController.rejectPayment);
router.delete('/:paymentId', authMiddleware, adminMiddleware, PaymentController.deletePayment);

// User routes
router.post('/', authMiddleware, uploadMiddleware.single('screenshot'), PaymentController.createPayment);

module.exports = router;