const { body, param, query } = require('express-validator');

const APPOINTMENT_STATUSES = ['pending_payment', 'confirmed', 'in_consultation', 'done', 'no_show', 'cancelled'];

// ─── Create booking ───────────────────────────────────────────────
const createBookingRules = [
  body('doctor_id')
    .isMongoId().withMessage('Invalid doctor ID'),

  body('patient_id')
    .isMongoId().withMessage('Invalid patient ID'),

  body('date')
    .notEmpty().withMessage('date is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be YYYY-MM-DD'),
];

// ─── Confirm payment ──────────────────────────────────────────────
const confirmBookingRules = [
  param('id').isMongoId().withMessage('Invalid booking ID'),

  body('razorpay_payment_id')
    .notEmpty().withMessage('razorpay_payment_id is required'),

  body('razorpay_signature')
    .notEmpty().withMessage('razorpay_signature is required'),
];

// ─── Cancel ───────────────────────────────────────────────────────
const cancelBookingRules = [
  param('id').isMongoId().withMessage('Invalid booking ID'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage('reason max 300 characters'),
];

// ─── User booking history ─────────────────────────────────────────
const myBookingsRules = [
  query('status')
    .optional()
    .isIn(APPOINTMENT_STATUSES).withMessage(`status must be one of: ${APPOINTMENT_STATUSES.join(', ')}`),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('limit must be 1–50'),
];

// ─── Doctor daily bookings ────────────────────────────────────────
const doctorBookingsRules = [
  query('date')
    .notEmpty().withMessage('date is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be YYYY-MM-DD'),

  query('status')
    .optional()
    .isIn(APPOINTMENT_STATUSES).withMessage(`status must be one of: ${APPOINTMENT_STATUSES.join(', ')}`),
];

// ─── Shared ───────────────────────────────────────────────────────
const bookingIdRule = [
  param('id').isMongoId().withMessage('Invalid booking ID'),
];

module.exports = {
  createBookingRules,
  confirmBookingRules,
  cancelBookingRules,
  myBookingsRules,
  doctorBookingsRules,
  bookingIdRule,
};
