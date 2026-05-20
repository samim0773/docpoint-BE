const express = require('express');
const router = express.Router();

const { verifyDoctor } = require('../middleware/auth');
const validate = require('../validators/validate');
const {
  upsertTemplateRules,
  patchDayRules,
  dailyRangeRules,
  holidayRules,
  availableDatesRules,
} = require('../validators/schedule.validators');

const {
  getTemplate,
  upsertTemplate,
  patchDay,
  getDailySchedules,
  setHoliday,
  getAvailableDates,
} = require('../controllers/schedule.controller');

// ─── Static routes MUST be declared before /:doctorId param routes ─

// Weekly template (doctor only)
router.get('/template', verifyDoctor, getTemplate);
router.put('/template', verifyDoctor, upsertTemplateRules, validate, upsertTemplate);
router.patch('/template/:day', verifyDoctor, patchDayRules, validate, patchDay);

// Daily schedule (doctor only)
router.get('/daily', verifyDoctor, dailyRangeRules, validate, getDailySchedules);
router.patch('/daily/:date/holiday', verifyDoctor, holidayRules, validate, setHoliday);

// ─── Public param route ────────────────────────────────────────────
router.get('/:doctorId/available-dates', availableDatesRules, validate, getAvailableDates);

module.exports = router;
