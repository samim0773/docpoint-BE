const express = require('express');
const router = express.Router();

const { verifyUser } = require('../middleware/auth');
const validate = require('../validators/validate');
const { addPatientRules, updatePatientRules, patientIdRule } = require('../validators/patient.validators');
const { addPatient, listPatients, updatePatient, deletePatient } = require('../controllers/patients.controller');

// All patient routes require authentication
router.use(verifyUser);

router.post('/', addPatientRules, validate, addPatient);
router.get('/', listPatients);
router.patch('/:id', updatePatientRules, validate, updatePatient);
router.delete('/:id', patientIdRule, validate, deletePatient);

module.exports = router;
