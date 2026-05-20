const logger = require('../config/logger');

/**
 * Start the BullMQ SMS worker.
 * Requiring smsWorker.js instantiates the Worker and begins processing.
 * Wrapped in try-catch so Redis absence degrades gracefully (same pattern as queueWatcher).
 */
const startSmsWorker = () => {
  try {
    require('./smsWorker');
    logger.info('[SMS Worker] BullMQ worker started — processing sms queue');
  } catch (err) {
    logger.warn(`[SMS Worker] Could not start worker (Redis required): ${err.message}`);
  }
};

module.exports = { startSmsWorker };
