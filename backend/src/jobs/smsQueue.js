const { Queue } = require('bullmq');
const logger = require('../config/logger');

// BullMQ requires ioredis-style options (host/port), not a URL string.
// Parse REDIS_URL so we don't duplicate the connection config.
const parseRedisOpts = () => {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  try {
    const { hostname, port, password } = new URL(url);
    return {
      host: hostname || 'localhost',
      port: parseInt(port) || 6379,
      ...(password && { password: decodeURIComponent(password) }),
      maxRetriesPerRequest: null, // required for BullMQ blocking commands
    };
  } catch {
    return { host: 'localhost', port: 6379, maxRetriesPerRequest: null };
  }
};

const connection = parseRedisOpts();

const smsQueue = new Queue('sms', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

smsQueue.on('error', (err) => {
  logger.error(`[SMS Queue] Queue error: ${err.message}`);
});

/**
 * Fire-and-forget enqueue. Failures are logged but never thrown.
 * @param {'booking_confirmed'|'booking_cancelled'|'token_called'} type
 * @param {string|ObjectId} appointmentId
 */
const enqueueSms = (type, appointmentId) => {
  smsQueue
    .add(type, { appointment_id: String(appointmentId) })
    .catch((err) => logger.warn(`[SMS Queue] Enqueue failed (${type}): ${err.message}`));
};

module.exports = { smsQueue, enqueueSms, connection };
