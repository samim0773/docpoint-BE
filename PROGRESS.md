# DocPoint — Development Progress

## Progress Bar
```
Backend  [████████████░░░] 12/15 steps  (80%)
Frontend [░░░░░░░░░░░] 0/10 steps  (0%)
Overall  [████████████░░░░░░░░░░░░░] 12/25 steps  (48%)
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
| 7 | Doctor Search — Geo + Atlas Search + Filters + Distance | ✅ DONE | src/validators/search.validators.js, src/controllers/search.controller.js, src/routes/search.routes.js |
| 8 | Booking System — Create + Confirm + Cancel + Refund | ✅ DONE | src/validators/booking.validators.js, src/controllers/booking.controller.js, src/routes/booking.routes.js |
| 9 |    | ✅ DONE | src/controllers/queue.controller.js, src/routes/queue.routes.js |
| 10 | Real-Time Queue — Socket.IO + MongoDB Change Streams | ✅ DONE | src/socket/index.js, src/socket/queueWatcher.js |
| 11 | Prescriptions — Write + History + Edit (24hr window) | ✅ DONE | src/validators/prescription.validators.js, src/controllers/prescription.controller.js, src/routes/prescription.routes.js |
| 12 | Reviews + Rating Aggregation | ✅ DONE | src/validators/review.validators.js, src/controllers/review.controller.js, src/routes/review.routes.js |
| 13 | SMS Jobs — Bull MQ + MSG91 (Booking, Cancel, Queue Alert) | ⏳ NEXT | |
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

## Step 7 — What Was Built

### New Files
```
src/
├── validators/
│   └── search.validators.js        # searchRules (city required, optional filters), doctorIdRule
├── controllers/
│   └── search.controller.js        # searchDoctors ($geoNear pipeline + $facet), getDoctorWithAvailability
└── routes/
    └── search.routes.js            # GET /doctors (searchLimiter), GET /doctors/:id
```

### Updated Files
- `server.js` — registered `/api/v1/search`

### Route Map (Step 7)
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | /api/v1/search/doctors?city=&specialization=&language=&max_fee=&available_today=&sort=&page=&limit= | Public (searchLimiter: 60/min) |
| GET | /api/v1/search/doctors/:id | Public |

### Key Design Decisions
- **`$geoNear` must be first**: it is the only aggregation stage that uses the 2dsphere index; approval/blocked/complete filters are pushed into its `query` option so they run at the index scan level
- **`$facet` for pagination**: total count + paginated results computed in a single pass — avoids a second `countDocuments` query on the full filtered result set
- **`$lookup` sub-pipeline for `available_today`**: uses correlated `$$did` variable with `$expr: { $lt: ['$booked_count', '$max_patients'] }` inside the sub-pipeline `$match` to check slot availability without a round-trip
- **`$limit: 1` inside lookup**: once one matching schedule is found we stop scanning — keeps the join cheap
- **Regex escaping**: specialization filter escapes user input before constructing `$regex` to prevent ReDoS
- **`languages` filter**: wired in pipeline; field not yet on Doctor model — will activate once added (filter currently has no effect)
- **50 km radius**: hardcoded in `$geoNear.maxDistance`; sufficient for city-based search, easy to make configurable later

---

## Step 8 — What Was Built

### New Files
```
src/
├── validators/
│   └── booking.validators.js       # createBookingRules, confirmBookingRules, cancelBookingRules, myBookingsRules, doctorBookingsRules, bookingIdRule
├── controllers/
│   └── booking.controller.js       # createBooking, confirmBooking, cancelBooking, getMyBookings, getDoctorBookings, getBookingDetail
└── routes/
    └── booking.routes.js           # All /api/v1/bookings/* routes (static /my /doctor before /:id)
```

### Updated Files
- `src/middleware/auth.js` — added `verifyUserOrDoctor` (tries user JWT → doctor JWT; used for cancel + detail routes)
- `server.js` — registered `/api/v1/bookings`

### Route Map (Step 8)
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | /api/v1/bookings | verifyUser |
| POST | /api/v1/bookings/:id/confirm | verifyUser |
| POST | /api/v1/bookings/:id/cancel | verifyUserOrDoctor |
| GET | /api/v1/bookings/my | verifyUser |
| GET | /api/v1/bookings/doctor | verifyDoctor |
| GET | /api/v1/bookings/:id | verifyUserOrDoctor |

### Key Design Decisions
- **Atomic slot claim**: `findOneAndUpdate` with `$expr: { $lt: ['$booked_count', '$max_patients'] }` + `$inc: { booked_count: 1 }` prevents overbooking without transactions
- **token_number = post-increment booked_count**: after `{ new: true }`, `schedule.booked_count` is the new value = assigned token
- **Razorpay rollback on gateway error**: if `createOrder` fails, the slot decrement and appointment delete run in parallel before re-throwing
- **Refund non-blocking on cancel**: refund failure is logged but doesn't block cancellation — support can manually process
- **bookings_used tracking**: incremented on confirm, decremented on cancel (guarded with `$gt: 0` to avoid negative)
- **Grace period blocked from booking**: checks `sub.is_active === true && sub.expires_at > now` directly — `hasActiveSubscription()` includes grace period so is not used here
- **Model field names**: `schedule_id` (not `daily_schedule_id`), `appointment_fee` (not `consultation_fee`), `cancellation_reason` (not `cancel_reason`), `refund_id` (not `razorpay_refund_id`)

---

## Step 9 — What Was Built

### New Files
```
src/
├── controllers/
│   └── queue.controller.js     # 8 handlers: startQueue, pauseQueue, resumeQueue, completeQueue, callNext, markDone, markNoShow, getQueueStatus
└── routes/
    └── queue.routes.js         # All /api/v1/queue/:scheduleId/* routes + inline validators
```

### Updated Files
- `server.js` — registered `/api/v1/queue`

### Route Map (Step 9)
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | /api/v1/queue/:scheduleId/start | verifyDoctor |
| POST | /api/v1/queue/:scheduleId/pause | verifyDoctor |
| POST | /api/v1/queue/:scheduleId/resume | verifyDoctor |
| POST | /api/v1/queue/:scheduleId/complete | verifyDoctor |
| POST | /api/v1/queue/:scheduleId/call-next | verifyDoctor |
| POST | /api/v1/queue/:scheduleId/done | verifyDoctor |
| POST | /api/v1/queue/:scheduleId/no-show | verifyDoctor |
| GET | /api/v1/queue/:scheduleId/status | Public |

### Key Design Decisions
- **`getOwnedSchedule` helper**: all doctor routes find the schedule with `{ _id, doctor_id: req.doctor._id }` — ownership check + existence check in one DB call
- **`call-next` pre-flight**: checks `Appointment.exists({ status:'confirmed', token_number: { $gte: nextToken } })` before incrementing so we never advance to an empty token
- **Aggregation pipeline `updateMany` for ETAs**: `$multiply: [{ $subtract: ['$token_number', nextToken] }, avg_consult_minutes]` inside a pipeline update — field-dependent calculation in a single bulk write (MongoDB 4.2+)
- **`complete` cascades no_shows**: `Appointment.updateMany({ status:'confirmed' })` marks all remaining confirmed appointments no_show atomically
- **`markDone` finds by status**: finds the `in_consultation` appointment rather than by token_number (doctor can only have one patient at a time, so this is unambiguous)
- **`markNoShow` accepts both confirmed and in_consultation**: handles the case where the token was called but the patient left before being seen

---

## Step 10 — What Was Built

### New Files
```
src/socket/
├── index.js          # initSocket(httpServer) + getIO() singleton; /queue namespace; join-queue room handler
└── queueWatcher.js   # MongoDB Change Stream watchers for DailySchedule + Appointment; auto-reconnect with resume token
```

### Updated Files
- `server.js` — `initSocket(server)` called immediately after `http.createServer(app)`; `startQueueWatcher()` called inside `startServer()` after `connectDB()`

### Socket.IO Event Contract (namespace: `/queue`)
| Direction | Event | Payload |
|-----------|-------|---------|
| Client → Server | `join-queue` | `{ scheduleId }` |
| Client → Server | `leave-queue` | `{ scheduleId }` |
| Server → Room | `queue-updated` | `{ schedule_id, queue_status, current_token, avg_consult_minutes, pause_reason }` |
| Server → Room | `token-called` | `{ appointment_id, token_number, status, patient_id, eta_minutes }` |
| Server → Room | `appointment-updated` | `{ appointment_id, token_number, status, patient_id, eta_minutes }` |

### Key Design Decisions
- **`initSocket` before middleware**: Socket.IO attached to `http.Server` before any Express middleware — ensures the upgrade handshake is handled before body parsers see the request
- **Named namespace `/queue`**: isolates queue traffic from any future namespaces (e.g. `/notifications`)
- **Resume token persistence**: each stream stores its own `resumeToken` in closure; after a reconnect, it passes `{ resumeAfter: resumeToken }` so no events are lost during the 5-second backoff
- **Standalone dev fallback**: `startQueueWatcher()` wraps both `watch()` calls in a try-catch; if MongoDB is standalone (no replica set), it logs a warning and continues — server doesn't crash
- **`$match` on `updatedFields`**: pipeline stage filters at the server before the change event reaches Node, reducing network traffic on busy collections
- **`fullDocument: 'updateLookup'`**: needed because `updateMany` (used in `completeQueue` + ETA recalc) doesn't embed full docs by default

---

## Step 11 — What Was Built

### New Files
```
src/
├── validators/
│   └── prescription.validators.js   # createRules, updateRules, idRule, appointmentIdRule, myListRules
├── controllers/
│   └── prescription.controller.js   # createPrescription, updatePrescription, getMyPrescriptions, getPrescription, getPrescriptionByAppointment
└── routes/
    └── prescription.routes.js       # All /api/v1/prescriptions/* routes (static /my + /appointment/:id before /:id)
```

### Updated Files
- `server.js` — registered `/api/v1/prescriptions`

### Route Map (Step 11)
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | /api/v1/prescriptions | verifyDoctor |
| PATCH | /api/v1/prescriptions/:id | verifyDoctor |
| GET | /api/v1/prescriptions/my | verifyUser |
| GET | /api/v1/prescriptions/appointment/:appointmentId | verifyUserOrDoctor |
| GET | /api/v1/prescriptions/:id | verifyUserOrDoctor |

### Key Design Decisions
- **Model vs spec differences**: Prescription model has `user_id` (not in spec) — captured from appointment on create; no `is_finalized` field; extra fields: `chief_complaint`, `diagnosis`, `vitals`, `follow_up_date` accepted in create/update
- **`appointment_id` unique index**: prevents duplicate prescriptions per appointment; checked with `Prescription.exists()` before create (returns 409 on conflict)
- **24-hour window via `createdAt`**: `Date.now() - prescription.createdAt.getTime() > 24*60*60*1000` — uses `timestamps: true` from Mongoose, no extra field needed
- **Static routes before `/:id`**: `/my` and `/appointment/:appointmentId` declared first so Express doesn't treat the literal strings as Mongo IDs
- **Access control on `GET /:id`**: if `req.user` — checks `Patient.exists({ _id, user_id, is_deleted: false })`; if `req.doctor` — checks `prescription.doctor_id === req.doctor._id`
- **`getMyPrescriptions` via Patient join**: fetches all non-deleted patient IDs for the user first, then uses `$in` — avoids needing a `user_id` index on Prescription

---

## Step 12 — What Was Built

### New Files
```
src/
├── validators/
│   └── review.validators.js   # createRules, doctorIdRule, visibilityRule, paginationRules
├── controllers/
│   └── review.controller.js   # createReview, getMyReviews, getDoctorReviews, setVisibility
└── routes/
    └── review.routes.js       # All /api/v1/reviews/* routes (static /my + /doctor/:id before /:id)
```

### Updated Files
- `server.js` — registered `/api/v1/reviews`

### Route Map (Step 12)
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | /api/v1/reviews | verifyUser |
| GET | /api/v1/reviews/my | verifyUser |
| GET | /api/v1/reviews/doctor/:doctorId | Public |
| PATCH | /api/v1/reviews/:id/visibility | verifyAdmin |

### Key Design Decisions
- **`is_hidden` not `is_visible`**: Review model stores `is_hidden` (inverted); admin sends `is_visible: true/false`, controller maps `is_hidden = !is_visible`
- **`recalculateDoctorRating` static**: already on the Review model — aggregates `{ is_hidden: false }` reviews and rounds to 1 decimal; called after create and after visibility toggle (only when value actually changed)
- **Rating recalc + appointment update in parallel**: `Promise.all([Appointment.update, Review.recalculate])` — neither depends on the other
- **`appointment_id` unique index**: checked via `review_submitted` flag on Appointment (more readable than `Review.exists`); unique index is the real guard against races
- **Visibility toggle conditional recalc**: `wasHidden !== newIsHidden` check prevents unnecessary aggregation when admin sets the same value twice
- **Public doctor reviews filter**: `{ doctor_id, is_hidden: false }` — hidden reviews never leave the server

---

## STEP 13 CONTINUATION PROMPT

Copy and paste this exactly to continue:

```
DocPoint backend Step 13: SMS Jobs — Bull MQ + MSG91

Project: DocPoint Smart Doctor Appointment Platform
Working directory: e:\Projects\DocPoint\workplace\backend
Stack: Node.js + Express + MongoDB + Redis (Bull MQ)
PROGRESS: Steps 1-12 complete (see e:\Projects\DocPoint\workplace\PROGRESS.md)

Build Step 13 — SMS Jobs via Bull MQ + MSG91:

Triggers (fire-and-forget, non-blocking):
1. Booking confirmed → SMS to patient: "Booking confirmed. Dr. {name}, {date}, Token #{token}"
2. Booking cancelled → SMS to patient: "Booking cancelled. Ref #{appointment_id}"
3. Token called (queue) → SMS to patient: "Your token #{token} is now being called. Please proceed to the doctor."

Architecture:
- Bull queue: 'sms' queue backed by Redis
- Worker: processes jobs, calls MSG91 API
- Enqueue from: booking.controller (confirm + cancel) and queue.controller (callNext)
- SMS service: src/services/sms.js already exists — check its interface before writing

Queue files:
- src/jobs/smsQueue.js       — create Bull queue + enqueue helper
- src/jobs/smsWorker.js      — process jobs, call SMS service
- src/jobs/index.js          — start worker (called from server.js startServer)

Integration:
- booking.controller.js — enqueue SMS after confirmBooking and cancelBooking
- queue.controller.js   — enqueue SMS after callNext marks token in_consultation

Do NOT create any new routes. No server.js route changes needed.
Update server.js: import and call startSmsWorker() in startServer().
Update PROGRESS.md: mark Step 13 done, add Step 14 prompt.
```

---

## STEP 12 CONTINUATION PROMPT (archived — already done)

```
DocPoint backend Step 12: Reviews + Rating Aggregation

Project: DocPoint Smart Doctor Appointment Platform
Working directory: e:\Projects\DocPoint\workplace\backend
Stack: Node.js + Express + MongoDB
PROGRESS: Steps 1-11 complete (see e:\Projects\DocPoint\workplace\PROGRESS.md)

Build Step 12 — Reviews + Rating Aggregation:

Existing models (do NOT recreate):
- Review: { doctor_id, patient_id, user_id, appointment_id, rating (1-5), comment, is_visible, created_at }
- Appointment: { doctor_id, patient_id, user_id, status, review_submitted }
- Doctor: { rating: { average, total_reviews } }

PART A — User actions
1. POST /api/v1/reviews
   Body: { appointment_id, rating, comment? }
   Auth: verifyUser
   - Appointment must be 'done' and belong to this user
   - review_submitted must be false (one review per appointment)
   - Create Review document
   - Set Appointment.review_submitted = true
   - Recalculate Doctor.rating.average and Doctor.rating.total_reviews atomically

2. GET /api/v1/reviews/my
   Auth: verifyUser
   Query: ?page=1&limit=10
   - Return reviews submitted by this user
   - Populate doctor name + specialization
   - Sort by createdAt desc

PART B — Public / Doctor actions
3. GET /api/v1/reviews/doctor/:doctorId
   Public
   Query: ?page=1&limit=10
   - Return visible reviews for a doctor
   - Sort by createdAt desc

PART C — Admin actions
4. PATCH /api/v1/reviews/:id/visibility
   Body: { is_visible: boolean }
   Auth: verifyAdmin
   - Toggle review visibility

Validators: src/validators/review.validators.js
Controller: src/controllers/review.controller.js
Route: src/routes/review.routes.js

Register /api/v1/reviews on server.js.
Update PROGRESS.md: mark Step 12 done, add Step 13 prompt.
```

---

## STEP 11 CONTINUATION PROMPT (archived — already done)

```
DocPoint backend Step 11: Prescriptions

Project: DocPoint Smart Doctor Appointment Platform
Working directory: e:\Projects\DocPoint\workplace\backend
Stack: Node.js + Express + MongoDB
PROGRESS: Steps 1-10 complete (see e:\Projects\DocPoint\workplace\PROGRESS.md)

Build Step 11 — Prescriptions: Write + History + Edit (24hr window):

Existing model (do NOT recreate):
- Prescription: { doctor_id, patient_id, appointment_id, medicines: [{name, dosage, frequency, duration, instructions}], notes, is_finalized, created_at }
- Appointment: { doctor_id, patient_id, user_id, schedule_id, status, prescription_id }

PART A — Doctor actions
1. POST /api/v1/prescriptions
   Body: { appointment_id, medicines: [{name, dosage, frequency, duration, instructions}], notes }
   Auth: verifyDoctor
   - Appointment must be 'done' status
   - Appointment.doctor_id must match req.doctor._id
   - Create Prescription document
   - Set Appointment.prescription_id = new prescription._id
   - Return prescription

2. PATCH /api/v1/prescriptions/:id
   Body: { medicines?, notes? }
   Auth: verifyDoctor (must be prescription owner)
   - Only editable within 24 hours of creation (createdAt + 24h > now)
   - Update medicines and/or notes
   - Return updated prescription

PART B — Patient/User actions
3. GET /api/v1/prescriptions/my
   Auth: verifyUser
   Query: ?page=1&limit=10
   - Return prescriptions for all the user's patients (patient_id in user's patients list)
   - Populate: doctor name + specialization, patient name
   - Sort by createdAt desc

4. GET /api/v1/prescriptions/:id
   Auth: verifyUser (patient's owner) OR verifyDoctor (prescription author)
   - Return full prescription with doctor info and patient info

PART C — Lookup by appointment
5. GET /api/v1/prescriptions/appointment/:appointmentId
   Auth: verifyUser (appointment owner) OR verifyDoctor
   - Return prescription for a specific appointment (if exists)

Validators: src/validators/prescription.validators.js
Controller: src/controllers/prescription.controller.js
Route: src/routes/prescription.routes.js

Register /api/v1/prescriptions on server.js.
Update PROGRESS.md: mark Step 11 done, add Step 12 prompt.
```
