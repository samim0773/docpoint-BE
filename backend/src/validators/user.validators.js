const { body } = require('express-validator');

const validateMobile = body('mobile')
  .trim()
  .notEmpty().withMessage('Mobile number is required')
  .matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit Indian mobile number');

const validateOTP = body('otp')
  .trim()
  .notEmpty().withMessage('OTP is required')
  .matches(/^\d{6}$/).withMessage('OTP must be a 6-digit number');

const sendOtpRules = [validateMobile];

const verifyOtpRules = [validateMobile, validateOTP];

const updateProfileRules = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),

  body('city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('City must be 2–100 characters'),

  body('state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('State must be 2–100 characters'),
];

const completeProfileRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),

  body('city')
    .trim()
    .notEmpty().withMessage('City is required'),

  body('state')
    .trim()
    .notEmpty().withMessage('State is required'),
];

module.exports = {
  sendOtpRules,
  verifyOtpRules,
  updateProfileRules,
  completeProfileRules,
};
