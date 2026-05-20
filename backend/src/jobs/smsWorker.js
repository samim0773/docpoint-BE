const { Worker } = require('bullmq');
const Appointment = require('../models/Appointment');
const { sendBookingConfirmation, sendBookingCancellation, sendQueueAlert } = require('../services/sms');
const { connection } = require('./smsQueue');
const logger = require('../config/logger');

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

// Single query per job — populates doctor name + user mobile
const fetchAppointment = (id) =>
  Appointment.findById(id)
    .populate('doctor_id', 'name')
    .populate('user_id', 'mobile')
    .lean();

const handlers = {
  booking_confirmed: async (job) => {
    const appt = await fetchAppointment(job.data.appointment_id);
    if (!appt) throw new Error(`Appointment not found: ${job.data.appointment_id}`);

    await sendBookingConfirmation(appt.user_id.mobile, {
      doctorName: appt.doctor_id.name,
      tokenNumber: appt.token_number,
      date: formatDate(appt.date),
      eta: appt.eta_minutes ?? 0,
    });
    logger.info(`[SMS Worker] booking_confirmed → ${appt.user_id.mobile}`);
  },

  booking_cancelled: async (job) => {
    const appt = await fetchAppointment(job.data.appointment_id);
    if (!appt) throw new Error(`Appointment not found: ${job.data.appointment_id}`);

    await sendBookingCancellation(appt.user_id.mobile, {
      doctorName: appt.doctor_id.name,
      date: formatDate(appt.date),
    });
    logger.info(`[SMS Worker] booking_cancelled → ${appt.user_id.mobile}`);
  },

  token_called: async (job) => {
    const appt = await fetchAppointment(job.data.appointment_id);
    if (!appt) throw new Error(`Appointment not found: ${job.data.appointment_id}`);

    await sendQueueAlert(appt.user_id.mobile, {
      doctorName: appt.doctor_id.name,
      position: appt.token_number,
    });
    logger.info(`[SMS Worker] token_called → ${appt.user_id.mobile}`);
  },
};

const worker = new Worker(
  'sms',
  async (job) => {
    const handler = handlers[job.name];
    if (!handler) {
      logger.warn(`[SMS Worker] Unknown job type: ${job.name}`);
      return;
    }
    await handler(job);
  },
  { connection }
);

worker.on('failed', (job, err) => {
  logger.error(`[SMS Worker] Job ${job?.id} (${job?.name}) failed after ${job?.attemptsMade} attempts: ${err.message}`);
});

worker.on('error', (err) => {
  logger.error(`[SMS Worker] Worker error: ${err.message}`);
});

module.exports = { worker };
