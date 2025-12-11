const { body, param, query } = require('express-validator');
const { handleValidationErrors } = require('../utils/validation');

/**
 * Validation for pagination query parameters
 */
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

/**
 * Validation for getting users
 */
exports.getUsersValidation = [
  query('role')
    .optional()
    .isIn(['USER', 'LOUNGE', 'ADMIN'])
    .withMessage('Role must be USER, LOUNGE, or ADMIN'),
  
  ...paginationValidation,
  handleValidationErrors
];

/**
 * Validation for updating user
 */
exports.updateUserValidation = [
  param('id')
    .notEmpty().withMessage('User ID is required')
    .isUUID().withMessage('Invalid user ID format'),
  
  body('isActive')
    .notEmpty().withMessage('isActive field is required')
    .isBoolean().withMessage('isActive must be a boolean'),
  
  handleValidationErrors
];

/**
 * Validation for getting lounges
 */
exports.getLoungesValidation = [
  query('status')
    .optional()
    .isIn(['pending', 'approved'])
    .withMessage('Status must be pending or approved'),
  
  ...paginationValidation,
  handleValidationErrors
];

/**
 * Validation for approving lounge
 */
exports.approveLoungeValidation = [
  param('id')
    .notEmpty().withMessage('Lounge ID is required')
    .isUUID().withMessage('Invalid lounge ID format'),
  
  body('isApproved')
    .notEmpty().withMessage('isApproved field is required')
    .isBoolean().withMessage('isApproved must be a boolean'),
  
  handleValidationErrors
];

/**
 * Validation for creating university
 */
exports.createUniversityValidation = [
  body('name')
    .notEmpty().withMessage('University name is required')
    .isLength({ min: 3, max: 200 }).withMessage('Name must be 3-200 characters'),
  
  body('code')
    .notEmpty().withMessage('University code is required')
    .isLength({ min: 2, max: 10 }).withMessage('Code must be 2-10 characters')
    .matches(/^[A-Z0-9]+$/).withMessage('Code must contain only uppercase letters and numbers'),
  
  body('city')
    .notEmpty().withMessage('City is required')
    .isLength({ min: 2, max: 100 }).withMessage('City must be 2-100 characters'),
  
  body('region')
    .notEmpty().withMessage('Region is required')
    .isLength({ min: 2, max: 100 }).withMessage('Region must be 2-100 characters'),
  
  handleValidationErrors
];

/**
 * Validation for creating campus
 */
exports.createCampusValidation = [
  body('name')
    .notEmpty().withMessage('Campus name is required')
    .isLength({ min: 3, max: 200 }).withMessage('Name must be 3-200 characters'),
  
  body('universityId')
    .notEmpty().withMessage('University ID is required')
    .isUUID().withMessage('Invalid university ID format'),
  
  body('address')
    .notEmpty().withMessage('Address is required')
    .isLength({ min: 5, max: 500 }).withMessage('Address must be 5-500 characters'),
  
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  
  handleValidationErrors
];

/**
 * Validation for getting campuses
 */
exports.getCampusesValidation = [
  query('universityId')
    .optional()
    .isUUID().withMessage('Invalid university ID format'),
  
  handleValidationErrors
];

/**
 * Validation for getting admin orders
 */
exports.getOrdersValidation = [
  query('status')
    .optional()
    .isIn(['PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'])
    .withMessage('Invalid status value'),
  
  query('loungeId')
    .optional()
    .isUUID().withMessage('Invalid lounge ID format'),
  
  ...paginationValidation,
  handleValidationErrors
];

/**
 * Validation for getting admin commissions
 */
exports.getCommissionsValidation = [
  query('loungeId')
    .optional()
    .isUUID().withMessage('Invalid lounge ID format'),
  
  query('status')
    .optional()
    .isIn(['PENDING', 'PAID', 'CANCELLED'])
    .withMessage('Status must be PENDING, PAID, or CANCELLED'),
  
  ...paginationValidation,
  handleValidationErrors
];

/**
 * Validation for getting admin payments
 */
exports.getPaymentsValidation = [
  query('type')
    .optional()
    .isIn(['ORDER', 'CONTRACT', 'REFUND'])
    .withMessage('Type must be ORDER, CONTRACT, or REFUND'),
  
  query('status')
    .optional()
    .isIn(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'])
    .withMessage('Status must be PENDING, COMPLETED, FAILED, or REFUNDED'),
  
  ...paginationValidation,
  handleValidationErrors
];
