const express = require('express');
const router = express.Router();

const { verifyAdmin } = require('../middleware/auth');
const validate = require('../validators/validate');
const {
  loginRules,
  rejectDoctorRules,
  createPlanRules,
  updatePlanRules,
  doctorIdRule,
  userIdRule,
  planIdRule,
  reviewIdRule,
} = require('../validators/admin.validators');

const {
  login, getMe,
  listDoctors, getDoctorDetail, approveDoctor, rejectDoctor,
  listUsers, blockUser, unblockUser,
  listPlans, createPlan, updatePlan, deactivatePlan,
  getDashboardStats,
  listReviews, hideReview, unhideReview,
} = require('../controllers/admin.controller');

// ─── Auth ─────────────────────────────────────────────────────────
router.post('/auth/login', loginRules, validate, login);
router.get('/auth/me', verifyAdmin, getMe);

// ─── Doctor Management ────────────────────────────────────────────
router.get('/doctors', verifyAdmin, listDoctors);
router.get('/doctors/:id', verifyAdmin, doctorIdRule, validate, getDoctorDetail);
router.patch('/doctors/:id/approve', verifyAdmin, doctorIdRule, validate, approveDoctor);
router.patch('/doctors/:id/reject', verifyAdmin, rejectDoctorRules, validate, rejectDoctor);

// ─── User Management ─────────────────────────────────────────────
router.get('/users', verifyAdmin, listUsers);
router.patch('/users/:id/block', verifyAdmin, userIdRule, validate, blockUser);
router.patch('/users/:id/unblock', verifyAdmin, userIdRule, validate, unblockUser);

// ─── Subscription Plan Management ────────────────────────────────
router.get('/plans', verifyAdmin, listPlans);
router.post('/plans', verifyAdmin, createPlanRules, validate, createPlan);
router.patch('/plans/:id', verifyAdmin, updatePlanRules, validate, updatePlan);
router.patch('/plans/:id/deactivate', verifyAdmin, planIdRule, validate, deactivatePlan);

// ─── Dashboard Stats ─────────────────────────────────────────────
router.get('/stats', verifyAdmin, getDashboardStats);

// ─── Review Moderation ────────────────────────────────────────────
router.get('/reviews', verifyAdmin, listReviews);
router.patch('/reviews/:id/hide', verifyAdmin, reviewIdRule, validate, hideReview);
router.patch('/reviews/:id/unhide', verifyAdmin, reviewIdRule, validate, unhideReview);

module.exports = router;
