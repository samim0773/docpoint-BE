const express = require('express');
const router = express.Router({ mergeParams: true });

const { verifyDoctor } = require('../middleware/auth');
const { param, body } = require('express-validator');
const validate = require('../validators/validate');

const {
  startQueue,
  pauseQueue,
  resumeQueue,
  completeQueue,
  callNext,
  markDone,
  markNoShow,
  getQueueStatus,
} = require('../controllers/queue.controller');

const scheduleIdRule = [
  param('scheduleId').isMongoId().withMessage('Invalid schedule ID'),
];

const noShowRule = [
  param('scheduleId').isMongoId().withMessage('Invalid schedule ID'),
  body('token_number')
    .notEmpty().withMessage('token_number is required')
    .isInt({ min: 1 }).withMessage('token_number must be a positive integer'),
];

const pauseRule = [
  param('scheduleId').isMongoId().withMessage('Invalid schedule ID'),
  body('reason').optional().trim().isLength({ max: 200 }).withMessage('reason max 200 chars'),
];

// ─── Queue Control (doctor) ───────────────────────────────────────
router.post('/:scheduleId/start',    verifyDoctor, scheduleIdRule, validate, startQueue);
router.post('/:scheduleId/pause',    verifyDoctor, pauseRule,      validate, pauseQueue);
router.post('/:scheduleId/resume',   verifyDoctor, scheduleIdRule, validate, resumeQueue);
router.post('/:scheduleId/complete', verifyDoctor, scheduleIdRule, validate, completeQueue);

// ─── Token Actions (doctor) ───────────────────────────────────────
router.post('/:scheduleId/call-next', verifyDoctor, scheduleIdRule, validate, callNext);
router.post('/:scheduleId/done',      verifyDoctor, scheduleIdRule, validate, markDone);
router.post('/:scheduleId/no-show',   verifyDoctor, noShowRule,     validate, markNoShow);

// ─── Status (public) ──────────────────────────────────────────────
router.get('/:scheduleId/status', scheduleIdRule, validate, getQueueStatus);

module.exports = router;
