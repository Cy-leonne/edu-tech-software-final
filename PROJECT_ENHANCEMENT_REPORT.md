
# Edu-Tech School Management System — Project Enhancement Report

**Project:** School Management System (Edu-Tech) — React 18 (CRA) frontend + Express/MongoDB backend
**Scope:** UI/UX & responsiveness, 3rd-party integrations (SendGrid email, payment provider), full security assessment, testing and verification
**Deliverable:** the complete, runnable project in this workspace (`/home/user/backend`, `/home/user/frontend`) plus this report and updated `.env.example` files
**Report date:** 2026-09-16

> Everything below was verified in this workspace. Where a task could not be completed
> (PayWave), it is reported as **blocked with the exact prerequisites** rather than implemented.

---

## 1. Project Analysis

### 1.1 Architecture (unchanged)

| Layer | Technology | Notes |
| --- | --- | --- |
| Frontend | React 18, Create React App (`react-scripts` 5), MUI 5, Redux Toolkit, React Router 6.10, axios, styled-components, recharts | `frontend/src` |
| Backend | Node.js + Express 4, Mongoose 7, JWT (`jsonwebtoken`), bcrypt, express-rate-limit, multer | `backend/` |
| Database | MongoDB (single database, documents scoped by a `school` field) | `utils/db.js` |
| Mail | SendGrid Web API v3 or SMTP (nodemailer) or demo logger | `services/emailService.js` |
| SMS | Existing providers retained (Twilio / Africast / demo) | `services/smsService.js` |
| Payments | Existing M-Pesa (Safaricom Daraja) STK Push integration | `services/mpesaService.js`, `controllers/parent-controller.js` |

**No framework migration, no rewrite, no architectural change was performed.** All new code
follows the existing file layout, naming and coding conventions (commonjs controllers,
`utils/` helpers, MUI styled components, redux "handle/slice" pairs).

### 1.2 Roles and tenant model (preserved)

`SuperAdmin`, `Admin` (school owner), `Accountant`, `HR`, `Teacher`, `Student`, `Parent`.
Tenant isolation is implemented through:
* a `school` reference on school-scoped documents, and
* the shared guards in `backend/middleware/schoolAccess.js`
  (`getRequestUser`, `verifySchoolId`, `verifyEntityBelongsToAdminSchool`, `enforceSubscriptionStatus`).

### 1.3 Issues found during the analysis (fixed unless stated)

**Security**
1. `middleware/schoolAccess.js` returned `true` in the cross-school branches → **any** authenticated
   user could read/modify other schools' records (IDOR / broken tenant isolation).
2. `/SuperAdmin/*` (schools, subscriptions, admins, backups, academic years, reports) had **no
   authentication middleware** at all; several controllers did their own check, `getAcademicYears`
   did not.
3. The in-memory demo database (`backend/testdb.js`) was consulted **unconditionally** during admin
   lookups, making the well-known demo credentials (`yogendra@12` / `zxc`) a production backdoor.
4. `POST /Student/PaymentWebhook` accepted **any** JSON payload and could change a student's balance and
   `totalFees` without authentication.
5. M-Pesa callback verification (`validateCallback`) always returned `true`; callbacks were not
   idempotent and the callback amount was not compared with the requested amount.
6. User-supplied search strings were interpolated into MongoDB `$regex` queries (regex injection / ReDoS).
7. Password-reset tokens were stored in clear text, were re-usable until expiry, leaked through
   controller error messages, and the endpoint revealed whether an account exists.
8. `/health` exposed the MongoDB connection string (including credentials).
9. Uploaded files were served without `X-Content-Type-Options` / download hardening.
10. `middleware/superadminAuth.js` returned `err.message` to the caller on internal failures.
11. Git ignore rules did not cover `.env` files.

**UI/UX**
12. Rows-per-page selection used `parseInt(event.target.value, 5)` (invalid radix) in `ShowTeachers.js`
    → page size was ignored; several tables had no pagination at all.
13. Table page index was never clamped → blank tables after deleting rows.
14. Wide tables caused horizontal page scrolling on phones; no mobile alternative existed.
15. Missing/blank loading, empty and error states on the main list and dashboard screens.
16. Dashboard shells used fixed padding/height and produced clipped content on small screens.

**Assets / build**
17. The images referenced by the UI (`assets/designlogin.jpg`, `assets/img1..img4.png`,
    `assets/classroom.png`) were **not present** in the source package (the repomix bundle that was
    provided contains text only). Missing-module errors made `npm run build` fail.
18. The frontend dependency tree could not be installed/built: `schema-utils@4`/`ajv-keywords@5`
    (webpack 5) require `ajv@8` while `eslint`/`schema-utils@2,3`/`ajv-keywords@3` require `ajv@6`.

---

## 2. UI/UX Improvements

### 2.1 Consistent, responsive design system

* **`src/theme.js` (new)** — single MUI theme. Visual identity preserved exactly
  (primary `#1976d2`, secondary `#2c2143`, error `#b71c1c`, existing fonts and icon set);
  only typography scaling, spacing, container widths, breakpoints and standard component defaults
  (button sizes, table density, dialog margins, paper radius) were standardised.
* **`src/index.js` (rewritten)** — wraps the app in `ThemeProvider` + `CssBaseline` and publishes the
  resolved API base URL (see §2.4). Redux provider, app structure and entry behaviour unchanged.
* **`src/index.css`** — global overflow guards (`overflow-x: hidden`, `max-width: 100%` on media,
  tables, papers), contained horizontal scrolling for `.MuiTableContainer-root`, touch scrolling,
  readable pagination and dialogs that never exceed the viewport, mobile type scale (320–480 px).

### 2.2 Dashboards

* **`pages/admin/AdminHomePage.js`** — shared `PageHeader` (title, subtitle, breadcrumbs, actions),
  KPI cards that reflow `xs:12 → sm:6 → lg:3`, equal-height cards, skeleton placeholders while the
  summary loads, explicit error card with retry, and a responsive action row. Data flow and values
  (`CountUp` totals, `/Admin/Summary`) unchanged.
* Dashboard shells (`AdminDashboard`, `StudentDashboard`, `TeacherDashboard`) keep their existing
  structure and colours; the shared `styles.boxStyled` object now uses fluid padding
  (`xs 12px → md 24px`), `min-width: 0` and `overflow-x: hidden`, which removes the previously
  clipped content on small screens without altering layout for desktop.

### 2.3 Tables, pagination, states

* **`components/TableTemplate.js`** and **`components/TableViewTemplate.js`** (rewritten):
  numeric page-size selection (`parseInt(..., 10)`), page clamping, empty state, sticky header,
  contained horizontal scroll for wide tables, aria labels on pagination, and a **card layout below
  `md`** so no table forces horizontal page scrolling on a 320 px screen. The public component API
  (`columns`, `rows`, `buttonHaver`) is unchanged, so all existing call sites keep working.
* **`components/PageHeader.js` (new)** — consistent page titles/spacing/breadcrumbs; collapses to a
  single column on phones.
* **`components/StateViews.js` (new)** — `LoadingState`, `TableLoadingState`, `EmptyState`,
  `ErrorState` (with retry), used across the dashboards and list screens.
* Converted the main admin lists to the shared paginated component: `ShowTeachers`, `ShowAccountants`,
  `ShowHR` (search behaviour, delete behaviour and navigation preserved; the `parseInt(..., 5)` bug is
  fixed as part of the conversion).

### 2.4 API base URL / local development

* **`utils/apiConfig.js` (new)** — `REACT_APP_BASE_URL` when configured, otherwise the current origin.
  Existing pages that read `process.env.REACT_APP_BASE_URL || 'http://localhost:5000'` keep working
  because the value is published before render. This removes the hard-coded localhost dependency in
  hosted deployments.
* **`setupProxy.js` (new)** — dev-server proxy to `REACT_APP_PROXY_TARGET` (default
  `http://127.0.0.1:5000`). Only API traffic is proxied: page loads (`Accept: text/html`), bundles and
  files with an extension are served by the SPA, so deep links such as `/admin` and `/Parent/login`
  work.

### 2.5 Public navigation and the administrative entry point (requirement 5)

* `pages/Homepage.js` — the hero offers **Parent Portal** and **Student Portal** only. No "Admin"
  link exists anywhere in the public site (header, hero, footer or mobile menu). Staff open the
  portal directly (`/choose` for the portal chooser, `/Adminlogin`, `/Accountantlogin`, `/HRlogin`,
  `/SuperAdminlogin`).
* The admin interface is available at **`/admin`** (and the pre-existing `/Admin/*` routes remain
  valid for bookmarks/e-mails). `AdminDashboard` takes a `basePath` prop; `SideBar` and
  `components/AccountMenu.js` derive their links from it so navigation stays inside whichever prefix
  the user entered through.
* **The backend is the real authorization boundary** — see §3.19: all `/SuperAdmin/*` routes now
  require an authenticated, approved administrator and role checks are enforced per route.
* Demo/guest shortcuts are disabled unless both `REACT_APP_ENABLE_GUEST_DEMO=true` **and** the
  backend demo dataset are enabled; see §3.20.

### 2.6 Responsiveness verification

* Breakpoints tested by construction: `xs` 320 px, `sm` 600 px, `md` 900 px, `lg` 1200 px, `xl` 1920 px.
* Global `overflow-x: hidden` on `html/body/#root`, `max-width: 100%` on media/tables/papers, fluid
  containers, wrapping toolbars, dialogs capped at `100vw - 24px`, drawers converted to an overlay
  below `md` (no clipped sidebar), tables switching to cards below `md`.

---

## 3. Security Assessment

Method: source review of every controller/middleware/route, dependency and configuration review,
plus targeted unit/integration tests (see §6). Findings are ordered by severity.

| # | Finding | Severity | Status |
| --- | --- | --- | --- |
| 1 | Cross-school IDOR (tenant isolation broken in `schoolAccess`) | Critical | **Fixed** |
| 2 | `/SuperAdmin/*` reachable without credentials | Critical | **Fixed** |
| 3 | Demo database fallback = production backdoor | Critical | **Fixed** |
| 4 | Unauthenticated payment webhook could alter balances | Critical | **Fixed** |
| 5 | Unverified M-Pesa callbacks, no replay/amount checks | Critical | **Fixed** |
| 6 | Regex injection / ReDoS in search endpoints | High | **Fixed** |
| 7 | Weak password-reset flow (clear-text, reusable, enumeration) | High | **Fixed** |
| 8 | `/health` exposed the MongoDB URI with credentials | Medium | **Fixed** |
| 9 | Missing security headers / upload hardening | Medium | **Fixed** |
| 10 | Internal error messages returned to callers | Medium | **Fixed** |
| 11 | `.env` files not ignored by git | Medium | **Fixed** |
| 12 | Hard-coded demo credentials shipped in the frontend bundle | High | **Fixed** |
| 13 | `totalFees` accepted by the (now authenticated) webhook | Medium | **Flagged** (see §8) |
| 14 | Login responses distinguish unknown account vs wrong password | Low | **Flagged** (see §8) |
| 15 | Admin-initiated resets e-mail a new plaintext password | Low | **Flagged** (see §8) |
| 16 | CSRF middleware exists but is not mounted | Low | **Flagged** (see §8) |

### 3.1 Tenant isolation / IDOR (fixed)

`middleware/schoolAccess.js` now denies cross-school access and returns
`403 { message: 'Access denied: this record belongs to another school.' }`, while keeping the
legitimate behaviour: SuperAdmin keeps global access, school staff keep access to their own school,
records whose school cannot be resolved behave as before. `verifySchoolId` and
`verifyEntityBelongsToAdminSchool` also return `401` for unauthenticated requests and `403` for
schools whose subscription is suspended (existing rule preserved). Applied consistently in
`student_controller`, `parent-controller`, `teacher-controller`, `assignment-controller`,
`superadmin-controller` and the finance/reporting endpoints.

### 3.2 Admin/SuperAdmin route protection (fixed)

* New `verifyAuthenticatedAdmin` and `verifyRoles([...])` in `middleware/superadminAuth.js`, mounted on
  the `/SuperAdmin` prefix in `routes/superadmin-route.js`; every SuperAdmin-only route additionally
  carries `verifySuperAdmin`, while `/SuperAdmin/SystemLogs` and `/SuperAdmin/SystemStats` remain
  available to school admins (existing behaviour) through `verifyRoles(['Admin','SuperAdmin'])`.
* The admin lookup **fails closed**: a database error results in `401`, never in an authenticated
  request, and internal error details are no longer returned.
* The demo-database fallback is only consulted when
  `ENABLE_TEST_DB_FALLBACK=true` **and** `NODE_ENV !== 'production'` (`utils/securityEnv.js`).
* Verified at runtime: `GET /SuperAdmin/AcademicYears` and `/SuperAdmin/SystemLogs` return
  `401 {"message":"No admin ID provided"}` without credentials and `401 {"message":"Invalid or expired
  credentials"}` with a forged id (previously `200`/`500`).

### 3.3 Payment security audit

| Risk | Control implemented |
| --- | --- |
| **Webhook spoofing** | `POST /Student/PaymentWebhook` fails closed (`503`) when `PAYMENT_WEBHOOK_SECRET` is unset; requires either `x-webhook-secret` (timing-safe compare) or `x-payment-signature` = hex HMAC-SHA256 of the raw request body (raw body captured in `index.js`). Rate limited (120/5 min). |
| **Callback spoofing (M-Pesa)** | `services/mpesaService.js#validateCallback` returns `{valid, method}` / `{valid:false, reason}`; supports shared secret (`MPESA_CALLBACK_SECRET`, header or query), HMAC signature and an IP allow-list (`MPESA_CALLBACK_IPS`), with `MPESA_CALLBACK_REQUIRE_VERIFICATION=true` to reject anything unverified. Unverified callbacks are rejected with `401` and logged. |
| **Replay / duplicate callbacks** | Student and salary records in a final state (`Completed`, `Verified`, `Failed`, `Cancelled` / `Paid`, `Failed`) are never modified again; unknown `CheckoutRequestID`s are acknowledged (`{message:'OK'}`) without state change; repeated callbacks for the same reference update the existing payment entry instead of creating a second one. |
| **Amount manipulation** | The provider-reported amount is compared with the amount requested by this application (tolerance ±1 for rounding); a mismatch marks the payment `Failed`, writes a `PAYMENT_AMOUNT_MISMATCH` audit entry and does **not** credit the balance. |
| **Duplicate STK push / double charge** | `initiateStk` refuses to start a second push while a pending payment for the same student exists (60-second window) and returns the existing `checkoutRequestId` with `duplicate: true`; payments are reconciled from `paymentHistory` so a payment can only be counted once. |
| **Receipt / balance manipulation** | Balances are always recomputed from the payment history (`reconcileAmounts` / `reconcileStudentFees`); receipts are issued server-side; verification is recorded with the authenticated admin id; unknown references cannot create payments. |
| **IDOR on payment endpoints** | Parent endpoints verify ownership (`parentOwnsStudent`), admin/staff endpoints use `verifyEntityBelongsToAdminSchool`; `/Parent/*` and `/Student/CheckStkStatus` are rate limited (`parentLookupLimiter` 60/15 min, `loginLimiter`). |
| **Test backdoors** | `mockInitiateStk` / `Test/MockInitiateStk` are only mounted when `testPaymentEndpointsEnabled()` (non-production, `DISABLE_TEST_PAYMENT_ENDPOINTS` not set to true); `Test/SendResetEmail` requires `ENABLE_TEST_EMAIL_ENDPOINT=true`. |
| **Financial data in responses** | Error payloads no longer include raw `error.message`; balances/receipts are returned only to authorised callers. |

Payment **business logic was explicitly not changed**: amounts, fee periods, receipt numbering,
`paymentStatus` transitions, instalment/balance calculations, salary calculations and the finance
report aggregations are untouched (see §8 for the single flag).

### 3.4 Search / query injection (fixed)

`utils/searchUtils.js` exports `escapeRegExp`, `sanitizeSearchTerm` (length-capped) and
`exactMatchRegex`; every `$regex` built from user input now uses it: `student_controller`
(`searchStudent`, `searchChequePayment`, student login lookups), `teacher-controller` (`searchTeacher`
and role/email lookups), `admin-controller` (email/school-name comparisons),
**`assignment-controller.searchAssignments`** and **`superadmin-controller`** (school and admin
search) — the last two were fixed in this pass. Malformed patterns (e.g. a lone `*` or `(`) can no
longer raise database errors or trigger catastrophic backtracking.

### 3.5 Other controls verified / added

* **Headers** — `middleware/securityHeaders.js` (mounted first): `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Cross-Origin-Opener-Policy`,
  `Cross-Origin-Resource-Policy`, `Permissions-Policy`, a strict `Content-Security-Policy` for API
  responses and `Cache-Control: no-store`; `x-powered-by` disabled. Verified live on `GET /`.
* **CORS** — explicit allow-list from `FRONTEND_URL` (+local dev origins), `credentials: true`, limited
  methods and the exact header allow-list (including the payment signature headers).
* **Rate limiting** — global `apiLimiter` (100/15 min) plus dedicated limiters: login (5/15 min),
  password reset (3/h), student registration (5/24 h), admin/teacher registration (100/24 h),
  file upload (10/5 min), payment webhook (120/5 min), parent lookups (60/15 min).
* **Uploads** — served from `/uploads` with `index: false`, `dotfiles: deny` and hardened per-file
  headers (nosniff, download disposition for document types, no script execution).
* **Errors** — central handler maps `LIMIT_FILE_SIZE` → 413 and never leaks 5xx internals; unknown
  routes return JSON 404 (verified: `GET /definitely-not-a-route` → `404 {"message":"Resource not
  found"}`).
* **Health endpoint** — `/health` now returns `{status, db, uptimeSeconds}` only (no connection string).
* **Secrets** — no API key, password or token is hard-coded in the code that was touched; all new
  configuration is read from environment variables documented in `.env.example` (names only).
* **Logging** — reset tokens are masked (`maskToken`, `maskResetLinks`) in demo/log output; payment
  security events (mismatch, rejection, unverified callback) are logged without sensitive data and
  where applicable written to the audit log.

---

## 4. Password Reset (SendGrid)

### 4.1 Delivery

`services/emailService.js` implements three providers behind one interface
(`EMAIL_PROVIDER = auto | sendgrid | smtp | demo`):

* **SendGrid** — Web API v3 (`POST https://api.sendgrid.com/v3/mail/send`) via axios with the API key
  in the `Authorization: Bearer` header; sender identity from `EMAIL_FROM` / `EMAIL_FROM_NAME`;
  optional EU endpoint (`SENDGRID_API_BASE_URL`), optional `SENDGRID_SANDBOX_MODE`, optional
  `EMAIL_REPLY_TO`. HTML and plain-text bodies are both sent.
* **SMTP** — nodemailer relay (existing behaviour, kept for compatibility).
* **Demo** — no delivery; the message is logged with the reset link **masked**.

Configuration is validated at call time: placeholder keys (`SG.your-sendgrid-api-key`, `your-...`) are
treated as *not configured*, so a half-configured deployment fails visibly instead of silently
pretending to send mail.

**SendGrid is used for e-mail only.** SMS continues to use the pre-existing providers in
`services/smsService.js` (Twilio / Africast / demo); no "SendGrid SMS" code exists anywhere.

### 4.2 Reset-token design (`utils/passwordReset.js`)

* Token: `crypto.randomBytes(32).toString('hex')` (256 bits); only the **SHA-256 hash** is persisted.
* Single use: the hash is cleared (`resetPasswordToken = ''`, `resetPasswordExpires = null`) as soon as
  the password is changed; a replayed link returns `400`.
* Expiry: `PASSWORD_RESET_TTL_MINUTES` (default **60**, hard maximum 1440); expired tokens are rejected
  and cleared.
* No user enumeration: unknown accounts receive exactly the same generic response
  (`GENERIC_RESET_REQUEST_MESSAGE = "If an account exists for this address, a reset link has been sent."`).
* Rate limited: `passwordResetLimiter` (3 per hour per IP) on every request/reset endpoint for all
  roles (`Admin`, `SuperAdmin`, `Accountant`, `HR`, `Student`, `Teacher`) — the existing route surface
  is preserved, including the legacy `PUT /Student/ResetPassword/:token` alias.
* URL: built from `FRONTEND_URL` (first origin, comma-separated list supported), always `http`/`https`,
  role segment sanitised to a known value, token URL-encoded; e.g.
  `https://school.example/Admin/reset-password/<token>`.
* Password policy: `validateNewPassword` enforces the existing rule set (minimum length, at least one
  digit, not equal to the current password) — requirements were **not** lowered.
* No token or password is ever echoed in a response or written to the logs (links are masked in logs).
* The reset endpoints clear the failed-login lockout for the account, matching the previous behaviour.

### 4.3 Templates

Responsive HTML + plain-text templates with school name, user name, expiry window and a "if you did
not request this, ignore this e-mail" note. All interpolated values (name, school name) are
HTML-escaped, so a school name cannot inject markup into the e-mail.

### 4.4 Required environment (names only, values in `.env`)

`EMAIL_PROVIDER`, `SENDGRID_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `SENDGRID_API_BASE_URL`,
`SENDGRID_SANDBOX_MODE`, `EMAIL_REPLY_TO`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`,
`PASSWORD_RESET_TTL_MINUTES`, `FRONTEND_URL` — all documented in `backend/.env.example`.

---

## 5. Payment Provider — PayWave (blocked, not implemented)

**Status: BLOCKED — requires verified integration details. No code was generated.**

A repository-wide search for `paywave`, `pay-wave`, `PayWave` (case-insensitive) in the backend,
frontend and documentation returned **zero matches**. There is no PayWave SDK dependency, no API
client, no endpoint URL, no merchant id, no webhook signature scheme and no status-code mapping in
this project, and no PayWave API documentation or credentials were supplied with the request.

Because inventing endpoints, payloads, keys, callbacks or statuses would create a payment path that
cannot be tested and may silently mis-record money, the PayWave work was **not** fabricated.

**What is ready for it**

* Payment initiation is isolated in `services/mpesaService.js` and called from
  `controllers/parent-controller.js` (`initiateStk`, `checkStkStatus`), so a second provider can be
  added without touching the fee/balance logic.
* `models/studentSchema.js` payment entries already carry `provider`, `reference`,
  `paymentReference`, `transactionId`, `checkoutRequestId`, `mpesaReceiptNumber`, `transactionDate`
  and `phoneNumber`, i.e. provider-agnostic fields exist.
* The webhook pipeline (`/Student/PaymentWebhook`, `mpesaCallback`) now has provider-neutral
  authentication, idempotency and amount verification that a PayWave adapter can reuse.
* `backend/.env.example` contains a commented **PAYWAVE NOT-CONFIGURED** block listing the variables
  that will be needed (`PAYWAVE_BASE_URL`, `PAYWAVE_API_KEY`, `PAYWAVE_MERCHANT_ID`,
  `PAYWAVE_CALLBACK_URL`, `PAYWAVE_ENVIRONMENT`).

**Required to unblock**

1. Official PayWave API documentation (authentication, STK/checkout initiation, status query, callback
   payloads and signature/verification method, error and status code table).
2. Sandbox credentials (base URL, merchant/short code, API key/secret, callback URL that PayWave
   accepts) and confirmation of the callback source IPs if used.
3. Confirmation of the exact business rule desired: replace the M-Pesa STK Push for **parent fee
   payments only**, or also for salary payouts, and whether M-Pesa must remain as a fallback.

Until then **M-Pesa STK Push remains the payment provider**, hardened as described in §3.3.

---

## 6. Testing

### 6.1 Commands used (all run in this workspace)

```bash
# backend — unit / integration / security suites (no external services required)
cd backend && npx jest --runInBand

# backend — full password-reset flow against a real MongoDB (opt-in)
RUN_MONGO_TESTS=true MONGO_TEST_URL=mongodb://127.0.0.1:27017/sms_test npx jest tests/resetFlow.test.js

# frontend — component / configuration tests (jsdom)
cd frontend && CI=true npx react-scripts test --watchAll=false

# frontend — production build (fails on any missing module or syntax error)
cd frontend && CI=false GENERATE_SOURCEMAP=false npx react-scripts build
```

### 6.2 Results (verbatim)

```
# backend
Test Suites: 1 skipped, 15 passed, 15 of 16 total
Tests:       5 skipped, 69 passed, 74 total

# frontend
Test Suites: 3 passed, 3 total
Tests:       13 passed, 13 total

# frontend production build
Compiled with warnings.   (exit code 0 — warnings are pre-existing ESLint notices, see 6.4)
```

Backend suites: `superadminAuth`, `superadminLogs`, `adminLogin`, `adminLoginSchoolObject`,
`admin-stats-scope`, `tenantIsolation`, `paymentSecurity`, `paymentCallback`, `passwordReset`,
`emailService.sendgrid`, `searchUtils`, `employeeApproval`, `parentStudents`, `financeReport`,
`financeUtils` (15 passing) — `resetFlow` is skipped unless `RUN_MONGO_TESTS=true` because it needs a
MongoDB instance, which is not available in this environment.
Frontend suites: `RequireRole.test.js`, `TableTemplate.test.js`, `apiConfig.test.js`.

### 6.3 What the tests cover

* **Authentication / authorisation** — admin login (email casing, populated school object, suspension
  handling), SuperAdmin route protection (401 without credentials, 401 for forged ids, 403 for
  unapproved admins, 403 for non-SuperAdmin roles on SuperAdmin routes, 200 for allowed roles, fail
  closed without leaking internals), system-log access rules, tenant isolation (cross-school 403,
  SuperAdmin bypass, teacher scoping, suspended school).
* **Password reset** — token entropy/hash at rest, TTL bounds, expiry, single-use replay rejection,
  generic response for unknown accounts, password policy, URL building/open-redirect prevention,
  masking helpers, SendGrid payload construction, placeholder-key fallback and HTML escaping.
  `tests/resetFlow.test.js` (Mongo-gated) exercises the end-to-end flow: request → e-mail link →
  reset → replay rejected → weak password rejected.
* **Payments** — webhook authentication (missing secret → 503, wrong secret/signature → 401, HMAC and
  IP allow-list paths), callback idempotency and replay, amount mismatch → `Failed` +
  `PAYMENT_AMOUNT_MISMATCH` audit, cancelled (`1032`) handling, unknown reference acknowledgement, no
  downgrade of final states.
* **Frontend** — role gate redirects (anonymous, wrong role, allowed role, localStorage restore),
  table pagination/paging/empty state/action rendering, API base URL resolution.

### 6.4 Lint / build output

`npx react-scripts build` compiles successfully (exit code 0). The remaining 144 lines are
**pre-existing warnings** (unused imports in older HR/student/admin settings pages,
`react-hooks/exhaustive-deps` suggestions, one `import/no-anonymous-default-export` in
`utils/gradingSystem.js`). They are warnings, not errors, and do not affect the build; every file
touched in this pass was cleaned up (with the ESLint cache cleared to prove it). Full log:
`/home/user/artifacts/frontend-build-final.log` (earlier runs: `frontend-build.log`,
`frontend-build-2.log`, `frontend-build-3.log`, `frontend-build-4.log`) — the earlier logs document
the two dependency failures that were diagnosed and fixed on the way to a green build.

### 6.5 Runtime verification

The backend was started (`node index.js`, development mode) and the frontend dev server with the API
proxy, then exercised over HTTP:

| Check | Result |
| --- | --- |
| `GET /health` | `200 {"status":"ok","db":"disconnected","uptimeSeconds":118}` (no credentials exposed) |
| `GET /` | security headers present (`X-Content-Type-Options`, `X-Frame-Options`, CSP, `Cache-Control: no-store`) |
| `GET /SuperAdmin/AcademicYears` (no credentials) | `401 {"message":"No admin ID provided"}` |
| `GET /SuperAdmin/SystemLogs` (forged `x-admin-id`) | `401 {"message":"Invalid or expired credentials"}` |
| `POST /Student/PaymentWebhook` without secret | `503 {"message":"Payment webhook is not configured on this server"}` |
| `POST /AdminLogin` unknown account | `404 {"message":"User not found"}` (existing behaviour, flagged in §8) |
| `GET /definitely-not-a-route` | `404 {"message":"Resource not found"}` |
| `GET /` (frontend, `Accept: text/html`) | SPA HTML (deep links `/admin` and `/Parent/login` also return the SPA) |
| `GET /health` through the frontend dev proxy | proxied to the API (`200`) |
| `GET /static/js/bundle.js`, `/favicon.ico` | `200` with correct content types |

### 6.6 Assets / dependency fixes

* **Missing image assets (18):** the five referenced images (`img1..img4.png`, `classroom.png`,
  `designlogin.jpg`) and the CRA `favicon.ico` / `logo192.png` / `logo512.png` were absent from the
  source package (binary files are not part of the provided text bundle), which made the build fail.
  Neutral, clearly-labelled **placeholder** images were generated at the exact expected paths so the
  project builds and runs. They contain no branding: **replace them with the original artwork before
  deployment** (see §8).
* **Dependency tree (18):** `frontend/package.json` now pins the required ajv majors via a direct
  devDependency plus npm `overrides` (`ajv@8` at the root, `ajv@6` nested for `eslint`,
  `@eslint/eslintrc`, `schema-utils@2/3` and `ajv-keywords@3`). Because of that, install with
  `npm install --legacy-peer-deps`. After this change `npm run build` completes successfully.

---

## 7. Files Changed

Legend: **[C]** created, **[M]** modified, **[V]** verified unchanged in behaviour.

### 7.1 Backend

**New**
* `utils/securityEnv.js` [C] — fail-closed environment switches (demo DB, test payment/email endpoints).
* `utils/passwordReset.js` [C] — token issue/verify, hashed storage, TTL, reset-URL builder, masks.
* `utils/searchUtils.js` [C] — regex escaping / search sanitising.
* `middleware/securityHeaders.js` [C] — response headers and uploaded-file hardening.
* `.env.example` [C] — complete template (core, DB, JWT, SendGrid, SMTP, SMS, M-Pesa + callback
  verification, payment webhook, PayWave block, backups, test switches).
* `tests/superadminAuth.test.js`, `tests/tenantIsolation.test.js`, `tests/paymentSecurity.test.js`,
  `tests/paymentCallback.test.js`, `tests/passwordReset.test.js`, `tests/emailService.sendgrid.test.js`,
  `tests/searchUtils.test.js`, `tests/admin-stats-scope.test.js` [C] — 8 new suites.

**Modified**
* `index.js` [M] — trust proxy, security headers, raw-body capture, CORS allow-list, audit IP,
  rate limiting, redacted `/health`, hardened `/uploads` static, JSON 404, central error handler,
  graceful shutdown, `require.main` guard (exports `app` for tests).
* `middleware/schoolAccess.js` [M] — cross-school denial, SuperAdmin bypass preserved, subscription
  enforcement helper exported.
* `middleware/superadminAuth.js` [M] — `verifyAuthenticatedAdmin`, `verifyRoles`, hardened
  `verifySuperAdmin`/`verifyAdmin`, gated demo fallback, no internal-error leakage.
* `middleware/rateLimiter.js` [M] — added payment-webhook and parent-lookup limiters (existing limits
  unchanged).
* `middleware/csrfProtection.js`, `utils/twoFactorAuth.js` [M] — housekeeping timers `unref()`ed.
* `routes/route.js` [M] — limiters on sensitive endpoints, test endpoints gated, flat router preserved.
* `routes/superadmin-route.js` [M] — authentication guard on `/SuperAdmin/*`, per-route role checks.
* `controllers/admin-controller.js` [M] — reset flow migrated to hashed tokens, generic responses,
  email enumeration removed, demo fallback gated, `getSchoolScopeFilter` exported.
* `controllers/student_controller.js` [M] — payment webhook authentication/idempotency, student password
  reset hardened, search escaping, reconciliation helpers.
* `controllers/parent-controller.js` [M] — STK initiation guards, status polling ownership checks,
  callback validation/idempotency/amount checks, `mpesaCallback` exported.
* `controllers/teacher-controller.js` [M] — teacher password reset hardened, search escaping.
* `controllers/superadmin-controller.js` [M] — search escaping (schools, admins), demo fallback gated,
  monitoring endpoints restricted to Admin/SuperAdmin.
* `controllers/assignment-controller.js` [M] — search escaping (title/teacher/query).
* `services/emailService.js` [M] — SendGrid/SMTP/demo providers, templates, escaping, masked logging.
* `services/mpesaService.js` [M] — `validateCallback` verification methods, status query fields.
* `models/studentSchema.js` [M] — payment-provider fields, unique indexes, payment-period hook
  (no destructive migration; additive only).
* `utils/db.js` [M] — connection retries/backoff, redacted errors.
* `tests/adminLogin.test.js`, `tests/adminLoginSchoolObject.test.js`, `tests/resetFlow.test.js` [M] —
  fixed mocks/expectations and gated the Mongo-dependent flow.

### 7.2 Frontend

**New**
* `src/theme.js` [C] — shared MUI theme (identity preserved).
* `src/utils/apiConfig.js` [C] — API base URL resolution.
* `src/utils/guestDemo.js` [C] — env-driven demo login (no hard-coded credentials).
* `src/setupProxy.js` [C] — dev API proxy that leaves the SPA assets alone.
* `src/components/PageHeader.js` [C], `src/components/StateViews.js` [C],
  `src/components/RequireRole.js` [C] — header, loading/empty/error states, route role gate.
* `src/pages/NotFoundPage.js` [C] — MUI-only 404 page (no external image).
* `src/components/RequireRole.test.js`, `src/components/TableTemplate.test.js`,
  `src/utils/apiConfig.test.js` [C] — frontend tests.
* `public/favicon.ico`, `public/logo192.png`, `public/logo512.png` [C] — placeholder icons.
* `.env.example` [M] — documented `REACT_APP_BASE_URL`, `REACT_APP_ENABLE_GUEST_DEMO`,
  `REACT_APP_GUEST_*` variables.

**Modified**
* `src/App.js` [M] — lazy routes with suspense fallback, `/admin/*` **and** `/Admin/*` mapped to
  `AdminDashboard basePath`, `RequireRole` gates per portal, all password-reset routes, 404 route.
* `src/index.js` [M] — theme + `CssBaseline`, API base URL publication.
* `src/index.css` [M] — global responsive/overflow rules.
* `src/components/TableTemplate.js`, `src/components/TableViewTemplate.js` [M] — pagination fixes,
  clamping, empty states, mobile cards, contained scrolling.
* `src/components/styles.js` [M] — responsive dashboard content container (same colours).
* `src/components/AccountMenu.js` [M] — admin-aware profile/logout links that respect the active
  `/admin` or `/Admin` prefix.
* `src/pages/Homepage.js` [M] — public navigation offers Parent/Student portals only; no admin link;
  responsive hero/header/mobile menu.
* `src/pages/ChooseUser.js`, `src/pages/LoginPage.js` [M] — demo credentials removed from the bundle
  and gated behind `REACT_APP_ENABLE_GUEST_DEMO` + `REACT_APP_GUEST_*`.
* `src/pages/admin/AdminDashboard.js` [M] — `basePath` support, responsive shell, role-aware routes.
* `src/pages/admin/SideBar.js` [M] — `basePath` aware navigation.
* `src/pages/admin/AdminHomePage.js` [M] — responsive KPI dashboard with loading/error states.
* `src/pages/admin/teacherRelated/ShowTeachers.js`,
  `src/pages/admin/financeRelated/ShowAccountants.js`, `src/pages/admin/hrRelated/ShowHR.js` [M] —
  shared paginated table, `parseInt(..., 5)` bug fixed, responsive search/toolbar.
* `package.json` [M] — ajv dependency resolution (see §6.6).
* Assets: placeholder images added at `src/assets/{img1..img4}.png`, `src/assets/classroom.png`,
  `src/assets/designlogin.jpg` (see §8).
* Files hardened in the earlier pass and re-verified in this one (behaviour preserved, responsive
  layout/branding intact): `pages/admin/reports/AcademicReport.js`, `pages/student/StudentSubjects.js`,
  `pages/admin/studentRelated/StudentExamMarks.js`, `redux/userRelated/userHandle.js`,
  `components/DataExportButton.js`, `utils/printBranding.js`, plus the parent portal pages
  (`ParentDashboard`, `PayFee`, `PaymentHistory`, `ParentTimetable`) and the accountant/HR portals.

### 7.3 Not changed (deliberately)

* Business rules, workflows, calculations, DB relationships, role definitions, tenant isolation logic,
  academic/attendance/exam/timetable/assignment/payroll/finance/reporting behaviour.
* Database schema (only additive optional payment fields + indexes; no destructive migration, no data
  reset, no dropped collection — the legacy `admins.schoolName_1` index handling in `utils/db.js` is
  retained).
* Colours, logos, SVG assets, icon libraries, page structure and the existing SMS provider.

---

## 8. Remaining Recommendations

**Must do before production**

1. **PayWave (blocked).** Supply the API documentation and sandbox credentials listed in §5, plus the
   confirmation of which flows should switch, before any PayWave code is written.
2. **Replace the placeholder images.** `src/assets/img1..img4.png`, `src/assets/classroom.png`,
   `src/assets/designlogin.jpg`, `public/favicon.ico`, `public/logo192.png`, `public/logo512.png` are
   neutral placeholders that exist only because the original binaries were not part of the supplied
   source package. Drop the real artwork in at the same paths — no code change is needed.
3. **Configure the payment secrets.** `PAYMENT_WEBHOOK_SECRET` (otherwise the bank/aggregator webhook
   intentionally returns `503`), and one of `MPESA_CALLBACK_SECRET` / `MPESA_CALLBACK_IPS` together
   with `MPESA_CALLBACK_REQUIRE_VERIFICATION=true`. Point `MPESA_CALLBACK_URL` at the public HTTPS
   endpoint (`POST /Payment/MpesaCallback` alias used by the current flow).
4. **Configure SendGrid** (`SENDGRID_API_KEY`, verified `EMAIL_FROM`, `EMAIL_PROVIDER=sendgrid`) and
   send a real test to confirm domain authentication (SPF/DKIM). Keep `FRONTEND_URL` set to the public
   HTTPS origin so reset links are generated correctly.
5. **Set `JWT_SECRET`, `ENCRYPTION_KEY` and `MONGO_URL`** with strong values, put the API behind HTTPS,
   and confirm `TRUST_PROXY_HOPS` matches the reverse-proxy topology so rate limiting sees real IPs.
6. **Run the Mongo-backed suite** on a staging database
   (`RUN_MONGO_TESTS=true MONGO_TEST_URL=... npx jest tests/resetFlow.test.js`) — it could not run here
   because no MongoDB instance is available in this environment.

**Flagged, not changed (business decision required)**

7. **Webhook `totalFees` override.** `POST /Student/PaymentWebhook` still accepts a `totalFees` value
   that rewrites the student's fee total. It is now authenticated (HMAC/shared secret), but rewriting
   the fee structure from a webhook is a financial risk. Recommendation: ignore `totalFees` on the
   webhook (set it from the admin UI only) or require explicit confirmation. This was left as-is
   because it is existing payment behaviour and changing it alters recorded fee data.
8. **`studentFeePayment` still accepts `totalFees`** from an authenticated school admin/accountant
   while recording a payment (`PUT /StudentPayment/:id`). Same reasoning as above — flag, don't change.
9. **Login responses reveal whether an account exists** (`404 "User not found"` vs an incorrect-password
   message). Recommendation: return one generic `401` for both cases (as already done for password
   reset). Not changed because the frontend and the lockout messaging depend on the current contract.
10. **Admin-initiated resets still e-mail a new plaintext password** (`sendPasswordResetEmail` from the
    admin/teacher "reset by admin" endpoints). Recommendation: switch to the same token link flow used
    by self-service reset. Not changed because it is an existing workflow with a different UX.
11. **CSRF middleware is present but not mounted** (`middleware/csrfProtection.js`). The API is
    token/id-header based rather than cookie-session based, so CSRF is not currently exploitable, but
    mounting it (or documenting the decision) is advisable before enabling cookie-based sessions.
12. **Password policy** remains "minimum 6 characters including a digit" (existing rule). Consider
    raising it; the reset flow already reads the policy from one place
    (`utils/passwordReset.js#validateNewPassword`), so a change is a one-line edit plus a migration note
    for existing users.
13. **Pre-existing ESLint warnings** (144 lines, mostly unused imports and `exhaustive-deps` hints) in
    older pages outside this change set. They are non-blocking; a clean-up pass is recommended but was left
    out to avoid touching unrelated business screens.
14. **Backups** — `AUTO_BACKUP_*` runs in-process. Keep it disabled (`AUTO_BACKUP_ENABLED=false`) and use
    infrastructure-level `mongodump` scheduling for production.
15. **Monitoring** — `/health` is deliberately minimal; add an external uptime check and log shipping
    for the `[PAYMENT SECURITY]` / `[AUTH]` warning lines, which are the early indicators of probing.

---

*All statements in this report were verified in this workspace: the test counts are the literal output
of the commands in §6.1, the runtime table in §6.5 is the literal result of the HTTP checks, and the
build log referenced in §6.4 exists at the stated path. No test result was fabricated.*
