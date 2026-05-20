const DailySchedule = require('../models/DailySchedule');
const Appointment = require('../models/Appointment');
const { enqueueSms } = require('../jobs/smsQueue');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../config/logger');

// ─── helper ──────────────────────────────────────────────────────
const getOwnedSchedule = async (scheduleId, doctorId) => {
  const schedule = await DailySchedule.findOne({
    _id: scheduleId,
    doctor_id: doctorId,
  });
  if (!schedule) throw new AppError('Schedule not found', 404);
  return schedule;
};

// ═══════════════════════════════════════════════════════════════
// PART A — Queue Control
// ═══════════════════════════════════════════════════════════════

// POST /queue/:scheduleId/start
const startQueue = asyncHandler(async (req, res) => {
  const schedule = await getOwnedSchedule(req.params.scheduleId, req.doctor._id);

  if (schedule.queue_status === 'completed') {
    throw new AppError('Queue is already completed for this schedule', 400);
  }
  if (schedule.queue_status === 'active') {
    return ApiResponse.success(res, 'Queue already active', schedule);
  }

  schedule.queue_status = 'active';
  schedule.current_token = 0;
  await schedule.save();

  logger.info(`Queue started: schedule=${schedule._id} doctor=${req.doctor._id}`);
  return ApiResponse.success(res, 'Queue started', schedule);
});

// POST /queue/:scheduleId/pause
const pauseQueue = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const schedule = await getOwnedSchedule(req.params.scheduleId, req.doctor._id);

  if (schedule.queue_status !== 'active') {
    throw new AppError('Queue must be active to pause', 400);
  }

  schedule.queue_status = 'paused';
  schedule.pause_reason = reason || '';
  await schedule.save();

  logger.info(`Queue paused: schedule=${schedule._id}`);
  return ApiResponse.success(res, 'Queue paused', schedule);
});

// POST /queue/:scheduleId/resume
const resumeQueue = asyncHandler(async (req, res) => {
  const schedule = await getOwnedSchedule(req.params.scheduleId, req.doctor._id);

  if (schedule.queue_status !== 'paused') {
    throw new AppError('Queue is not paused', 400);
  }

  schedule.queue_status = 'active';
  schedule.pause_reason = undefined;
  await schedule.save();

  logger.info(`Queue resumed: schedule=${schedule._id}`);
  return ApiResponse.success(res, 'Queue resumed', schedule);
});

// POST /queue/:scheduleId/complete
const completeQueue = asyncHandler(async (req, res) => {
  const schedule = await getOwnedSchedule(req.params.scheduleId, req.doctor._id);

  if (schedule.queue_status === 'completed') {
    return ApiResponse.success(res, 'Queue already completed', schedule);
  }
  if (schedule.queue_status === 'not_started') {
    throw new AppError('Queue has not been started yet', 400);
  }

  schedule.queue_status = 'completed';
  await schedule.save();

  // Mark all remaining confirmed appointments as no_show
  const { modifiedCount } = await Appointment.updateMany(
    { schedule_id: schedule._id, status: 'confirmed' },
    { $set: { status: 'no_show' } }
  );

  logger.info(
    `Queue completed: schedule=${schedule._id} — ${modifiedCount} appointment(s) marked no_show`
  );
  return ApiResponse.success(res, 'Queue completed', {
    schedule,
    no_shows_recorded: modifiedCount,
  });
});

// ═══════════════════════════════════════════════════════════════
// PART B — Token Actions
// ═══════════════════════════════════════════════════════════════

// POST /queue/:scheduleId/call-next
const callNext = asyncHandler(async (req, res) => {
  const schedule = await getOwnedSchedule(req.params.scheduleId, req.doctor._id);

  if (schedule.queue_status !== 'active') {
    throw new AppError('Queue must be active to call the next token', 400);
  }

  // Check there are still confirmed appointments waiting
  const nextToken = schedule.current_token + 1;
  const hasWaiting = await Appointment.exists({
    schedule_id: schedule._id,
    status: 'confirmed',
    token_number: { $gte: nextToken },
  });
  if (!hasWaiting) {
    throw new AppError('No more confirmed appointments waiting in queue', 400);
  }

  // Atomically advance current_token
  schedule.current_token = nextToken;
  await schedule.save();

  // Move the called appointment to in_consultation
  const calledAppointment = await Appointment.findOneAndUpdate(
    { schedule_id: schedule._id, token_number: nextToken, status: 'confirmed' },
    { $set: { status: 'in_consultation', eta_minutes: 0 } },
    { new: true }
  ).populate('patient_id', 'name age gender relation');

  // Recalculate ETAs for all still-waiting confirmed appointments (MongoDB 4.2+ pipeline update)
  await Appointment.updateMany(
    {
      schedule_id: schedule._id,
      status: 'confirmed',
      token_number: { $gt: nextToken },
    },
    [
      {
        $set: {
          eta_minutes: {
            $multiply: [
              { $subtract: ['$token_number', nextToken] },
              schedule.avg_consult_minutes,
            ],
          },
        },
      },
    ]
  );

  logger.info(
    `Called token ${nextToken}: schedule=${schedule._id} appt=${calledAppointment?._id ?? 'none'}`
  );
  if (calledAppointment) enqueueSms('token_called', calledAppointment._id);

  return ApiResponse.success(res, `Token ${nextToken} called`, {
    current_token: nextToken,
    appointment: calledAppointment || null,
  });
});

// POST /queue/:scheduleId/done
const markDone = asyncHandler(async (req, res) => {
  const schedule = await getOwnedSchedule(req.params.scheduleId, req.doctor._id);

  const appointment = await Appointment.findOneAndUpdate(
    { schedule_id: schedule._id, status: 'in_consultation' },
    { $set: { status: 'done' } },
    { new: true }
  );

  if (!appointment) {
    throw new AppError('No appointment currently in consultation for this schedule', 404);
  }

  logger.info(`Appointment done: appt=${appointment._id}`);
  return ApiResponse.success(res, 'Consultation marked as done', appointment);
});

// POST /queue/:scheduleId/no-show
const markNoShow = asyncHandler(async (req, res) => {
  const { token_number } = req.body;
  const schedule = await getOwnedSchedule(req.params.scheduleId, req.doctor._id);

  const appointment = await Appointment.findOneAndUpdate(
    {
      schedule_id: schedule._id,
      token_number: Number(token_number),
      status: { $in: ['confirmed', 'in_consultation'] },
    },
    { $set: { status: 'no_show' } },
    { new: true }
  );

  if (!appointment) {
    throw new AppError(
      `No active appointment found for token ${token_number}`,
      404
    );
  }

  logger.info(`No-show: token=${token_number} appt=${appointment._id}`);
  return ApiResponse.success(res, 'Marked as no-show', appointment);
});

// ═══════════════════════════════════════════════════════════════
// PART C — Queue Status (public)
// ═══════════════════════════════════════════════════════════════

// GET /queue/:scheduleId/status
const getQueueStatus = asyncHandler(async (req, res) => {
  const schedule = await DailySchedule.findById(req.params.scheduleId)
    .select('queue_status current_token avg_consult_minutes doctor_id date')
    .lean();

  if (!schedule) throw new AppError('Schedule not found', 404);

  const remaining_count = await Appointment.countDocuments({
    schedule_id: req.params.scheduleId,
    status: 'confirmed',
    token_number: { $gt: schedule.current_token },
  });

  return ApiResponse.success(res, 'Queue status fetched', {
    queue_status: schedule.queue_status,
    current_token: schedule.current_token,
    avg_consult_minutes: schedule.avg_consult_minutes,
    remaining_count,
  });
});

module.exports = {
  startQueue,
  pauseQueue,
  resumeQueue,
  completeQueue,
  callNext,
  markDone,
  markNoShow,
  getQueueStatus,
};
