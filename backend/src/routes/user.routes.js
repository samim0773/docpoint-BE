const express = require('express');
const router = express.Router();

const { otpLimiter, authLimiter } = require('../middleware/rateLimiter');
const { verifyUser } = require('../middleware/auth');
const validate = require('../validators/validate');
const {
  sendOtpRules,
  verifyOtpRules,
  updateProfileRules,
  completeProfileRules,
} = require('../validators/user.validators');
const { uploadProfilePhoto } = require('../config/cloudinary');

const { sendOtp, verifyOtp, refreshToken, logout } = require('../controllers/userAuth.controller');
const { getMe, updateMe, completeProfile } = require('../controllers/userProfile.controller');

// ─── Auth ────────────────────────────────────────────────────────
router.post('/auth/send-otp', otpLimiter, sendOtpRules, validate, sendOtp);
router.post('/auth/verify-otp', authLimiter, verifyOtpRules, validate, verifyOtp);
router.post('/auth/refresh', refreshToken);
router.post('/auth/logout', logout);

// ─── Profile (protected) ─────────────────────────────────────────
router.get('/me', verifyUser, getMe);
router.patch('/me', verifyUser, uploadProfilePhoto.single('photo'), updateProfileRules, validate, updateMe);
router.patch('/me/complete-profile', verifyUser, completeProfileRules, validate, completeProfile);

module.exports = router;
