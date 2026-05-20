const { param, query } = require('express-validator');

const searchRules = [
  query('city')
    .trim()
    .notEmpty().withMessage('city is required'),

  query('specialization')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('specialization must be 2–100 characters'),

  query('language')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('language must be 2–50 characters'),

  query('max_fee')
    .optional()
    .isFloat({ min: 0 }).withMessage('max_fee must be 0 or more'),

  query('available_today')
    .optional()
    .isBoolean().withMessage('available_today must be true or false'),

  query('sort')
    .optional()
    .isIn(['distance', 'rating', 'fee']).withMessage('sort must be distance, rating, or fee'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('limit must be 1–50'),
];

const doctorIdRule = [
  param('id').isMongoId().withMessage('Invalid doctor ID'),
];

module.exports = { searchRules, doctorIdRule };
