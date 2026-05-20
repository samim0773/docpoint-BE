const cron = require('node-cron');
const Doctor = require('../models/Doctor');
const WeeklyTemplate = require('../models/WeeklyTemplate');
const DailySchedule = require('../models/DailySchedule');
const logger = require('../config/logger');

// JS Date.getUTCDay() → 0=Sunday
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const LOOKAHEAD_DAYS = 30;

const generateSchedules = async () => {
  logger.info('[ScheduleGen] Starting daily schedule generation');

  const startedAt = Date.now();
  let doctorsProcessed = 0;
  let schedulesCreated = 0;
  let errors = 0;

  try {
    const doctors = await Doctor.find({ approval_status: 'approved' }).select('_id').lean();

    for (const doctor of doctors) {
      try {
        const template = await WeeklyTemplate.findOne({ doctor_id: doctor._id }).lean();

        if (!template?.schedule?.length) continue;

        const templateMap = new Map(
          template.schedule.filter((d) => d.is_working).map((d) => [d.day, d])
        );

        if (templateMap.size === 0) continue;

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const ops = [];

        for (let i = 0; i <= LOOKAHEAD_DAYS; i++) {
          const date = new Date(today.getTime() + i * 86400000);
          const dayName = DAY_NAMES[date.getUTCDay()];
          const dayConfig = templateMap.get(dayName);

          if (!dayConfig) continue;

          ops.push({
            updateOne: {
              filter: { doctor_id: doctor._id, date },
              update: {
                $setOnInsert: {
                  doctor_id: doctor._id,
                  date,
                  slots: (dayConfig.slots || []).map(({ start_time, end_time }) => ({
                    start_time,
                    end_time,
                  })),
                  max_patients: dayConfig.max_patients || 20,
                  avg_consult_minutes: template.avg_consult_minutes || 10,
                  booked_count: 0,
                  current_token: 0,
                  is_available: true,
                  is_holiday: false,
                  queue_status: 'not_started',
                },
              },
              upsert: true,
            },
          });
        }

        if (ops.length) {
          const result = await DailySchedule.bulkWrite(ops, { ordered: false });
          schedulesCreated += result.upsertedCount;
        }

        doctorsProcessed++;
      } catch (err) {
        errors++;
        logger.error(`[ScheduleGen] Doctor ${doctor._id} failed: ${err.message}`);
      }
    }

    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    logger.info(
      `[ScheduleGen] Done in ${elapsed}s — doctors: ${doctorsProcessed}, new schedules: ${schedulesCreated}, errors: ${errors}`
    );
  } catch (err) {
    logger.error(`[ScheduleGen] Fatal: ${err.message}`);
  }
};

const startScheduleGenerator = () => {
  // 00:05 UTC daily ≈ 05:35 IST — runs after midnight to create next-day+ schedules
  cron.schedule('5 0 * * *', generateSchedules);
  logger.info('[ScheduleGen] Cron registered — daily at 00:05 UTC');
};

module.exports = { startScheduleGenerator, generateSchedules };
