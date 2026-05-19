# DocPoint — Development Progress

## Progress Bar
```
Backend  [█░░░░░░░░░░░░░░] 1/15 steps  (7%)
Frontend [░░░░░░░░░░░] 0/10 steps  (0%)
Overall  [█░░░░░░░░░░░░░░░░░░░░░░░░] 1/25 steps  (4%)
```

---

## BACKEND STEPS

| # | Step | Status | Files Created |
|---|------|--------|---------------|
| 1 | Project Setup + All 10 Models + Server Scaffold | ✅ DONE | package.json, server.js, .env.example, src/config/(db,redis,cloudinary,logger).js, src/models/(all 10), src/middleware/(errorHandler,notFound,rateLimiter).js, src/utils/(apiResponse,asyncHandler,AppError).js, scripts/(seed,verifyIndexes).js |
| 2 | User Auth — OTP + JWT + Refresh + Middleware | ⏳ NEXT | |
| 3 | User Profile + Family Patients CRUD | ⏳ | |
| 4 | User Subscription — Razorpay + Webhook + Grace Period | ⏳ | |
| 5 | Doctor Auth + Registration + Profile + Cloudinary | ⏳ | |
| 6 | Admin Auth + Doctor Approval + User Mgmt + Plan Mgmt | ⏳ | |
| 7 | Doctor Schedule — Weekly Template + Daily Auto-gen (Cron) | ⏳ | |
| 8 | Doctor Search — Geo + Atlas Search + Filters + Distance | ⏳ | |
| 9 | Booking System — Create + Confirm + Cancel + Refund | ⏳ | |
| 10 | Doctor Queue Mgmt — Call/Done/No-show + Pause/Resume | ⏳ | |
| 11 | Real-Time Queue — Socket.IO + MongoDB Change Streams | ⏳ | |
| 12 | Prescriptions — Write + History + Edit (24hr window) | ⏳ | |
| 13 | Reviews + Rating Aggregation | ⏳ | |
| 14 | SMS Jobs — Bull MQ + MSG91 (Booking, Cancel, Queue Alert) | ⏳ | |
| 15 | Production Hardening — Validators + Redis Cache + Security | ⏳ | |

---

## FRONTEND STEPS

| # | Step | Status | Notes |
|---|------|--------|-------|
| 16 | Angular Setup + Routing + Auth Guards + HTTP Interceptors | ⏳ | |
| 17 | OTP Login Screen + Profile Completion | ⏳ | |
| 18 | Family Patients Management | ⏳ | |
| 19 | Subscription Payment Screen (Razorpay) | ⏳ | |
| 20 | Doctor Registration Form (Multi-step) | ⏳ | |
| 21 | Doctor Search + Filters + Results Page | ⏳ | |
| 22 | Doctor Detail + Calendar + Booking Flow | ⏳ | |
| 23 | Live Queue Tracker (Socket.IO) | ⏳ | |
| 24 | Prescriptions + Reviews Screens | ⏳ | |
| 25 | Admin Panel — Approval + Users + Plans + Stats Dashboard | ⏳ | |

---

## Step 1 — What Was Built

### Directory Structure
```
backend/
├── server.js                    # Express app + HTTP server bootstrap
├── package.json                 # All dependencies
├── .env.example                 # Environment variable template
├── .gitignore
├── scripts/
│   ├── seed.js                  # Seeds default ₹30 plan + admin account
│   └── verifyIndexes.js         # Verifies all DB indexes before deploy
└── src/
    ├── config/
    │   ├── db.js                # MongoDB connection (Mongoose)
    │   ├── redis.js             # Redis connection (ioredis)
    │   ├── cloudinary.js        # Cloudinary + Multer upload config
    │   └── logger.js            # Winston structured logging
    ├── models/                  # All 10 Mongoose schemas
    │   ├── User.js              # Patient accounts + OTP + embedded subscription
    │   ├── UserPlan.js          # Admin-managed subscription tiers
    │   ├── Patient.js           # Family member profiles
    │   ├── Doctor.js            # Doctor profile + 2dsphere geo index
    │   ├── WeeklyTemplate.js    # Doctor's recurring weekly schedule
    │   ├── DailySchedule.js     # Per-day availability + queue state
    │   ├── Appointment.js       # Bookings + tokens (unique composite index)
    │   ├── Payment.js           # All money movement (3 types)
    │   ├── Prescription.js      # Digital prescriptions with medicines
    │   └── Review.js            # Ratings + static recalculateDoctorRating()
    ├── middleware/
    │   ├── errorHandler.js      # Global error handler (Mongoose, JWT, duplicate)
    │   ├── notFound.js          # 404 fallback
    │   └── rateLimiter.js       # OTP/Auth/Search/Global rate limiters
    └── utils/
        ├── apiResponse.js       # Standardised { success, message, data } responses
        ├── asyncHandler.js      # Wraps async controllers — catches rejections
        └── AppError.js          # Operational error class
```

### Key Design Decisions
- `subscription` block embedded in `User` — avoids join on every booking check
- `DailySchedule` uses atomic `$inc` on `booked_count` — no duplicate tokens under load
- `Appointment` has unique index on `{schedule_id, token_number}` — race condition prevention
- `Doctor.location` has `2dsphere` index — enables `$near` geo queries
- `Review.statics.recalculateDoctorRating()` aggregates and updates doctor rating after every save
- Rate limiters defined centrally and applied per route group in Step 2+

---

## How to Use This Progress File

When you send the **Step N prompt** below, Claude will:
1. Read this PROGRESS.md to know what was already built
2. Build only the new step's files
3. Update this file marking Step N as ✅ DONE
4. Give you the prompt for Step N+1

---

## STEP 2 CONTINUATION PROMPT

Copy and paste this exactly to continue:

```
DocPoint backend Step 2: User Auth

Project: DocPoint Smart Doctor Appointment Platform
Working directory: e:\Projects\DocPoint\workplace\backend
PRD: 10 collections, Node.js+Express+MongoDB+Socket.IO+Razorpay stack
PROGRESS: Step 1 complete (see e:\Projects\DocPoint\workplace\PROGRESS.md)

Build Step 2 — User Auth (OTP + JWT):

Controllers + Routes + Validators for:
1. POST /api/v1/users/auth/send-otp
   - Validate 10-digit Indian mobile
   - OTP brute-force: max 3 attempts, 5-min expiry, 30-sec resend cooldown
   - In dev mode return OTP in response (MSG91 service stub)
   - MSG91 service in src/services/sms.js (real call + dev stub)

2. POST /api/v1/users/auth/verify-otp
   - Verify OTP + check expiry + check attempts
   - Issue JWT access token (15min) + refresh token (30days, HttpOnly cookie)
   - Create user if first login

3. POST /api/v1/users/auth/refresh
   - Verify refresh token from HttpOnly cookie
   - Issue new access token

4. POST /api/v1/users/auth/logout
   - Clear refresh token from DB + cookie

5. GET /users/me — auth middleware (verifyUser)
6. PATCH /users/me — update name, city, photo
7. PATCH /users/me/complete-profile — mark profile complete

Auth middleware: src/middleware/auth.js
- verifyUser: validates Bearer JWT, checks user not blocked
- verifyDoctor: for doctor routes (Step 5)  
- verifyAdmin: for admin routes (Step 6)

Apply otpLimiter to send-otp, authLimiter to verify-otp.

Register routes on server.js replacing the placeholder.
Update PROGRESS.md: mark Step 2 done, add Step 3 prompt.
```
