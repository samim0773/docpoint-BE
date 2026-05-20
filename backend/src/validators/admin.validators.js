const { body, param, query } = require('express-validator');

// ─── Auth ────────────────────────────────────────────────────────
const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Enter a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),
];

// ─── Doctor actions ──────────────────────────────────────────────
const rejectDoctorRules = [
  param('id').isMongoId().withMessage('Invalid doctor ID'),
  body('reason')
    .trim()
    .notEmpty().withMessage('Rejection reason is required')
    .isLength({ min: 10, max: 500 }).withMessage('Reason must be 10–500 characters'),
];

// ─── Plan management ─────────────────────────────────────────────
const createPlanRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Plan name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),

  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0 }).withMessage('Price must be 0 or more'),

  body('duration_days')
    .notEmpty().withMessage('Duration is required')
    .isInt({ min: 1 }).withMessage('Duration must be at least 1 day'),

  body('grace_days')
    .optional()
    .isInt({ min: 0 }).withMessage('Grace days must be 0 or more'),

  body('booking_cap')
    .optional()
    .isInt({ min: 1 }).withMessage('Booking cap must be at least 1'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage('Description max 300 characters'),
];

const updatePlanRules = [
  param('id').isMongoId().withMessage('Invalid plan ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),

  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price must be 0 or more'),

  body('duration_days')
    .optional()
    .isInt({ min: 1 }).withMessage('Duration must be at least 1 day'),

  body('grace_days')
    .optional()
    .isInt({ min: 0 }).withMessage('Grace days must be 0 or more'),

  body('booking_cap')
    .optional()
    .isInt({ min: 1 }).withMessage('Booking cap must be at least 1'),
];

// ─── Shared param validators ─────────────────────────────────────
const doctorIdRule = [param('id').isMongoId().withMessage('Invalid doctor ID')];
const userIdRule   = [param('id').isMongoId().withMessage('Invalid user ID')];
const planIdRule   = [param('id').isMongoId().withMessage('Invalid plan ID')];
const reviewIdRule = [param('id').isMongoId().withMessage('Invalid review ID')];

module.exports = {
  loginRules,
  rejectDoctorRules,
  createPlanRules,
  updatePlanRules,
  doctorIdRule,
  userIdRule,
  planIdRule,
  reviewIdRule,
};
