// puls-academy-backend/routes/paymentRoutes.js

const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { adminMiddleware } = require('../middlewares/adminMiddleware');
// Import the new upload middleware from the storage config
const { uploadMiddleware } = require('../config/storage');

router.get('/my-payments', authMiddleware, PaymentController.getUserPayments);

// Admin routes
router.get('/', authMiddleware, adminMiddleware, PaymentController.getPayments);
router.get('/pending', authMiddleware, adminMiddleware, PaymentController.getPendingPayments);
router.get('/stats', authMiddleware, adminMiddleware, PaymentController.getPaymentStats);
router.get('/:paymentId', authMiddleware, adminMiddleware, PaymentController.getPaymentById);
router.put('/:paymentId/approve', authMiddleware, adminMiddleware, PaymentController.approvePayment);
router.put('/:paymentId/reject', authMiddleware, adminMiddleware, PaymentController.rejectPayment);
router.delete('/:paymentId', authMiddleware, adminMiddleware, PaymentController.deletePayment);

// User routes
// Use the new middleware. 'screenshot' is the name of the file field in the form.
router.post('/', authMiddleware, uploadMiddleware.single('screenshot'), PaymentController.createPayment);

module.exports = router;