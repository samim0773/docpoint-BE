# DocPoint — Development Progress

## Progress Bar
```
Backend  [█████░░░░░░░░░░] 5/15 steps  (33%)
Frontend [░░░░░░░░░░░] 0/10 steps  (0%)
Overall  [█████░░░░░░░░░░░░░░░░░░░░] 5/25 steps  (20%)
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
| 6 | Doctor Schedule — Weekly Template + Daily Auto-gen (Cron) | ⏳ NEXT | |
| 7 | Doctor Search — Geo + Atlas Search + Filters + Distance | ⏳ | |
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

## STEP 6 CONTINUATION PROMPT

Copy and paste this exactly to continue:

```
DocPoint backend Step 6: Doctor Schedule

Project: DocPoint Smart Doctor Appointment Platform
Working directory: e:\Projects\DocPoint\workplace\backend
Stack: Node.js + Express + MongoDB
PROGRESS: Steps 1-5 complete (see e:\Projects\DocPoint\workplace\PROGRESS.md)

Build Step 6 — Doctor Schedule: Weekly Template + Daily Auto-gen (Cron):

Existing models (already created in Step 1, do NOT recreate):
- WeeklySchedule: { doctor_id, day_of_week (0-6), slots: [{start_time, end_time, max_patients}], is_active }
- DailySchedule: { doctor_id, date, slots: [{start_time, end_time, max_patients, booked_count}], queue_status (open/paused/closed), current_token, is_holiday }

PART A — Weekly Template (doctor-facing)
1. GET    /api/v1/schedules/template
   - Return doctor's weekly template (all 7 days, even if no slots set)
   - verifyDoctor (approved only)

2. PUT    /api/v1/schedules/template
   - Upsert the full weekly template: body is array of { day_of_week, slots, is_active }
   - Each slot: { start_time (HH:MM), end_time (HH:MM), max_patients (int, min 1, max 50) }
   - Validate no overlapping slots within the same day
   - verifyDoctor

3. PATCH  /api/v1/schedules/template/:day
   - Update a single day (day = 0-6)
   - Body: { slots, is_active }
   - verifyDoctor

PART B — Daily Schedule Management (doctor-facing)
4. GET    /api/v1/schedules/daily?from=YYYY-MM-DD&to=YYYY-MM-DD
   - Return daily schedules in date range (max 31 days)
   - verifyDoctor

5. PATCH  /api/v1/schedules/daily/:date/holiday
   - Mark a specific date as holiday (is_holiday: true, clear all slots)
   - Body: { is_holiday: boolean }
   - verifyDoctor

6. GET    /api/v1/schedules/:doctorId/available-dates?month=YYYY-MM
   - Public endpoint: return list of dates in the month that have open slots
   - Used by booking flow to show calendar

PART C — Auto-generation Cron Job
7. node-cron job: runs at 00:05 every day
   - For each approved doctor, generate DailySchedule for (today + 30 days) if not already exists
   - Copy from WeeklySchedule template for that day_of_week
   - Skip holidays and dates already generated
   - Log summary: doctors processed, schedules created, errors

Validators: src/validators/schedule.validators.js
Controller: src/controllers/schedule.controller.js
Route: src/routes/schedule.routes.js
Cron: src/jobs/scheduleGenerator.js (job definition) + register in server.js

Register /api/v1/schedules on server.js.
Update PROGRESS.md: mark Step 6 done, add Step 7 prompt.
```
