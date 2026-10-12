# RepairHub Mobile ↔ Backend API — Connectivity & Gaps

**Status checked:** Sun 11 Oct 2026 · **Live API:** https://repairhub-api-1.onrender.com/api · **Docs (Swagger):** https://repairhub-api-1.onrender.com/api-docs · **Backend repo:** https://github.com/Code4Frankie/RepairHub_api

This document answers two questions:

1. **"All APIs should be connected and working"** — what does the mobile app call, and is it live?
2. **"Which API is missing / needed from the backend?"** — the full list of gaps found and fixed, including the **service centre** question.

---

## TL;DR

| # | Finding |
| --- | --- |
| 1 | ✅ **Every API the app calls now exists on the backend** — including the gaps that were missing (password reset, structured preferred date/time, photos + "On the way" on status updates, review replies, dispute-refund cleanup). Full list in section 4. |
| 2 | ✅ **Service Centres are now fully built in the app** (role picker, sign-up, business setup, team management, jobs + quotes with technician assignment, earnings) and connected to the backend's `service_center` role + `/service-centers` API. |
| 3 | ⚠️ **The live database still needs one seed step** — `GET /api/service-categories` returns `[]` because the live DB was never seeded. The backend now **auto-seeds categories + admin at boot**, so a fresh deploy heals itself; an already-running old instance just needs a redeploy (or the one-time seed command in section 6). |
| 4 | ⚠️ **Payments work in test/mock mode only** — real Paystack secret key + webhook must be set on Render/Railway to move real money. |
| 5 | 🟥 **Admin operations (technician/centre verification, disputes, withdrawals) have APIs but no UI** — only reachable via Swagger/Postman today. Not part of the app deliverable. |

---

## 1. How the app talks to the API

- Base URL: `https://repairhub-api-1.onrender.com/api` (set via `EXPO_PUBLIC_API_URL` in `.env`).
- The app sends `Authorization: Bearer <token>` once logged in (`src/shared/core/api.ts`).
- The live API sleeps when idle; the app's fetch client tolerates up to ~90 s on the first call.
- Swagger UI: `https://repairhub-api-1.onrender.com/api-docs` — handy for testing any endpoint manually.

---

## 2. Every API the app calls — and its status

Legend: ✅ implemented & wired · ⚠️ implemented but limited / workaround needed · ❌ missing from backend.

### 2.1 Users & auth (screens: Sign up, Log in, Change password, Forgot password)

| Method | Path | Used by | Status |
| --- | --- | --- | --- |
| POST | `/users/register` | Sign up (customer, technician & service centre) | ✅ |
| POST | `/users/login` | Log in (all three roles) | ✅ |
| POST | `/users/change-password` | Change password screen | ✅ |
| PATCH | `/users/:id` | Editing name/phone in profile | ✅ |
| POST | `/users/forgot-password` | Forgot password — step 1 (email) | ✅ **added** |
| POST | `/users/reset-password` | Forgot password — step 2 (one-time token + new password) | ✅ **added** |

> **Password reset delivery:** there is no SMTP/email service on the backend yet, so the `forgot-password` endpoint returns the one-time reset token (1-hour expiry) in the API response and the app shows it. When an email/SMS provider is added, the token stops coming back in the response and gets delivered instead — the app flow stays the same.

### 2.2 Categories (used on Home, Request, Technician & Centre services)

| Method | Path | Used by | Status |
| --- | --- | --- | --- |
| GET | `/service-categories` | Category chips everywhere | ✅ endpoint exists · ⚠️ **live DB returns `[]` until seeded** (auto-seeded at boot in the new build — section 6) |

### 2.3 Customer flows (Request → Quotes → Book → Pay → Track → Review → Warranty)

| Method | Path | Used by | Status |
| --- | --- | --- | --- |
| POST | `/repair-requests` (multipart, ≤6 media) | Submit request | ✅ |
| GET | `/repair-requests?limit=50` | Home, history, live request | ✅ |
| GET | `/repair-requests/:id` | Job detail / boards | ✅ |
| PATCH | `/repair-requests/:id/cancel` | Cancel request | ✅ |
| GET | `/quotations/repair-request/:id` | Compare quotes | ✅ |
| GET | `/quotations/:id` | (via appointment) | ✅ |
| PATCH | `/quotations/:id/accept` | Book a quote | ✅ |
| POST | `/appointments` | Booking → creates the job | ✅ |
| GET | `/appointments/:id` | Appointments | ✅ |
| PATCH | `/appointments/:id/reschedule` | Reschedule | ✅ |
| PATCH | `/appointments/:id/cancel` | Cancel appointment | ✅ |
| POST | `/transactions/pay` | Pay into escrow (Paystack/cash) | ⚠️ test/mock mode until real keys + webhook |
| GET | `/transactions/verify/:reference` | Checkout result | ✅ |
| GET | `/repair-jobs?limit=50` | Track repair, history | ✅ |
| GET | `/repair-jobs/:id` | Track timeline / job screen | ✅ |
| PATCH | `/repair-jobs/:id/status` | Technician & centre status updates | ✅ **added multipart photos + `on_the_way`** |
| POST | `/repair-jobs/:id/confirm` | Confirm completion → release escrow | ✅ |
| GET | `/warranty-records/job/:jobId` | Warranty card/QR | ✅ |
| POST | `/warranty-records/:id/claims` | File a claim | ✅ |
| PATCH | `/warranty-records/:id/claims/:claimId` | Respond to a claim | ✅ |
| GET | `/reviews/technician/:id` | Reviews on profiles | ✅ |
| POST | `/reviews` | Rate a repair | ✅ |
| POST | `/reviews/:id/reply` | Technician reply to a review | ✅ **added** |
| GET | `/notifications?limit=40` | Alerts (all roles) | ✅ |
| PATCH | `/notifications/:id/read` | Mark read | ✅ |
| PATCH | `/notifications/read-all` | Mark all read | ✅ |
| GET | `/customer-profiles/me` | Customer set-up, home address | ✅ |
| PATCH | `/customer-profiles/:id` | Save address + location | ✅ |
| POST | `/disputes` (multipart, ≤5 evidence) | Report an issue | ✅ |
| GET | `/disputes` | Dispute state on a job | ✅ |
| GET | `/technician-profiles` | Search technicians | ✅ |
| GET | `/technician-profiles/:id` | Public technician profile | ✅ |

### 2.4 Technician flows (Sign-up → Verif. → Board → Quote → Job → Wallet)

| Method | Path | Used by | Status |
| --- | --- | --- | --- |
| GET | `/technician-profiles/me` | Tech home | ✅ |
| PATCH | `/technician-profiles/:id` | Update skills/areas/bio/base location | ✅ |
| POST | `/technician-profiles/:id/verification-docs` (multipart, ≤5) | Upload ID + certificate | ✅ |
| GET | `/repair-requests?limit=50` | Jobs board | ✅ |
| GET | `/quotations/mine` | My quotes, revise flow | ✅ |
| POST | `/quotations` | Send/revise quote | ✅ |
| PATCH | `/quotations/:id/withdraw` | Withdraw a quote | ✅ |
| GET | `/repair-jobs?limit=50` | Active & completed jobs | ✅ |
| GET | `/repair-jobs/:id` | Job status screen | ✅ |
| PATCH | `/repair-jobs/:id/status` | Move job through stages (with photos) | ✅ |
| GET | `/wallets/me` | Earnings balance | ✅ |
| GET | `/transactions/me` | Earnings transactions | ✅ |
| POST | `/wallets/withdraw` | Withdraw | ✅ |
| GET | `/reviews/technician/:id` | Reviews screen | ✅ |
| GET | `/warranty-records/job/:jobId` | Tech claims (checked per completed job) | ✅ |

### 2.5 Service centre flows (Sign-up → Business setup → Verif. → Team → Jobs → Earnings)

**The service centre role is now built end-to-end in the app** (`src/features/center/*` + the `(center)` tab group) and connected to the backend.

| Method | Path | Used by | Status |
| --- | --- | --- | --- |
| POST | `/users/register` (`role: service_center` + `businessName`) | Centre sign-up | ✅ |
| GET | `/service-centers/me` | Centre profile + verification status + rating | ✅ |
| PATCH | `/service-centers/:id` | Update business name/description/address/location/areas/skills | ✅ |
| POST | `/service-centers/:id/verification-docs` (multipart, ≤5) | Business documents (CAC etc.) | ✅ |
| GET | `/service-centers/:id/team` | Team members list | ✅ |
| POST | `/service-centers/:id/team` | Add technician by email | ✅ |
| DELETE | `/service-centers/:id/team/:technicianId` | Remove technician | ✅ |
| GET | `/repair-requests?limit=50` | Centre jobs board | ✅ |
| GET | `/quotations/mine` | Quotes the centre sent | ✅ |
| POST | `/quotations` (with **`technicianId`**) | Send a quote, naming the team member who does the work | ✅ |
| PATCH | `/quotations/:id/withdraw` | Withdraw a centre quote | ✅ |
| GET | `/repair-jobs?limit=50` | Centre jobs (paid into the centre wallet) | ✅ |
| GET | `/repair-jobs/:id` | Job status screen (same shared screen as technicians) | ✅ |
| PATCH | `/repair-jobs/:id/status` | Update the job status | ✅ |
| GET | `/wallets/me` | Centre earnings balance | ✅ |
| GET | `/transactions/me` | Centre transactions | ✅ |
| POST | `/wallets/withdraw` | Withdraw centre earnings | ✅ |
| GET | `/service-centers` | Public centre search (unused by screens today, kept for search) | ✅ |

---

## 3. What exists on the backend but is NOT used by the app

### 3.1 Admin/back-office — API ✅ complete, no UI

| Resource | Routes | Needed for |
| --- | --- | --- |
| `/admin/stats` | GET | Platform dashboard |
| `/admin/withdrawals` | GET list, `PATCH /:id` process | Paying technicians/centres out |
| `/admin/run-auto-release` | POST | 72-h escrow auto-release (needs a cron/web worker) |
| `/technician-profiles/pending` · `/:id/verify` | GET/PATCH | Approving technicians |
| `/service-centers/pending` · `/:id/verify` | GET/PATCH | Approving centres (also in `GET /service-centers/pending`) |
| `/users/` | GET list, `PATCH /:id/status`, `DELETE /:id` | User moderation |
| `/disputes` · `/:id/resolve` | GET list, PATCH | Ruling disputes |

Sources allowed: `admin` role only. There is **no admin app and no admin screens** — today these are driven via Swagger/Postman. **Needed to go live** (technician + centre verification, dispute rulings, withdrawal processing).

### 3.2 Other backend endpoints the app never calls (fine to keep)

| Endpoint | Notes |
| --- | --- |
| `POST /transactions/topup` | Wallet top-up — the app has no top-up flow (customers always use job escrow) |
| `GET /users/me`, `GET /users/:id` | Extra lookups |
| `GET /customer-profiles/:id`, `GET /wallets/:userId` | Admin-lens equivalents of the `/me` routes the app uses |

---

## 4. The gaps found — and what was done (the full list)

This is the complete "which API was missing / needed" answer.

### 4.1 App-side gaps that needed a backend feature — all now implemented

| # | Gap | What the backend now has | Status |
| --- | --- | --- | --- |
| 1 | **Password reset was a dead end.** The forgot-password screen only said "contact support" — no endpoint existed. | `POST /users/forgot-password` + `POST /users/reset-password` (one-time token, 60-min expiry, bcrypt re-hash). App: 2-step Forgot Password screen. | ✅ |
| 2 | **Structured preferred date/time + service mode.** The app packed these into a text description; the API couldn't filter or match on them. | `preferredDate`, `preferredTime`, `serviceMode` fields on `RepairRequest` (validated), plus `serviceMode` fallback (`home`/`shop`) on quotations and jobs. | ✅ |
| 3 | **No photos on technician status updates.** Progress/after photos stayed on-device. | `PATCH /repair-jobs/:id/status` now accepts multipart (`media` field, ≤5, Cloudinary) alongside the status body. | ✅ |
| 4 | **No real "On the way" state.** The app faked the arrival step. | New status `on_the_way` in the job status machine (`accepted → on_the_way → diagnosing → …`), exposed through the job view + notifications. | ✅ |
| 5 | **Review replies.** Reviews had no reply field, so the app hid its reply design. | `repliedAt`/`replyText` on review + `POST /reviews/:id/reply` (verified technician owns the review). | ✅ |
| 6 | **Dispute-refund left jobs in limbo.** Resolution set the job `cancelled` but left the repair request `in_progress`. | Resolving a dispute with a refund now also cancels the repair request (atomic, guarded update). | ✅ |
| 7 | **Email strictness rejected real-world addresses** (TLD allow-list) — sign-up failed for users with unusual TLDs. | All email schemas (register, login, forgot-password, add-team-member) now use `tlds: { allow: false }` — a syntactically valid address always passes. | ✅ |
| 8 | **Empty-database boot.** A fresh deploy had no categories, so requests had nothing to attach to (looks like "requests don't save"). | `index.js` auto-seeds categories + an admin (env-driven) at boot when the DB is empty (idempotent). | ✅ |

### 4.2 App-side workarounds removed

| # | Gap | Resolution |
| --- | --- | --- |
| 1 | Service centre role existed only in the API — **the app had no centre screens at all** (no role card, no setup, no dashboard, no team). | Full centre app built: role picker card, sign-up with business name, business setup + verification docs, 5-tab dashboard (Home/Jobs/Team/Earnings/Profile), quotes that name a team member, /send-quote team picker, shared job/booking/withdraw screens wired for the centre role. |
| 2 | Login/refresh ordering could strand a signed-in user back on the form if the first background refresh failed. | Sign-up and login now navigate immediately after the successful register/login call; the first refresh runs in the background (failure-safe). |

### 4.3 Still open — operational, not code

| # | Item | Needed for | How |
| --- | --- | --- | --- |
| 1 | **Seed the live database** (or redeploy the new build, which auto-seeds). Until then `GET /service-categories` returns `[]`. | Categories render, requests save | Section 6, one command |
| 2 | **Real Paystack secret key + webhook URL** on the live host. | Escrow money actually moving | Paystack dashboard → webhook to `/api/transactions/webhook/paystack` |
| 3 | **Cron for the 72-h escrow auto-release.** | Payments releasing without the customer confirming | Route `POST /admin/run-auto-release` on a schedule (or Render cron) |
| 4 | **Email/SMS provider for the reset-code (and future OTP) delivery.** | Password reset code arriving by email/text | Wire provider; API returns the token in-app today (documented) |
| 5 | **Admin UI** (technician/centre verification, disputes, withdrawals). | Human review of the platform | Swagger/Postman today; a future admin app |

---

## 5. Verified live right now (checked against your API)

```text
GET /health                          → {"status":"ok","service":"repairhub-api",...}
GET /api/service-categories          → {"success":true,"message":"Success","data":[]}   ← empty until the DB is seeded
POST /api/users/register             → 201 (customer / technician / service_center)
POST /api/users/login                → 200 JWT
GET  /api/customer-profiles/me       → 200
GET  /api/repair-requests            → 200
GET  /api/repair-jobs                → 200
GET  /api/notifications              → 200
POST /api/users/forgot-password      → 404 on the OLD live build — present in the new backend
```

The "Status" columns were cross-checked against the backend repository's route/controller files (`backend-api/routes/*.js`, `backend-api/controller/*.js`) and the app's API client (`src/shared/core/backend.ts`) at the current `main` of both repos.

---

## 6. Going live — the checklist

The new backend build auto-seeds on boot. To bring an already-running old instance up to date:

```bash
# 1. Deploy the new build (or run these one-time scripts against the live Mongo URI).
#    Categories (idempotent — safe to run any time):
MONGO_URI=... npm run seed:categories

#    Admin account (once):
ADMIN_EMAIL=you@company.com ADMIN_PASSWORD='a-strong-password' npm run seed:admin

# 2. Real payments:
#    - PAYSTACK_SECRET_KEY  → live secret key
#    - PAYSTACK_MOCK=false in the live env
#    - webhook → https://<host>/api/transactions/webhook/paystack

# 3. Escrow auto-release: hit POST /api/admin/run-auto-release on a schedule (or the
#    server's built-in sweep — it runs every 10 minutes when the process starts).

# 4. Optional email/SMS: set the reset-code provider; the forgot-password flow already
#    supports it (the token stops being echoed once a provider is configured).
```