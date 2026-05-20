const express = require('express');
const router = express.Router();

const { verifyUser, verifyDoctor, verifyUserOrDoctor } = require('../middleware/auth');
const { bookingLimiter } = require('../middleware/rateLimiter');
const validate = require('../validators/validate');
const {
  createBookingRules,
  confirmBookingRules,
  cancelBookingRules,
  myBookingsRules,
  doctorBookingsRules,
  bookingIdRule,
} = require('../validators/booking.validators');

const {
  createBooking,
  confirmBooking,
  cancelBooking,
  getMyBookings,
  getDoctorBookings,
  getBookingDetail,
} = require('../controllers/booking.controller');

// ─── Static routes MUST come before /:id param routes ─────────────

// User history
router.get('/my', verifyUser, myBookingsRules, validate, getMyBookings);

// Doctor daily list
router.get('/doctor', verifyDoctor, doctorBookingsRules, validate, getDoctorBookings);

// Create booking
router.post('/', bookingLimiter, verifyUser, createBookingRules, validate, createBooking);

// ─── Param routes ─────────────────────────────────────────────────

// Confirm payment
router.post('/:id/confirm', verifyUser, confirmBookingRules, validate, confirmBooking);

// Cancel (user owner OR appointment's doctor)
router.post('/:id/cancel', verifyUserOrDoctor, cancelBookingRules, validate, cancelBooking);

// Full detail (user owner OR appointment's doctor)
router.get('/:id', verifyUserOrDoctor, bookingIdRule, validate, getBookingDetail);

module.exports = router;
