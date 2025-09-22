// puls-academy-backend/routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { adminMiddleware } = require('../middlewares/adminMiddleware');

router.get('/dashboard', authMiddleware, adminMiddleware, AdminController.getDashboardStats);
router.get('/users', authMiddleware, adminMiddleware, AdminController.getAllUsers);
router.get('/users/search', authMiddleware, adminMiddleware, AdminController.searchUsers);
router.get('/users/:userId', authMiddleware, adminMiddleware, AdminController.getUserDetails);
router.put('/users/:userId', authMiddleware, adminMiddleware, AdminController.updateUser);
router.delete('/users/:userId', authMiddleware, adminMiddleware, AdminController.deleteUser);
router.delete('/users/bulk', authMiddleware, adminMiddleware, AdminController.bulkDeleteUsers);

router.get('/courses', authMiddleware, adminMiddleware, AdminController.getAllCourses);
router.get('/courses/top', authMiddleware, adminMiddleware, AdminController.getTopCourses);
router.get('/courses/:courseId/enrollments', authMiddleware, adminMiddleware, AdminController.getCourseEnrollments);
router.get('/courses/:courseId/payments', authMiddleware, adminMiddleware, AdminController.getCoursePayments);
router.delete('/courses/bulk', authMiddleware, adminMiddleware, AdminController.bulkDeleteCourses);

router.get('/students/top', authMiddleware, adminMiddleware, AdminController.getTopStudents);
router.get('/revenue/report', authMiddleware, adminMiddleware, AdminController.getRevenueReport);

router.get('/payments/approved', authMiddleware, adminMiddleware, AdminController.getApprovedPayments);
router.delete('/revenue/reset', authMiddleware, adminMiddleware, AdminController.resetRevenue);

// إدارة طلبات الأجهزة
router.get('/device-requests', authMiddleware, adminMiddleware, AdminController.getDeviceRequests);
router.put('/device-requests/:requestId/approve', authMiddleware, adminMiddleware, AdminController.approveDeviceRequest);
router.put('/device-requests/:requestId/reject', authMiddleware, adminMiddleware, AdminController.rejectDeviceRequest);

// إدارة المخالفات
router.get('/violations', authMiddleware, adminMiddleware, AdminController.getViolators);
router.put('/users/:userId/suspend', authMiddleware, adminMiddleware, AdminController.suspendUser);
router.put('/users/:userId/reactivate', authMiddleware, adminMiddleware, AdminController.reactivateUser);


module.exports = router;