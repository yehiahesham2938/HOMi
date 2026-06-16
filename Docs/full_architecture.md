# 🏠 HOMi — Full System Architecture & Business Logic

> **Last Updated:** June 2026 &nbsp;|&nbsp; **Stack:** Vite + React · Node.js/Express · PostgreSQL (Supabase) · Upstash Redis · Socket.IO

---

## 📑 Table of Contents

1. [System Overview](#1-system-overview)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Deployment & Configuration Layer](#3-deployment--configuration-layer)
4. [Client Layer (SPA)](#4-client-layer-spa)
5. [Server Entry & Middleware](#5-server-entry--middleware)
6. [Auth Module](#6-auth-module)
7. [Properties Module](#7-properties-module)
8. [Rental Requests Module](#8-rental-requests-module)
9. [Contracts Module](#9-contracts-module)
10. [Payments & Wallet Module](#10-payments--wallet-module)
11. [Maintenance Module](#11-maintenance-module)
12. [Messages Module](#12-messages-module)
13. [Notifications Module](#13-notifications-module)
14. [Roommate Matching Module](#14-roommate-matching-module)
15. [Admin Module](#15-admin-module)
16. [Saved Properties Module](#16-saved-properties-module)
17. [Cache & Session Services](#17-cache--session-services)
18. [Real-time Layer (Socket.IO)](#18-real-time-layer-socketio)
19. [Data Stores](#19-data-stores)
20. [External Services](#20-external-services)
21. [Full Data Flow Diagram](#21-full-data-flow-diagram)

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HOMi Platform                               │
│                                                                     │
│  🌐 Client SPA          ⚙️ Express Server          🗄️ Data Layer    │
│  ─────────────          ──────────────────          ──────────────  │
│  Vite + React    ──▶    Node.js  Port 3000   ──▶   PostgreSQL       │
│  Axios (REST)    ──▶    11 Feature Modules   ──▶   Upstash Redis    │
│  Socket.IO  ◀──▶        Socket.IO Server    ◀──▶   Supabase (AWS)  │
└─────────────────────────────────────────────────────────────────────┘
```

HOMi is a **multi-role property rental platform** connecting:

| Actor | Role Constant | Core Capability |
|---|---|---|
| 🏠 Tenant | `TENANT` | Search, rent, pay, raise maintenance |
| 🔑 Landlord | `LANDLORD` | List properties, approve tenants, manage contracts |
| 🔧 Maintenance Provider | `MAINTENANCE_PROVIDER` | Browse jobs, apply, track & complete work |
| 🛡️ Admin | `ADMIN` | Verify landlords/providers, ban users, resolve disputes |

---

## 2. User Roles & Permissions

```
                         ┌─────────────┐
                         │  👤  User   │
                         │  (base row) │
                         └──────┬──────┘
                                │  role ENUM
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼                 ▼
         ┌─────────┐      ┌──────────┐    ┌────────────┐    ┌───────────┐
         │ TENANT  │      │ LANDLORD │    │ MAINTENANCE│    │   ADMIN   │
         │         │      │          │    │ _PROVIDER  │    │           │
         └────┬────┘      └────┬─────┘    └─────┬──────┘    └─────┬─────┘
              │                │                │                  │
    ┌─────────▼──┐    ┌────────▼───┐   ┌────────▼───┐    ┌────────▼───┐
    │• Browse    │    │• List props│   │• Apply to  │    │• Verify    │
    │  properties│    │• Approve / │   │  jobs      │    │  landlords │
    │• Submit    │    │  Decline   │   │• Track     │    │• Approve   │
    │  requests  │    │  requests  │   │  location  │    │  providers │
    │• Sign &    │    │• Fill &    │   │• Mark      │    │• Ban users │
    │  pay       │    │  sign      │   │  complete  │    │• Resolve   │
    │  contracts │    │  contracts │   │• Receive   │    │  disputes  │
    │• Raise     │    │• View      │   │  payment   │    │• View logs │
    │  maint.    │    │  maint.    │   │            │    │            │
    │• Chat      │    │• Chat      │   │            │    │            │
    │• Roommate  │    │            │   │            │    │            │
    │  matching  │    │            │   │            │    │            │
    └────────────┘    └────────────┘   └────────────┘    └────────────┘
```

### 🔒 Role-Based Guards

Every protected endpoint validates:
1. **JWT authenticity** — signed HS256, stored in Upstash Redis session (15 min TTL)
2. **Role check** — `req.user.role` compared to allowed roles via `requireRole()` middleware
3. **Ownership check** — service layer verifies `landlord_id`, `tenant_id`, etc.

---

## 3. Deployment & Configuration Layer

```
  .env (secrets)
       │
       ▼
  config/default.ts  ◀────  config/development.ts  (Redis OFF by default)
       │              ◀────  config/production.ts   (Redis ON, rate-limit ON)
       │
       ▼
  src/config/env.ts  (Zod schema validation)
       │
       ▼
  appConfig  (typed, singleton)
       │
       ├──▶  Middleware  (CORS origins, rate-limit toggle)
       ├──▶  Cache Service  (Redis URL, TTL defaults)
       ├──▶  Session Service  (Redis prefix, 15 min TTL)
       └──▶  Paymob / Gemini / SMTP credentials
```

### Key Config Flags

| Flag | Dev | Prod | Effect |
|---|---|---|---|
| `REDIS_ENABLED` | `false` | `true` | Enables cache + sessions |
| `RATE_LIMIT_ENABLED` | `false` | `true` | Upstash sliding-window |
| `NODE_ENV` | `development` | `production` | Picks config file |

### 🌐 Production Deployment Architecture

HOMi is deployed as a monorepo setup:
1. **Frontend (Vite + React SPA):** Hosted on **Vercel**.
   - Build Command: `vite build` (compiles to static files in `dist/`).
   - Deep Linking: Configuration in [vercel.json](client/vercel.json) rewrites all deep route requests to `index.html` to allow React Router SPA routing.
   - Env Vars: `VITE_GOOGLE_CLIENT_ID` for Google sign-in. `VITE_API_BASE_URL` points to the production backend.
2. **Backend (Node.js/Express):** Hosted on **Railway**.
   - Build Tool: Nixpacks automatically detects dependencies and runs `npm start`.
   - Production Engine: Uses `tsx` in production to run TypeScript directly without pre-compile steps.
   - Database & Cache Plugins: Deploys a managed PostgreSQL database instance and connects to Upstash Redis.
   - SSL Verification: Automatically enabled for PostgreSQL connections in production via SSL connection pooling.
3. **CI/CD Pipeline:** Fully automated via GitHub Actions:
   - Verification: On push and PR, runs backend test suite (fully mocked, 97 tests) and compiles the frontend build.
   - CD Hook: After CI passes, Railway and Vercel fetch changes from `main` to push to staging/production.

---

## 4. Client Layer (SPA)

```
  Browser
     │
     ▼
  Vite + React SPA  (port 5173 dev / CDN in prod)
     │
     ├── 📄 Pages & Features
     │       ├── /auth          → Login, Register, Email Verify, Complete Profile
     │       ├── /properties    → Browse, Search, Detail
     │       ├── /rental        → Submit request, track status
     │       ├── /contracts     → Sign flow (landlord 4-step / tenant 3-step)
     │       ├── /payments      → Wallet top-up, pay rent, history
     │       ├── /maintenance   → Post issue, track provider
     │       ├── /messages      → Real-time chat rooms
     │       ├── /roommate      → Habit quiz, AI matches
     │       ├── /settings      → Profile, security
     │       └── /admin         → Verification, ban, logs (ADMIN only)
     │
     ├── 🔌 REST via Axios  (baseURL = VITE_API_URL)
     │       └── All modules call dedicated service files
     │           e.g. contractService.ts → GET/POST /api/contracts/*
     │
     └── 🔌 Socket.IO Client  (socket.service.ts)
             ├── connect()  → wss://api.homi.app
             ├── join room  → "conversation:<id>"
             ├── join room  → "maintenance_request:<id>"
             ├── emit  "send_message"
             └── on    "new_message" | "maintenance:status" | "notification"
```

### 🛡️ Client-Side Auth Guard (`AuthGuard.tsx`)

Every protected route is wrapped in `<AuthGuard>` which enforces:

```
Route requested
      │
      ▼
 ┌────────────────────────────────┐
 │ Is accessToken in store?       │──── No ──▶  Redirect /auth/login
 └──────────────┬─────────────────┘
                │ Yes
                ▼
 ┌────────────────────────────────┐
 │ Is email verified?             │──── No ──▶  Redirect /auth/verify-email
 └──────────────┬─────────────────┘
                │ Yes
                ▼
 ┌────────────────────────────────┐
 │ Is profile complete?           │──── No ──▶  Redirect /auth/complete-profile
 └──────────────┬─────────────────┘
                │ Yes
                ▼
            ✅ Render page
```

---

## 5. Server Entry & Middleware

```
  index.ts  →  app.ts  →  Express app
                              │
            ┌─────────────────▼──────────────────────┐
            │             MIDDLEWARE PIPELINE          │
            │                                          │
            │  1. 🪖  Helmet          (security headers)│
            │  2. 🌐  CORS            (whitelist origins)│
            │  3. 📦  express.json()  (body parser)    │
            │  4. ⚡  Rate Limiter    (if enabled)     │
            │         │                                │
            │    ┌────▼────────────────────┐           │
            │    │ RATE_LIMIT_ENABLED?      │           │
            │    └────┬──────────┬──────────┘          │
            │        YES        NO                     │
            │         │          │                     │
            │         ▼          ▼                     │
            │  checkRateLimit() SKIP                   │
            │  (Upstash sliding                        │
            │   window, 60 req/min)                    │
            │    ├── PASS ──▶  next()                  │
            │    └── FAIL ──▶  429 Too Many Requests   │
            │                                          │
            │  5. 🛣️  API Routes  (/api/*)              │
            │  6. ❌  Global error handler             │
            └──────────────────────────────────────────┘
```

### API Route Map

| Prefix | Module |
|---|---|
| `/api/auth/*` | Auth (register, login, OAuth, WebAuthn, Valify NID OCR) |
| `/api/properties/*` | Properties CRUD, search & reporting |
| `/api/rental-requests/*` | Rental request lifecycle |
| `/api/contracts/*` | Contract signing, wallet payments/withdrawals, tenant reporting, early lease termination |
| `/api/payment-methods/*` | Saved credit cards/wallets management |
| `/api/maintenance/*` | Maintenance full lifecycle, bidding, conflicts & ratings |
| `/api/messages/*` | Conversations & messages |
| `/api/notifications/*` | Push & in-app notifications |
| `/api/roommate-matching/*` | Smart habit compatibility matching, AI roommate wish, connection requests, lease workspace |
| `/api/saved-properties/*` | Saved properties |
| `/api/admin/*` | Admin-only verification, ban/unban, dispute resolution, tenant reports, termination requests |

---

## 6. Auth Module

### 6.1 Registration & Email Verification

```
  Client POST /api/auth/register
         │
         ▼
  ┌──────────────────────────────────────────┐
  │  Validate body (Zod schema)              │
  │  Hash password  (bcrypt, 12 rounds)      │
  │  Create User row  (role = TENANT default)│
  │  Create Profile row (empty)              │
  │  Generate 6-digit OTP                    │
  │  Send OTP email  via Gmail SMTP          │
  │  Store OTP in Redis  (5 min TTL)         │
  └──────────────────────────────────────────┘
         │
         ▼  201 Created  { message: "Check your email" }

  Client POST /api/auth/verify-email  { otp }
         │
         ▼
  ┌──────────────────────────────────────────┐
  │  Fetch OTP from Redis                    │
  │  Compare OTP  (constant-time)            │
  │  Mark user.is_email_verified = true      │
  │  Delete OTP from Redis                   │
  │  Issue accessToken + refreshToken (JWT)  │
  │  Store session in Redis HSET (15 min)    │
  └──────────────────────────────────────────┘
         │
         ▼  200 OK  { accessToken, refreshToken, user }
```

### 6.2 Login Flow

```
  POST /api/auth/login  { email, password }
         │
         ├─ Find User by email
         ├─ bcrypt.compare(password, hash)
         ├─ Check is_email_verified → 403 if not
         ├─ Check is_banned         → 403 if banned
         ├─ Issue JWT pair
         └─ Store Redis session (HSET sessionId → userId, role)

         ▼  200 OK  { accessToken, refreshToken, user }
```

### 6.3 Google OAuth Flow

```
  GET /api/auth/google          → redirect to Google consent
  GET /api/auth/google/callback
         │
         ├─ Exchange code → Google access token
         ├─ GET https://www.googleapis.com/oauth2/v2/userinfo
         ├─ Find or create User by email
         │     └─ If new: create Profile, mark email verified
         ├─ Issue JWT pair
         └─ Redirect to CLIENT_URL with tokens in query

```

### 6.4 Token Refresh & Logout

```
  POST /api/auth/refresh  { refreshToken }
         │
         ├─ Verify refreshToken signature
         ├─ Check session exists in Redis (HGET)
         └─ Issue new accessToken  (15 min)

  POST /api/auth/logout
         ├─ Delete session from Redis (HDEL)
         └─ 200 OK
```

### 6.5 WebAuthn (Passkey)

```
  POST /api/auth/webauthn/register/options  → generate challenge
  POST /api/auth/webauthn/register/verify   → store credential
  POST /api/auth/webauthn/login/options     → generate challenge
  POST /api/auth/webauthn/login/verify      → verify + issue JWT
```

### 6.6 Egyptian National ID OCR Verification (Valify Proxy)

To safely authenticate and extract profile details from Egyptian National Identity Cards without exposing API credentials to the client side, HOMi proxies scanning queries to the **Valify OCR API**.

```
  Client POST /api/auth/verify-nid  { image }  (base64 image scan)
         │
         ▼
  ┌────────────────────────────────────────────────────────┐
  │  1. Check authentic user session                       │
  │  2. Request OAuth2 access token from Valify Stage API  │
  │     POST /api/o/token/  (credentials cached/stored)    │
  │  3. Proxy base64 NID image to Valify OCR API           │
  │     POST /api/v1.5/ocr/                                │
  └────────────────────────────────────────────────────────┘
         │
         ▼
  200 OK  { success: true, ocrData: { nationalId, birthdate, gender, firstName, lastName... } }
```

---

## 7. Properties Module

### 7.1 Property Lifecycle

```
  LANDLORD creates property
         │
         ▼
  status = DRAFT  ──▶  Landlord fills details, uploads images
         │
         ▼
  status = PENDING_VERIFICATION  ──▶  Submitted for admin review
         │
         ├─── Admin REJECTS  ──▶  status = REJECTED  (landlord notified)
         │
         └─── Admin APPROVES ──▶  status = AVAILABLE  (visible in search)
                                          │
                              Tenant submits rental request
                                          │
                                  status = RENTED
                                  (set when contract goes ACTIVE)
```

### 7.2 Property CRUD & Caching

```
  GET /api/properties  (browse / search)
         │
         ▼
  ┌──────────────────────────────────────────────┐
  │  Build cache key from query params            │
  │  cacheService.get(key)                        │
  │       │                                       │
  │  HIT ─┼──▶  Return cached JSON  (fast ⚡)    │
  │       │                                       │
  │  MISS─┼──▶  Query PostgreSQL (Sequelize)      │
  │       │     ├─ Filter: city, type, price      │
  │       │     ├─ Include: images, specs, landlord│
  │       │     └─ Paginate                       │
  │       │                                       │
  │       └──▶  cacheService.set(key, result, TTL)│
  │             └─▶  Upstash Redis SET            │
  └──────────────────────────────────────────────┘
         │
         ▼  { properties[], pagination }

  POST/PUT/DELETE  → Invalidates relevant cache keys
```

### 7.3 Property Data Model (key fields)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `landlord_id` | UUID FK | Owner |
| `title` | string | |
| `type` | ENUM | APARTMENT, VILLA, STUDIO, … |
| `status` | ENUM | DRAFT, PENDING_VERIFICATION, AVAILABLE, RENTED, REJECTED |
| `monthly_price` | DECIMAL | EGP |
| `security_deposit` | DECIMAL | EGP |
| `furnishing` | ENUM | FURNISHED, UNFURNISHED, SEMI |
| `address` | string | |
| `images[]` | join table | PropertyImage, `is_main` flag |
| `specifications` | join row | bedrooms, bathrooms, area_sqft |
| `detailedLocation` | join row | lat, lng, floor, building |
| `amenities[]` | join table | wifi, parking, pool, … |

---

## 8. Rental Requests Module

### 8.1 Full Lifecycle — Tenant → Landlord → Contract

```
  ╔══════════════════════════════════════════════════════════════════╗
  ║                  RENTAL REQUEST LIFECYCLE                        ║
  ╠══════════════════════════════════════════════════════════════════╣
  ║                                                                  ║
  ║  TENANT                    LANDLORD              SYSTEM          ║
  ║  ──────                    ────────              ──────          ║
  ║                                                                  ║
  ║  1. Browse available                                             ║
  ║     properties                                                   ║
  ║         │                                                        ║
  ║  2. POST /api/rental-requests                                    ║
  ║     { property_id,                                               ║
  ║       move_in_date,                                              ║
  ║       duration,        ──────────────────────────────────────▶  ║
  ║       occupants,                                        DB row   ║
  ║       living_situation,                            status=PENDING ║
  ║       message? }                                                 ║
  ║         │                                                        ║
  ║  3. Guard: role===TENANT                                         ║
  ║     Guard: property.status===AVAILABLE                           ║
  ║     Guard: no existing PENDING request                           ║
  ║         │                                                        ║
  ║  ✅ 201 Created { id, status: PENDING }                          ║
  ║         │                                                        ║
  ║  ════════════════════════════════════════════════════════════    ║
  ║                                                                  ║
  ║  4.  Landlord views incoming requests                            ║
  ║      GET /api/rental-requests/landlord                           ║
  ║      (filters: status, page, limit)    ◀───────────────────────  ║
  ║         │                                                        ║
  ║  5.  Landlord reviews tenant profile                             ║
  ║      (name, avatar, bio, living situation, occupants)            ║
  ║         │                                                        ║
  ║  ════════════════════════════════════════════════════════════    ║
  ║                                                                  ║
  ║  6. PATCH /api/rental-requests/:id/status                        ║
  ║     { status: "APPROVED" | "DECLINED" }                          ║
  ║         │                                                        ║
  ║     Guard: property belongs to this landlord                     ║
  ║     Guard: request.status === PENDING                            ║
  ║         │                                                        ║
  ║    ┌────▼────────────────┐                                       ║
  ║    │ DECLINED            │  status → DECLINED                    ║
  ║    │ (tenant notified)   │  tenant may re-apply later            ║
  ║    └─────────────────────┘                                       ║
  ║         │                                                        ║
  ║    ┌────▼────────────────────────────────────────────────────┐   ║
  ║    │ APPROVED                                                │   ║
  ║    │  status → APPROVED                                      │   ║
  ║    │  ActivityLog: RENTAL_REQUEST_APPROVED                   │   ║
  ║    │  ──▶  contractService.createContractFromApproval(id)   │   ║
  ║    │       (auto-creates Contract in PENDING_LANDLORD state) │   ║
  ║    └─────────────────────────────────────────────────────────┘   ║
  ║                                                                  ║
  ╚══════════════════════════════════════════════════════════════════╝
```

### 8.2 Status Enum

| Status | Who sets it | Meaning |
|---|---|---|
| `PENDING` | System (on create) | Awaiting landlord review |
| `APPROVED` | Landlord | Accepted → triggers contract creation |
| `DECLINED` | Landlord | Rejected — tenant can re-apply |
| *(deleted)* | Tenant | Tenant cancels their own PENDING request |

### 8.3 Business Rules

```
  ✅  Only TENANT role can submit requests
  ✅  Only AVAILABLE properties accept requests
  ✅  One PENDING request per tenant/property pair
      (historical APPROVED/DECLINED rows are kept for audit)
  ✅  Only LANDLORD who owns the property can approve/decline
  ✅  Only PENDING requests can be approved or declined
  ✅  Tenant can only cancel their OWN PENDING request
  ✅  Contract auto-creation failure does NOT roll back approval
```

### 8.4 Rental Request Data Fields

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `tenant_id` | UUID FK | |
| `property_id` | UUID FK | |
| `status` | ENUM | PENDING / APPROVED / DECLINED |
| `move_in_date` | DATE | Requested move-in |
| `duration` | ENUM | `6_MONTHS` / `12_MONTHS` / `24_MONTHS` |
| `occupants` | INT | Number of people |
| `living_situation` | string | e.g. "Student", "Family" |
| `message` | text? | Optional note to landlord |

---

## 9. Contracts Module

### 9.1 Contract Status State Machine

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                  CONTRACT STATUS FLOW                           │
  │                                                                 │
  │  [Auto-created on Rental Request APPROVED]                      │
  │                 │                                               │
  │                 ▼                                               │
  │        PENDING_LANDLORD  ◀── Landlord fills Steps 1-3-4        │
  │                 │                                               │
  │   Landlord signs (Step 4 complete)                              │
  │                 │                                               │
  │                 ▼                                               │
  │         PENDING_TENANT   ◀── Tenant fills Steps 1-2-3          │
  │                 │                                               │
  │   Tenant signs (Step 3 complete)                                │
  │                 │                                               │
  │                 ▼                                               │
  │        PENDING_PAYMENT   ◀── Tenant pays security deposit       │
  │                 │             + first month + service fee       │
  │                 │                                               │
  │   Payment verified                                              │
  │                 │                                               │
  │                 ▼                                               │
  │            ACTIVE        ◀── Lease is live, rent due monthly    │
  │                 │                                               │
  │   Lease end date reached (cron check)                           │
  │                 │                                               │
  │                 ▼                                               │
  │            EXPIRED / TERMINATED                                 │
  └─────────────────────────────────────────────────────────────────┘
```

### 9.2 Landlord Signing Steps (PENDING_LANDLORD)

```
  ╔══════════════════════════════════════════════════════════════════╗
  ║           LANDLORD FILLS CONTRACT  (4 steps)                    ║
  ╠══════════════════════════════════════════════════════════════════╣
  ║                                                                  ║
  ║  STEP 1 — Lease Terms & Financials                               ║
  ║  POST /api/contracts/:id/landlord/lease-terms                    ║
  ║  { rent_due_date, late_fee_amount, max_occupants }               ║
  ║  Saves: rent_due_date, late_fee_amount, max_occupants            ║
  ║                                                                  ║
  ║  STEP 2 — Identity Verification                                  ║
  ║  POST /api/contracts/:id/landlord/identity                       ║
  ║  { national_id }                                                 ║
  ║  Saves: landlord_national_id (AES-256 encrypted in DB)           ║
  ║                                                                  ║
  ║  STEP 3 — Property Ownership Confirmation                        ║
  ║  POST /api/contracts/:id/landlord/property-confirmation          ║
  ║  { property_registration_number, maintenance_responsibilities[] }║
  ║  Saves: property_registration_number                             ║
  ║  Creates: ContractMaintenanceResponsibility rows                 ║
  ║  (used later to determine who pays for maintenance)              ║
  ║                                                                  ║
  ║  STEP 4 — Sign Contract                                          ║
  ║  POST /api/contracts/:id/landlord/sign                           ║
  ║  { signature_url }                                               ║
  ║  Guard: Steps 1-2-3 must be complete                             ║
  ║  Sets: landlord_signature_url, landlord_signed_at                ║
  ║  Status: PENDING_LANDLORD → PENDING_TENANT                       ║
  ║                                                                  ║
  ╚══════════════════════════════════════════════════════════════════╝
```

### 9.3 Tenant Signing Steps (PENDING_TENANT)

```
  ╔══════════════════════════════════════════════════════════════════╗
  ║           TENANT FILLS CONTRACT  (3 steps)                      ║
  ╠══════════════════════════════════════════════════════════════════╣
  ║                                                                  ║
  ║  STEP 1 — Review (read-only)                                     ║
  ║  GET /api/contracts/:id/verification-summary                     ║
  ║  Returns: platform-verified property info, payment terms,        ║
  ║           lease duration — tenant cannot edit these              ║
  ║                                                                  ║
  ║  STEP 2 — Identity Verification                                  ║
  ║  POST /api/contracts/:id/tenant/identity                         ║
  ║  { national_id, emergency_contact_name, emergency_phone }        ║
  ║  Saves: tenant_national_id (AES-256 encrypted)                   ║
  ║         tenant_emergency_contact_name, tenant_emergency_phone    ║
  ║                                                                  ║
  ║  STEP 3 — Sign Contract                                          ║
  ║  POST /api/contracts/:id/tenant/sign                             ║
  ║  { signature_url }                                               ║
  ║  Guard: Step 2 must be complete                                  ║
  ║  Sets: tenant_signature_url, tenant_signed_at                    ║
  ║        tenant_agreed_terms = true                                ║
  ║  Status: PENDING_TENANT → PENDING_PAYMENT                        ║
  ║                                                                  ║
  ╚══════════════════════════════════════════════════════════════════╝
```

### 9.4 Payment Step (PENDING_PAYMENT → ACTIVE)

```
  Tenant chooses payment method:
         │
         ├── Option A: Pay via Paymob (card / mobile wallet)
         │       │
         │       ▼
         │   POST /api/contracts/:id/pay/initiate
         │       ├─ Calculate total = rent + security_deposit + service_fee
         │       ├─ Create Paymob order (REST API)
         │       ├─ Save paymob_order_id on contract
         │       └─ Return iFrame checkout URL
         │               │
         │        Tenant completes payment on Paymob
         │               │
         │       POST /api/contracts/:id/pay/verify
         │       { transaction_id }
         │               │
         │       ├─ paymobService.verifyTransaction(id)
         │       ├─ Match orderId + amountCents + success flags
         │       ├─ On success: payment_status=PAID, status=ACTIVE
         │       └─ On fail:   payment_status=FAILED, 400 error
         │
         └── Option B: Pay from Wallet balance
                 │
                 ▼
             POST /api/contracts/:id/pay/balance
                 │
                 ├─ Sequelize transaction (row-level lock on profile)
                 ├─ Check wallet_balance >= (rent + deposit + fee)
                 ├─ Debit wallet atomically
                 ├─ Set payment_status=PAID, status=ACTIVE
                 └─ Return remaining balance
```

### 9.5 Monthly Rent Payments (ACTIVE contract)

```
  POST /api/contracts/:id/rent/pay
         │
         ├─ Get all payable installment dates since move_in_date
         ├─ Count ActivityLog rows for MONTHLY_RENT_PAID_FROM_BALANCE
         │  (determines how many installments already paid)
         ├─ Calculate outstanding installments
         │
         ├─ Apply landlord-responsibility maintenance credits
         │  (LandlordMaintenanceCharge rows with status=PENDING)
         │  → deducted from rent amount automatically
         │
         ├─ Apply late fees (late_fee_amount × overdue installments)
         │
         ├─ Atomic debit from wallet (row-level lock)
         ├─ Mark LandlordMaintenanceCharge rows as APPLIED
         └─ Log MONTHLY_RENT_PAID_FROM_BALANCE in ActivityLog
```

### 9.6 Lease Termination & Expiry

```
  Termination Request:
  POST /api/contracts/:id/terminate
       ├─ Only LANDLORD or TENANT on contract
       ├─ Only ACTIVE contracts can be terminated
       └─ status → PENDING request created in LeaseTerminationRequests table

  Expiry (automatic):
  expireCompletedLeases()  — called at the top of every list fetch
       ├─ Finds ACTIVE contracts where:
       │    move_in_date + lease_duration_months < today
       └─ Updates status → EXPIRED

### 9.6 Early Lease Termination Request & Execution Flow

To ensure fair resolution of early exits and dispute handling, terminations undergo admin review.

1. **Request Submission:**
   - **Endpoint:** `POST /api/contracts/:id/terminate`
   - **Payload:** `{ reason, scenario, details }` (scenario defines lease breach, landlord fault, or mutual exits)
   - **Action:** Creates a `LeaseTerminationRequest` in the `PENDING` state.

2. **Admin Review:**
   - **Approve/Reject:** Admin actions request via `POST /api/admin/termination-requests/:id/action`.
   - **If Approved:** Sets request to `APPROVED`, specifying `damageDeduction` and `mutualDepositOption` (if mutual).

3. **Lease Execution (Daily Cron):**
   - The cron task `runDailyLeaseCycleCheck()` searches for active contracts with approved termination requests.
   - At the end of the current billing cycle, if rent is fully paid, the system triggers `executeApprovedLeaseTermination()` atomically:
     - **Unpaid Rent:** Calculates unpaid rent for the final cycle and transfers it from the tenant's wallet to the landlord. If the tenant's wallet is short, the rent is deducted directly from the security deposit refund.
     - **Deposit Refund / Forfeiture Scenarios:**
       - `LANDLORD_INITIATED` / `Property uninhabitable` / `Landlord breached contract`: Full deposit refunded to tenant.
       - `Property Damage` / `Lease Violation` / `Unauthorized Occupancy`: Full deposit forfeited and credited to the landlord's wallet.
       - `Early exit` (Tenant early exit, no landlord fault):
         - *Before Halfway Point:* Deposit is forfeited to the landlord as a penalty.
         - *After Halfway Point:* Deposit is refunded to the tenant, minus `damage_deduction`.
       - `Mutual Agreement`: Deposit is distributed based on the selected choice (`LANDLORD`, `TENANT`, or `SPLIT`), adjusted for damages.
     - **Lease Closeout:** The contract status is updated to `TERMINATED`, and the property status returns to `AVAILABLE`.

### 9.8 Tenant Reporting (Landlord-to-Admin)

Landlords can submit formal reports against tenants for lease violations.

- **Endpoint:** `POST /api/contracts/:id/report-tenant`
- **Payload:** `{ reason: TenantReportReason, details: string }`
- **Reasons:** `LATE_PAYMENT`, `PROPERTY_DAMAGE`, `NOISE_COMPLAINT`, `UNAUTHORIZED_OCCUPANTS`, `OTHER`.
- **Workflow:** Validates that the contract is ACTIVE or EXPIRED, creates an `OPEN` `TenantReport` record, and pushes it to the admin moderation queue.
```

### 9.7 Contract Data Model (key fields)

| Field | Type | Notes |
|---|---|---|
| `contract_id` | string | Human-readable e.g. `HOMI-4821` |
| `lease_id` | string | e.g. `L-3741-K` |
| `status` | ENUM | PENDING_LANDLORD → PENDING_TENANT → PENDING_PAYMENT → ACTIVE → EXPIRED / TERMINATED |
| `payment_status` | ENUM | PENDING / PAID / FAILED |
| `rent_amount` | DECIMAL | Monthly rent (EGP) |
| `security_deposit` | DECIMAL | EGP |
| `service_fee` | DECIMAL | Platform fee (default 10 EGP) |
| `move_in_date` | DATE | |
| `lease_duration_months` | INT | 6 / 12 / 24 |
| `rent_due_date` | INT | Day of month rent is due |
| `late_fee_amount` | DECIMAL | Per overdue installment |
| `landlord_national_id` | string | AES-256 encrypted |
| `tenant_national_id` | string | AES-256 encrypted |
| `landlord_signature_url` | string | Canvas PNG URL |
| `tenant_signature_url` | string | Canvas PNG URL |
| `paymob_order_id` | BIGINT | Paymob order reference |
| `paymob_transaction_id` | BIGINT | Paymob tx reference |

---

## 10. Payments & Wallet Module

### 10.1 Wallet Top-Up Flow (Paymob)

```
  POST /api/contracts/wallet/topup/initiate
  { amount, payment_method: "CARD" | "WALLET" }
         │
         ├─ Select Paymob integration ID based on method
         ├─ paymobService.createCheckoutSession(amountCents, ...)
         ├─ Save pending order on Profile:
         │    wallet_pending_order_id
         │    wallet_pending_amount_cents
         │    wallet_pending_save_card
         └─ Return { checkoutUrl, orderId, amountCents }

  Tenant pays on Paymob iFrame
         │
         ▼
  POST /api/contracts/wallet/topup/verify
  { transaction_id }
         │
         ├─ Idempotency: check ActivityLog for this transaction_id
         │    (prevents double-credit on retry)
         │
         ├─ paymobService.verifyTransaction(transaction_id)
         ├─ Match: orderId + amountCents + success flags
         │
         ├─ On success (row-level lock):
         │    wallet_balance += amount
         │    Clear pending order fields on Profile
         │    Log WALLET_TOPUP_VERIFIED in ActivityLog
         │
         └─ Return { balance, currency: "EGP" }
```

### 10.2 Paymob Webhook (HMAC)

```
  Paymob POST → /api/payments/webhook
         │
         ├─ Compute HMAC-SHA512 of payload
         ├─ Compare with hmac query param (timing-safe)
         ├─ If mismatch → 401
         │
         ├─ If obj_type = "TRANSACTION" + success = true:
         │    ├─ Look up order by merchant_order_id prefix
         │    │    "WALLET-{userId}-*"  → top up wallet
         │    │    "HOMI-*"            → activate contract
         │    └─ Idempotency: skip if already processed
         │
         └─ 200 OK (Paymob requires 2xx or it retries)
```

### 10.3 Payment Data Model

| Field | Where stored | Notes |
|---|---|---|
| `wallet_balance` | `Profile.wallet_balance` | User's (Tenant/Landlord/Provider) EGP balance |
| `wallet_pending_order_id` | `Profile` | Paymob order during top-up |
| `wallet_pending_amount_cents` | `Profile` | Expected amount (cents) |
| `paymob_order_id` | `Contract` | BIGINT (normalized to Number) |
| `paymob_transaction_id` | `Contract` | Paymob tx reference |

### 10.4 Wallet Withdrawal Flow

Landlords and Maintenance Providers can withdraw their earnings/balances back to their registered bank accounts:

```
  User POST /api/contracts/payments/wallet/withdraw  { amount }
         │
         ▼
  ┌────────────────────────────────────────────────────────┐
  │  1. Initiate Sequelize database transaction            │
  │  2. Fetch user Profile with row-level lock (FOR UPDATE)│
  │  3. Verify amount > 0 and wallet_balance >= amount     │
  │  4. Deduct amount from wallet_balance                  │
  │  5. Log WALLET_WITHDRAWAL in ActivityLog               │
  └────────────────────────────────────────────────────────┘
         │
         ▼
  200 OK  { balance: remainingBalance, currency: "EGP" }
```

---

## 11. Maintenance Module

> The most complex module — a full **marketplace** between tenants, landlords, and maintenance providers, with escrow, live tracking, disputes, and rating.

### 11.1 Roles in Maintenance

| Role | Capability |
|---|---|
| 🏠 **Tenant** | Post issue, review applicants, accept provider, confirm completion, raise dispute, rate provider |
| 🔑 **Landlord** | View issues on their properties, see charge party, receive notifications |
| 🔧 **Provider** | Browse open jobs, apply with price, mark en-route, mark arrived, mark complete |
| 🛡️ **Admin** | Approve/reject provider applications, resolve disputes |

### 11.2 Maintenance Request Lifecycle

```
  ╔══════════════════════════════════════════════════════════════════════╗
  ║              MAINTENANCE FULL LIFECYCLE                              ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║                                                                      ║
  ║  ① TENANT POSTS ISSUE                                               ║
  ║  POST /api/maintenance/requests                                      ║
  ║  { category, title, description, urgency,                           ║
  ║    estimatedBudget?, images[], contractId? }                         ║
  ║                                                                      ║
  ║  Guard: tenant must have an ACTIVE contract                          ║
  ║                                                                      ║
  ║  System derives charge_party from contract responsibilities:         ║
  ║    If category maps to a LANDLORD-responsible area                   ║
  ║      → charge_party = LANDLORD                                       ║
  ║    Else → charge_party = TENANT                                      ║
  ║                                                                      ║
  ║  status → OPEN                                                       ║
  ║  Notify: landlord (new issue posted)                                 ║
  ║  Notify: up to 25 approved providers in that category                ║
  ║                                                                      ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║                                                                      ║
  ║  ② PROVIDERS BROWSE & APPLY                                         ║
  ║  GET /api/maintenance/jobs/available                                 ║
  ║  Guard: provider must have APPROVED application                      ║
  ║                                                                      ║
  ║  POST /api/maintenance/jobs/:requestId/apply                         ║
  ║  { finalPrice, priceBreakdown?, coverNote?, etaHours? }              ║
  ║  Guard: request still OPEN                                           ║
  ║  Guard: provider hasn't applied before                               ║
  ║  Creates: MaintenanceJobApplication (status=PENDING)                 ║
  ║  Notify: tenant (new application received)                           ║
  ║                                                                      ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║                                                                      ║
  ║  ③ TENANT ACCEPTS AN APPLICATION  (ESCROW DEBIT)                    ║
  ║  POST /api/maintenance/requests/:id/accept-application               ║
  ║  { applicationId }                                                   ║
  ║                                                                      ║
  ║  Sequelize transaction (row-level lock):                             ║
  ║    ├─ Debit tenant wallet by agreed_price (escrow)                   ║
  ║    ├─ Set request.status = ASSIGNED                                  ║
  ║    ├─ Set assigned_provider_id                                       ║
  ║    ├─ accepted_application → status = ACCEPTED                       ║
  ║    └─ All other PENDING applications → status = REJECTED             ║
  ║                                                                      ║
  ║  Notify: accepted provider (you got the job)                         ║
  ║  Notify: rejected providers (not selected)                           ║
  ║  Notify: landlord (provider accepted)                                ║
  ║  Realtime: emit maintenance:status to request room                   ║
  ║                                                                      ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║                                                                      ║
  ║  ④ PROVIDER EN ROUTE                                                ║
  ║  POST /api/maintenance/requests/:id/en-route                         ║
  ║  Guard: assigned_provider_id === current user                        ║
  ║  status → EN_ROUTE, en_route_started_at = now                        ║
  ║  Notify: tenant + landlord                                           ║
  ║  Realtime: emit maintenance:status                                   ║
  ║                                                                      ║
  ║  POST /api/maintenance/requests/:id/location   (live GPS)            ║
  ║  { lat, lng, accuracyM?, heading?, speed? }                          ║
  ║  Upserts: MaintenanceLocation row                                    ║
  ║  Realtime: emit maintenance:location to request room                 ║
  ║                                                                      ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║                                                                      ║
  ║  ⑤ PROVIDER ARRIVED & IN PROGRESS                                   ║
  ║  POST /api/maintenance/requests/:id/arrived                          ║
  ║  status → IN_PROGRESS, in_progress_started_at = now                  ║
  ║  Notify: tenant + landlord                                           ║
  ║                                                                      ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║                                                                      ║
  ║  ⑥ PROVIDER MARKS COMPLETE                                          ║
  ║  POST /api/maintenance/requests/:id/complete                         ║
  ║  { completionNotes, completionImages[] }                             ║
  ║  status → PENDING_CONFIRMATION                                       ║
  ║  provider_completed_at = now                                         ║
  ║  Notify: tenant (please confirm or dispute)                          ║
  ║                                                                      ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║                                                                      ║
  ║  ⑦ TENANT CONFIRMS COMPLETION  (ESCROW RELEASE)                     ║
  ║  POST /api/maintenance/requests/:id/confirm-completion               ║
  ║                                                                      ║
  ║  charge_party = TENANT:                                              ║
  ║    Escrow already debited → credit provider wallet                   ║
  ║                                                                      ║
  ║  charge_party = LANDLORD:                                            ║
  ║    Refund escrow back to tenant wallet                                ║
  ║    Create LandlordMaintenanceCharge (status=PENDING)                 ║
  ║    → deducted from landlord's next rent payment automatically        ║
  ║                                                                      ║
  ║  status → COMPLETED, tenant_confirmed_at = now                       ║
  ║  Notify: provider (payment released)                                 ║
  ║  Notify: landlord (job completed)                                    ║
  ║                                                                      ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║                                                                      ║
  ║  ⑧ TENANT RAISES DISPUTE (instead of confirming)                    ║
  ║  POST /api/maintenance/requests/:id/dispute                          ║
  ║  { reason }                                                          ║
  ║  status → DISPUTED, disputed_at = now                                ║
  ║  Creates: MaintenanceConflict row (status=OPEN)                      ║
  ║  Escrow held — neither party gets it yet                             ║
  ║  Notify: admin, provider                                             ║
  ║                                                                      ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║                                                                      ║
  ║  ⑨ ADMIN RESOLVES DISPUTE                                           ║
  ║  POST /api/maintenance/conflicts/:id/resolve                         ║
  ║  { resolution: "TENANT_WINS" | "PROVIDER_WINS" | "SPLIT",           ║
  ║    adminNotes, splitRatio? }                                          ║
  ║                                                                      ║
  ║  TENANT_WINS  → full escrow refunded to tenant                       ║
  ║  PROVIDER_WINS→ full escrow released to provider                     ║
  ║  SPLIT        → splitRatio% to provider, rest to tenant              ║
  ║                                                                      ║
  ║  status → RESOLVED, resolved_at = now                                ║
  ║  Conflict.status → RESOLVED                                          ║
  ║  Notify: tenant + provider                                           ║
  ║                                                                      ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║                                                                      ║
  ║  ⑩ TENANT RATES PROVIDER  (after COMPLETED or RESOLVED)             ║
  ║  POST /api/maintenance/requests/:id/rate                             ║
  ║  { rating: 1-5, comment? }                                           ║
  ║  Creates: MaintenanceRating row                                       ║
  ║  Linked to provider_id for aggregate rating display                  ║
  ║                                                                      ║
  ╚══════════════════════════════════════════════════════════════════════╝
```

### 11.3 Maintenance Status Enum

| Status | Triggered by |
|---|---|
| `OPEN` | Tenant posts issue |
| `ASSIGNED` | Tenant accepts provider application |
| `EN_ROUTE` | Provider marks en-route |
| `IN_PROGRESS` | Provider marks arrived |
| `PENDING_CONFIRMATION` | Provider marks complete |
| `COMPLETED` | Tenant confirms completion |
| `DISPUTED` | Tenant disputes instead of confirming |
| `RESOLVED` | Admin resolves dispute |
| `CANCELLED` | Tenant cancels (only while OPEN) |

### 11.4 Provider Application Process

```
  Provider wants to join HOMi as maintenance provider:

  POST /api/maintenance/provider/apply
  { category, providerType: "INDIVIDUAL"|"COMPANY",
    businessName?, bio, yearsExperience, certifications[] }
         │
         ▼
  MaintenanceProviderApplication  (status = PENDING)
         │
         ▼
  Admin reviews → GET /api/admin/provider-applications
         │
         ├─ PATCH /api/admin/provider-applications/:id/approve
         │    status → APPROVED
         │    Provider can now browse jobs
         │
         └─ PATCH /api/admin/provider-applications/:id/reject
              status → REJECTED
              Provider cannot access job marketplace
```

### 11.5 Charge Party Logic

```
  When tenant posts issue, system checks contract responsibilities:

  category = "Plumbing"
       │
       ▼
  CATEGORY_TO_CONTRACT_AREAS["Plumbing"] = ["Plumbing"]
       │
       ▼
  ContractMaintenanceResponsibility.findAll({
    contract_id, area: { $in: ["Plumbing"] }
  })
       │
       ├─ Any row with responsible_party = "LANDLORD"?
       │    YES → charge_party = LANDLORD
       │          (landlord pays, deducted from next rent)
       │
       └─ All TENANT or no rows?
            → charge_party = TENANT
              (tenant's wallet pays provider directly)
```

---

## 12. Messages Module

### 12.1 Conversation & Messaging Flow

```
  POST /api/messages/conversations
  { participantId }  — create or fetch existing conversation
         │
         ▼
  Conversation row (participant_a, participant_b)

  POST /api/messages/conversations/:id/messages
  { content, type: "TEXT"|"IMAGE" }
         │
         ├─ Persist to PostgreSQL (Message row)
         ├─ Save to Redis chat history:
         │    LPUSH  chat:{conversationId}  serialized message
         │    LTRIM  chat:{conversationId}  0 99   (keep last 100)
         │
         └─ Emit via Socket.IO:
              io.to("conversation:{id}").emit("new_message", payload)

  GET /api/messages/conversations/:id/messages
         │
         ├─ Try Redis LRANGE chat:{id} 0 99  (fast read ⚡)
         └─ Fallback: PostgreSQL query + repopulate Redis

  PATCH /api/messages/conversations/:id/read
         ├─ Mark messages as read in DB
         └─ Emit "messages_read" event to room
```

### 12.2 Socket.IO Room Management for Messages

```
  Client connects → socket.service.ts authenticates via JWT
  Client emits "join_conversation" { conversationId }
       └─ Server: socket.join("conversation:{id}")

  Client emits "send_message" { conversationId, content }
       └─ Server: persist + broadcast to room

  Client emits "leave_conversation" { conversationId }
       └─ Server: socket.leave("conversation:{id}")
```

---

## 13. Notifications Module

```
  notificationService.create({ userId, type, title, body,
                                relatedEntityType, relatedEntityId, data? })
         │
         ├─ Persist to PostgreSQL (Notification row)
         └─ Emit via Socket.IO:
              io.to("user:{userId}").emit("notification", payload)

  notificationService.createMany([...])  — bulk insert + emit

  GET  /api/notifications           — list user's notifications
  PATCH /api/notifications/:id/read — mark one as read
  PATCH /api/notifications/read-all — mark all as read
  DELETE /api/notifications/:id     — delete one
```

### Notification Types

| Type | Trigger |
|---|---|
| `MAINTENANCE_REQUEST_POSTED` | Tenant posts issue |
| `MAINTENANCE_NEW_APPLICATION` | Provider applies to job |
| `MAINTENANCE_APPLICATION_ACCEPTED` | Tenant accepts provider |
| `MAINTENANCE_APPLICATION_REJECTED` | Another provider was chosen |
| `MAINTENANCE_PROVIDER_EN_ROUTE` | Provider heads out |
| `MAINTENANCE_COMPLETION_REQUESTED` | Provider marks done |
| `MAINTENANCE_COMPLETED` | Tenant confirms |
| `MAINTENANCE_DISPUTED` | Tenant raises dispute |
| `MAINTENANCE_DISPUTE_RESOLVED` | Admin resolves |
| `RENTAL_REQUEST_APPROVED` | Landlord approves request |
| `RENTAL_REQUEST_DECLINED` | Landlord declines request |
| `CONTRACT_READY_TO_SIGN` | Contract ready for tenant |
| `SYSTEM` | Generic platform alerts |

---

## 14. Roommate Matching Module

HOMi features a complete roommate matching system under the `/api/roommate-matching/*` routes. It helps tenants find compatible roommates or list individual rooms in their active lease using non-AI filtering, AI compatibility, and a dedicated lease partition workspace.

### 14.1 Habit Profile Quiz
```
  POST /api/roommate-matching/requests
  { habits: { sleepSchedule, noiseLevel, guestPolicy,
              cleanlinessLevel, smokingPolicy, petsPolicy,
              workFromHome, sharingCommonAreas } }
         │
         ├─ Save habits to Profile (JSONB column)
         └─ 200 OK
```

### 14.2 Matching Strategies

#### 👥 A. Smart Matches (Non-AI Habit Compatibility)
- **Endpoint:** `GET /api/roommate-matching/smart-matches`
- **Workflow:**
  1. Computes matching scores mathematically (0-100) by comparing user lifestyle habits against candidate profiles in the same city.
  2. Supports filters: `city`, `area`, `gender`, `minScore`.

#### 🔮 B. HOMi Wish AI Matching (Google Gemini AI)
- **Endpoint:** `POST /api/roommate-matching/wish`
- **Payload:** `{ wishText }` (e.g. "Seeking an early-sleeping medical student, clean and feline-friendly.")
- **Workflow:**
  1. Compiles a roster of all active roommate seekers in the same city.
  2. Sends the candidate roster along with the user's free-text `wishText` to Google Gemini.
  3. Gemini computes a personalized compatibility score and provides a 2-sentence rationale.
  4. Returns the candidate list sorted by the AI compatibility score.

### 14.3 Roommate Connections
- **Send Connection:** `POST /api/roommate-matching/connect` sends a roommate invitation to a target user, creating a pending `RoommateMatch` and triggering a system notification.
- **Mutual Accept:** If the target accepts (via `PATCH /api/roommate-matching/matches/:id/respond` with action `ACCEPTED`), the match status updates to `MUTUAL` and enables chat options.

### 14.4 Lease Workspace & Room Partitions
Active leaseholders can configure and divide their active properties to recruit roommates:
- **Get Active Leases:** `GET /api/roommate-matching/leases` returns the user's active contracts, auto-generating a default room config (e.g., Master Room ensuite vs. standard rooms, splitting the monthly rent amount evenly across bedrooms).
- **Save Config:** `PUT /api/roommate-matching/leases/:contractId/config` saves `{ roommatesWanted, rooms: [{ name, rent, ensuite, listed }] }`. This creates/updates an active `SEARCH_ROOMMATE` `RoommateRequest` listing in the database, publicizing the vacant rooms.

---

## 15. Admin Module

### 15.1 Admin Capabilities

```
  All admin routes require role === ADMIN  (enforced by requireRole middleware)

  ┌─────────────────────────────────────────────────────────────────┐
  │  PROPERTY VERIFICATION                                          │
  │  GET  /api/admin/properties/pending                             │
  │  PATCH /api/admin/properties/:id/approve  → status = AVAILABLE │
  │  PATCH /api/admin/properties/:id/reject   → status = REJECTED  │
  │        └─ Notifies landlord via email + in-app notification     │
  ├─────────────────────────────────────────────────────────────────┤
  │  USER MANAGEMENT                                                │
  │  GET  /api/admin/users             — list all users             │
  │  GET  /api/admin/users/:id         — user detail                │
  │  PATCH /api/admin/users/:id/ban    — set is_banned = true       │
  │  PATCH /api/admin/users/:id/unban  — set is_banned = false      │
  │  PATCH /api/admin/users/:id/verify — set is_verified = true     │
  │        (landlord identity verified by admin)                    │
  ├─────────────────────────────────────────────────────────────────┤
  │  MAINTENANCE PROVIDER APPLICATIONS                              │
  │  GET  /api/admin/provider-applications                          │
  │  PATCH /api/admin/provider-applications/:id/approve             │
  │  PATCH /api/admin/provider-applications/:id/reject              │
  ├─────────────────────────────────────────────────────────────────┤
  │  DISPUTE RESOLUTION                                             │
  │  GET  /api/admin/maintenance/conflicts                          │
  │  POST /api/admin/maintenance/conflicts/:id/resolve              │
  │       { resolution, adminNotes, splitRatio? }                   │
  ├─────────────────────────────────────────────────────────────────┤
  │  TENANT COMPLAINT MODERATION                                    │
  │  GET  /api/admin/tenant-reports      — list tenant reports      │
  │  POST /api/admin/tenant-reports/:id/warn                        │
  │       → sends warning email + system notification to tenant     │
  │       → updates report status to ACTIONED                       │
  │  POST /api/admin/tenant-reports/:id/ban                         │
  │       → bans tenant account (is_banned = true)                  │
  │       → sends ban email, destroys active Redis sessions         │
  │       → updates report status to ACTIONED                       │
  ├─────────────────────────────────────────────────────────────────┤
  │  LEASE TERMINATION REQUESTS                                     │
  │  GET  /api/admin/termination-requests — list early exit requests│
  │  POST /api/admin/termination-requests/:id/action                │
  │       { action: "APPROVE" | "REJECT", rejectionReason?,         │
  │         damageDeduction?, mutualDepositOption? }                │
  │       → APPROVE: status → APPROVED, triggers cron execution     │
  │       → REJECT: status → REJECTED, sends user notification      │
  ├─────────────────────────────────────────────────────────────────┤
  │  ACTIVITY LOGS (Audit Trail)                                    │
  │  GET  /api/admin/activity-logs                                  │
  │  Every significant action logs to ActivityLog table:            │
  │    { actor_user_id, role, action, entityType,                   │
  │      entityId, description, metadata, created_at }              │
  └─────────────────────────────────────────────────────────────────┘
```

---

## 16. Saved Properties Module

```
  POST   /api/saved/:propertyId   — save a property (upsert)
  DELETE /api/saved/:propertyId   — unsave a property
  GET    /api/saved               — list all saved properties
                                    (with full property details,
                                     images, specs, landlord info)
```

---

## 17. Cache & Session Services

### 17.1 Cache Service

```
  cacheService.get(key)
       ├─ REDIS_ENABLED=true  → Upstash Redis GET
       └─ REDIS_ENABLED=false → return null (no-op)

  cacheService.set(key, value, ttlSeconds)
       ├─ REDIS_ENABLED=true  → Upstash Redis SET EX ttl
       └─ REDIS_ENABLED=false → no-op

  cacheService.del(key | key[])
       ├─ Single key  → Redis DEL
       └─ Pattern     → Redis SCAN + DEL (bulk invalidation)

  Used by: Properties module (browse/search results, TTL=300s)
```

### 17.2 Session Service

```
  sessionService.create(sessionId, { userId, role, email })
       └─ Redis HSET session:{id} field value  (EX 900s = 15 min)

  sessionService.get(sessionId)
       └─ Redis HGETALL session:{id}

  sessionService.delete(sessionId)
       └─ Redis DEL session:{id}

  sessionService.refresh(sessionId)
       └─ Redis EXPIRE session:{id} 900

  Used by: Auth module (login, refresh, logout)
```

### 17.3 Chat History Service

```
  chatHistoryService.push(conversationId, message)
       └─ Redis LPUSH chat:{id}  JSON.stringify(message)
          Redis LTRIM chat:{id}  0 99   (capped at 100 messages)

  chatHistoryService.get(conversationId)
       └─ Redis LRANGE chat:{id}  0 -1
          Returns: parsed message[]  (newest first)

  O(1) write complexity — constant time regardless of history size
  Used by: Messages module
```

---

## 18. Real-time Layer (Socket.IO)

```
  Socket.IO Server  (attached to Express HTTP server)
         │
  Authentication middleware:
       └─ Extract JWT from handshake.auth.token
          Verify + attach user to socket

  Room Types:
  ┌─────────────────────────────────────────────────┐
  │  "user:{userId}"          Personal room          │
  │   → notifications, session events               │
  │                                                  │
  │  "conversation:{id}"      Chat room              │
  │   → new_message, messages_read                   │
  │                                                  │
  │  "maintenance_request:{id}"  Job room            │
  │   → maintenance:status, maintenance:location     │
  └─────────────────────────────────────────────────┘

  Events emitted by server:
  ┌────────────────────────┬────────────────────────────┐
  │ Event                  │ Payload                    │
  ├────────────────────────┼────────────────────────────┤
  │ new_message            │ { message, conversationId }│
  │ messages_read          │ { conversationId, userId } │
  │ notification           │ { type, title, body, data }│
  │ maintenance:status     │ { requestId, status }      │
  │ maintenance:location   │ { lat, lng, heading, speed}│
  └────────────────────────┴────────────────────────────┘
```

---

## 19. Data Stores

### 19.1 PostgreSQL (Supabase, AWS eu-west-1)

```
  ORM: Sequelize  (TypeScript models)
  Connection: Pool (max 10, idle 30s, acquire 60s)

  Core Tables:
  ┌──────────────────────────────────────────────────┐
  │  users                    profiles               │
  │  properties               property_images        │
  │  property_specifications  property_amenities      │
  │  property_detailed_loc    saved_properties        │
  │  rental_requests          contracts              │
  │  contract_maintenance_res payment_methods        │
  │  maintenance_requests     maintenance_job_apps    │
  │  maintenance_locations    maintenance_conflicts   │
  │  maintenance_ratings      maintenance_provider_app│
  │  landlord_maint_charges   conversations          │
  │  messages                 notifications           │
  │  roommate_profiles        activity_logs           │
  └──────────────────────────────────────────────────┘
```

### 19.2 Upstash Redis (REST API)

```
  Key namespaces:
  ┌─────────────────────────────────────────────────┐
  │  session:{sessionId}     Auth sessions (15 min)  │
  │  otp:{userId}            Email OTP    (5  min)   │
  │  cache:properties:*      Query cache  (5  min)   │
  │  chat:{conversationId}   Message list (no TTL)   │
  │  ratelimit:{ip}          Sliding window counters │
  └─────────────────────────────────────────────────┘
```

---

## 20. External Services

| Service | Usage | Auth |
|---|---|---|
| **Paymob** | Payment iFrame, mobile wallet, HMAC webhooks | API key + HMAC secret |
| **Google OAuth 2.0** | Social login, user info fetch | OAuth2 client credentials |
| **Google Gemini AI** | Roommate habit compatibility scoring | API key |
| **Gmail SMTP** | Email verification OTPs, system emails | App password (Nodemailer) |
| **Valify OCR** | Egyptian National ID scan & OCR verification stage APIs | Client credentials + Bundle key |

---

## 21. Full Data Flow Diagram

```
  ┌──────────────────────────────────────────────────────────────────────────────────┐
  │                        HOMi COMPLETE DATA FLOW                                   │
  └──────────────────────────────────────────────────────────────────────────────────┘

  USERS
  ─────
  [Tenant Browser] ──HTTPS──▶ [Express :3000]
  [Landlord Browser]──HTTPS──▶ [Express :3000]
  [Admin Browser]  ──HTTPS──▶ [Express :3000]
  [Any Browser]    ──WSS───▶  [Socket.IO Server]

  AUTH FLOW
  ─────────
  Register/Login ──▶ Auth Module ──▶ PostgreSQL (User, Profile)
                              └────▶ Upstash Redis (session HSET)
                              └────▶ Gmail SMTP (OTP email)
                              └────▶ Google OAuth API (social login)
                              └────▶ Valify OCR API (NID scanning verification proxy)

  PROPERTY BROWSING
  ─────────────────
  GET /properties ──▶ Cache Service ──HIT──▶ Upstash Redis ──▶ Response
                              └──MISS──▶ PostgreSQL ──▶ Upstash Redis SET ──▶ Response

  RENTAL → CONTRACT → PAYMENT PIPELINE
  ─────────────────────────────────────
  Tenant  ──POST rental-request──▶ DB (status=PENDING)
  Landlord──PATCH approve       ──▶ DB (status=APPROVED)
                                    └──▶ contractService.createContractFromApproval()
                                              └──▶ DB (Contract, status=PENDING_LANDLORD)
  Landlord fills 4 steps        ──▶ DB (encrypted fields, signature)
                                    status → PENDING_TENANT
  Tenant   fills 3 steps        ──▶ DB (encrypted fields, signature)
                                    status → PENDING_PAYMENT
  Tenant pays (Paymob / wallet) ──▶ Paymob API  (if card)
                                    └──▶ verifyTransaction ──▶ DB (status=ACTIVE)
                                  OR wallet debit ──▶ DB (status=ACTIVE)

  Monthly rent   ──▶ Check installments ──▶ Apply credits ──▶ wallet debit ──▶ ActivityLog

  Withdrawal     ──▶ POST /payments/wallet/withdraw ──▶ Atomic wallet debit ──▶ ActivityLog

  Landlord Report──▶ POST /report-tenant ──▶ TenantReport (OPEN) ──▶ Admin Queue

  Lease Terminate──▶ POST /terminate ──▶ LeaseTerminationRequest (PENDING) ──▶ Admin Queue

  MAINTENANCE PIPELINE
  ────────────────────
  Tenant posts issue    ──▶ DB (OPEN) ──▶ Notify landlord + providers
  Provider applies      ──▶ DB (application PENDING) ──▶ Notify tenant
  Tenant accepts        ──▶ wallet debit (escrow) ──▶ DB (ASSIGNED)
                            Socket.IO broadcast maintenance:status
  Provider en-route     ──▶ DB (EN_ROUTE) ──▶ Socket.IO location stream
  Provider completes    ──▶ DB (PENDING_CONFIRMATION) ──▶ Notify tenant
  Tenant confirms       ──▶ Release escrow to provider  (or create landlord charge)
                            DB (COMPLETED)
  Tenant disputes       ──▶ DB (DISPUTED) ──▶ Create conflict ──▶ Notify admin
  Admin resolves        ──▶ Split/release escrow ──▶ DB (RESOLVED)

  MESSAGING
  ─────────
  Send message  ──▶ DB (persist) ──▶ Redis LPUSH (chat history)
                    Socket.IO emit new_message to conversation room

  AI & SMART ROOMMATE MATCHING
  ────────────────────────────
  GET /smart-matches ──▶ Fetch candidate pool ──▶ Habit compatibility scoring ──▶ Response
  POST /wish         ──▶ Fetch candidate pool ──▶ Google Gemini AI (wish text rank) ──▶ Response
  POST /connect      ──▶ Create RoommateMatch (PENDING) ──▶ System Notification to target
  PUT /leases/:id/config ──▶ Save rooms layout ──▶ RoommateRequest (SEARCH_ROOMMATE)

  ADMIN
  ─────
  Property verify ──▶ DB (status=AVAILABLE) ──▶ Cache invalidate ──▶ Notify
  User ban        ──▶ DB (is_banned=true)   ──▶ Session destroy (Redis DEL)
  Dispute resolve ──▶ Wallet transfers      ──▶ DB (RESOLVED)    ──▶ Notify
  Tenant report   ──▶ Warn (warning email + system notify) / Ban ──▶ Status (ACTIONED)
  Termination     ──▶ Approve/Reject request ──▶ Run execution in cycle cron

  ┌──────────────────────────────────────────────────────────────────────────────────┐
  │  LEGEND                                                                          │
  │  ──▶   Synchronous request / DB write                                            │
  │  ···▶  Async / event-driven                                                      │
  │  ━━▶   Real-time (Socket.IO)                                                     │
  │  🔒    Encrypted at rest (AES-256)                                               │
  │  🔑    JWT-protected endpoint                                                    │
  │  ⚡    Redis-cached (fast path)                                                   │
  └──────────────────────────────────────────────────────────────────────────────────┘
```

---

*Generated from live source code — `server/src/modules/*` — May 2026*
