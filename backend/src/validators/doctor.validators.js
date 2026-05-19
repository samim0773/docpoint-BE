const { body, param } = require('express-validator');

const GENDER_ENUM = ['male', 'female', 'other'];

// ─── Doctor registration (all required fields) ───────────────────
const registerDoctorRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Enter a valid email address')
    .normalizeEmail(),

  body('gender')
    .notEmpty().withMessage('Gender is required')
    .isIn(GENDER_ENUM).withMessage('Gender must be male, female, or other'),

  body('specialization')
    .trim()
    .notEmpty().withMessage('Specialization is required')
    .isLength({ min: 2, max: 100 }).withMessage('Specialization must be 2–100 characters'),

  body('qualification')
    .isArray({ min: 1 }).withMessage('At least one qualification is required'),

  body('qualification.*')
    .trim()
    .notEmpty().withMessage('Qualification entry cannot be empty')
    .isLength({ max: 100 }).withMessage('Qualification too long'),

  body('experience_years')
    .notEmpty().withMessage('Experience years is required')
    .isInt({ min: 0, max: 70 }).withMessage('Experience must be 0–70 years'),

  body('registration_number')
    .trim()
    .notEmpty().withMessage('Medical registration number is required'),

  body('clinic_name')
    .trim()
    .notEmpty().withMessage('Clinic name is required')
    .isLength({ min: 2, max: 150 }).withMessage('Clinic name must be 2–150 characters'),

  body('clinic_address.city')
    .trim()
    .notEmpty().withMessage('Clinic city is required'),

  body('clinic_address.state')
    .trim()
    .notEmpty().withMessage('Clinic state is required'),

  body('clinic_address.street')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Street address too long'),

  body('clinic_address.pincode')
    .optional()
    .trim()
    .matches(/^\d{6}$/).withMessage('Pincode must be 6 digits'),

  body('consultation_fee')
    .notEmpty().withMessage('Consultation fee is required')
    .isFloat({ min: 0 }).withMessage('Consultation fee must be 0 or more'),

  body('avg_consult_minutes')
    .optional()
    .isInt({ min: 5, max: 120 }).withMessage('Avg consultation time must be 5–120 minutes'),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Bio must not exceed 1000 characters'),
];

// ─── Doctor profile update (all optional) ───────────────────────
const updateDoctorProfileRules = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Enter a valid email address')
    .normalizeEmail(),

  body('clinic_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 150 }).withMessage('Clinic name must be 2–150 characters'),

  body('clinic_address.city')
    .optional()
    .trim()
    .notEmpty().withMessage('City cannot be empty'),

  body('clinic_address.state')
    .optional()
    .trim()
    .notEmpty().withMessage('State cannot be empty'),

  body('clinic_address.street')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Street address too long'),

  body('clinic_address.pincode')
    .optional()
    .trim()
    .matches(/^\d{6}$/).withMessage('Pincode must be 6 digits'),

  body('consultation_fee')
    .optional()
    .isFloat({ min: 0 }).withMessage('Consultation fee must be 0 or more'),

  body('avg_consult_minutes')
    .optional()
    .isInt({ min: 5, max: 120 }).withMessage('Avg consultation time must be 5–120 minutes'),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Bio cannot exceed 1000 characters'),
];

const doctorIdRule = [
  param('id').isMongoId().withMessage('Invalid doctor ID'),
];

module.exports = { registerDoctorRules, updateDoctorProfileRules, doctorIdRule };
