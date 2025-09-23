const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { adminMiddleware } = require('../middlewares/adminMiddleware');

// --- المسارات الحالية (تبقى كما هي) ---
router.get('/dashboard', authMiddleware, adminMiddleware, AdminController.getDashboardStats);
router.get('/users', authMiddleware, adminMiddleware, AdminController.getAllUsers);
router.get('/users/search', authMiddleware, adminMiddleware, AdminController.searchUsers);
router.get('/users/:userId', authMiddleware, adminMiddleware, AdminController.getUserDetails);
router.put('/users/:userId', authMiddleware, adminMiddleware, AdminController.updateUser);
router.delete('/users/:userId', authMiddleware, adminMiddleware, AdminController.deleteUser);
router.get('/courses', authMiddleware, adminMiddleware, AdminController.getAllCourses);
router.get('/revenue/report', authMiddleware, adminMiddleware, AdminController.getRevenueReport);
router.get('/payments/approved', authMiddleware, adminMiddleware, AdminController.getApprovedPayments);
router.delete('/revenue/reset', authMiddleware, adminMiddleware, AdminController.resetRevenue);
router.get('/messages/conversations', authMiddleware, adminMiddleware, AdminController.getConversations);
router.get('/messages/:userId', authMiddleware, adminMiddleware, AdminController.getMessagesWithUser);
router.post('/messages', authMiddleware, adminMiddleware, AdminController.sendMessageToUser);

// 1. إدارة طلبات الأجهزة
router.get('/device-requests', authMiddleware, adminMiddleware, AdminController.getDeviceRequests);
router.put('/device-requests/:requestId/approve', authMiddleware, adminMiddleware, AdminController.approveDeviceRequest);
router.put('/device-requests/:requestId/reject', authMiddleware, adminMiddleware, AdminController.rejectDeviceRequest);

// 2. إدارة المخالفات
router.get('/violations', authMiddleware, adminMiddleware, AdminController.getViolators);
router.put('/users/:userId/suspend', authMiddleware, adminMiddleware, AdminController.suspendUser);
router.put('/users/:userId/reactivate', authMiddleware, adminMiddleware, AdminController.reactivateUser);


// ✨ A new, dedicated route for updating student status.
router.patch('/students/:studentId/status', authMiddleware, adminMiddleware, AdminController.updateStudentStatus);

// The DELETE route remains for actual deletions.
router.delete('/students/:studentId', authMiddleware, adminMiddleware, AdminController.deleteStudent);

module.exports = router;