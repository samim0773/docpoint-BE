const express = require('express');
const router = express.Router();

const { verifyUser, verifyAdmin } = require('../middleware/auth');
const validate = require('../validators/validate');
const {
  createRules,
  doctorIdRule,
  visibilityRule,
  paginationRules,
} = require('../validators/review.validators');
const {
  createReview,
  getMyReviews,
  getDoctorReviews,
  setVisibility,
} = require('../controllers/review.controller');

// Static routes before /:id
router.get('/my', verifyUser, paginationRules, validate, getMyReviews);
router.get('/doctor/:doctorId', doctorIdRule, paginationRules, validate, getDoctorReviews);

// Submit review
router.post('/', verifyUser, createRules, validate, createReview);

// Admin toggle
router.patch('/:id/visibility', verifyAdmin, visibilityRule, validate, setVisibility);

module.exports = router;
