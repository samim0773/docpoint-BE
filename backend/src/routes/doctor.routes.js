const express = require('express');
const router = express.Router();

const { otpLimiter, authLimiter } = require('../middleware/rateLimiter');
const { verifyUser, verifyDoctor, verifyDoctorAny } = require('../middleware/auth');
const validate = require('../validators/validate');
const { sendOtpRules, verifyOtpRules } = require('../validators/user.validators');
const { registerDoctorRules, updateDoctorProfileRules, doctorIdRule } = require('../validators/doctor.validators');
const { uploadDoctorDoc, uploadProfilePhoto } = require('../config/cloudinary');

const { sendOtp, verifyOtp, refreshToken, logout } = require('../controllers/doctorAuth.controller');
const {
  registerDoctor,
  uploadDocuments,
  getDoctorPublicProfile,
  updateDoctorProfile,
  getDoctorAvailability,
  getDoctorDistance,
} = require('../controllers/doctorProfile.controller');

// ─── Auth ─────────────────────────────────────────────────────────
// Static routes MUST be declared before /:id param routes
router.post('/auth/send-otp', otpLimiter, sendOtpRules, validate, sendOtp);
router.post('/auth/verify-otp', authLimiter, verifyOtpRules, validate, verifyOtp);
router.post('/auth/refresh', refreshToken);
router.post('/auth/logout', logout);

// ─── Registration (unapproved doctors allowed) ────────────────────
router.post('/register', verifyDoctorAny, registerDoctorRules, validate, registerDoctor);
router.post(
  '/register/documents',
  verifyDoctorAny,
  uploadDoctorDoc.array('documents', 3),
  uploadDocuments
);

// ─── Profile (approved doctors only) ─────────────────────────────
router.patch(
  '/profile',
  verifyDoctor,
  uploadProfilePhoto.single('photo'),
  updateDoctorProfileRules,
  validate,
  updateDoctorProfile
);

// ─── Public param routes (must be after all static routes) ────────
router.get('/:id/availability', doctorIdRule, validate, getDoctorAvailability);
router.get('/:id/distance', doctorIdRule, validate, verifyUser, getDoctorDistance);
router.get('/:id', doctorIdRule, validate, getDoctorPublicProfile);

module.exports = router;
