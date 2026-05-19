const User = require('../models/User');
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
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  REFRESH_COOKIE_OPTIONS,
  CLEAR_COOKIE_OPTIONS,
} = require('../utils/jwt');
const { sendOTP } = require('../services/sms');
const logger = require('../config/logger');

// ─── POST /users/auth/send-otp ───────────────────────────────────
const sendOtp = asyncHandler(async (req, res) => {
  const { mobile } = req.body;

  let user = await User.findOne({ mobile });

  if (user) {
    if (user.is_blocked) throw new AppError('Account blocked. Contact support.', 403);

    if (!isResendAllowed(user.otp?.last_sent_at)) {
      throw new AppError('Please wait 30 seconds before requesting a new OTP.', 429);
    }
  }

  const otp = generateOTP();
  const otpPayload = buildOTPPayload(otp);

  if (user) {
    user.otp = otpPayload;
    await user.save();
  } else {
    user = await User.create({ mobile, otp: otpPayload });
  }

  await sendOTP(mobile, otp);

  const responseData = { mobile };
  if (process.env.NODE_ENV !== 'production') {
    responseData.otp = otp;
  }

  return ApiResponse.success(res, 'OTP sent successfully', responseData);
});

// ─── POST /users/auth/verify-otp ────────────────────────────────
const verifyOtp = asyncHandler(async (req, res) => {
  const { mobile, otp } = req.body;

  const user = await User.findOne({ mobile }).select('+refresh_token');
  if (!user) throw new AppError('No OTP requested for this number', 400);
  if (user.is_blocked) throw new AppError('Account blocked. Contact support.', 403);

  const stored = user.otp;

  if (!stored?.code) throw new AppError('No active OTP. Request a new one.', 400);
  if (isOTPExpired(stored.expires_at)) throw new AppError('OTP expired. Request a new one.', 400);
  if (isMaxAttemptsReached(stored.attempts)) {
    throw new AppError('Too many incorrect attempts. Request a new OTP.', 429);
  }

  if (stored.code !== otp) {
    user.otp.attempts += 1;
    await user.save();
    const remaining = 3 - user.otp.attempts;
    throw new AppError(
      remaining > 0
        ? `Invalid OTP. ${remaining} attempt(s) remaining.`
        : 'Too many incorrect attempts. Request a new OTP.',
      400
    );
  }

  // OTP correct — clear it and issue tokens
  user.otp = {};
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refresh_token = hashToken(refreshToken);
  await user.save();

  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

  logger.info(`User authenticated: ${user._id} (${mobile})`);

  return ApiResponse.success(res, 'Login successful', {
    access_token: accessToken,
    user: {
      id: user._id,
      mobile: user.mobile,
      name: user.name,
      city: user.city,
      is_profile_complete: user.is_profile_complete,
      subscription: {
        is_active: user.subscription?.is_active || false,
        expires_at: user.subscription?.expires_at || null,
      },
    },
  });
});

// ─── POST /users/auth/refresh ────────────────────────────────────
const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new AppError('Refresh token missing', 401);

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await User.findById(decoded.id).select('+refresh_token');
  if (!user) throw new AppError('User not found', 401);
  if (user.is_blocked) throw new AppError('Account blocked. Contact support.', 403);

  const hashedIncoming = hashToken(token);
  if (user.refresh_token !== hashedIncoming) {
    throw new AppError('Refresh token revoked. Please login again.', 401);
  }

  // Token rotation — issue new pair
  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);
  user.refresh_token = hashToken(newRefreshToken);
  await user.save();

  res.cookie('refreshToken', newRefreshToken, REFRESH_COOKIE_OPTIONS);

  return ApiResponse.success(res, 'Token refreshed', { access_token: newAccessToken });
});

// ─── POST /users/auth/logout ─────────────────────────────────────
const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (token) {
    try {
      const decoded = verifyRefreshToken(token);
      await User.findByIdAndUpdate(decoded.id, { refresh_token: null });
    } catch {
      // token already invalid — still clear cookie
    }
  }

  res.clearCookie('refreshToken', CLEAR_COOKIE_OPTIONS);
  return ApiResponse.success(res, 'Logged out successfully');
});

module.exports = { sendOtp, verifyOtp, refreshToken, logout };
