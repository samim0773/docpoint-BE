const { body, param } = require('express-validator');

const GENDER_ENUM = ['male', 'female', 'other'];
const RELATION_ENUM = ['self', 'spouse', 'child', 'parent', 'sibling', 'other'];
const BLOOD_GROUP_ENUM = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const addPatientRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Patient name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),

  body('age')
    .optional()
    .isInt({ min: 0, max: 150 }).withMessage('Age must be 0–150'),

  body('gender')
    .optional()
    .isIn(GENDER_ENUM).withMessage(`Gender must be one of: ${GENDER_ENUM.join(', ')}`),

  body('relation')
    .optional()
    .isIn(RELATION_ENUM).withMessage(`Relation must be one of: ${RELATION_ENUM.join(', ')}`),

  body('blood_group')
    .optional()
    .isIn(BLOOD_GROUP_ENUM).withMessage(`Blood group must be one of: ${BLOOD_GROUP_ENUM.join(', ')}`),
];

const updatePatientRules = [
  param('id').isMongoId().withMessage('Invalid patient ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),

  body('age')
    .optional()
    .isInt({ min: 0, max: 150 }).withMessage('Age must be 0–150'),

  body('gender')
    .optional()
    .isIn(GENDER_ENUM).withMessage(`Gender must be one of: ${GENDER_ENUM.join(', ')}`),

  body('relation')
    .optional()
    .isIn(RELATION_ENUM).withMessage(`Relation must be one of: ${RELATION_ENUM.join(', ')}`),

  body('blood_group')
    .optional()
    .isIn(BLOOD_GROUP_ENUM).withMessage(`Blood group must be one of: ${BLOOD_GROUP_ENUM.join(', ')}`),
];

const patientIdRule = [
  param('id').isMongoId().withMessage('Invalid patient ID'),
];

module.exports = { addPatientRules, updatePatientRules, patientIdRule };
