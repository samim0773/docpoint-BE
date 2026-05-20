const express = require('express');
const router = express.Router();

const validate = require('../validators/validate');
const { searchRules, doctorIdRule } = require('../validators/search.validators');
const { searchDoctors, getDoctorWithAvailability } = require('../controllers/search.controller');

const { searchLimiter } = require('../middleware/rateLimiter');

// Static before param
router.get('/doctors', searchLimiter, searchRules, validate, searchDoctors);
router.get('/doctors/:id', doctorIdRule, validate, getDoctorWithAvailability);

module.exports = router;
