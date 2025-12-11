const { body, param, query } = require('express-validator');
const { handleValidationErrors } = require('../utils/validation');

/**
 * Validation rules for creating an order
 */
exports.createOrderValidation = [
  body('loungeId')
    .notEmpty().withMessage('Lounge ID is required')
    .isUUID().withMessage('Invalid lounge ID format'),
  
  body('items')
    .isArray({ min: 1 }).withMessage('Order must contain at least one item'),
  
  body('items.*.foodId')
    .notEmpty().withMessage('Food ID is required')
    .isUUID().withMessage('Invalid food ID format'),
  
  body('items.*.quantity')
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  
  body('paymentMethod')
    .notEmpty().withMessage('Payment method is required')
    .isIn(['contract', 'chapa']).withMessage('Payment method must be either "contract" or "chapa"'),
  
  body('contractId')
    .if(body('paymentMethod').equals('contract'))
    .notEmpty().withMessage('Contract ID is required for contract payment')
    .isUUID().withMessage('Invalid contract ID format'),
  
  handleValidationErrors
];

/**
 * Validation rules for getting orders
 */
exports.getOrdersValidation = [
  query('status')
    .optional()
    .isIn(['PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'])
    .withMessage('Invalid status value'),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

/**
 * Validation rules for getting order by ID
 */
exports.getOrderByIdValidation = [
  param('id')
    .notEmpty().withMessage('Order ID is required')
    .isUUID().withMessage('Invalid order ID format'),
  
  handleValidationErrors
];

/**
 * Validation rules for updating order status
 */
exports.updateOrderStatusValidation = [
  param('id')
    .notEmpty().withMessage('Order ID is required')
    .isUUID().withMessage('Invalid order ID format'),
  
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'])
    .withMessage('Invalid status value'),
  
  handleValidationErrors
];

/**
 * Validation rules for verifying QR code
 */
exports.verifyQRCodeValidation = [
  body('qrCode')
    .notEmpty().withMessage('QR code is required')
    .isString().withMessage('QR code must be a string')
    .trim()
    .isLength({ min: 10 }).withMessage('Invalid QR code format'),
  
  handleValidationErrors
];
