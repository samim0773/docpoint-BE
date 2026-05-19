const Doctor = require('../models/Doctor');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const { hashToken } = require('../utils/tokenHash');
const {
  generateOTP,
  isResendAllowed,
  buildOTPPayload,
  isOTPExpired,
  isMaxAttemptsReached,
} = require('../utils/otp');
const {
  generateDoctorAccessToken,
  generateDoctorRefreshToken,
  verifyRefreshToken,
  REFRESH_COOKIE_OPTIONS,
  CLEAR_COOKIE_OPTIONS,
} = require('../utils/jwt');
const { sendOTP } = require('../services/sms');
const logger = require('../config/logger');

// ─── POST /doctors/auth/send-otp ─────────────────────────────────
const sendOtp = asyncHandler(async (req, res) => {
  const { mobile } = req.body;

  let doctor = await Doctor.findOne({ mobile });

  if (doctor) {
    if (doctor.is_blocked) throw new AppError('Account blocked. Contact support.', 403);
    if (!isResendAllowed(doctor.otp?.last_sent_at)) {
      throw new AppError('Please wait 30 seconds before requesting a new OTP.', 429);
    }
  }

  const otp = generateOTP();
  const otpPayload = buildOTPPayload(otp);

  if (doctor) {
    doctor.otp = otpPayload;
    await doctor.save();
  } else {
    doctor = await Doctor.create({ mobile, otp: otpPayload });
  }

  await sendOTP(mobile, otp);

  const responseData = { mobile };
  if (process.env.NODE_ENV !== 'production') responseData.otp = otp;

  return ApiResponse.success(res, 'OTP sent successfully', responseData);
});

// ─── POST /doctors/auth/verify-otp ───────────────────────────────
const verifyOtp = asyncHandler(async (req, res) => {
  const { mobile, otp } = req.body;

  const doctor = await Doctor.findOne({ mobile }).select('+refresh_token');
  if (!doctor) throw new AppError('No OTP requested for this number', 400);
  if (doctor.is_blocked) throw new AppError('Account blocked. Contact support.', 403);

  const stored = doctor.otp;
  if (!stored?.code) throw new AppError('No active OTP. Request a new one.', 400);
  if (isOTPExpired(stored.expires_at)) throw new AppError('OTP expired. Request a new one.', 400);
  if (isMaxAttemptsReached(stored.attempts)) {
    throw new AppError('Too many incorrect attempts. Request a new OTP.', 429);
  }

  if (stored.code !== otp) {
    doctor.otp.attempts += 1;
    await doctor.save();
    const remaining = 3 - doctor.otp.attempts;
    throw new AppError(
      remaining > 0
        ? `Invalid OTP. ${remaining} attempt(s) remaining.`
        : 'Too many incorrect attempts. Request a new OTP.',
      400
    );
  }

  doctor.otp = {};
  const accessToken = generateDoctorAccessToken(doctor._id);
  const refreshToken = generateDoctorRefreshToken(doctor._id);
  doctor.refresh_token = hashToken(refreshToken);
  await doctor.save();

  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

  logger.info(`Doctor authenticated: ${doctor._id} (${mobile})`);

  return ApiResponse.success(res, 'Login successful', {
    access_token: accessToken,
    doctor: {
      id: doctor._id,
      mobile: doctor.mobile,
      name: doctor.name,
      approval_status: doctor.approval_status,
      is_profile_complete: doctor.is_profile_complete,
      subscription: {
        is_active: doctor.subscription?.is_active || false,
        tier: doctor.subscription?.tier || 'basic',
        expires_at: doctor.subscription?.expires_at || null,
      },
    },
  });
});

// ─── POST /doctors/auth/refresh ──────────────────────────────────
const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new AppError('Refresh token missing', 401);

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  if (decoded.role !== 'doctor') throw new AppError('Invalid token type', 401);

  const doctor = await Doctor.findById(decoded.id).select('+refresh_token');
  if (!doctor) throw new AppError('Doctor not found', 401);
  if (doctor.is_blocked) throw new AppError('Account blocked. Contact support.', 403);

  if (doctor.refresh_token !== hashToken(token)) {
    throw new AppError('Refresh token revoked. Please login again.', 401);
  }

  const newAccessToken = generateDoctorAccessToken(doctor._id);
  const newRefreshToken = generateDoctorRefreshToken(doctor._id);
  doctor.refresh_token = hashToken(newRefreshToken);
  await doctor.save();

  res.cookie('refreshToken', newRefreshToken, REFRESH_COOKIE_OPTIONS);

  return ApiResponse.success(res, 'Token refreshed', { access_token: newAccessToken });
});

// ─── POST /doctors/auth/logout ───────────────────────────────────
const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (token) {
    try {
      const decoded = verifyRefreshToken(token);
      if (decoded.role === 'doctor') {
        await Doctor.findByIdAndUpdate(decoded.id, { refresh_token: null });
      }
    } catch {
      // token already invalid — still clear cookie
    }
  }

  res.clearCookie('refreshToken', CLEAR_COOKIE_OPTIONS);
  return ApiResponse.success(res, 'Logged out successfully');
});

module.exports = { sendOtp, verifyOtp, refreshToken, logout };
