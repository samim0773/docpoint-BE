const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const DailySchedule = require('../models/DailySchedule');
const UserPlan = require('../models/UserPlan');
const User = require('../models/User');
const { createOrder, verifyPaymentSignature, initiateRefund } = require('../services/razorpay');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../config/logger');

const parseUTCDate = (str) => new Date(str + 'T00:00:00.000Z');

const parsePage = (req) => ({
  page: Math.max(1, parseInt(req.query.page) || 1),
  limit: Math.min(Math.max(1, parseInt(req.query.limit) || 10), 50),
});

// ═══════════════════════════════════════════════════════════════
// POST /bookings — initiate booking + Razorpay order
// ═══════════════════════════════════════════════════════════════
const createBooking = asyncHandler(async (req, res) => {
  const { doctor_id, patient_id, date } = req.body;
  const user = req.user;
  const now = new Date();

  // a. Active subscription (grace period users cannot book)
  const sub = user.subscription;
  if (!sub?.is_active || !sub.expires_at || sub.expires_at <= now) {
    throw new AppError('An active subscription is required to book appointments.', 403);
  }

  // b. Booking cap
  if (sub.plan_id) {
    const plan = await UserPlan.findById(sub.plan_id).select('booking_cap').lean();
    if (plan?.booking_cap !== null && sub.bookings_used >= plan.booking_cap) {
      throw new AppError(
        `Booking limit of ${plan.booking_cap} reached for this cycle. Upgrade your plan.`,
        403
      );
    }
  }

  // c. Patient must belong to this user
  const patient = await Patient.findOne({
    _id: patient_id,
    user_id: user._id,
    is_deleted: false,
  }).lean();
  if (!patient) throw new AppError('Patient not found', 404);

  // d. Doctor must be approved and active
  const doctor = await Doctor.findOne({
    _id: doctor_id,
    approval_status: 'approved',
    is_blocked: false,
  })
    .select('consultation_fee name')
    .lean();
  if (!doctor) throw new AppError('Doctor not found or unavailable', 404);
  if (!doctor.consultation_fee) {
    throw new AppError('Doctor has not set a consultation fee', 400);
  }

  // e. Atomic slot claim — fails if fully booked or date invalid
  const dateObj = parseUTCDate(date);
  const nextDay = new Date(dateObj.getTime() + 86400000);

  const schedule = await DailySchedule.findOneAndUpdate(
    {
      doctor_id,
      date: { $gte: dateObj, $lt: nextDay },
      is_available: true,
      is_holiday: false,
      queue_status: { $ne: 'completed' },
      $expr: { $lt: ['$booked_count', '$max_patients'] },
    },
    { $inc: { booked_count: 1 } },
    { new: true }
  );
  if (!schedule) {
    throw new AppError('No available slots for this date. Please choose another date.', 409);
  }

  const token_number = schedule.booked_count; // post-increment = assigned token

  // f. Create appointment (pending payment)
  const appointment = await Appointment.create({
    user_id: user._id,
    patient_id,
    doctor_id,
    schedule_id: schedule._id,
    date: schedule.date,
    token_number,
    status: 'pending_payment',
    appointment_fee: doctor.consultation_fee,
  });

  // g. Create Razorpay order
  const receipt = `appt_${appointment._id.toString().slice(-12)}`;
  let order;
  try {
    order = await createOrder(doctor.consultation_fee, 'INR', receipt, {
      appointment_id: appointment._id.toString(),
    });
  } catch (err) {
    // Roll back slot and appointment on gateway error
    await Promise.all([
      DailySchedule.findByIdAndUpdate(schedule._id, { $inc: { booked_count: -1 } }),
      Appointment.findByIdAndDelete(appointment._id),
    ]);
    throw err;
  }

  // h. Create Payment record
  const payment = await Payment.create({
    user_id: user._id,
    type: 'appointment',
    amount: doctor.consultation_fee,
    currency: 'INR',
    razorpay_order_id: order.id,
    status: 'created',
    reference_id: appointment._id,
    reference_type: 'appointment',
  });

  appointment.payment_id = payment._id;
  await appointment.save();

  logger.info(
    `Booking initiated: appt=${appointment._id} user=${user._id} doctor=${doctor_id} token=${token_number}`
  );

  return ApiResponse.created(res, 'Booking initiated. Complete payment to confirm.', {
    appointment_id: appointment._id,
    token_number,
    razorpay_order_id: order.id,
    amount: doctor.consultation_fee,
    key_id: process.env.RAZORPAY_KEY_ID,
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /bookings/:id/confirm — verify signature + confirm
// ═══════════════════════════════════════════════════════════════
const confirmBooking = asyncHandler(async (req, res) => {
  const { razorpay_payment_id, razorpay_signature } = req.body;

  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) throw new AppError('Appointment not found', 404);
  if (appointment.user_id.toString() !== req.user._id.toString()) {
    throw new AppError('Unauthorized', 403);
  }
  if (appointment.status !== 'pending_payment') {
    throw new AppError('Appointment is not awaiting payment', 400);
  }

  const payment = await Payment.findById(appointment.payment_id);
  if (!payment) throw new AppError('Payment record not found', 404);

  const valid = verifyPaymentSignature(
    payment.razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );
  if (!valid) throw new AppError('Payment verification failed. Invalid signature.', 400);

  appointment.status = 'confirmed';
  await appointment.save();

  payment.status = 'captured';
  payment.razorpay_payment_id = razorpay_payment_id;
  payment.razorpay_signature = razorpay_signature;
  await payment.save();

  // Track bookings used against subscription cap
  await User.findByIdAndUpdate(req.user._id, {
    $inc: { 'subscription.bookings_used': 1 },
  });

  logger.info(`Booking confirmed: appt=${appointment._id}`);

  return ApiResponse.success(res, 'Appointment confirmed', appointment);
});

// ═══════════════════════════════════════════════════════════════
// POST /bookings/:id/cancel — user owner OR doctor
// ═══════════════════════════════════════════════════════════════
const cancelBooking = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) throw new AppError('Appointment not found', 404);

  const isOwner = req.user && appointment.user_id.toString() === req.user._id.toString();
  const isDoctor =
    req.doctor && appointment.doctor_id.toString() === req.doctor._id.toString();
  if (!isOwner && !isDoctor) throw new AppError('Unauthorized', 403);

  if (appointment.status !== 'confirmed') {
    throw new AppError('Only confirmed appointments can be cancelled', 400);
  }

  // Free up the slot
  await DailySchedule.findByIdAndUpdate(appointment.schedule_id, {
    $inc: { booked_count: -1 },
  });

  // Attempt refund
  const payment = await Payment.findById(appointment.payment_id);
  if (payment?.status === 'captured' && payment.razorpay_payment_id) {
    try {
      const refund = await initiateRefund(payment.razorpay_payment_id, payment.amount, {
        appointment_id: appointment._id.toString(),
        reason: reason || 'Appointment cancelled',
      });
      payment.status = 'refunded';
      payment.refund_id = refund.id;
      payment.refunded_amount = payment.amount;
      payment.refunded_at = new Date();
      await payment.save();
    } catch (err) {
      // Log but don't block cancellation — support can process refund manually
      logger.warn(`Refund failed for appt=${appointment._id}: ${err.message}`);
    }
  }

  appointment.status = 'cancelled';
  appointment.cancellation_reason = reason || '';
  appointment.cancelled_at = new Date();
  await appointment.save();

  // Return the cap usage (guard against going negative)
  await User.findOneAndUpdate(
    { _id: appointment.user_id, 'subscription.bookings_used': { $gt: 0 } },
    { $inc: { 'subscription.bookings_used': -1 } }
  );

  logger.info(
    `Booking cancelled: appt=${appointment._id} by=${isDoctor ? 'doctor' : 'user'}`
  );

  return ApiResponse.success(res, 'Appointment cancelled', appointment);
});

// ═══════════════════════════════════════════════════════════════
// GET /bookings/my — user's booking history (paginated)
// ═══════════════════════════════════════════════════════════════
const getMyBookings = asyncHandler(async (req, res) => {
  const { page, limit } = parsePage(req);
  const skip = (page - 1) * limit;

  const filter = { user_id: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .populate('doctor_id', 'name specialization clinic_address profile_photo')
      .populate('patient_id', 'name relation')
      .select('date token_number status appointment_fee cancellation_reason createdAt')
      .sort({ date: -1, token_number: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Appointment.countDocuments(filter),
  ]);

  return ApiResponse.success(res, 'Bookings fetched', {
    appointments,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
});

// ═══════════════════════════════════════════════════════════════
// GET /bookings/doctor — doctor's appointment list for a date
// ═══════════════════════════════════════════════════════════════
const getDoctorBookings = asyncHandler(async (req, res) => {
  const dateObj = parseUTCDate(req.query.date);
  if (isNaN(dateObj)) throw new AppError('Invalid date', 400);
  const nextDay = new Date(dateObj.getTime() + 86400000);

  const filter = {
    doctor_id: req.doctor._id,
    date: { $gte: dateObj, $lt: nextDay },
  };
  if (req.query.status) filter.status = req.query.status;

  const appointments = await Appointment.find(filter)
    .populate('patient_id', 'name age gender relation blood_group')
    .select('token_number status appointment_fee eta_minutes cancellation_reason patient_id date')
    .sort({ token_number: 1 })
    .lean();

  return ApiResponse.success(res, 'Appointments fetched', {
    date: req.query.date,
    count: appointments.length,
    appointments,
  });
});

// ═══════════════════════════════════════════════════════════════
// GET /bookings/:id — full detail (owner or doctor)
// ═══════════════════════════════════════════════════════════════
const getBookingDetail = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('doctor_id', 'name specialization clinic_name clinic_address consultation_fee profile_photo')
    .populate('patient_id', 'name age gender relation blood_group')
    .lean();

  if (!appointment) throw new AppError('Appointment not found', 404);

  const isOwner = req.user && appointment.user_id.toString() === req.user._id.toString();
  const isDoctor =
    req.doctor && appointment.doctor_id._id.toString() === req.doctor._id.toString();
  if (!isOwner && !isDoctor) throw new AppError('Unauthorized', 403);

  return ApiResponse.success(res, 'Appointment details fetched', appointment);
});

module.exports = {
  createBooking,
  confirmBooking,
  cancelBooking,
  getMyBookings,
  getDoctorBookings,
  getBookingDetail,
};
