const express = require('express');
const router = express.Router();

const { verifyUser, verifyDoctor, verifyUserOrDoctor } = require('../middleware/auth');
const validate = require('../validators/validate');
const {
  createRules,
  updateRules,
  idRule,
  appointmentIdRule,
  myListRules,
} = require('../validators/prescription.validators');
const {
  createPrescription,
  updatePrescription,
  getMyPrescriptions,
  getPrescription,
  getPrescriptionByAppointment,
} = require('../controllers/prescription.controller');

// Static routes BEFORE /:id — prevents Express treating 'my' / 'appointment' as an ID param
router.get('/my', verifyUser, myListRules, validate, getMyPrescriptions);
router.get('/appointment/:appointmentId', verifyUserOrDoctor, appointmentIdRule, validate, getPrescriptionByAppointment);

// Doctor actions
router.post('/', verifyDoctor, createRules, validate, createPrescription);
router.patch('/:id', verifyDoctor, updateRules, validate, updatePrescription);

// Single prescription detail (user OR doctor)
router.get('/:id', verifyUserOrDoctor, idRule, validate, getPrescription);

module.exports = router;
