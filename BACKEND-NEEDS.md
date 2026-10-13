# What the app needs from the backend

Last checked: **14 October 2026**, against the backend repo [Code4Frankie/RepairHub_api](https://github.com/Code4Frankie/RepairHub_api) (latest commit `57ad3f3`) and the live server `https://repairhub-api-1.onrender.com/api`.

How this was checked: every API call the app makes (50 of them) exists in the live server's published spec, and a full end-to-end test (new customer + new technician, every flow) was run against the same backend code on a laptop with a test database. The results are in [`docs/RepairHub-API-Integration-Report.html`](docs/RepairHub-API-Integration-Report.html).

## 1. Blocking: the live server can't be used until these are done

The live server answers, but today it has **0 categories, 0 technicians and no admin**, so nobody can create a repair request or send a quote.

| # | What | How |
|---|---|---|
| 1 | **Admin account** | Run `ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run seed:admin` with the Render `MONGO_URI`. Admins can't sign up through the API. |
| 2 | **Service categories** | `scripts/seedCategories.js` in the backend repo is an **empty file**, so `npm run seed:categories` does nothing. The app expects exactly these names: `Smartphones`, `Laptops`, `Tablets`, `Desktops`, `Printers` (active) and `TVs`, `Refrigerators` (inactive, shown as "coming soon"). With an admin login, `tools/seed-categories.sh` in this repo creates them. |
| 3 | **Cloudinary keys** on Render | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Request photos, ID documents and dispute evidence upload there. |
| 4 | **Paystack** | Set `PAYSTACK_SECRET_KEY` (a test key first), keep `PAYSTACK_MOCK` off in production, and point the Paystack dashboard webhook to `https://repairhub-api-1.onrender.com/api/transactions/webhook/paystack`. The app waits for that confirmation before showing "Booking confirmed". |
| 5 | **Technician approval** | Someone with an admin login approves each technician after they upload their ID (`PATCH /technician-profiles/:id/verify {"decision":"approve"}`). Until then they can't see requests or quote. |

## 2. Bugs and rough edges found while testing

| # | Problem | Evidence | Suggested fix |
|---|---|---|---|
| 1 | **A quote can't be edited or re-sent.** The database allows one quote per technician per request, there is no edit endpoint, and a withdrawn quote still occupies that slot. So "withdraw, then send a corrected quote" fails with `Duplicate value for repairRequestId, technicianId`, and a technician who withdraws can never quote that request again. | `POST /quotations` after `PATCH /quotations/:id/withdraw` | Add `PATCH /quotations/:id` (while `pending`), or let a new quote replace a withdrawn one. The app currently treats quotes as final and tells the technician before they withdraw. |
| 2 | **Wrong current password returns 401** on `POST /users/change-password`. 401 is also what an expired or invalid token returns, so clients can't tell them apart (the app logged the user out until this was worked around by matching the message text). | `controller/userController.js` `changePassword` | Return 400 or 403 for a wrong current password; keep 401 for token problems. |
| 3 | **After a full-refund dispute ruling, the job becomes `cancelled` but the repair request stays `in_progress`.** | `resolveDispute` | Also set the request to `cancelled`. |
| 4 | **Rate limit is 300 requests per 15 minutes per IP address.** The app uses about 5 requests a minute while idle, but many phones on one campus or office Wi-Fi share an IP and can hit "Too many requests" during a demo. | `app.js` | Limit per signed-in user instead of per IP, or raise the limit. |
| 5 | **CORS only allows `CLIENT_URL`.** Browser-based previews (Expo web) on `localhost` are refused by the live server. Phones are not affected. | `app.js` | Add the web-preview origin, or allow localhost in development. |
| 6 | **Some changes send no notification.** When a technician withdraws a quote or a customer cancels a request, the other side isn't told. | quotation and repair-request controllers | Add `notifyUser` calls. |
| 7 | **Cold start.** Render's free tier sleeps after about 15 minutes; the first request takes about 30 seconds. | `/health` | Paid instance, or a ping every 10 minutes (this repo has a GitHub Action for that, see `.github/workflows/keep-api-awake.yml`). |

## 3. Features the app works around today

| # | Missing | What the app does now | Suggested addition |
|---|---|---|---|
| 1 | **Progress notes without a status change.** The job only moves between statuses, so "Diagnosis completed" and "Repair in progress" (both `in_progress`) can't be recorded. | Those two updates stay on the technician's phone only; the customer's tracker doesn't show them, and they reset if the technician switches phones. | `POST /repair-jobs/:id/updates { note, stage }`, or allow a same-status update with a note. |
| 2 | **"On the way" job status.** | Uses `diagnosing` for it. | Add an `on_the_way` status (after `accepted`). |
| 3 | **Technician progress and completion photos.** | Photo step removed; the customer only sees their own "before" photo. | `POST /repair-jobs/:id/media` (multipart) and `mediaUrls` on the job. |
| 4 | **Preferred date, time and service type on a repair request.** | Added to the end of `problemDescription` ("Preferred: Thu 15 Oct · 1:00 – 4:00 PM · Home service") and parsed back. | Fields `preferredDate`, `preferredTime`, `serviceMode` on the request. |
| 5 | **Forgot and reset password.** | "Contact support" message. | `POST /users/forgot-password` and `POST /users/reset-password` (email link or code). |
| 6 | **Distance in responses.** The location filters already exist (`lng`, `lat`, `radiusKm` on `/repair-requests` and `/technician-profiles`), but responses carry no distance value. | The app saves locations and works out distances itself. | A `distanceKm` field when `lng`/`lat` are sent, on requests, quotes and technicians. |
| 7 | **List of warranty claims on a technician's jobs.** | Looks up each finished job's warranty one by one. | `GET /warranty-records/mine` (or `/claims`), with `?status=open`. |
| 8 | **Customer name on requests and reviews.** Technicians see "Customer". | Shows "Customer". | A `customerDisplayName` ("Ada O.") on open requests and reviews. |
| 9 | **Push notifications.** | The app checks for new notifications every 12 seconds while it is open. | A device-token endpoint (`POST /notifications/devices`) and Expo push sending; and a `?since=` filter on `/notifications`. (An unread count already exists: `meta.unreadCount`.) |
| 10 | **Payout verification.** BVN check, selfie, payout PIN and bank account-name lookup. | Technicians enter bank, account number and name; RepairHub's team pays withdrawals by hand. | Needs a decision and a provider (e.g. Paystack's resolve-account API, or a KYC vendor). |
| 11 | **Review replies from technicians.** | Not shown in the app. | `POST /reviews/:id/reply`. Lower priority. |
| 12 | **Payout account saved on the server.** | Rebuilt from the technician's latest withdrawal on a new phone. | Store bank details on the technician profile. |
| 13 | **Claim evidence and technician claim notes with photos.** | Claims are text only. | Allow media on `POST …/claims`. |

## 4. Already in the backend (confirmed, nothing needed)

- **The other party's phone** is returned on `GET /repair-jobs/:id` (`contact: { name, phone }`); the app's Call buttons use it.
- **Unread notification count** is returned in `meta.unreadCount` on `GET /notifications`.
- **Location filters** exist on repair requests and technician search (only the distance value is missing, see 3.6).
- **"This week" earnings and the percentage change** don't need an endpoint: `GET /transactions/me` returns dated payouts and the app calculates them.
