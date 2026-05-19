const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const {
  verifyUserToken,
  verifyDoctorToken,
  verifyAdminToken,
} = require('../utils/jwt');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');

const extractBearer = (req) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
};

// ─── Patient / User ─────────────────────────────────────────────
const verifyUser = asyncHandler(async (req, res, next) => {
  const token = extractBearer(req);
  if (!token) throw new AppError('Authentication required', 401);

  const decoded = verifyUserToken(token);

  const user = await User.findById(decoded.id);
  if (!user) throw new AppError('User not found', 401);
  if (user.is_blocked) throw new AppError('Account blocked. Contact support.', 403);

  req.user = user;
  next();
});

// ─── Doctor ─────────────────────────────────────────────────────
const verifyDoctor = asyncHandler(async (req, res, next) => {
  const token = extractBearer(req);
  if (!token) throw new AppError('Authentication required', 401);

  const decoded = verifyDoctorToken(token);

  const doctor = await Doctor.findById(decoded.id);
  if (!doctor) throw new AppError('Doctor not found', 401);
  if (doctor.is_blocked) throw new AppError('Account blocked. Contact support.', 403);
  if (doctor.approval_status !== 'approved') {
    throw new AppError('Doctor account pending approval', 403);
  }

  req.doctor = doctor;
  next();
});

// ─── Admin ──────────────────────────────────────────────────────
const verifyAdmin = asyncHandler(async (req, res, next) => {
  const token = extractBearer(req);
  if (!token) throw new AppError('Authentication required', 401);

  const decoded = verifyAdminToken(token);

  const admin = await Admin.findById(decoded.id);
  if (!admin) throw new AppError('Admin not found', 401);
  if (!admin.is_active) throw new AppError('Admin account disabled', 403);

  req.admin = admin;
  next();
});

// ─── Optional user auth (doesn't fail if no token) ──────────────
const optionalUser = asyncHandler(async (req, res, next) => {
  const token = extractBearer(req);
  if (!token) return next();

  try {
    const decoded = verifyUserToken(token);
    const user = await User.findById(decoded.id);
    if (user && !user.is_blocked) req.user = user;
  } catch {
    // token invalid — just proceed as guest
  }
  next();
});

module.exports = { verifyUser, verifyDoctor, verifyAdmin, optionalUser };
