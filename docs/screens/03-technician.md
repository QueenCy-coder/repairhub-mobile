# Technician Screens

All screens a technician can see, ordered roughly along their journey: register and get verified → browse jobs and quote → accept a booking → progress the job → get paid → manage earnings and reviews.

The technician tab bar (defined in `src/app/(tech)/_layout.tsx`) is **Home · Jobs · Earnings · Profile**. The **Jobs** tab shows a badge when there are open requests or an accepted booking to act on.

A technician whose verification is not yet complete is redirected to registration; while under review they can look around but quoting is disabled until verified.

---

## 32. Service profile (registration)

- **Route:** `/tech-register` (`src/app/tech-register.tsx` → `TechRegister`)
- **Source:** `src/features/technician/registration.tsx` → `TechRegister`
- **Role:** Technician
- **Purpose:** Set up the technician profile and submit documents for verification.

**How you get there**
- Automatically after a technician signs up; Profile → Edit profile (dashboard "What you can do now").

**On screen**
- Title *"Service profile"*; intro *"Set up your profile so customers can find and trust you. It takes about 3 minutes."*
- **1 · Personal details** — first/middle/last name (must match government ID), read-only verified phone.
- **2 · Services & skills** — checkboxes for the live categories (Laptops, Smartphones, Tablets, Desktops, Printers).
- **3 · Service area** — pick at least one Lagos area; plus a travel radius (5/10/15 km).
- **4 · Documents** — government ID (NIN slip, Driver's licence, Voter's card, Passport) and at least one certificate.
- Footer `Submit for verification`.

**Actions**
- `Submit for verification` uploads the profile and documents, asks for notification permission, notifies the technician, and goes to Home.

**States & edge cases**
- Alerts if the name is invalid, no skill/area chosen, or ID/certificate missing.
- Button shows *"Uploading…"* while working.

---

## 33. Verification status

- **Route:** `/verification` (`src/app/verification.tsx` → `Verification`)
- **Source:** `src/features/technician/registration.tsx` → `Verification`
- **Role:** Technician
- **Purpose:** Shows the state of the technician's application and documents review.

**How you get there**
- Dashboard verification card; Profile → Verification.

**On screen**
- Applicant card (avatar, name, submitted date) with a status (Verified / Fix needed / In review).
- Rejection banner (with the reason) when action is needed.
- **Application progress** list: Personal details, Services & skills, Service area, Documents verification — each with a Completed / In review / Action needed pill.
- "What happens next?" panel while not yet verified.
- Footer: `Go to dashboard` (verified) or `Go to profile`, plus **Contact support**.

**Actions**
- If rejected: `Upload a new ID photo & resubmit`.
- `Contact support` opens the phone dialler.

---

## 34. Home dashboard

- **Route:** `/tech-home` (`src/app/(tech)/tech-home.tsx` → `TechHome`)
- **Source:** `src/features/technician/dashboard.tsx` → `TechHome`
- **Role:** Technician
- **Purpose:** The technician's home: earnings, key stats, today's job and nearby requests.

**How you get there**
- Bottom tab **Home**. Sign-in lands here (verified technicians).

**On screen — while under review (not verified)**
- Greeting, a verification-status card (or "Action needed" when rejected), and a "What you can do now" list: Browse available jobs, Check earnings, Edit profile, Help and support. Plus a help panel.

**On screen — verified**
- Greeting row (avatar, name, "Ready for today's repairs?") and notification bell.
- **Available earnings** card (big number, total this month, trend).
- **Overview** period selector (This week / This month / All time) and four stat tiles: Available jobs, Active jobs, Completed jobs, Average rating — each tappable.
- Warranty-claim card when a customer is waiting for an answer.
- **Today's job** / **Next job** card (device, customer, service type, date/time, status) with `Respond to booking` or `View job`.
- **Available nearby** list (up to 3) with `See all`.

**Actions**
- Bell → Notifications.
- Earnings card / stat tiles → Earnings, Jobs (with a tab), or Reviews.
- Job card → Booking request or Update repair status.
- Nearby request → Job details.

**States & edge cases**
- No scheduled job → *"No job scheduled. Send quotes on nearby requests to get booked."*
- No nearby requests → *"No open requests in your skills right now."*

---

## 35. Notifications

- **Route:** `/tech-alerts` (`src/app/tech-alerts.tsx` → `TechAlerts`)
- **Source:** `src/features/technician/dashboard.tsx` → `TechAlerts`
- **Role:** Technician
- **Purpose:** The technician's notification inbox.

**On screen**
- Title *"Notifications"*; list of notifications. Unread ones are marked read on open, except warranty claims awaiting a response.

**States & edge cases**
- Empty: *"New bookings, payments and reviews show up here."*

---

## 36. Jobs board

- **Route:** `/jobs` (`src/app/(tech)/jobs.tsx` → `Jobs`)
- **Source:** `src/features/technician/jobs.tsx` → `Jobs`
- **Role:** Technician
- **Purpose:** Browse open requests, active jobs and completed jobs.

**How you get there**
- Bottom tab **Jobs** (optionally with a preset tab).

**On screen**
- Title *"Jobs"* with **search** and **filter** icon buttons.
- Three tabs: **Available (n) · Active (n) · Completed (n)**.
- Available tab: intro line, a "quoting unlocks once verified" warning if unverified, and request cards (device photo, headline, customer, distance/area, mode, needed date, typical or your price, category chips) with **View details** and **Send quote** / **Revise quote**.
- Active tab: intro line and the current active job card (device, customer, service, date, price, status, mini progress steps) with context buttons (`Respond to booking` / `Start job` / `View job` / `Update status`) and **View details**.
- Completed tab: list of finished jobs with a `Show more` control.

**Actions**
- Search toggles a search box; Filter toggles category chips and a "Within 10 km" toggle.
- Request card → Job details or Send/Revise quote.
- Active job → Booking request or Update repair status.

**States & edge cases**
- No matching jobs → empty state. Jobs outside the technician's skills are summarised with a link to **Services & coverage**.
- Unverified technicians can browse but not quote.

---

## 37. Job details

- **Route:** `/job-details` (`src/app/job-details.tsx` → `JobDetails`)
- **Source:** `src/features/technician/jobs.tsx` → `JobDetails`
- **Role:** Technician
- **Purpose:** Full details of one request before quoting.

**On screen**
- Customer row (avatar, name, reference, distance/area chip).
- Device heading, issue text, and customer photos.
- Details card: Category, Area, Exact address (shared after booking), Needed, Service, Posted, and Your quote if one exists.
- Banner if the job is already booked (whether to you or another technician).
- Footer: `Send a quote` / `Revise quote`, or `Respond to booking` / `Open job` if booked to you.

**States & edge cases**
- Unverified technicians see the quote button disabled.

---

## 38. Send / revise quote

- **Route:** `/send-quote` (`src/app/send-quote.tsx` → `SendQuote`)
- **Source:** `src/features/technician/jobs.tsx` → `SendQuote`
- **Role:** Technician
- **Purpose:** Compose or revise a quote for a request.

**On screen**
- Title *"Send quote"* or *"Revise quote"*.
- Request summary card (reference, device, distance/area, issue).
- Existing-quote banner when revising.
- Fields: **Labour (₦)** (required), **Parts (₦)**, **Ready in** (days), **Warranty** (months), **Note to customer** (optional).
- Earnings card: Customer pays, RepairHub commission (10%), and **You receive**.
- Note about validity (7 days) and travel.
- Footer `Send quote` / `Update quote · ₦…`; **Withdraw quote** when revising.

**Actions**
- `Send quote` / `Update quote` submits via the API and returns.
- `Withdraw quote` confirms and removes the quote.

**States & edge cases**
- Offline: quotes are blocked with *"You're offline… Quotes need a connection…"*.
- If the request is already booked, an empty state points to the job or back to Jobs.

---

## 39. Booking request

- **Route:** `/booking-request` (`src/app/booking-request.tsx` → `BookingRequest`)
- **Source:** `src/features/technician/job-progress.tsx` → `BookingRequest`
- **Role:** Technician
- **Purpose:** Accept or decline a customer's booking.

**How you get there**
- Dashboard/Today's job → Respond to booking; Jobs → Respond to booking.

**On screen**
- Title *"New booking"*.
- Success banner: *"[Customer] chose your quote and paid ₦… into escrow."*
- Details card: Job, When, Service, Address (home service), Customer phone (masked until accepted), In escrow, You receive (after 10%).
- Note: *"Please respond within 2 hours. If you decline, the customer gets a full refund."*
- Job stages summary.
- Footer: `Accept booking` and `Decline`.

**Actions**
- `Accept booking` (needs a connection) moves the job to Accepted and opens **Update repair status**.
- `Decline` confirms, refunds the customer, and returns to Jobs.

**States & edge cases**
- No booking request → empty state linking to Jobs.
- Already accepted → empty state linking to the job.

---

## 40. Update repair status

- **Route:** `/job` (`src/app/job.tsx` → `Job`)
- **Source:** `src/features/technician/job-progress.tsx` → `Job`
- **Role:** Technician
- **Purpose:** Move the job through its stages and keep the customer informed. Works offline.

**How you get there**
- Dashboard/Jobs active job → View job / Update status; after accepting a booking.

**On screen**
- Title *"Update Repair Status"*.
- Offline strip / sync status.
- Dispute banners (frozen payment, or a resolved outcome).
- Job card: device photo, headline, customer, Job ID, service type, date/time; plus `Navigate` (home service early stages) and a call button.
- **Repair progress** stage list (Booked → On the way/Device received → Repair in progress → Repair completed → Paid) with the current stage highlighted and completed stages expandable.
- **Add update** note box (optional) and a **Pause for parts** flow.
- "Waiting for customer to confirm" banner with auto-release countdown after completion.
- **Job details** card (description, customer photos, labour/parts, escrow, warranty offered).
- Footer: `Save progress · [next stage]` or, when paused, `▶ Parts arrived · resume repair`.

**Actions**
- `Save progress` advances to the next stage (queued offline if needed).
- `Pause for parts` records an awaiting-parts state with a note.
- Completing the job navigates to **Repair completed**.
- Call/Navigate where available.

**States & edge cases**
- No active job → empty state.
- Payment frozen while a reported problem is under review — status can't be changed.
- Completion notes: the API has no technician photos yet, so only the note is required.

---

## 41. Repair completed

- **Route:** `/job-done` (`src/app/job-done.tsx` → `JobDone`)
- **Source:** `src/features/technician/job-progress.tsx` → `JobDone`
- **Role:** Technician
- **Purpose:** Success moment after the technician marks the repair complete.

**On screen**
- Success mark, *"Repair completed!"*, and a status line (customer notified / customer confirmed).
- Job summary card (device, customer, Job ID, completed time, total).
- Note about the net amount after 10% commission.
- Footer: `View completed job` and `Back to home`.

---

## 42. Earnings

- **Route:** `/earnings` (`src/app/(tech)/earnings.tsx` → `Earnings`)
- **Source:** `src/features/technician/earnings.tsx` → `Earnings`
- **Role:** Technician
- **Purpose:** Wallet balance, earnings chart and recent transactions.

**How you get there**
- Bottom tab **Earnings**; Home → Earnings card.

**On screen**
- Title *"Earnings"* with a date chip.
- **Total earnings** card (this month, job count, after 10% commission) with a mini chart.
- Two tiles: **Available** and **Pending (escrow)**.
- Withdraw button (`Withdraw ₦…`, disabled below the ₦1,000 minimum).
- Payout summary (bank account / set up link).
- **Earning overview** with This week / This month / All time segments and a bar chart.
- **Recent transactions** list (credits and withdrawals), each tappable.

**Actions**
- `Withdraw` → Withdraw.
- Transaction row → Transaction details.

**States & edge cases**
- Brand-new technician: a "your earnings chart starts here" placeholder instead of a chart.

---

## 43. Profile

- **Route:** `/me` (`src/app/(tech)/me.tsx` → `Me`)
- **Source:** `src/features/technician/profile.tsx` → `Me`
- **Role:** Technician
- **Purpose:** The technician profile tab and settings menu.

**On screen**
- Offline strip.
- Avatar (verified), name, "Electronics technician · [area]", a profile-completion bar (85%) and label.
- Menu rows: **Services & coverage**, **Reviews**, **Verification**, **Payout account**, **Warranty claims**, **Change password**.
- An **Availability calendar** row marked "Coming soon".
- `Log out` (with confirmation).

**Actions**
- Each row opens its screen. Log out returns to Welcome.

---

## 44. Services & coverage

- **Route:** `/services` (`src/app/services.tsx` → `ServicesCoverage`)
- **Source:** `src/features/technician/profile.tsx` → `ServicesCoverage`
- **Role:** Technician
- **Purpose:** Choose which services and areas the technician covers.

**On screen**
- Title *"Services & Coverage"*.
- **Services you offer** — switches for Laptop repair, Phone repair, Tablet repair, Desktop repair, Printer repair, plus add-ons (Software installation, Data recovery, Device cleaning).
- **Service coverage** — searchable area picker; selected areas shown as removable chips; `＋ Add service area`.
- Footer `Save changes`.

**Actions**
- Toggling switches and adding/removing areas; `Save changes` persists via the API.

**States & edge cases**
- Requires at least one service and one area (flagged in red otherwise).

---

## 45. Reviews

- **Route:** `/reviews` (`src/app/reviews.tsx` → `Reviews`)
- **Source:** `src/features/technician/profile.tsx` → `Reviews`
- **Role:** Technician
- **Purpose:** The technician's ratings and customer reviews.

**On screen**
- Title *"My reviews"*.
- Summary card: big average score, stars, total count, and a 5→1 star distribution bar.
- Filter chips: All · 5★ · 4★ · 3★ & below.
- Review cards (customer, date, stars, job, text, tags).

**States & edge cases**
- No reviews: empty state. (Note: replying to reviews is not available in the API yet.)

---

## 46. Warranty claims

- **Route:** `/tech-claim` (`src/app/tech-claim.tsx` → `TechClaim`)
- **Source:** `src/features/technician/warranty-claims.tsx` → `TechClaim`
- **Role:** Technician
- **Purpose:** Respond to customers' warranty claims.

**How you get there**
- Profile → Warranty claims; Dashboard warranty-claim card.

**On screen**
- Title *"Warranty claims"*.
- Banner if any customers are waiting for a response.
- Claim cards: device thumbnail, claim reference, status chip (Action needed / Fixed / Not covered), device · repair · date, the customer's description, and the technician's response if any.
- When responding: options **I'll fix it under warranty** (free) or **Not covered by the warranty** (choose a reason and explain), plus a note field.
- Earlier claims section.
- Footer card explaining warranty work is free for the customer.

**Actions**
- `Respond` expands the response form.
- `Mark fixed` or `Send response` submits and notifies the customer.

**States & edge cases**
- Loading state; no claims → empty state.

---

## 47. Payout account

- **Route:** `/payout-account` (`src/app/payout-account.tsx` → `PayoutAccountScreen`)
- **Source:** `src/features/technician/payouts/payout-account.tsx` → `PayoutAccountScreen`
- **Role:** Technician
- **Purpose:** Add or change the bank account that payouts go to.

**How you get there**
- Profile → Payout account; Earnings → Manage/Set up; Withdraw → Change.

**On screen**
- If an account exists: a view card (bank, formatted account number, account name) and `Change payout account`.
- If adding/changing: fields **Bank** (searchable list of supported banks), **Account number (NUBAN)** (10 digits) and **Account name**.
- Note: payouts must go to an account in the technician's own name.
- Footer `Save account` (or `Continue` when opened from another flow).

**Actions**
- Saving stores the account, notifies the technician, and returns.

**States & edge cases**
- Validation for bank, 10-digit account number and account name.

---

## 48. Withdraw

- **Route:** `/withdraw` (`src/app/withdraw.tsx` → `Withdraw`)
- **Source:** `src/features/technician/payouts/withdraw.tsx` → `Withdraw`
- **Role:** Technician
- **Purpose:** Request a withdrawal to the bank account.

**On screen**
- Title *"Withdraw"*.
- Available-to-withdraw card.
- **Amount** field (with a `Max` button) and **Pay into** (bank + change link).
- Note: RepairHub's team checks and pays withdrawals; it shows as Processing until paid.
- Footer `Withdraw ₦…`.

**Actions**
- `Withdraw ₦…` asks for confirmation, submits via the API, and goes to the withdrawal receipt.
- `Change` → Payout account.

**States & edge cases**
- No payout account: prompts to add one first.
- Validates against the ₦1,000 minimum and the available balance.

---

## 49. Withdrawal receipt

- **Route:** `/withdraw-done` (`src/app/withdraw-done.tsx` → `WithdrawDone`)
- **Source:** `src/features/technician/payouts/withdraw.tsx` → `WithdrawDone`
- **Role:** Technician
- **Purpose:** Withdrawal confirmation, status and receipt.

**On screen**
- A status icon, *"Withdrawal requested"* or *"Money sent"*, the net amount and a status chip.
- A Stepper: Requested → Processing → Paid.
- Details card: Paid into, Account name, Amount, Fee, You receive, Requested, Expected/Arrived, Reference.
- `View full receipt` and a note to quote the reference for support.
- Footer `Back to earnings`.

**States & edge cases**
- No withdrawals → empty state.

---

## 50. Transaction details

- **Route:** `/transaction` (`src/app/transaction.tsx` → `TransactionDetail`)
- **Source:** `src/features/technician/payouts/transactions.tsx` → `TransactionDetail`
- **Role:** Technician
- **Purpose:** Full detail/receipt for a wallet credit or a withdrawal.

**On screen**
- A header showing the direction (Job payment received / Withdrawal), the amount and a status chip.
- Credits: **Job**, **Breakdown** (customer paid, 10% commission, credited amount) and **Details** cards, with a copyable transaction ID.
- Withdrawals: **Recipient**, **Amount** (with fee) and **Transfer details** cards, plus a status timeline.
- Footer: `⬆ Share receipt` and **Report a problem with this transaction**.

**States & edge cases**
- Unknown transaction → *"Transaction not found"*.
