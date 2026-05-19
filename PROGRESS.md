# DocPoint — Development Progress

## Progress Bar
```
Backend  [████░░░░░░░░░░░] 4/15 steps  (27%)
Frontend [░░░░░░░░░░░] 0/10 steps  (0%)
Overall  [████░░░░░░░░░░░░░░░░░░░░░] 4/25 steps  (16%)
```

---

## BACKEND STEPS

| # | Step | Status | Key Files |
|---|------|--------|-----------|
| 1 | Project Setup + All 10 Models + Server Scaffold | ✅ DONE | package.json, server.js, src/config/*, src/models/* (10 models) |
| 2 | User Auth — OTP + JWT + Refresh + Auth Middleware | ✅ DONE | src/models/Admin.js, src/services/sms.js, src/utils/(jwt,otp,tokenHash).js, src/middleware/auth.js, src/controllers/(userAuth,userProfile).controller.js |
| 3 | Family Patients CRUD + User Subscription + Razorpay Webhook | ✅ DONE | src/services/razorpay.js, src/controllers/(patients,subscription).controller.js, src/routes/(patient,subscription).routes.js |
| 4 | Doctor Auth + Registration + Profile + Cloudinary + Distance | ✅ DONE | src/utils/citiesCoords.js, src/services/maps.js, src/validators/doctor.validators.js, src/controllers/(doctorAuth,doctorProfile).controller.js, src/routes/doctor.routes.js |
| 5 | Admin Auth + Doctor Approval + User Mgmt + Plan Mgmt + Stats | ⏳ NEXT | |
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

## STEP 5 CONTINUATION PROMPT

Copy and paste this exactly to continue:

```
DocPoint backend Step 5: Admin Panel

Project: DocPoint Smart Doctor Appointment Platform
Working directory: e:\Projects\DocPoint\workplace\backend
Stack: Node.js + Express + MongoDB
PROGRESS: Steps 1-4 complete (see e:\Projects\DocPoint\workplace\PROGRESS.md)

Build Step 5 — Admin Auth + Full Admin Panel:

PART A — Admin Auth
1. POST /api/v1/admin/auth/login
   - Email + bcrypt password (Admin model already exists from Step 2)
   - Issue Admin JWT (JWT_ADMIN_SECRET, 8hr expiry)
   - No refresh token for admin (8hr session is enough)
2. GET  /api/v1/admin/auth/me — verifyAdmin: return admin name + email

PART B — Doctor Management
3. GET   /api/v1/admin/doctors?status=pending|approved|rejected&page=1&limit=20
   - Paginated list, filter by approval_status
   - Return: name, mobile, specialization, clinic_address.city, createdAt, is_profile_complete
4. GET   /api/v1/admin/doctors/:id — Full doctor details for review
5. PATCH /api/v1/admin/doctors/:id/approve
   - Set approval_status: approved
   - Send SMS to doctor (sendDoctorApproval from sms.js)
6. PATCH /api/v1/admin/doctors/:id/reject
   - Body: { reason } (required)
   - Set approval_status: rejected, rejection_reason: reason
   - Send SMS to doctor

PART C — User Management
7. GET  /api/v1/admin/users?page=1&limit=20&search=mobilOrName
   - Paginated, optional search by name or mobile
   - Return: name, mobile, city, subscription status, createdAt, is_blocked
8. PATCH /api/v1/admin/users/:id/block   — toggle is_blocked: true
9. PATCH /api/v1/admin/users/:id/unblock — toggle is_blocked: false

PART D — Subscription Plan Management
10. GET   /api/v1/admin/plans          — list all UserPlans (active + inactive)
11. POST  /api/v1/admin/plans          — create new plan { name, price, duration_days, grace_days, booking_cap, description }
12. PATCH /api/v1/admin/plans/:id      — update plan fields
13. PATCH /api/v1/admin/plans/:id/deactivate — set is_active: false

PART E — Platform Dashboard Stats
14. GET /api/v1/admin/stats
    Return single object:
    - total_users: count of all users
    - active_subscriptions: users with subscription.is_active=true AND expires_at > now
    - total_doctors: approved doctors count
    - pending_doctors: pending approval count
    - bookings_today: appointments created today (any status except cancelled)
    - revenue_mtd: sum of Payment.amount where type in [subscription,appointment], status=captured, createdAt >= start of current month

PART F — Review Moderation
15. GET   /api/v1/admin/reviews?page=1&limit=20&hidden=false
    - Paginated reviews, filterable by is_hidden
    - Populate: doctor name, patient name, rating, comment
16. PATCH /api/v1/admin/reviews/:id/hide   — set is_hidden: true, recalculate doctor rating
17. PATCH /api/v1/admin/reviews/:id/unhide — set is_hidden: false, recalculate doctor rating

Validators: src/validators/admin.validators.js
Controller: src/controllers/admin.controller.js (single file, all actions)
Route: src/routes/admin.routes.js

Register /api/v1/admin on server.js.
Update PROGRESS.md: mark Step 5 done, add Step 6 prompt.
```
