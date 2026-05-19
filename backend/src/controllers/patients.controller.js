const Patient = require('../models/Patient');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const MAX_PATIENTS = 6;

// ─── POST /patients ──────────────────────────────────────────────
const addPatient = asyncHandler(async (req, res) => {
  const count = await Patient.countDocuments({
    user_id: req.user._id,
    is_deleted: false,
  });

  if (count >= MAX_PATIENTS) {
    throw new AppError(`You can add a maximum of ${MAX_PATIENTS} family members.`, 400);
  }

  const { name, age, gender, relation, blood_group } = req.body;

  const patient = await Patient.create({
    user_id: req.user._id,
    name,
    age,
    gender,
    relation: relation || 'self',
    blood_group: blood_group || null,
  });

  return ApiResponse.created(res, 'Patient added successfully', patient);
});

// ─── GET /patients ───────────────────────────────────────────────
const listPatients = asyncHandler(async (req, res) => {
  const patients = await Patient.find({
    user_id: req.user._id,
    is_deleted: false,
  }).sort({ createdAt: 1 });

  return ApiResponse.success(res, 'Patients fetched', patients);
});

// ─── PATCH /patients/:id ─────────────────────────────────────────
const updatePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({
    _id: req.params.id,
    user_id: req.user._id,
    is_deleted: false,
  });

  if (!patient) throw new AppError('Patient not found', 404);

  const { name, age, gender, relation, blood_group } = req.body;

  if (name !== undefined) patient.name = name;
  if (age !== undefined) patient.age = age;
  if (gender !== undefined) patient.gender = gender;
  if (relation !== undefined) patient.relation = relation;
  if (blood_group !== undefined) patient.blood_group = blood_group;

  await patient.save();

  return ApiResponse.success(res, 'Patient updated', patient);
});

// ─── DELETE /patients/:id ────────────────────────────────────────
const deletePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({
    _id: req.params.id,
    user_id: req.user._id,
    is_deleted: false,
  });

  if (!patient) throw new AppError('Patient not found', 404);

  patient.is_deleted = true;
  await patient.save();

  return ApiResponse.success(res, 'Patient removed');
});

module.exports = { addPatient, listPatients, updatePatient, deletePatient };
