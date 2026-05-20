const mongoose = require('mongoose');
const { getIO } = require('./index');
const logger = require('../config/logger');

// ─── helpers ──────────────────────────────────────────────────────
const emitToSchedule = (scheduleId, event, data) => {
  try {
    getIO().of('/queue').to(String(scheduleId)).emit(event, data);
  } catch (err) {
    logger.warn(`[QueueWatcher] emit failed (${event}): ${err.message}`);
  }
};

// ─── DailySchedule watcher ────────────────────────────────────────
const watchDailySchedules = () => {
  const pipeline = [
    {
      $match: {
        operationType: 'update',
        $or: [
          { 'updateDescription.updatedFields.queue_status': { $exists: true } },
          { 'updateDescription.updatedFields.current_token': { $exists: true } },
        ],
      },
    },
  ];

  let resumeToken = null;

  const open = () => {
    const options = resumeToken
      ? { resumeAfter: resumeToken, fullDocument: 'updateLookup' }
      : { fullDocument: 'updateLookup' };

    const stream = mongoose.connection
      .collection('dailyschedules')
      .watch(pipeline, options);

    stream.on('change', (change) => {
      resumeToken = change._id;

      const doc = change.fullDocument;
      if (!doc) return;

      emitToSchedule(doc._id, 'queue-updated', {
        schedule_id: doc._id,
        queue_status: doc.queue_status,
        current_token: doc.current_token,
        avg_consult_minutes: doc.avg_consult_minutes,
        pause_reason: doc.pause_reason || null,
      });
    });

    stream.on('error', (err) => {
      logger.error(`[QueueWatcher] DailySchedule stream error: ${err.message}`);
      stream.close();
      // Reconnect after short backoff
      setTimeout(open, 5000);
    });

    stream.on('close', () => {
      logger.warn('[QueueWatcher] DailySchedule stream closed');
    });

    logger.info('[QueueWatcher] DailySchedule change stream open');
    return stream;
  };

  return open();
};

// ─── Appointment watcher ──────────────────────────────────────────
const watchAppointments = () => {
  const pipeline = [
    {
      $match: {
        operationType: 'update',
        'updateDescription.updatedFields.status': { $exists: true },
      },
    },
  ];

  let resumeToken = null;

  const open = () => {
    const options = resumeToken
      ? { resumeAfter: resumeToken, fullDocument: 'updateLookup' }
      : { fullDocument: 'updateLookup' };

    const stream = mongoose.connection
      .collection('appointments')
      .watch(pipeline, options);

    stream.on('change', (change) => {
      resumeToken = change._id;

      const doc = change.fullDocument;
      if (!doc) return;

      const scheduleId = doc.schedule_id;
      const status = doc.status;

      const payload = {
        appointment_id: doc._id,
        token_number: doc.token_number,
        status,
        patient_id: doc.patient_id,
        eta_minutes: doc.eta_minutes ?? null,
      };

      if (status === 'in_consultation') {
        emitToSchedule(scheduleId, 'token-called', payload);
      } else if (status === 'done' || status === 'no_show' || status === 'cancelled') {
        emitToSchedule(scheduleId, 'appointment-updated', payload);
      }
    });

    stream.on('error', (err) => {
      logger.error(`[QueueWatcher] Appointment stream error: ${err.message}`);
      stream.close();
      setTimeout(open, 5000);
    });

    stream.on('close', () => {
      logger.warn('[QueueWatcher] Appointment stream closed');
    });

    logger.info('[QueueWatcher] Appointment change stream open');
    return stream;
  };

  return open();
};

// ─── Public entry point ───────────────────────────────────────────
/**
 * Start both change stream watchers.
 * Must be called after connectDB() and initSocket().
 * Change streams require MongoDB replica set / Atlas — silently skipped in
 * standalone mode so dev environment doesn't crash.
 */
const startQueueWatcher = () => {
  try {
    watchDailySchedules();
    watchAppointments();
    logger.info('[QueueWatcher] Change stream watchers started');
  } catch (err) {
    logger.warn(
      `[QueueWatcher] Could not start change streams (replica set required): ${err.message}`
    );
  }
};

module.exports = { startQueueWatcher };
