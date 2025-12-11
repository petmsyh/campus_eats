const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const adminController = require('../controllers/admin.controller');
const adminValidator = require('../validators/admin.validator');

const adminAuth = [auth, authorize('ADMIN')];

/**
 * @route   GET /api/v1/admin/stats
 * @desc    Get system statistics
 * @access  Private (Admin)
 */
router.get('/stats', adminAuth, adminController.getStats);

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users
 * @access  Private (Admin)
 */
router.get('/users', adminAuth, adminValidator.getUsersValidation, adminController.getUsers);

/**
 * @route   PUT /api/v1/admin/users/:id
 * @desc    Update user (activate/deactivate)
 * @access  Private (Admin)
 */
router.put('/users/:id', adminAuth, adminValidator.updateUserValidation, adminController.updateUser);

/**
 * @route   GET /api/v1/admin/lounges
 * @desc    Get all lounges (including pending approval)
 * @access  Private (Admin)
 */
router.get('/lounges', adminAuth, adminValidator.getLoungesValidation, adminController.getLounges);

/**
 * @route   PUT /api/v1/admin/lounges/:id/approve
 * @desc    Approve or reject lounge
 * @access  Private (Admin)
 */
router.put('/lounges/:id/approve', adminAuth, adminValidator.approveLoungeValidation, adminController.approveLounge);

/**
 * @route   POST /api/v1/admin/universities
 * @desc    Create university
 * @access  Private (Admin)
 */
router.post('/universities', adminAuth, adminValidator.createUniversityValidation, adminController.createUniversity);

/**
 * @route   GET /api/v1/admin/universities
 * @desc    Get all universities
 * @access  Private (Admin)
 */
router.get('/universities', adminAuth, adminController.getUniversities);

/**
 * @route   POST /api/v1/admin/campuses
 * @desc    Create campus
 * @access  Private (Admin)
 */
router.post('/campuses', adminAuth, adminValidator.createCampusValidation, adminController.createCampus);

/**
 * @route   GET /api/v1/admin/campuses
 * @desc    Get all campuses
 * @access  Private (Admin)
 */
router.get('/campuses', adminAuth, adminValidator.getCampusesValidation, adminController.getCampuses);

/**
 * @route   GET /api/v1/admin/orders
 * @desc    Get all orders (admin overview)
 * @access  Private (Admin)
 */
router.get('/orders', adminAuth, adminValidator.getOrdersValidation, adminController.getOrders);

/**
 * @route   GET /api/v1/admin/commissions
 * @desc    Get all commissions (admin overview)
 * @access  Private (Admin)
 */
router.get('/commissions', adminAuth, adminValidator.getCommissionsValidation, adminController.getCommissions);

/**
 * @route   GET /api/v1/admin/payments
 * @desc    Get all payments (admin overview)
 * @access  Private (Admin)
 */
router.get('/payments', adminAuth, adminValidator.getPaymentsValidation, adminController.getPayments);

module.exports = router;
