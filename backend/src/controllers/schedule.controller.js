const WeeklyTemplate = require('../models/WeeklyTemplate');
const DailySchedule = require('../models/DailySchedule');
const Doctor = require('../models/Doctor');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../config/logger');

// day index 0=Sunday matches JS Date.getDay()
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// ─── helpers ─────────────────────────────────────────────────────
const toMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const validateSlots = (slots) => {
  if (!slots?.length) return;
  const ranges = slots.map((s) => [toMinutes(s.start_time), toMinutes(s.end_time)]);
  for (let i = 0; i < ranges.length; i++) {
    const [s, e] = ranges[i];
    if (s >= e) {
      throw new AppError(
        `Slot ${slots[i].start_time}–${slots[i].end_time}: start_time must be before end_time`,
        422
      );
    }
  }
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      if (ranges[i][0] < ranges[j][1] && ranges[j][0] < ranges[i][1]) {
        throw new AppError(
          `Slots ${slots[i].start_time}–${slots[i].end_time} and ${slots[j].start_time}–${slots[j].end_time} overlap`,
          422
        );
      }
    }
  }
};

// Parse YYYY-MM-DD as UTC midnight Date
const parseUTCDate = (str) => new Date(str + 'T00:00:00.000Z');

// Build the empty 7-day shape returned when no template exists
const emptySchedule = () =>
  DAY_NAMES.slice(1).concat('sunday').map((day) => ({
    day,
    is_working: false,
    slots: [],
    max_patients: 20,
  }));

// ═══════════════════════════════════════════════════════════════
// PART A — Weekly Template
// ═══════════════════════════════════════════════════════════════

// GET /schedules/template
const getTemplate = asyncHandler(async (req, res) => {
  const template = await WeeklyTemplate.findOne({ doctor_id: req.doctor._id }).lean();

  if (!template) {
    return ApiResponse.success(res, 'No template set — returning defaults', {
      schedule: emptySchedule(),
      avg_consult_minutes: 10,
    });
  }

  // Fill in any days missing from the stored schedule
  const byDay = new Map(template.schedule.map((d) => [d.day, d]));
  const schedule = DAY_NAMES.map((day) =>
    byDay.get(day) ?? { day, is_working: false, slots: [], max_patients: 20 }
  );

  return ApiResponse.success(res, 'Weekly template fetched', { ...template, schedule });
});

// PUT /schedules/template
// Body: { schedule: [{day, is_working, slots, max_patients}], avg_consult_minutes? }
const upsertTemplate = asyncHandler(async (req, res) => {
  const { schedule: days, avg_consult_minutes } = req.body;

  for (const d of days) {
    validateSlots(d.slots);
  }

  let template = await WeeklyTemplate.findOne({ doctor_id: req.doctor._id });

  if (!template) {
    template = new WeeklyTemplate({ doctor_id: req.doctor._id, schedule: [] });
  }

  // Merge: keep existing days not included in the request
  const byDay = new Map((template.schedule || []).map((d) => [d.day, d]));
  for (const d of days) {
    byDay.set(d.day, {
      day: d.day,
      is_working: d.is_working ?? false,
      slots: (d.slots || []).map(({ start_time, end_time }) => ({ start_time, end_time })),
      max_patients: d.max_patients ?? 20,
    });
  }

  template.schedule = Array.from(byDay.values());
  if (avg_consult_minutes !== undefined) {
    template.avg_consult_minutes = Number(avg_consult_minutes);
  }

  await template.save();

  logger.info(`Doctor ${req.doctor._id} upserted weekly template`);
  return ApiResponse.success(res, 'Weekly template saved', template);
});

// PATCH /schedules/template/:day
const patchDay = asyncHandler(async (req, res) => {
  const { day } = req.params;
  const { is_working, slots, max_patients } = req.body;

  if (slots?.length) validateSlots(slots);

  let template = await WeeklyTemplate.findOne({ doctor_id: req.doctor._id });

  if (!template) {
    template = new WeeklyTemplate({
      doctor_id: req.doctor._id,
      schedule: DAY_NAMES.map((d) => ({ day: d, is_working: false, slots: [], max_patients: 20 })),
    });
  }

  const entry = template.schedule.find((d) => d.day === day);
  if (entry) {
    if (is_working !== undefined) entry.is_working = is_working;
    if (slots !== undefined) entry.slots = slots.map(({ start_time, end_time }) => ({ start_time, end_time }));
    if (max_patients !== undefined) entry.max_patients = max_patients;
  } else {
    template.schedule.push({
      day,
      is_working: is_working ?? false,
      slots: (slots || []).map(({ start_time, end_time }) => ({ start_time, end_time })),
      max_patients: max_patients ?? 20,
    });
  }

  template.markModified('schedule');
  await template.save();

  logger.info(`Doctor ${req.doctor._id} patched ${day} template`);
  return ApiResponse.success(
    res,
    `${day} updated`,
    template.schedule.find((d) => d.day === day)
  );
});

// ═══════════════════════════════════════════════════════════════
// PART B — Daily Schedule Management
// ═══════════════════════════════════════════════════════════════

// GET /schedules/daily?from=YYYY-MM-DD&to=YYYY-MM-DD
const getDailySchedules = asyncHandler(async (req, res) => {
  const from = parseUTCDate(req.query.from);
  const to = parseUTCDate(req.query.to);

  if (isNaN(from) || isNaN(to)) throw new AppError('Invalid date format', 400);
  if (to < from) throw new AppError('to must be on or after from', 400);

  const diffDays = Math.round((to - from) / 86400000);
  if (diffDays > 31) throw new AppError('Date range may not exceed 31 days', 400);

  const toExclusive = new Date(to.getTime() + 86400000);

  const schedules = await DailySchedule.find({
    doctor_id: req.doctor._id,
    date: { $gte: from, $lt: toExclusive },
  })
    .sort({ date: 1 })
    .lean();

  return ApiResponse.success(res, 'Daily schedules fetched', schedules);
});

// PATCH /schedules/daily/:date/holiday
const setHoliday = asyncHandler(async (req, res) => {
  const { date } = req.params;
  const { is_holiday, reason } = req.body;

  const dateObj = parseUTCDate(date);
  if (isNaN(dateObj)) throw new AppError('Invalid date', 400);

  const nextDay = new Date(dateObj.getTime() + 86400000);

  let schedule = await DailySchedule.findOne({
    doctor_id: req.doctor._id,
    date: { $gte: dateObj, $lt: nextDay },
  });

  if (schedule) {
    schedule.is_holiday = is_holiday;
    schedule.is_available = !is_holiday;
    schedule.holiday_reason = is_holiday ? (reason || '') : undefined;
    if (is_holiday) {
      schedule.slots = [];
      schedule.max_patients = 0;
    }
  } else {
    // No auto-generated schedule yet — create a placeholder
    if (!is_holiday) {
      // Restore from template if it exists
      const template = await WeeklyTemplate.findOne({ doctor_id: req.doctor._id }).lean();
      const dayName = DAY_NAMES[dateObj.getUTCDay()];
      const dayConfig = template?.schedule?.find((d) => d.day === dayName);

      schedule = new DailySchedule({
        doctor_id: req.doctor._id,
        date: dateObj,
        is_holiday: false,
        is_available: !!(dayConfig?.is_working),
        slots: dayConfig?.slots || [],
        max_patients: dayConfig?.max_patients || 20,
        avg_consult_minutes: template?.avg_consult_minutes || 10,
      });
    } else {
      schedule = new DailySchedule({
        doctor_id: req.doctor._id,
        date: dateObj,
        is_holiday: true,
        is_available: false,
        holiday_reason: reason || '',
        slots: [],
        max_patients: 0,
      });
    }
  }

  await schedule.save();

  logger.info(`Doctor ${req.doctor._id} set ${date} holiday=${is_holiday}`);
  return ApiResponse.success(res, `Date ${is_holiday ? 'marked as holiday' : 'restored'}`, schedule);
});

// ═══════════════════════════════════════════════════════════════
// PART B (public) — Available Dates
// ═══════════════════════════════════════════════════════════════

// GET /schedules/:doctorId/available-dates?month=YYYY-MM
const getAvailableDates = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { month } = req.query;

  const [year, mon] = month.split('-').map(Number);
  const from = new Date(Date.UTC(year, mon - 1, 1));
  const to = new Date(Date.UTC(year, mon, 1)); // exclusive

  const schedules = await DailySchedule.find({
    doctor_id: doctorId,
    date: { $gte: from, $lt: to },
    is_available: true,
    is_holiday: false,
    queue_status: { $ne: 'completed' },
  })
    .select('date max_patients booked_count queue_status')
    .sort({ date: 1 })
    .lean();

  const dates = schedules
    .filter((s) => s.booked_count < s.max_patients)
    .map((s) => ({
      date: s.date.toISOString().split('T')[0],
      remaining_slots: s.max_patients - s.booked_count,
      queue_status: s.queue_status,
    }));

  return ApiResponse.success(res, 'Available dates fetched', { month, dates });
});

module.exports = {
  getTemplate,
  upsertTemplate,
  patchDay,
  getDailySchedules,
  setHoliday,
  getAvailableDates,
};
