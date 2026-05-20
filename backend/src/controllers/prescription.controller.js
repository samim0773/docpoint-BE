const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Prescription = require('../models/Prescription');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');

// ─── POST /api/v1/prescriptions ──────────────────────────────────
const createPrescription = asyncHandler(async (req, res) => {
  const { appointment_id, medicines, notes, chief_complaint, diagnosis, vitals, follow_up_date } =
    req.body;
  const doctorId = req.doctor._id;

  const appt = await Appointment.findById(appointment_id);
  if (!appt) throw new AppError('Appointment not found', 404);
  if (String(appt.doctor_id) !== String(doctorId)) {
    throw new AppError('Not your appointment', 403);
  }
  if (appt.status !== 'done') {
    throw new AppError('Prescription can only be written for completed appointments', 400);
  }

  const existing = await Prescription.exists({ appointment_id });
  if (existing) throw new AppError('Prescription already exists for this appointment', 409);

  const prescription = await Prescription.create({
    appointment_id,
    doctor_id: doctorId,
    patient_id: appt.patient_id,
    user_id: appt.user_id,
    medicines: medicines || [],
    notes,
    chief_complaint,
    diagnosis,
    vitals,
    follow_up_date,
  });

  await Appointment.findByIdAndUpdate(appointment_id, { prescription_id: prescription._id });

  res.status(201).json({ success: true, data: prescription });
});

// ─── PATCH /api/v1/prescriptions/:id ─────────────────────────────
const updatePrescription = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const doctorId = req.doctor._id;

  const prescription = await Prescription.findById(id);
  if (!prescription) throw new AppError('Prescription not found', 404);
  if (String(prescription.doctor_id) !== String(doctorId)) {
    throw new AppError('Not your prescription', 403);
  }

  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  if (Date.now() - prescription.createdAt.getTime() > TWENTY_FOUR_HOURS) {
    throw new AppError('Prescription can only be edited within 24 hours of creation', 403);
  }

  const { medicines, notes, chief_complaint, diagnosis, vitals, follow_up_date } = req.body;
  if (medicines !== undefined) prescription.medicines = medicines;
  if (notes !== undefined) prescription.notes = notes;
  if (chief_complaint !== undefined) prescription.chief_complaint = chief_complaint;
  if (diagnosis !== undefined) prescription.diagnosis = diagnosis;
  if (vitals !== undefined) prescription.vitals = vitals;
  if (follow_up_date !== undefined) prescription.follow_up_date = follow_up_date;

  await prescription.save();

  res.json({ success: true, data: prescription });
});

// ─── GET /api/v1/prescriptions/my ────────────────────────────────
const getMyPrescriptions = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const patients = await Patient.find({ user_id: userId, is_deleted: false }, '_id');
  const patientIds = patients.map((p) => p._id);

  const filter = { patient_id: { $in: patientIds } };

  const [total, prescriptions] = await Promise.all([
    Prescription.countDocuments(filter),
    Prescription.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('doctor_id', 'name specialization')
      .populate('patient_id', 'name'),
  ]);

  res.json({
    success: true,
    data: prescriptions,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
});

// ─── GET /api/v1/prescriptions/:id ───────────────────────────────
const getPrescription = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const prescription = await Prescription.findById(id)
    .populate('doctor_id', 'name specialization mobile')
    .populate('patient_id', 'name age gender');

  if (!prescription) throw new AppError('Prescription not found', 404);

  if (req.user) {
    const owned = await Patient.exists({
      _id: prescription.patient_id._id,
      user_id: req.user._id,
      is_deleted: false,
    });
    if (!owned) throw new AppError('Access denied', 403);
  } else {
    // req.doctor is set by verifyUserOrDoctor
    if (String(prescription.doctor_id._id) !== String(req.doctor._id)) {
      throw new AppError('Access denied', 403);
    }
  }

  res.json({ success: true, data: prescription });
});

// ─── GET /api/v1/prescriptions/appointment/:appointmentId ────────
const getPrescriptionByAppointment = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;

  const appt = await Appointment.findById(appointmentId);
  if (!appt) throw new AppError('Appointment not found', 404);

  if (req.user && String(appt.user_id) !== String(req.user._id)) {
    throw new AppError('Access denied', 403);
  }
  if (req.doctor && String(appt.doctor_id) !== String(req.doctor._id)) {
    throw new AppError('Access denied', 403);
  }

  const prescription = await Prescription.findOne({ appointment_id: appointmentId })
    .populate('doctor_id', 'name specialization mobile')
    .populate('patient_id', 'name age gender');

  if (!prescription) throw new AppError('No prescription found for this appointment', 404);

  res.json({ success: true, data: prescription });
});

module.exports = {
  createPrescription,
  updatePrescription,
  getMyPrescriptions,
  getPrescription,
  getPrescriptionByAppointment,
};
