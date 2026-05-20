# DocPoint — Development Progress

## Progress Bar
```
Backend  [██████░░░░░░░░░] 6/15 steps  (40%)
Frontend [░░░░░░░░░░░] 0/10 steps  (0%)
Overall  [██████░░░░░░░░░░░░░░░░░░░] 6/25 steps  (24%)
```

---

## BACKEND STEPS

| # | Step | Status | Key Files |
|---|------|--------|-----------|
| 1 | Project Setup + All 10 Models + Server Scaffold | ✅ DONE | package.json, server.js, src/config/*, src/models/* (10 models) |
| 2 | User Auth — OTP + JWT + Refresh + Auth Middleware | ✅ DONE | src/models/Admin.js, src/services/sms.js, src/utils/(jwt,otp,tokenHash).js, src/middleware/auth.js, src/controllers/(userAuth,userProfile).controller.js |
| 3 | Family Patients CRUD + User Subscription + Razorpay Webhook | ✅ DONE | src/services/razorpay.js, src/controllers/(patients,subscription).controller.js, src/routes/(patient,subscription).routes.js |
| 4 | Doctor Auth + Registration + Profile + Cloudinary + Distance | ✅ DONE | src/utils/citiesCoords.js, src/services/maps.js, src/validators/doctor.validators.js, src/controllers/(doctorAuth,doctorProfile).controller.js, src/routes/doctor.routes.js |
| 5 | Admin Auth + Doctor Approval + User Mgmt + Plan Mgmt + Stats | ✅ DONE | src/validators/admin.validators.js, src/controllers/admin.controller.js, src/routes/admin.routes.js |
| 6 | Doctor Schedule — Weekly Template + Daily Auto-gen (Cron) | ✅ DONE | src/validators/schedule.validators.js, src/controllers/schedule.controller.js, src/routes/schedule.routes.js, src/jobs/scheduleGenerator.js |
| 7 | Doctor Search — Geo + Atlas Search + Filters + Distance | ⏳ NEXT | |
| 8 | Booking System — Create + Confirm + Cancel + Refund | ⏳ | |
| 9 | Doctor Queue Mgmt — Call/Done/No-show + Pause/Resume | ⏳ | |
| 10 | Real-Time Queue — Socket.IO + MongoDB Change Streams | ⏳ | |
| 11 | Prescriptions — Write + History + Edit (24hr window) | ⏳ | |
| 12 | Reviews + Rating Aggregation | ⏳ | |
| 13 | SMS Jobs — Bull MQ + MSG91 (Booking, Cancel, Queue Alert) | ⏳ | |
| 14 | Production Hardening — Redis Cache + Security + PM2 | ⏳ | |

---

## FRONTEND STEPS

| # | Step | Status |
|---|------|--------|
| 15 | Angular Setup + Routing + Auth Guards + HTTP Interceptors | ⏳ |
| 16 | OTP Login Screen + Profile Completion | ⏳ |
| 17 | Family Patients Management | ⏳ |
| 18 | Subscription Payment Screen (Razorpay) | ⏳ |
| 19 | Doctor Registration Form (Multi-step) | ⏳ |
| 20 | Doctor Search + Filters + Results Page | ⏳ |
| 21 | Doctor Detail + Calendar + Booking Flow | ⏳ |
| 22 | Live Queue Tracker (Socket.IO) | ⏳ |
| 23 | Prescriptions + Reviews Screens | ⏳ |
| 24 | Admin Panel — Approval + Users + Plans + Stats Dashboard | ⏳ |

---

## Step 5 — What Was Built

### New Files
```
src/
├── validators/
│   └── admin.validators.js         # loginRules, rejectDoctorRules, createPlanRules, updatePlanRules + shared ID param validators
├── controllers/
│   └── admin.controller.js         # All 17 admin actions in 6 parts (A–F)
└── routes/
    └── admin.routes.js             # All /api/v1/admin/* routes with verifyAdmin + validators
```

### Updated Files
- `server.js` — registered `/api/v1/admin`

### Route Map (Step 5)
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | /api/v1/admin/auth/login | Public |
| GET | /api/v1/admin/auth/me | verifyAdmin |
| GET | /api/v1/admin/doctors | verifyAdmin |
| GET | /api/v1/admin/doctors/:id | verifyAdmin |
| PATCH | /api/v1/admin/doctors/:id/approve | verifyAdmin |
| PATCH | /api/v1/admin/doctors/:id/reject | verifyAdmin |
| GET | /api/v1/admin/users | verifyAdmin |
| PATCH | /api/v1/admin/users/:id/block | verifyAdmin |
| PATCH | /api/v1/admin/users/:id/unblock | verifyAdmin |
| GET | /api/v1/admin/plans | verifyAdmin |
| POST | /api/v1/admin/plans | verifyAdmin |
| PATCH | /api/v1/admin/plans/:id | verifyAdmin |
| PATCH | /api/v1/admin/plans/:id/deactivate | verifyAdmin |
| GET | /api/v1/admin/stats | verifyAdmin |
| GET | /api/v1/admin/reviews | verifyAdmin |
| PATCH | /api/v1/admin/reviews/:id/hide | verifyAdmin |
| PATCH | /api/v1/admin/reviews/:id/unhide | verifyAdmin |

### Key Design Decisions
- **No refresh token for admin**: 8-hour JWT-only session — no cookie, no rotation, no redis entry
- **Fire-and-forget SMS**: approveDoctor/rejectDoctor use `.catch()` on sendDoctorApproval so SMS failure never blocks the response
- **blockUser clears refresh_token**: ensures blocked users are immediately logged out on their next API call
- **Regex search escaping**: listUsers escapes special regex chars before building `$regex` filter (prevents ReDoS)
- **MTD revenue via Payment.aggregate**: single `$match + $group` pipeline filters type + status + month boundary, returns 0 if no payments
- **recalculateDoctorRating after hide/unhide**: keeps doctor.rating.average consistent with visible reviews only

---

## Step 4 — What Was Built

### New Files
```
src/
├── utils/
│   └── citiesCoords.js         # 55+ Indian city → [lng, lat] lookup (no external API)
├── services/
│   └── maps.js                 # Google Maps Distance Matrix API wrapper (dev mock if no key)
├── validators/
│   └── doctor.validators.js    # registerDoctor / updateProfile / doctorId rules
├── controllers/
│   ├── doctorAuth.controller.js    # sendOtp, verifyOtp, refreshToken, logout (doctor)
│   └── doctorProfile.controller.js # registerDoctor, uploadDocuments, getPublicProfile,
│                                    # updateProfile, getDoctorAvailability, getDoctorDistance
└── routes/
    └── doctor.routes.js        # All /api/v1/doctors/* routes (static before /:id params)
```

### Updated Files
- `src/middleware/auth.js` — added `verifyDoctorAny` (no approval_status check, for registration flow)
- `server.js` — registered `/api/v1/doctors`

### Route Map (Step 4)
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | /api/v1/doctors/auth/send-otp | Public (otpLimiter) |
| POST | /api/v1/doctors/auth/verify-otp | Public (authLimiter) |
| POST | /api/v1/doctors/auth/refresh | Cookie |
| POST | /api/v1/doctors/auth/logout | Cookie |
| POST | /api/v1/doctors/register | verifyDoctorAny |
| POST | /api/v1/doctors/register/documents | verifyDoctorAny + multer |
| PATCH | /api/v1/doctors/profile | verifyDoctor (approved only) |
| GET | /api/v1/doctors/:id | Public |
| GET | /api/v1/doctors/:id/availability | Public |
| GET | /api/v1/doctors/:id/distance | verifyUser |

### Key Design Decisions
- **verifyDoctorAny vs verifyDoctor**: registration + doc upload use `verifyDoctorAny` (pending doctors can complete profile). PATCH /profile uses `verifyDoctor` (approved only)
- **Re-registration guard**: if `approval_status === 'approved'`, the register endpoint returns 400 — use PATCH /profile instead
- **Geo coords from city name**: `citiesCoords.js` covers 55+ cities with no external API call. City not in map → descriptive 400 error with support instructions
- **Static routes before param routes**: `/auth/*`, `/register`, `/profile` declared before `/:id` to prevent Express routing conflicts
- **Maps dev fallback**: if `GOOGLE_MAPS_API_KEY` is missing, `maps.js` returns mock data instead of crashing
- **Document naming**: `req.body.names` JSON array optionally overrides `file.originalname` for human-readable doc names

---

## Step 6 — What Was Built

### New Files
```
src/
├── validators/
│   └── schedule.validators.js      # upsertTemplateRules, patchDayRules, dailyRangeRules, holidayRules, availableDatesRules
├── controllers/
│   └── schedule.controller.js      # getTemplate, upsertTemplate, patchDay, getDailySchedules, setHoliday, getAvailableDates
├── routes/
│   └── schedule.routes.js          # All /api/v1/schedules/* routes (static before /:doctorId)
└── jobs/
    └── scheduleGenerator.js        # node-cron job: daily 00:05 UTC, bulk-upserts 30-day DailySchedule window
```

### Updated Files
- `server.js` — registered `/api/v1/schedules`, imported & started `scheduleGenerator` cron inside `startServer()`

### Route Map (Step 6)
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | /api/v1/schedules/template | verifyDoctor |
| PUT | /api/v1/schedules/template | verifyDoctor |
| PATCH | /api/v1/schedules/template/:day | verifyDoctor |
| GET | /api/v1/schedules/daily?from=&to= | verifyDoctor |
| PATCH | /api/v1/schedules/daily/:date/holiday | verifyDoctor |
| GET | /api/v1/schedules/:doctorId/available-dates?month= | Public |

### Key Design Decisions
- **Model adaptation**: WeeklyTemplate uses string day names ('monday'…'sunday') and `is_working` — the API matches the model, not the spec's 0-6 integers / `is_active`
- **Merge semantics on PUT**: only days included in the request body are overwritten; unmentioned days are preserved — safe for partial updates
- **`$setOnInsert` bulkWrite**: cron uses upsert with `$setOnInsert` so existing schedules (including holidays set manually) are never overwritten
- **UTC date storage**: all dates stored at UTC midnight; `parseUTCDate()` appends `T00:00:00.000Z` to keep dates consistent across timezones
- **Holiday restore**: when is_holiday=false and no schedule exists yet, the controller reads the WeeklyTemplate to reconstruct slots/max_patients
- **Slot overlap validation**: O(n²) check in controller (max ~10 slots/day so trivially fast)
- **Static before param routes**: `/template`, `/daily` declared before `/:doctorId` to prevent Express treating "template" as a doctorId

---

## STEP 7 CONTINUATION PROMPT

Copy and paste this exactly to continue:

```
DocPoint backend Step 7: Doctor Search

Project: DocPoint Smart Doctor Appointment Platform
Working directory: e:\Projects\DocPoint\workplace\backend
Stack: Node.js + Express + MongoDB
PROGRESS: Steps 1-6 complete (see e:\Projects\DocPoint\workplace\PROGRESS.md)

Build Step 7 — Doctor Search: Geo + Filters + Distance:

Existing models (do NOT recreate):
- Doctor: location (2dsphere GeoJSON Point), specialization, rating.average, consultation_fee, languages, approval_status, is_blocked, is_profile_complete
- DailySchedule: doctor_id, date, is_available, is_holiday, max_patients, booked_count, queue_status
- WeeklyTemplate: doctor_id, schedule[{day, is_working}]

PART A — Search Endpoint
1. GET /api/v1/search/doctors
   Query params:
   - city (required) — lookup coords from citiesCoords.js
   - specialization (optional) — case-insensitive substring match
   - language (optional) — filter by languages array
   - max_fee (optional) — consultation_fee <= max_fee
   - available_today (optional, boolean) — only doctors with open DailySchedule today
   - sort (optional) — 'distance' (default) | 'rating' | 'fee'
   - page, limit (default 1, 10; max limit 50)

   Pipeline:
   a. $geoNear: { near: cityCoords, distanceField: 'distance_m', maxDistance: 50000 (50km), query: { approval_status:'approved', is_blocked:false, is_profile_complete:true } }
   b. Apply specialization / language / max_fee filters
   c. If available_today: $lookup DailySchedule for today, filter to docs with available slot
   d. Sort by chosen field
   e. Return: name, specialization, rating, consultation_fee, clinic_address.city, distance_m, profile_photo, languages

PART B — Doctor Detail (augmented)
2. GET /api/v1/search/doctors/:id
   - Full doctor profile (same as /api/v1/doctors/:id but adds next_available_date)
   - next_available_date: nearest DailySchedule date where is_available=true, booked_count < max_patients, date >= today

Validators: src/validators/search.validators.js
Controller: src/controllers/search.controller.js
Route: src/routes/search.routes.js

Register /api/v1/search on server.js.
Update PROGRESS.md: mark Step 7 done, add Step 8 prompt.
```
