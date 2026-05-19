# DocPoint — Development Progress

## Progress Bar
```
Backend  [███░░░░░░░░░░░░] 3/15 steps  (20%)
Frontend [░░░░░░░░░░░] 0/10 steps  (0%)
Overall  [███░░░░░░░░░░░░░░░░░░░░░░] 3/25 steps  (12%)
```

---

## BACKEND STEPS

| # | Step | Status | Key Files |
|---|------|--------|-----------|
| 1 | Project Setup + All 10 Models + Server Scaffold | ✅ DONE | package.json, server.js, src/config/*, src/models/* (10 models) |
| 2 | User Auth — OTP + JWT + Refresh + Auth Middleware | ✅ DONE | src/models/Admin.js, src/services/sms.js, src/utils/(jwt,otp,tokenHash).js, src/middleware/auth.js, src/validators/(validate,user.validators).js, src/controllers/(userAuth,userProfile).controller.js, src/routes/user.routes.js |
| 3 | Family Patients CRUD + User Subscription + Razorpay Webhook | ✅ DONE | src/services/razorpay.js, src/validators/(patient,subscription).validators.js, src/controllers/(patients,subscription).controller.js, src/routes/(patient,subscription).routes.js |
| 4 | Doctor Auth + Registration + Profile + Cloudinary | ⏳ NEXT | |
| 5 | Admin Auth + Doctor Approval + User Mgmt + Plan Mgmt | ⏳ | |
| 6 | Doctor Schedule — Weekly Template + Daily Auto-gen (Cron) | ⏳ | |
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

## Step 3 — What Was Built

### New Files
```
src/
├── services/
│   └── razorpay.js           # createOrder, verifyPaymentSignature, verifyWebhookSignature, initiateRefund
├── validators/
│   ├── patient.validators.js # addPatient / updatePatient rules (enum validation for gender/relation/blood_group)
│   └── subscription.validators.js # createOrder / confirmPayment rules
├── controllers/
│   ├── patients.controller.js     # addPatient, listPatients, updatePatient, deletePatient
│   └── subscription.controller.js # getPlans, createSubscriptionOrder, confirmSubscription, getSubscriptionStatus, handleRazorpayWebhook
└── routes/
    ├── patient.routes.js      # /api/v1/patients CRUD
    └── subscription.routes.js # /api/v1/subscription plans/order/confirm/status
```

### Route Map (Step 3)
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | /api/v1/patients | verifyUser |
| GET | /api/v1/patients | verifyUser |
| PATCH | /api/v1/patients/:id | verifyUser (ownership check) |
| DELETE | /api/v1/patients/:id | verifyUser (ownership check, soft delete) |
| GET | /api/v1/subscription/plans | Public |
| POST | /api/v1/subscription/order | verifyUser |
| POST | /api/v1/subscription/confirm | verifyUser |
| GET | /api/v1/subscription/status | verifyUser |
| POST | /webhooks/razorpay | Webhook Secret (raw body, outside /api/v1) |

### Key Design Decisions
- **Webhook mounted BEFORE express.json()**: uses `express.raw()` — raw Buffer preserved for HMAC-SHA256 verification
- **Idempotency**: both `/confirm` and webhook handler check `payment.status === 'captured'` before re-processing
- **Loyalty renewal**: if subscription still has >7 days left, renewal is blocked. At ≤7 days, new expiry extends from existing `expires_at` (not from today)
- **MongoDB transaction**: `_activateSubscription` runs inside a session to atomically update both Payment and User
- **Max 6 patients**: enforced in controller with `countDocuments` before insert
- **Ownership check**: `findOne({ _id, user_id: req.user._id })` pattern — no separate ownership middleware needed
- **timingSafeEqual**: Razorpay signature comparison uses `crypto.timingSafeEqual` to prevent timing attacks

---

## STEP 4 CONTINUATION PROMPT

Copy and paste this exactly to continue:

```
DocPoint backend Step 4: Doctor Auth + Registration + Profile

Project: DocPoint Smart Doctor Appointment Platform
Working directory: e:\Projects\DocPoint\workplace\backend
Stack: Node.js + Express + MongoDB + Cloudinary
PROGRESS: Steps 1-3 complete (see e:\Projects\DocPoint\workplace\PROGRESS.md)

Build Step 4 — Doctor Auth + Registration + Profile:

PART A — Doctor Auth (separate JWT_DOCTOR_SECRET, separate endpoints)
1. POST /api/v1/doctors/auth/send-otp
   - Same OTP flow as user (brute-force guards, MSG91 sms service)
   - Create Doctor record if first time (mobile only)
2. POST /api/v1/doctors/auth/verify-otp
   - Verify OTP, issue Doctor JWT (signed with JWT_DOCTOR_SECRET)
   - Refresh token in HttpOnly cookie (same cookie name: refreshToken)
   - Return: access_token, doctor basic info, is_profile_complete, approval_status
3. POST /api/v1/doctors/auth/logout
   - Clear refresh token from DB + cookie

PART B — Doctor Registration (multi-step profile, Cloudinary document upload)
4. POST /api/v1/doctors/register
   - Auth: verifyDoctor middleware BUT allow unapproved doctors (pending)
   - Create a separate verifyDoctorAny middleware (no approval check)
   - Fields: name, email, gender, specialization, qualification[], experience_years,
             registration_number, clinic_name, clinic_address{street,city,state,pincode},
             consultation_fee, avg_consult_minutes, bio
   - Location: derive from clinic_address.city using a cities-to-coords map
               (hardcode top 20 Indian cities with lat/lng — no external API needed here)
   - Set is_profile_complete: true after registration
   - Doctors start with approval_status: pending — admin must approve (Step 5)

5. POST /api/v1/doctors/register/documents
   - Auth: verifyDoctorAny
   - Upload up to 3 documents (degree, registration cert, ID proof) via Cloudinary
   - Use uploadDoctorDoc.array('documents', 3) multer middleware
   - Push to doctor.documents array

PART C — Doctor Profile (public + protected)
6. GET  /api/v1/doctors/:id           — Public doctor profile
7. PATCH /api/v1/doctors/profile      — verifyDoctor (approved only), update editable fields
8. GET  /api/v1/doctors/:id/availability — Public: returns available dates + slot info for next 30 days
   - Query DailySchedule for the doctor, return dates with remaining slots
9. GET  /api/v1/doctors/:id/distance  — verifyUser: Google Maps Distance Matrix API
   - from: req.user.city, to: doctor.clinic_address.city
   - Return: distance_text, duration_text, distance_meters, duration_seconds

Middleware: add verifyDoctorAny to src/middleware/auth.js
            (same as verifyDoctor but without approval_status check)

Validators: src/validators/doctor.validators.js
Controllers: src/controllers/doctorAuth.controller.js
             src/controllers/doctorProfile.controller.js
Routes: src/routes/doctor.routes.js

Register /api/v1/doctors on server.js.
Update PROGRESS.md: mark Step 4 done, add Step 5 prompt.
```
