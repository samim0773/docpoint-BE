const { body, param, query } = require('express-validator');

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ─── Weekly template (full upsert) ───────────────────────────────
const upsertTemplateRules = [
  body('schedule')
    .isArray({ min: 1, max: 7 }).withMessage('schedule must be an array of 1–7 day entries'),

  body('schedule.*.day')
    .isIn(DAYS).withMessage(`day must be one of: ${DAYS.join(', ')}`),

  body('schedule.*.is_working')
    .optional()
    .isBoolean().withMessage('is_working must be boolean'),

  body('schedule.*.max_patients')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('max_patients must be 1–50'),

  body('schedule.*.slots')
    .optional()
    .isArray().withMessage('slots must be an array'),

  body('schedule.*.slots.*.start_time')
    .matches(TIME_RE).withMessage('slot start_time must be HH:MM (24-hour)'),

  body('schedule.*.slots.*.end_time')
    .matches(TIME_RE).withMessage('slot end_time must be HH:MM (24-hour)'),

  body('avg_consult_minutes')
    .optional()
    .isInt({ min: 1, max: 120 }).withMessage('avg_consult_minutes must be 1–120'),
];

// ─── Single-day patch ─────────────────────────────────────────────
const patchDayRules = [
  param('day')
    .isIn(DAYS).withMessage(`day param must be one of: ${DAYS.join(', ')}`),

  body('is_working')
    .optional()
    .isBoolean().withMessage('is_working must be boolean'),

  body('max_patients')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('max_patients must be 1–50'),

  body('slots')
    .optional()
    .isArray().withMessage('slots must be an array'),

  body('slots.*.start_time')
    .matches(TIME_RE).withMessage('slot start_time must be HH:MM (24-hour)'),

  body('slots.*.end_time')
    .matches(TIME_RE).withMessage('slot end_time must be HH:MM (24-hour)'),
];

// ─── Daily schedule range query ───────────────────────────────────
const dailyRangeRules = [
  query('from')
    .notEmpty().withMessage('from is required')
    .matches(DATE_RE).withMessage('from must be YYYY-MM-DD'),

  query('to')
    .notEmpty().withMessage('to is required')
    .matches(DATE_RE).withMessage('to must be YYYY-MM-DD'),
];

// ─── Holiday toggle ───────────────────────────────────────────────
const holidayRules = [
  param('date')
    .matches(DATE_RE).withMessage('date param must be YYYY-MM-DD'),

  body('is_holiday')
    .notEmpty().withMessage('is_holiday is required')
    .isBoolean().withMessage('is_holiday must be boolean'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('reason max 200 characters'),
];

// ─── Available dates (public) ─────────────────────────────────────
const availableDatesRules = [
  param('doctorId')
    .isMongoId().withMessage('Invalid doctor ID'),

  query('month')
    .notEmpty().withMessage('month is required')
    .matches(/^\d{4}-\d{2}$/).withMessage('month must be YYYY-MM'),
];

module.exports = {
  upsertTemplateRules,
  patchDayRules,
  dailyRangeRules,
  holidayRules,
  availableDatesRules,
};
