const { body, param, query } = require('express-validator');

const createRules = [
  body('appointment_id').isMongoId().withMessage('Invalid appointment_id'),
  body('rating')
    .notEmpty().withMessage('rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('rating must be between 1 and 5')
    .toInt(),
  body('comment').optional().trim().isLength({ max: 1000 }).withMessage('comment max 1000 chars'),
];

const doctorIdRule = [
  param('doctorId').isMongoId().withMessage('Invalid doctor ID'),
];

const visibilityRule = [
  param('id').isMongoId().withMessage('Invalid review ID'),
  body('is_visible')
    .notEmpty().withMessage('is_visible is required')
    .isBoolean().withMessage('is_visible must be a boolean')
    .toBoolean(),
];

const paginationRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1').toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be 1–50').toInt(),
];

module.exports = { createRules, doctorIdRule, visibilityRule, paginationRules };
