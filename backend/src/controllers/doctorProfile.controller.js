const Doctor = require('../models/Doctor');
const DailySchedule = require('../models/DailySchedule');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const { getCityCoords } = require('../utils/citiesCoords');
const { getDriveTime } = require('../services/maps');

// ─── POST /doctors/register ──────────────────────────────────────
const registerDoctor = asyncHandler(async (req, res) => {
  const doctor = req.doctor;

  if (doctor.approval_status === 'approved') {
    throw new AppError('Profile already approved. Use PATCH /doctors/profile to update.', 400);
  }

  const {
    name, email, gender, specialization, qualification,
    experience_years, registration_number, clinic_name,
    clinic_address, consultation_fee, avg_consult_minutes, bio,
  } = req.body;

  // Derive geo coordinates from clinic city
  const coords = getCityCoords(clinic_address?.city);
  if (!coords) {
    throw new AppError(
      `City "${clinic_address?.city}" not found in our database. ` +
      'Please contact support to add it, or choose the nearest supported city.',
      400
    );
  }

  doctor.name = name;
  if (email) doctor.email = email;
  doctor.gender = gender;
  doctor.specialization = specialization;
  doctor.qualification = Array.isArray(qualification) ? qualification : [qualification];
  doctor.experience_years = Number(experience_years);
  doctor.registration_number = registration_number;
  doctor.clinic_name = clinic_name;
  doctor.clinic_address = clinic_address;
  doctor.location = { type: 'Point', coordinates: coords };
  doctor.consultation_fee = Number(consultation_fee);
  if (avg_consult_minutes) doctor.avg_consult_minutes = Number(avg_consult_minutes);
  if (bio) doctor.bio = bio;
  doctor.is_profile_complete = true;

  await doctor.save();

  return ApiResponse.success(res, 'Profile registered. Awaiting admin approval.', {
    id: doctor._id,
    name: doctor.name,
    approval_status: doctor.approval_status,
    is_profile_complete: doctor.is_profile_complete,
  });
});

// ─── POST /doctors/register/documents ───────────────────────────
const uploadDocuments = asyncHandler(async (req, res) => {
  const doctor = req.doctor;

  if (!req.files || req.files.length === 0) {
    throw new AppError('No documents uploaded', 400);
  }

  const MAX_DOCS = 5;
  const currentCount = doctor.documents?.length || 0;
  const incoming = req.files.length;

  if (currentCount + incoming > MAX_DOCS) {
    throw new AppError(`You can upload a maximum of ${MAX_DOCS} documents total.`, 400);
  }

  // Names can optionally be supplied as req.body.names (JSON array string or comma-separated)
  let names = [];
  if (req.body.names) {
    try {
      names = JSON.parse(req.body.names);
    } catch {
      names = String(req.body.names).split(',').map((n) => n.trim());
    }
  }

  const newDocs = req.files.map((file, idx) => ({
    name: names[idx] || file.originalname,
    url: file.path,       // Cloudinary secure URL
    public_id: file.filename, // Cloudinary public_id
  }));

  doctor.documents.push(...newDocs);
  await doctor.save();

  return ApiResponse.success(res, `${incoming} document(s) uploaded`, {
    documents: doctor.documents,
  });
});

// ─── GET /doctors/:id ────────────────────────────────────────────
const getDoctorPublicProfile = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({
    _id: req.params.id,
    approval_status: 'approved',
    is_blocked: false,
  }).select(
    'name gender specialization qualification experience_years clinic_name ' +
    'clinic_address consultation_fee avg_consult_minutes bio profile_photo ' +
    'rating subscription.tier createdAt'
  );

  if (!doctor) throw new AppError('Doctor not found', 404);

  return ApiResponse.success(res, 'Doctor profile fetched', doctor);
});

// ─── PATCH /doctors/profile ──────────────────────────────────────
const updateDoctorProfile = asyncHandler(async (req, res) => {
  const doctor = req.doctor;

  const {
    name, email, clinic_name, clinic_address,
    consultation_fee, avg_consult_minutes, bio,
  } = req.body;

  if (name !== undefined) doctor.name = name;
  if (email !== undefined) doctor.email = email;
  if (clinic_name !== undefined) doctor.clinic_name = clinic_name;
  if (consultation_fee !== undefined) doctor.consultation_fee = Number(consultation_fee);
  if (avg_consult_minutes !== undefined) doctor.avg_consult_minutes = Number(avg_consult_minutes);
  if (bio !== undefined) doctor.bio = bio;

  if (clinic_address) {
    doctor.clinic_address = { ...doctor.clinic_address?.toObject?.() ?? {}, ...clinic_address };

    // If city changed, update geo coordinates
    if (clinic_address.city) {
      const coords = getCityCoords(clinic_address.city);
      if (!coords) throw new AppError(`City "${clinic_address.city}" not found in our database.`, 400);
      doctor.location = { type: 'Point', coordinates: coords };
    }
  }

  // Profile photo uploaded via multer-cloudinary
  if (req.file) {
    doctor.profile_photo = req.file.path;
  }

  await doctor.save();

  return ApiResponse.success(res, 'Profile updated', {
    id: doctor._id,
    name: doctor.name,
    clinic_name: doctor.clinic_name,
    clinic_address: doctor.clinic_address,
    consultation_fee: doctor.consultation_fee,
    avg_consult_minutes: doctor.avg_consult_minutes,
  });
});

// ─── GET /doctors/:id/availability ───────────────────────────────
const getDoctorAvailability = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({
    _id: req.params.id,
    approval_status: 'approved',
    is_blocked: false,
  }).select('_id avg_consult_minutes');

  if (!doctor) throw new AppError('Doctor not found', 404);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thirtyDaysLater = new Date(today);
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

  const schedules = await DailySchedule.find({
    doctor_id: doctor._id,
    date: { $gte: today, $lte: thirtyDaysLater },
    is_available: true,
    is_holiday: false,
  })
    .select('date max_patients booked_count slots queue_status avg_consult_minutes')
    .sort({ date: 1 })
    .lean();

  const availability = schedules.map((s) => ({
    date: s.date,
    slots: s.slots,
    max_patients: s.max_patients,
    booked_count: s.booked_count,
    remaining_slots: Math.max(0, s.max_patients - s.booked_count),
    is_full: s.booked_count >= s.max_patients,
    queue_status: s.queue_status,
    avg_consult_minutes: s.avg_consult_minutes || doctor.avg_consult_minutes,
  }));

  return ApiResponse.success(res, 'Availability fetched', {
    doctor_id: doctor._id,
    available_dates: availability,
    total_available_days: availability.filter((d) => !d.is_full).length,
  });
});

// ─── GET /doctors/:id/distance ───────────────────────────────────
const getDoctorDistance = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({
    _id: req.params.id,
    approval_status: 'approved',
    is_blocked: false,
  }).select('name clinic_address');

  if (!doctor) throw new AppError('Doctor not found', 404);

  const userCity = req.user.city;
  const doctorCity = doctor.clinic_address?.city;

  if (!userCity) throw new AppError('Please complete your profile with your city first.', 400);
  if (!doctorCity) throw new AppError('Doctor clinic city not available.', 400);

  const result = await getDriveTime(userCity, doctorCity);

  if (!result) {
    return ApiResponse.success(res, 'Distance info unavailable', {
      from: userCity,
      to: doctorCity,
      available: false,
    });
  }

  return ApiResponse.success(res, 'Distance fetched', {
    from: result.origin,
    to: result.destination,
    distance_text: result.distance_text,
    distance_meters: result.distance_meters,
    duration_text: result.duration_text,
    duration_seconds: result.duration_seconds,
    available: true,
  });
});

module.exports = {
  registerDoctor,
  uploadDocuments,
  getDoctorPublicProfile,
  updateDoctorProfile,
  getDoctorAvailability,
  getDoctorDistance,
};
