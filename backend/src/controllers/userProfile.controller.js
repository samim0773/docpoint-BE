const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

// ─── GET /users/me ───────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  const user = req.user;
  return ApiResponse.success(res, 'Profile fetched', {
    id: user._id,
    mobile: user.mobile,
    name: user.name,
    city: user.city,
    state: user.state,
    photo: user.photo,
    is_profile_complete: user.is_profile_complete,
    subscription: {
      is_active: user.hasActiveSubscription(),
      is_in_grace: user.isInGracePeriod(),
      expires_at: user.subscription?.expires_at || null,
      grace_until: user.subscription?.grace_until || null,
    },
    createdAt: user.createdAt,
  });
});

// ─── PATCH /users/me ─────────────────────────────────────────────
const updateMe = asyncHandler(async (req, res) => {
  const { name, city, state } = req.body;
  const user = req.user;

  if (name !== undefined) user.name = name.trim();
  if (city !== undefined) user.city = city.trim();
  if (state !== undefined) user.state = state.trim();

  // photo uploaded via multer-cloudinary — req.file.path is the Cloudinary URL
  if (req.file) {
    user.photo = req.file.path;
  }

  await user.save();

  return ApiResponse.success(res, 'Profile updated', {
    id: user._id,
    name: user.name,
    city: user.city,
    state: user.state,
    photo: user.photo,
  });
});

// ─── PATCH /users/me/complete-profile ───────────────────────────
const completeProfile = asyncHandler(async (req, res) => {
  const { name, city, state } = req.body;
  const user = req.user;

  if (user.is_profile_complete) {
    throw new AppError('Profile already completed', 400);
  }

  user.name = name.trim();
  user.city = city.trim();
  user.state = state.trim();
  user.is_profile_complete = true;

  await user.save();

  return ApiResponse.success(res, 'Profile completed successfully', {
    id: user._id,
    name: user.name,
    city: user.city,
    state: user.state,
    is_profile_complete: user.is_profile_complete,
  });
});

module.exports = { getMe, updateMe, completeProfile };
