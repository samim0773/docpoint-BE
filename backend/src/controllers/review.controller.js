const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Review = require('../models/Review');
const Appointment = require('../models/Appointment');
const { getCache, setCache, delCacheByPattern } = require('../utils/cache');

const REVIEWS_TTL = 120; // seconds
const reviewsCacheKey = (doctorId, page, limit) => `reviews:doctor:${doctorId}:${page}:${limit}`;

// ─── POST /api/v1/reviews ─────────────────────────────────────────
const createReview = asyncHandler(async (req, res) => {
  const { appointment_id, rating, comment } = req.body;
  const userId = req.user._id;

  const appt = await Appointment.findById(appointment_id);
  if (!appt) throw new AppError('Appointment not found', 404);
  if (String(appt.user_id) !== String(userId)) throw new AppError('Not your appointment', 403);
  if (appt.status !== 'done') throw new AppError('Can only review completed appointments', 400);
  if (appt.review_submitted) throw new AppError('Review already submitted for this appointment', 409);

  const review = await Review.create({
    appointment_id,
    doctor_id: appt.doctor_id,
    patient_id: appt.patient_id,
    user_id: userId,
    rating,
    comment,
  });

  await Promise.all([
    Appointment.findByIdAndUpdate(appointment_id, { review_submitted: true }),
    Review.recalculateDoctorRating(appt.doctor_id),
    delCacheByPattern(`reviews:doctor:${appt.doctor_id}:*`),
  ]);

  res.status(201).json({ success: true, data: review });
});

// ─── GET /api/v1/reviews/my ───────────────────────────────────────
const getMyReviews = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const filter = { user_id: userId };

  const [total, reviews] = await Promise.all([
    Review.countDocuments(filter),
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('doctor_id', 'name specialization'),
  ]);

  res.json({
    success: true,
    data: reviews,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
});

// ─── GET /api/v1/reviews/doctor/:doctorId ─────────────────────────
const getDoctorReviews = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const cacheKey = reviewsCacheKey(doctorId, page, limit);
  const cached = await getCache(cacheKey);
  if (cached) return res.json({ success: true, ...cached });

  const filter = { doctor_id: doctorId, is_hidden: false };

  const [total, reviews] = await Promise.all([
    Review.countDocuments(filter),
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);

  const payload = { data: reviews, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  setCache(cacheKey, payload, REVIEWS_TTL); // fire-and-forget

  res.json({ success: true, ...payload });
});

// ─── PATCH /api/v1/reviews/:id/visibility ─────────────────────────
// Spec uses is_visible; model stores is_hidden — invert on write.
const setVisibility = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { is_visible } = req.body;
  const newIsHidden = !is_visible;

  const review = await Review.findById(id);
  if (!review) throw new AppError('Review not found', 404);

  const wasHidden = review.is_hidden;
  review.is_hidden = newIsHidden;
  await review.save();

  if (wasHidden !== newIsHidden) {
    await Review.recalculateDoctorRating(review.doctor_id);
  }

  res.json({ success: true, data: review });
});

module.exports = { createReview, getMyReviews, getDoctorReviews, setVisibility };
