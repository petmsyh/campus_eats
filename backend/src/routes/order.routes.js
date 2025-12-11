const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const orderController = require('../controllers/order.controller');
const orderValidator = require('../validators/order.validator');

/**
 * @route   POST /api/v1/orders
 * @desc    Create a new order
 * @access  Private
 */
router.post(
  '/',
  auth,
  orderValidator.createOrderValidation,
  orderController.createOrder
);

/**
 * @route   GET /api/v1/orders
 * @desc    Get orders (user's own or lounge's orders)
 * @access  Private
 */
router.get(
  '/',
  auth,
  orderValidator.getOrdersValidation,
  orderController.getOrders
);

/**
 * @route   GET /api/v1/orders/:id
 * @desc    Get order by ID
 * @access  Private
 */
router.get(
  '/:id',
  auth,
  orderValidator.getOrderByIdValidation,
  orderController.getOrderById
);

/**
 * @route   PUT /api/v1/orders/:id/status
 * @desc    Update order status
 * @access  Private (Lounge owner or Admin)
 */
router.put(
  '/:id/status',
  auth,
  authorize('LOUNGE', 'ADMIN'),
  orderValidator.updateOrderStatusValidation,
  orderController.updateOrderStatus
);

/**
 * @route   POST /api/v1/orders/verify-qr
 * @desc    Verify QR code and mark order as delivered
 * @access  Private (Lounge owner or Admin)
 */
router.post(
  '/verify-qr',
  auth,
  authorize('LOUNGE', 'ADMIN'),
  orderValidator.verifyQRCodeValidation,
  orderController.verifyQRCode
);

module.exports = router;
