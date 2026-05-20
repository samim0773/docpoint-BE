const rateLimit = require('express-rate-limit');

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    message: { success: false, message },
    standardHeaders: true,
    legacyHeaders: false,
  });

const otpLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  'Too many OTP requests. Try again in 15 minutes.'
);

const authLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  'Too many auth attempts. Try again in 15 minutes.'
);

const searchLimiter = createLimiter(
  60 * 1000,
  60,
  'Too many search requests. Slow down.'
);

const bookingLimiter = createLimiter(
  60 * 60 * 1000,
  20,
  'Too many booking attempts. Try again in an hour.'
);

const queueLimiter = createLimiter(
  60 * 1000,
  60,
  'Too many queue requests. Slow down.'
);

const globalLimiter = createLimiter(
  15 * 60 * 1000,
  300,
  'Too many requests from this IP.'
);

module.exports = { otpLimiter, authLimiter, searchLimiter, bookingLimiter, queueLimiter, globalLimiter };
