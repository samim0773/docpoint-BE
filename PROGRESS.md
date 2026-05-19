# DocPoint — Development Progress

## Progress Bar
```
Backend  [██░░░░░░░░░░░░░] 2/15 steps  (13%)
Frontend [░░░░░░░░░░░] 0/10 steps  (0%)
Overall  [██░░░░░░░░░░░░░░░░░░░░░░░] 2/25 steps  (8%)
```

---

## BACKEND STEPS

| # | Step | Status | Key Files |
|---|------|--------|-----------|
| 1 | Project Setup + All 10 Models + Server Scaffold | ✅ DONE | package.json, server.js, src/config/*, src/models/* (10 models), src/middleware/*, src/utils/* |
| 2 | User Auth — OTP + JWT + Refresh + Auth Middleware | ✅ DONE | src/models/Admin.js, src/services/sms.js, src/utils/(jwt,otp,tokenHash).js, src/middleware/auth.js, src/validators/(validate,user.validators).js, src/controllers/(userAuth,userProfile).controller.js, src/routes/user.routes.js |
| 3 | Family Patients CRUD | ⏳ NEXT | |
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

| # | Step | Status |
|---|------|--------|
| 16 | Angular Setup + Routing + Auth Guards + HTTP Interceptors | ⏳ |
| 17 | OTP Login Screen + Profile Completion | ⏳ |
| 18 | Family Patients Management | ⏳ |
| 19 | Subscription Payment Screen (Razorpay) | ⏳ |
| 20 | Doctor Registration Form (Multi-step) | ⏳ |
| 21 | Doctor Search + Filters + Results Page | ⏳ |
| 22 | Doctor Detail + Calendar + Booking Flow | ⏳ |
| 23 | Live Queue Tracker (Socket.IO) | ⏳ |
| 24 | Prescriptions + Reviews Screens | ⏳ |
| 25 | Admin Panel — Approval + Users + Plans + Stats Dashboard | ⏳ |

---

## Step 2 — What Was Built

### New Files
```
src/
├── models/
│   └── Admin.js                      # Admin model (email+bcrypt password, used by verifyAdmin)
├── services/
│   └── sms.js                        # MSG91 Flow API wrapper — dev stub + 4 message types
├── utils/
│   ├── jwt.js                        # Token generators + verifiers for all 3 roles
│   ├── otp.js                        # OTP generation, expiry, attempt helpers
│   └── tokenHash.js                  # SHA-256 hash for refresh token storage
├── middleware/
│   └── auth.js                       # verifyUser / verifyDoctor / verifyAdmin / optionalUser
├── validators/
│   ├── validate.js                   # express-validator error formatter middleware
│   └── user.validators.js            # sendOtp / verifyOtp / updateProfile / completeProfile rules
├── controllers/
│   ├── userAuth.controller.js        # sendOtp, verifyOtp, refreshToken, logout
│   └── userProfile.controller.js     # getMe, updateMe, completeProfile
└── routes/
    └── user.routes.js                # All /api/v1/users/* routes with correct middleware chain
```

### Route Map (Step 2)
| Method | Endpoint | Auth | Limiter |
|--------|----------|------|---------|
| POST | /api/v1/users/auth/send-otp | Public | otpLimiter (5/15min) |
| POST | /api/v1/users/auth/verify-otp | Public | authLimiter (10/15min) |
| POST | /api/v1/users/auth/refresh | Cookie | — |
| POST | /api/v1/users/auth/logout | Cookie | — |
| GET | /api/v1/users/me | verifyUser | — |
| PATCH | /api/v1/users/me | verifyUser | — |
| PATCH | /api/v1/users/me/complete-profile | verifyUser | — |

### Security Decisions
- **OTP brute-force**: 3 attempt limit + 5-min expiry + 30-sec resend cooldown
- **Refresh token rotation**: new refresh token issued on every `/auth/refresh` call — old one invalidated
- **Token storage**: refresh token hashed with SHA-256 before DB storage (bcrypt truncates JWTs >72 chars)
- **Cookie config**: HttpOnly + Secure (prod) + SameSite strict (prod) / lax (dev)
- **Dev OTP leak**: OTP returned in response body ONLY when NODE_ENV !== production
- **verifyDoctor**: checks `approval_status === 'approved'` — unapproved doctors get 403 immediately

---

## STEP 3 CONTINUATION PROMPT

Copy and paste this exactly to continue:

```
DocPoint backend Step 3: Family Patients CRUD + User Subscription

Project: DocPoint Smart Doctor Appointment Platform
Working directory: e:\Projects\DocPoint\workplace\backend
Stack: Node.js + Express + MongoDB + Razorpay
PROGRESS: Steps 1-2 complete (see e:\Projects\DocPoint\workplace\PROGRESS.md)

Build Step 3 — two feature groups:

GROUP A — Family Patients CRUD (/api/v1/patients)
Uses Patient model (user_id, name, age, gender, relation, blood_group, is_deleted)
1. POST   /patients         — add family member (max 6 per user, validate relation enum)
2. GET    /patients         — list all non-deleted patients for current user
3. PATCH  /patients/:id     — update patient (ownership check: patient.user_id === req.user._id)
4. DELETE /patients/:id     — soft delete (set is_deleted: true, ownership check)
All routes: verifyUser middleware

GROUP B — User Subscription (/api/v1/subscription)
Uses UserPlan + Payment + User models. Razorpay integration.
1. GET  /subscription/plans   — list active UserPlans (Public)
2. POST /subscription/order   — create Razorpay order for chosen plan (verifyUser)
   - Check no active subscription (or in grace — allow renewal)
   - Create Payment record (status: created)
   - Return Razorpay order_id + key_id
3. POST /subscription/confirm — verify Razorpay payment signature (verifyUser)
   - HMAC-SHA256 verify: razorpay_order_id + "|" + razorpay_payment_id
   - Update Payment to captured
   - Activate subscription on User:
     * If existing subscription not expired: extend from expires_at (loyalty reward)
     * Otherwise: start from now
     * Set grace_until = expires_at + plan.grace_days
   - Return updated subscription info
4. GET  /subscription/status  — current sub status (verifyUser)

POST /webhooks/razorpay — Razorpay webhook handler
   - Verify X-Razorpay-Signature header
   - Handle event: payment.captured → same activation logic as /confirm
   - Handle event: payment.failed → update Payment status to failed
   - Must be raw body (use express.raw for this route only)

Razorpay service: src/services/razorpay.js
   - createOrder(amount, currency, receipt, notes)
   - verifyWebhookSignature(body, signature)
   - verifyPaymentSignature(orderId, paymentId, signature)
   - initiateRefund(paymentId, amount, notes)

Validators: src/validators/subscription.validators.js
Controllers: src/controllers/patients.controller.js
             src/controllers/subscription.controller.js
Routes: src/routes/patient.routes.js
        src/routes/subscription.routes.js

Register both on server.js.
Update PROGRESS.md: mark Step 3 done, add Step 4 prompt.
```
