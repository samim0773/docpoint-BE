const Admin = require('../models/Admin');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const UserPlan = require('../models/UserPlan');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const { generateAdminToken } = require('../utils/jwt');
const { sendDoctorApproval } = require('../services/sms');
const logger = require('../config/logger');

// ─── helpers ─────────────────────────────────────────────────────
const parsePage = (req) => ({
  page: Math.max(1, parseInt(req.query.page) || 1),
  limit: Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100),
});

// ═══════════════════════════════════════════════════════════════
// PART A — Admin Auth
// ═══════════════════════════════════════════════════════════════

// POST /admin/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email }).select('+password');
  if (!admin || !admin.is_active) throw new AppError('Invalid credentials', 401);

  const isMatch = await admin.comparePassword(password);
  if (!isMatch) throw new AppError('Invalid credentials', 401);

  const token = generateAdminToken(admin._id);

  logger.info(`Admin login: ${admin.email}`);

  return ApiResponse.success(res, 'Login successful', {
    access_token: token,
    admin: { id: admin._id, name: admin.name, email: admin.email },
  });
});

// GET /admin/auth/me
const getMe = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, 'Admin profile', {
    id: req.admin._id,
    name: req.admin.name,
    email: req.admin.email,
    createdAt: req.admin.createdAt,
  });
});

// ═══════════════════════════════════════════════════════════════
// PART B — Doctor Management
// ═══════════════════════════════════════════════════════════════

// GET /admin/doctors
const listDoctors = asyncHandler(async (req, res) => {
  const { page, limit } = parsePage(req);
  const skip = (page - 1) * limit;

  const filter = {};
  if (['pending', 'approved', 'rejected'].includes(req.query.status)) {
    filter.approval_status = req.query.status;
  }

  const [doctors, total] = await Promise.all([
    Doctor.find(filter)
      .select('name mobile email specialization clinic_address.city approval_status is_profile_complete is_blocked createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Doctor.countDocuments(filter),
  ]);

  return ApiResponse.success(res, 'Doctors fetched', {
    doctors,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
});

// GET /admin/doctors/:id
const getDoctorDetail = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id)
    .select('-otp -refresh_token -__v');

  if (!doctor) throw new AppError('Doctor not found', 404);

  return ApiResponse.success(res, 'Doctor details fetched', doctor);
});

// PATCH /admin/doctors/:id/approve
const approveDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) throw new AppError('Doctor not found', 404);

  if (doctor.approval_status === 'approved') {
    return ApiResponse.success(res, 'Doctor already approved');
  }

  doctor.approval_status = 'approved';
  doctor.rejection_reason = undefined;
  await doctor.save();

  // Fire-and-forget — don't block response on SMS failure
  sendDoctorApproval(doctor.mobile, {
    doctorName: doctor.name || 'Doctor',
    status: 'approved',
  }).catch((err) => logger.warn(`Approval SMS failed for ${doctor._id}:`, err.message));

  logger.info(`Admin approved doctor: ${doctor._id}`);

  return ApiResponse.success(res, 'Doctor approved successfully', {
    id: doctor._id,
    name: doctor.name,
    approval_status: doctor.approval_status,
  });
});

// PATCH /admin/doctors/:id/reject
const rejectDoctor = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) throw new AppError('Doctor not found', 404);

  doctor.approval_status = 'rejected';
  doctor.rejection_reason = reason;
  await doctor.save();

  sendDoctorApproval(doctor.mobile, {
    doctorName: doctor.name || 'Doctor',
    status: 'rejected',
    reason,
  }).catch((err) => logger.warn(`Rejection SMS failed for ${doctor._id}:`, err.message));

  logger.info(`Admin rejected doctor: ${doctor._id} — reason: ${reason}`);

  return ApiResponse.success(res, 'Doctor rejected', {
    id: doctor._id,
    approval_status: doctor.approval_status,
    rejection_reason: doctor.rejection_reason,
  });
});

// ═══════════════════════════════════════════════════════════════
// PART C — User Management
// ═══════════════════════════════════════════════════════════════

// GET /admin/users
const listUsers = asyncHandler(async (req, res) => {
  const { page, limit } = parsePage(req);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.search) {
    const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { mobile: { $regex: escaped } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('name mobile city is_profile_complete is_blocked subscription.is_active subscription.expires_at createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return ApiResponse.success(res, 'Users fetched', {
    users,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
});

// PATCH /admin/users/:id/block
const blockUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  if (user.is_blocked) return ApiResponse.success(res, 'User already blocked');

  user.is_blocked = true;
  user.refresh_token = null;
  await user.save();

  logger.info(`Admin blocked user: ${user._id}`);
  return ApiResponse.success(res, 'User blocked');
});

// PATCH /admin/users/:id/unblock
const unblockUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  if (!user.is_blocked) return ApiResponse.success(res, 'User is not blocked');

  user.is_blocked = false;
  await user.save();

  logger.info(`Admin unblocked user: ${user._id}`);
  return ApiResponse.success(res, 'User unblocked');
});

// ═══════════════════════════════════════════════════════════════
// PART D — Subscription Plan Management
// ═══════════════════════════════════════════════════════════════

// GET /admin/plans
const listPlans = asyncHandler(async (req, res) => {
  const plans = await UserPlan.find().sort({ is_active: -1, price: 1 }).lean();
  return ApiResponse.success(res, 'Plans fetched', plans);
});

// POST /admin/plans
const createPlan = asyncHandler(async (req, res) => {
  const { name, price, duration_days, grace_days, booking_cap, description } = req.body;

  const plan = await UserPlan.create({
    name,
    price: Number(price),
    duration_days: Number(duration_days),
    grace_days: grace_days !== undefined ? Number(grace_days) : 7,
    booking_cap: booking_cap ? Number(booking_cap) : null,
    description,
    is_active: true,
  });

  logger.info(`Admin created plan: ${plan.name} ₹${plan.price}`);
  return ApiResponse.created(res, 'Plan created', plan);
});

// PATCH /admin/plans/:id
const updatePlan = asyncHandler(async (req, res) => {
  const plan = await UserPlan.findById(req.params.id);
  if (!plan) throw new AppError('Plan not found', 404);

  const { name, price, duration_days, grace_days, booking_cap, description } = req.body;

  if (name !== undefined) plan.name = name;
  if (price !== undefined) plan.price = Number(price);
  if (duration_days !== undefined) plan.duration_days = Number(duration_days);
  if (grace_days !== undefined) plan.grace_days = Number(grace_days);
  if (booking_cap !== undefined) plan.booking_cap = booking_cap === null ? null : Number(booking_cap);
  if (description !== undefined) plan.description = description;

  await plan.save();

  logger.info(`Admin updated plan: ${plan._id}`);
  return ApiResponse.success(res, 'Plan updated', plan);
});

// PATCH /admin/plans/:id/deactivate
const deactivatePlan = asyncHandler(async (req, res) => {
  const plan = await UserPlan.findById(req.params.id);
  if (!plan) throw new AppError('Plan not found', 404);
  if (!plan.is_active) return ApiResponse.success(res, 'Plan already inactive');

  plan.is_active = false;
  await plan.save();

  logger.info(`Admin deactivated plan: ${plan._id}`);
  return ApiResponse.success(res, 'Plan deactivated');
});

// ═══════════════════════════════════════════════════════════════
// PART E — Platform Dashboard Stats
// ═══════════════════════════════════════════════════════════════

// GET /admin/stats
const getDashboardStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    total_users,
    active_subscriptions,
    total_doctors,
    pending_doctors,
    bookings_today,
    revenueResult,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({
      'subscription.is_active': true,
      'subscription.expires_at': { $gt: now },
    }),
    Doctor.countDocuments({ approval_status: 'approved' }),
    Doctor.countDocuments({ approval_status: 'pending' }),
    Appointment.countDocuments({
      createdAt: { $gte: startOfToday },
      status: { $nin: ['cancelled', 'pending_payment'] },
    }),
    Payment.aggregate([
      {
        $match: {
          type: { $in: ['subscription', 'appointment'] },
          status: 'captured',
          createdAt: { $gte: startOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  return ApiResponse.success(res, 'Dashboard stats fetched', {
    total_users,
    active_subscriptions,
    total_doctors,
    pending_doctors,
    bookings_today,
    revenue_mtd: revenueResult[0]?.total || 0,
    generated_at: now.toISOString(),
  });
});

// ═══════════════════════════════════════════════════════════════
// PART F — Review Moderation
// ═══════════════════════════════════════════════════════════════

// GET /admin/reviews
const listReviews = asyncHandler(async (req, res) => {
  const { page, limit } = parsePage(req);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.hidden === 'true') filter.is_hidden = true;
  else if (req.query.hidden === 'false') filter.is_hidden = false;

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate('doctor_id', 'name specialization')
      .populate('patient_id', 'name')
      .select('rating comment is_hidden createdAt doctor_id patient_id')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);

  return ApiResponse.success(res, 'Reviews fetched', {
    reviews,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
});

// PATCH /admin/reviews/:id/hide
const hideReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError('Review not found', 404);
  if (review.is_hidden) return ApiResponse.success(res, 'Review already hidden');

  review.is_hidden = true;
  await review.save();

  // Recalculate so hidden review is excluded from doctor's score
  await Review.recalculateDoctorRating(review.doctor_id);

  return ApiResponse.success(res, 'Review hidden');
});

// PATCH /admin/reviews/:id/unhide
const unhideReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError('Review not found', 404);
  if (!review.is_hidden) return ApiResponse.success(res, 'Review already visible');

  review.is_hidden = false;
  await review.save();

  await Review.recalculateDoctorRating(review.doctor_id);

  return ApiResponse.success(res, 'Review unhidden');
});

module.exports = {
  // Auth
  login, getMe,
  // Doctors
  listDoctors, getDoctorDetail, approveDoctor, rejectDoctor,
  // Users
  listUsers, blockUser, unblockUser,
  // Plans
  listPlans, createPlan, updatePlan, deactivatePlan,
  // Stats
  getDashboardStats,
  // Reviews
  listReviews, hideReview, unhideReview,
};
