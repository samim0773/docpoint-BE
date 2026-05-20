const Doctor = require('../models/Doctor');
const DailySchedule = require('../models/DailySchedule');
const { getCityCoords } = require('../utils/citiesCoords');
const { getCache, setCache } = require('../utils/cache');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');

const SEARCH_TTL = 60; // seconds

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePage = (req) => ({
  page: Math.max(1, parseInt(req.query.page) || 1),
  limit: Math.min(Math.max(1, parseInt(req.query.limit) || 10), 50),
});

const todayUTC = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// ═══════════════════════════════════════════════════════════════
// GET /search/doctors
// ═══════════════════════════════════════════════════════════════
const searchDoctors = asyncHandler(async (req, res) => {
  const cacheKey = `search:${req.originalUrl}`;
  const cached = await getCache(cacheKey);
  if (cached) return ApiResponse.success(res, 'Doctors found', cached);

  const {
    city,
    specialization,
    language,
    max_fee,
    available_today,
    sort = 'distance',
  } = req.query;

  const { page, limit } = parsePage(req);
  const skip = (page - 1) * limit;

  const coords = getCityCoords(city.trim());
  if (!coords) {
    throw new AppError(
      `City "${city}" is not in our supported list. Try Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Pune, etc.`,
      400
    );
  }

  // ── Stage 1: geo filter (must be first in pipeline) ──────────
  const pipeline = [
    {
      $geoNear: {
        near: { type: 'Point', coordinates: coords },
        distanceField: 'distance_m',
        maxDistance: 50000, // 50 km
        spherical: true,
        query: {
          approval_status: 'approved',
          is_blocked: false,
          is_profile_complete: true,
        },
      },
    },
  ];

  // ── Stage 2: optional field filters ──────────────────────────
  if (specialization) {
    pipeline.push({
      $match: {
        specialization: { $regex: escapeRegex(specialization.trim()), $options: 'i' },
      },
    });
  }

  if (language) {
    // languages field is not yet in the Doctor model — filter is wired and ready
    pipeline.push({ $match: { languages: language.trim() } });
  }

  if (max_fee !== undefined) {
    pipeline.push({ $match: { consultation_fee: { $lte: Number(max_fee) } } });
  }

  // ── Stage 3: availability today (join DailySchedule) ─────────
  if (available_today === 'true') {
    const start = todayUTC();
    const end = new Date(start.getTime() + 86400000);

    pipeline.push(
      {
        $lookup: {
          from: 'dailyschedules',
          let: { did: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$doctor_id', '$$did'] },
                    { $lt: ['$booked_count', '$max_patients'] },
                  ],
                },
                date: { $gte: start, $lt: end },
                is_available: true,
                is_holiday: false,
              },
            },
            { $limit: 1 },
          ],
          as: '_avail',
        },
      },
      // Keep only doctors who have at least one matching schedule today
      { $match: { '_avail.0': { $exists: true } } }
    );
  }

  // ── Stage 4: sort + paginate + project via $facet ─────────────
  const sortStage =
    sort === 'rating' ? { $sort: { 'rating.average': -1, distance_m: 1 } } :
    sort === 'fee'    ? { $sort: { consultation_fee: 1, distance_m: 1 } } :
                        { $sort: { distance_m: 1 } };

  pipeline.push({
    $facet: {
      data: [
        sortStage,
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            name: 1,
            specialization: 1,
            rating: 1,
            consultation_fee: 1,
            avg_consult_minutes: 1,
            experience_years: 1,
            'clinic_address.city': 1,
            'clinic_address.state': 1,
            profile_photo: 1,
            languages: 1,
            distance_m: 1,
          },
        },
      ],
      total: [{ $count: 'count' }],
    },
  });

  const [result] = await Doctor.aggregate(pipeline);
  const total = result.total[0]?.count || 0;

  const payload = {
    doctors: result.data,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
  setCache(cacheKey, payload, SEARCH_TTL); // fire-and-forget

  return ApiResponse.success(res, 'Doctors found', payload);
});

// ═══════════════════════════════════════════════════════════════
// GET /search/doctors/:id
// ═══════════════════════════════════════════════════════════════
const getDoctorWithAvailability = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id)
    .select('-otp -refresh_token -subscription -__v')
    .lean();

  if (!doctor) throw new AppError('Doctor not found', 404);
  if (doctor.approval_status !== 'approved' || doctor.is_blocked) {
    throw new AppError('Doctor not available', 404);
  }

  const today = todayUTC();

  const nextSchedule = await DailySchedule.findOne({
    doctor_id: doctor._id,
    date: { $gte: today },
    is_available: true,
    is_holiday: false,
    $expr: { $lt: ['$booked_count', '$max_patients'] },
  })
    .sort({ date: 1 })
    .select('date max_patients booked_count queue_status')
    .lean();

  return ApiResponse.success(res, 'Doctor details fetched', {
    ...doctor,
    next_available_date: nextSchedule?.date
      ? nextSchedule.date.toISOString().split('T')[0]
      : null,
  });
});

module.exports = { searchDoctors, getDoctorWithAvailability };
