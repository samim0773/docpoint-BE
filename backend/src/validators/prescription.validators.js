const { body, param, query } = require('express-validator');

const medicineArrayRule = body('medicines')
  .optional()
  .isArray({ min: 1 }).withMessage('medicines must be a non-empty array')
  .custom((meds) => {
    for (const m of meds) {
      if (!m.name || typeof m.name !== 'string' || !m.name.trim()) {
        throw new Error('Each medicine must have a name');
      }
    }
    return true;
  });

const createRules = [
  body('appointment_id').isMongoId().withMessage('Invalid appointment_id'),
  medicineArrayRule,
  body('notes').optional().trim().isLength({ max: 2000 }).withMessage('notes max 2000 chars'),
  body('chief_complaint').optional().trim().isLength({ max: 500 }).withMessage('chief_complaint max 500 chars'),
  body('diagnosis').optional().trim().isLength({ max: 500 }).withMessage('diagnosis max 500 chars'),
  body('follow_up_date').optional().isISO8601().withMessage('follow_up_date must be a valid date'),
];

const updateRules = [
  param('id').isMongoId().withMessage('Invalid prescription ID'),
  medicineArrayRule,
  body('notes').optional().trim().isLength({ max: 2000 }).withMessage('notes max 2000 chars'),
  body('chief_complaint').optional().trim().isLength({ max: 500 }).withMessage('chief_complaint max 500 chars'),
  body('diagnosis').optional().trim().isLength({ max: 500 }).withMessage('diagnosis max 500 chars'),
  body('follow_up_date').optional().isISO8601().withMessage('follow_up_date must be a valid date'),
];

const idRule = [param('id').isMongoId().withMessage('Invalid prescription ID')];

const appointmentIdRule = [
  param('appointmentId').isMongoId().withMessage('Invalid appointment ID'),
];

const myListRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1').toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be 1–50').toInt(),
];

module.exports = { createRules, updateRules, idRule, appointmentIdRule, myListRules };
