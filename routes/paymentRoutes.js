// puls-academy-backend/routes/paymentRoutes.js

const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { adminMiddleware } = require('../middlewares/adminMiddleware');

// ✨ --- START: THIS IS THE CORRECTED IMPORT --- ✨
// We are now correctly importing the 'upload' object from the middleware.
const { upload } = require('../middlewares/uploadMiddleware');
// ✨ --- END: THE IMPORT IS NOW CORRECT --- ✨

// ===================================
// ===       Admin Routes          ===
// ===================================

// Get all payments
router.get('/', authMiddleware, adminMiddleware, PaymentController.getAllPayments);

// Get pending payments
router.get('/pending', authMiddleware, adminMiddleware, PaymentController.getPendingPayments);

// Update payment status (approve/reject)
router.put('/:paymentId/status', authMiddleware, adminMiddleware, PaymentController.updatePaymentStatus);


// ===================================
// ===       Student Routes        ===
// ===================================

// Create a new payment request
router.post('/', authMiddleware, upload.single('screenshot'), PaymentController.createPayment);

// Get payments for the logged-in student
router.get('/my-payments', authMiddleware, PaymentController.getStudentPayments);

module.exports = router;