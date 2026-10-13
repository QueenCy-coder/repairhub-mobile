# Customer Screens

All screens a customer can see, ordered roughly along the repair journey: request a repair → receive and compare quotes → book and pay → track → confirm → warranty.

The customer tab bar (defined in `src/app/(customer)/_layout.tsx`) is **Home · My Repairs · Profile**. The **My Repairs** tab shows a `!` badge when the customer has something to act on (quotes to compare, or a finished repair to confirm).

---

## 7. Home

- **Route:** `/home` (`src/app/(customer)/home.tsx` → `Home`)
- **Source:** `src/features/customer/home.tsx` → `Home`
- **Role:** Customer
- **Purpose:** The customer's dashboard: a live repair at a glance, device categories, quick repair shortcuts and search.

**How you get there**
- Bottom tab **Home**. Sign-in lands here.

**On screen**
- Top row: RepairHub logo and a **notifications bell** with an unread-count badge.
- Greeting row: profile avatar (tap to open Profile), *"Hi, [First name] 👋"* and *"What needs fixing today?"*.
- Tappable **search bar**: *"Search for a repair service…"*.
- **Active repair card** (only when a repair is open) — see below.
- Category group chips: **All · Electronics · Appliances · Furniture · Automotive**.
- **Popular categories** grid with a `See all →` link. Live categories (Phones, Laptops, Tablets, Printers) open a request; others show "Coming soon".
- **Request a repair** list of quick shortcuts: Phone screen repair, Laptop repair, Tablet repair, Printer repair.

**Active repair card (when a repair is open)**
- Shows the request reference, a status pill, device photo/icon, device name, progress bar across 7 stages (Request sent → Quotes in → Booking confirmed → Technician on the way/Device dropped off → Repair in progress → Repair completed → Payment released), the current step and "Step n of 7", plus the technician/next-step row with one context action button that changes with status: **View · Compare/Pay · Track · Confirm**.

**Actions**
- Search bar → Search (`/search`).
- Bell → Notifications (`/alerts`).
- Avatar → Profile (`/profile`).
- Category tile → Request a repair step 1 (`/new-request`), pre-filling the category. Unlisted categories show a "coming soon" toast.
- Quick repair row → Request a repair step 1 with that category.
- Active card → the relevant stage screen (`/waiting`, `/compare`, `/pay`, `/track`, `/complete`).

**States & edge cases**
- If a repair is already open, starting a new one shows *"You already have an open repair request"* and routes to the active screen.
- After a finished/cancelled repair, the next request starts blank.

---

## 8. Search / find a technician

- **Route:** `/search` (`src/app/search.tsx` → `Search`)
- **Source:** `src/features/customer/home.tsx` → `Search`
- **Role:** Customer
- **Purpose:** Browse verified technicians on RepairHub.

**How you get there**
- Home → search bar; Home → Popular categories `See all →`.

**On screen**
- Search input: *"Search name or repair, e.g. laptop"*.
- Filter chips: **✓ Verified only**, **Highest rated**, **Most jobs**.
- Info banner: *"Prices come from quotes. Post one request and compare binding quotes side by side."*
- List of technician cards: avatar (verified tick), name, skill/title, rating with job count and areas, chevron.

**Actions**
- Type to filter by name, skill or area.
- Sort chips change the ordering.
- Tapping a technician → Technician profile (`/tech-profile`).

**States & edge cases**
- Empty result: *"No matches"* (with a search) or *"No verified technicians yet"*, with a **Request a repair** action.

---

## 9. Technician profile

- **Route:** `/tech-profile` (`src/app/tech-profile.tsx` → `TechProfile`)
- **Source:** `src/features/customer/quotes.tsx` → `TechProfile`
- **Role:** Customer
- **Purpose:** A technician's public profile, including their quote for the current request.

**How you get there**
- Search result; a quote card's `View`; booking screens.

**On screen**
- Blue header with back arrow and *"Technician Profile"*.
- Avatar (verified), an online/response chip or a "Verified by RepairHub" chip, name, title, rating with review count and distance.
- Three stat tiles: joined/experience, jobs completed, warranty.
- **Quote card** for the current request (price, repair time, warranty, labour/parts split) when a quote exists.
- **Service categories** the technician covers.
- **Certifications** carousel ("Checked by RepairHub"); tapping opens a full-screen viewer.
- **Recent works** before/after carousel (from real finished jobs or samples).
- **About** text and the areas they serve.

**Actions**
- `Book [First name] · ₦…` (when they can be booked) → Book (`/book`) or Pay (`/pay`).
- Otherwise `Request a repair` → Request step 1.
- Tap certificates/works → full-screen image viewer.

**States & edge cases**
- With no quote on the request, the primary action becomes **Request a repair**.

---

## 10. Request a repair — step 1 (describe the problem)

- **Route:** `/new-request` (`src/app/new-request.tsx` → `NewRequest`)
- **Source:** `src/features/customer/request.tsx` → `NewRequest`
- **Role:** Customer
- **Purpose:** Capture the device, model, problem description and photos.

**How you get there**
- Home shortcuts/categories; History empty state; various "Request a repair" buttons.

**On screen**
- Header: *"Request a repair"*; step label *"Step 1 of 3 · Tell us what's wrong"*.
- **Device** — required; tappable tiles for Phones, Laptops, Tablets, Desktops, Printers.
- **Brand / model** — required; a searchable picker. Common models per category are listed; the customer can also type any model not listed.
- **Describe the problem** — required, free text, minimum 20 characters, with a live character counter.
- **Photos / videos** — required; up to 5 photos and 1 video, with a sample-photo shortcut.
- Footer `Continue` button.

**Actions**
- `Continue` validates step 1 and moves to **Location & appointment** (step 2).
- Selecting a category can reset an incompatible model.

**States & edge cases**
- Validation catches: no device, model too short, description under 20 characters, no photo. A phone model filed under the wrong category (e.g. an iPhone under Laptops) shows a helpful error.
- If a repair is already in progress, the screen instead shows an empty state: *"You have a repair in progress"* with a **View it** action.

---

## 11. Request a repair — step 2 (location & appointment)

- **Route:** `/request-details` (`src/app/request-details.tsx` → `RequestDetails`)
- **Source:** `src/features/customer/request.tsx` → `RequestDetails`
- **Role:** Customer
- **Purpose:** Where and when the repair is needed, and the service preference.

**How you get there**
- Request step 1 → `Continue`.

**On screen**
- Step label *"Step 2 of 3 · Where's the repair needed?"*.
- **📍 Current location** — required; prefilled from the profile's home address.
- **📅 Preferred date** — required; choose from suggested dates or type one.
- **🕘 Preferred time** — required; choose a time window or type one.
- **Service preference** — required; **Visit the workshop** (free) or **Home service** (technician comes to you).
- Footer `Continue` button.

**Actions**
- `Continue` validates and moves to **Review request** (step 3).

**States & edge cases**
- Missing location/date/time are flagged in red after submitting.

---

## 12. Request a repair — step 3 (review & submit)

- **Route:** `/review-request` (`src/app/review-request.tsx` → `ReviewRequest`)
- **Source:** `src/features/customer/request.tsx` → `ReviewRequest`
- **Role:** Customer
- **Purpose:** Final check before the request is sent to technicians.

**How you get there**
- Request step 2 → `Continue`.

**On screen**
- Title *"Review request"*; intro *"Kindly review your details before submitting your repair request"*.
- **Repair details** card (category, model, description, photo thumbnails) with an edit (pencil) button.
- **Location** card with edit button.
- **Preferred date & time** card with edit button.
- **Service preference** card with edit button.
- Confirmation checkbox: *"Technicians will review your request and send quotation."*
- Note: *"You only pay after you choose a quote. Your payment is held safely until you confirm the repair."*
- Footer `Submit Request` button.

**Actions**
- Edit buttons jump back to the relevant step.
- `Submit Request` sends the request to the API, asks for notification permission, notifies the customer, and goes to **Waiting for quotes**.

**States & edge cases**
- If details are missing it redirects back to the offending step with a toast.
- The confirm checkbox must be ticked.

---

## 13. Waiting for quotes

- **Route:** `/waiting` (`src/app/waiting.tsx` → `Waiting`)
- **Source:** `src/features/customer/quotes.tsx` → `Waiting`
- **Role:** Customer
- **Purpose:** Live status while technicians respond with quotes.

**How you get there**
- After submitting a request; the active-repair card when status is *Requested*.

**On screen**
- Title shows the request reference, e.g. *"Request RH-0841"*.
- A pulsing radar graphic with 📡 (waiting) or ✅ (quotes received).
- Title/subtitle: *"Finding technicians…"* or *"N quotes received"*.
- Incoming quote cards (price, rating, time, warranty, badges).
- Summary card: Device, Preferred, Service, Posted.
- Footer: `Compare N quotes →` once at least one quote exists.

**Actions**
- `Compare N quotes →` → Compare (`/compare`).
- **Cancel request** (available before booking) asks for confirmation and cancels.

**States & edge cases**
- No open request: empty state with **Request a repair**.
- Cancelled request shows *"This request was cancelled"*.

---

## 14. Compare quotes

- **Route:** `/compare` (`src/app/compare.tsx` → `Compare`)
- **Source:** `src/features/customer/quotes.tsx` → `Compare`
- **Role:** Customer
- **Purpose:** Compare technicians' quotes side by side and choose one.

**How you get there**
- Waiting for quotes; active-repair card → Compare.

**On screen**
- Title *"Repair quotations"*; subtitle *"N technicians responded · [model]"*.
- Sort chips: **Lowest price · Highest rated · Fastest · Longest warranty**, with a one-line explanation of the current sort.
- Status banner once a technician has been chosen (*"You chose … Finish paying…"*) or booked.
- Quote cards, each showing: technician avatar/name, total price, rating with jobs/distance, repair time and warranty, badges (**Lowest price · Top rated · Fastest**), labour/parts breakdown, optional note, expiry countdown, and **View** / **Select** buttons.
- Footer **Cancel request** (before booking).

**Actions**
- Sort chips reorder the list.
- **View** → Technician profile.
- **Select** → Book (`/book`), or **Pay** if a booking already exists.

**States & edge cases**
- Badges only appear when comparison is meaningful (2+ quotes, real rating, a unique winner).
- No quotes yet → empty state with **Back to request**.

---

## 15. Book technician

- **Route:** `/book` (`src/app/book.tsx` → `Book`)
- **Source:** `src/features/customer/booking.tsx` → `Book`
- **Role:** Customer
- **Purpose:** Confirm the appointment and price before paying.

**How you get there**
- Compare/quote card → Select; technician profile → Book.

**On screen**
- Title *"Book Technician"*.
- Technician card (avatar, name, rating).
- Repair card (device, short description).
- Quoted price card.
- **Appointment** section (date, time, service type) with a `Change` / `Done` toggle; when editing, offers date/time choices and service type.
- Total card.
- Footer `Continue to payment →`.

**Actions**
- `Change` → edit appointment inline.
- `Continue to payment →` → Checkout (`/pay`). If the date/time is invalid, it opens the editor with a toast.

---

## 16. Checkout / pay (escrow)

- **Route:** `/pay` (`src/app/pay.tsx` → `Pay`)
- **Source:** `src/features/customer/booking.tsx` → `Pay`
- **Role:** Customer
- **Purpose:** Pay into escrow via Paystack, or choose to pay cash after the repair.

**How you get there**
- Book → `Continue to payment →`; active card → **Pay**.

**On screen**
- Title *"Checkout"*.
- Repair card (device, date/time, service type).
- Technician card.
- **Price details**: Labour, Parts, RepairHub fee (₦0) and Total.
- **Payment method** options:
  - **Card, bank transfer or USSD** — secure checkout by Paystack, held in escrow.
  - **Cash after the repair** — pay the technician directly when done.
- Trust note: *"🛡 Your payment is held securely until you confirm the repair is complete."*

**Actions**
- `🔒 Pay ₦…` opens the Paystack page; the app then polls until the server confirms payment and goes to **Booking confirmed**.
- With cash selected: `Book · pay cash after the repair` confirms the booking directly.
- While waiting: `I've paid · check now` and `Open the payment page again`.

**States & edge cases**
- On payment failure: *"Payment didn't go through. You have not been charged."*
- A slow/absent confirmation shows *"Payment not received yet…"*.
- If already accepted (paid), it shows the **Booking confirmed** screen.

---

## 17. Booking confirmed

- **Route:** `/confirmed` (`src/app/confirmed.tsx` → `Confirmed`)
- **Source:** `src/features/customer/booking.tsx` → `Confirmed`
- **Role:** Customer
- **Purpose:** Success moment after the booking is paid/confirmed.

**How you get there**
- After successful payment; if already confirmed, `Pay` redirects here.

**On screen**
- Animated success mark, *"Booking Confirmed!"* and a booking ID chip.
- Card: technician (avatar, name, rating), Date/time, Address, Amount in escrow (or "Pay in cash after the repair"), Warranty.
- Info banner: *"[First name] has your booking and will update you here as the repair moves along."*
- Links: **Reschedule or cancel**.

**Actions**
- `Track Repair →` → Track repair.
- `Call Technician` (when a phone number is available).
- **Reschedule or cancel** → Appointments.

**States & edge cases**
- If the booking no longer exists (cancelled), it shows a "refunded"/"cancelled" empty state instead.

---

## 18. Appointments

- **Route:** `/appointments` (`src/app/appointments.tsx` → `Appointments`)
- **Source:** `src/features/customer/booking.tsx` → `Appointments`
- **Role:** Customer
- **Purpose:** Manage the upcoming appointment and view past repairs.

**How you get there**
- Profile → Appointments; Booking confirmed → Reschedule or cancel; Track → Manage appointment.

**On screen (upcoming appointment)**
- Appointment card with status pill and reference, a date tile, date/time and service type, a **Stepper** (Booked → On the way/Dropped off → Repairing → Done), device row, technician row (with call button), "Where" and escrow/cash tiles, and action buttons.
- **Past** section listing completed repairs.

**Actions**
- `Track repair` → Track.
- `Reschedule` → inline date/time editor → `Confirm new time`.
- `Cancel` → confirmation (refund if escrow held) → Repair history.

**States & edge cases**
- Once the repair has started, reschedule/cancel is disabled with a note: *"The repair has started, so the time can't be changed…"*.
- No upcoming appointment → empty state with **Request a repair**.

---

## 19. Track repair

- **Route:** `/track` (`src/app/track.tsx` → `Track`)
- **Source:** `src/features/customer/tracking.tsx` → `Track`
- **Role:** Customer
- **Purpose:** Follow the repair's progress and contact the technician.

**How you get there**
- Active card → Track; Appointments → Track repair; Booking confirmed → Track Repair.

**On screen**
- Title *"[Model] repair"*; *"Request ID: …"*.
- Dispute banner (if a problem was reported and payment is frozen).
- **Live map** when the technician is on the way (home service).
- **Timeline** of the repair's stages.
- **Photos from [technician]** grid (when the technician has added progress photos).
- Technician summary card (avatar, name, date/time, service type, amount).
- Footer: `Check & confirm repair →` (when completed) or `View warranty` (when released), plus `Call [name]` and `Manage appointment`.

**Actions**
- Call technician, manage appointment, confirm, or view warranty as available.
- **Report a problem** link (while not released and no open dispute) → Report an issue.

**States & edge cases**
- Nothing to track yet → empty state with **Go home**.
- Open dispute shows *"Problem reported… ₦… stays frozen in escrow…"*.

---

## 20. Report an issue (dispute)

- **Route:** `/report` (`src/app/report.tsx` → `Report`)
- **Source:** `src/features/customer/tracking.tsx` → `Report`
- **Role:** Customer
- **Purpose:** Freeze escrow and raise a problem with the repair.

**How you get there**
- Track repair → Report a problem; Check & confirm → Report an Issue.

**On screen**
- Title *"Report an issue"*.
- Warning banner: *"Your ₦… stays frozen in escrow while a RepairHub admin reviews both sides."*
- **What went wrong?** options (Repair not done properly, New damage, Charged more than quote, Didn't show up, Other).
- **Details** (required, min 15 characters) and **Evidence** photo/video upload.
- **What would fix this?** options (Redo the repair, Partial refund, Full refund).
- Footer `Submit report`.

**Actions**
- `Submit report` sends the dispute and returns to Track.

**States & edge cases**
- If payment was already released, the screen instead points to the **warranty claim** flow (escrow can no longer be frozen).

---

## 21. Check & confirm repair

- **Route:** `/complete` (`src/app/complete.tsx` → `Complete`)
- **Source:** `src/features/customer/completion.tsx` → `Complete`
- **Role:** Customer
- **Purpose:** Confirm the repair works and release escrow to the technician.

**How you get there**
- Track repair → `Check & confirm repair →`; active card → Confirm.

**On screen**
- Success mark and *"Repair Completed!"*.
- Auto-release countdown card: *"Payment releases automatically in … unless you confirm or report an issue."*
- Before/after photo row.
- Technician card (verified).
- **Repair details** card (service, issue, device, cost, completed on, warranty).
- Optional **Quick check** toggles (Device powers on, Problem fixed, No new damage).
- Footer: `Confirm & release ₦…` and `Report an Issue →`.

**Actions**
- `Confirm & release ₦…` asks for confirmation, releases payment, and goes to **Rate your repair**.
- `Report an Issue →` → Report an issue.
- After release, the footer becomes `View warranty`; if disputed, `View issue status`.

**States & edge cases**
- Not finished yet → empty state linking back to Track.

---

## 22. Rate your repair

- **Route:** `/review` (`src/app/review.tsx` → `Review`)
- **Source:** `src/features/customer/completion.tsx` → `Review`
- **Role:** Customer
- **Purpose:** Rate and review the technician after a completed repair.

**How you get there**
- After releasing payment; Repair details → Rate this repair.

**On screen**
- Technician avatar and name.
- *"How was your repair experience?"* with a 5-star picker and a word label (Poor → Excellent).
- Tag chips: On time, Professional, Fair price, Neat work, Explained the fix.
- Optional written review (min 10 characters if written).
- **Skip for now** link.

**Actions**
- `Submit Review` sends the review and goes to **Review submitted**.
- **Skip for now** → Warranty.

**States & edge cases**
- A star rating is required; a written review must be at least 10 characters.

---

## 23. Review submitted

- **Route:** `/review-done` (`src/app/review-done.tsx` → `ReviewDone`)
- **Source:** `src/features/customer/completion.tsx` → `ReviewDone`
- **Role:** Customer
- **Purpose:** Confirmation that the review was submitted.

**On screen**
- Success mark, *"Your review has been submitted"*, and a thank-you line.
- Footer: `View your warranty` and `Back to home`.

---

## 24. Warranty info

- **Route:** `/warranty` (`src/app/warranty.tsx` → `Warranty`)
- **Source:** `src/features/customer/warranty.tsx` → `Warranty`
- **Role:** Customer
- **Purpose:** The digital warranty card, coverage details and QR code.

**How you get there**
- Profile → Warranties; Repair details → View warranty; after confirmation.

**On screen**
- Header with a **share** action.
- Warranty header card (device, status chip Active/Expired/Claim open, repair ID, link to repair details).
- **Warranty information** card (Warranty ID, Repair ID, Technician, Repair date, Expiry date with days left).
- **Coverage** and **Not covered** lists.
- **Warranty code** — a scannable QR code (*"Show this code to any RepairHub technician to verify your warranty."*).
- **Terms and conditions** row (opens a dialog).
- Footer: `Submit warranty claim` (or `Track claim` if a claim is open).

**States & edge cases**
- If no warranty exists yet: *"Your digital warranty is created when you confirm the repair, or when the payment auto-releases."*

---

## 25. Submit warranty claim

- **Route:** `/claim` (`src/app/claim.tsx` → `Claim`)
- **Source:** `src/features/customer/warranty.tsx` → `Claim`
- **Role:** Customer
- **Purpose:** Raise a warranty claim for a completed repair.

**How you get there**
- Warranty → Submit warranty claim; Report (released) → Start a warranty claim; Warranty → Track claim.

**On screen**
- Warranty header card (device, repair ID, warranty ID, days left).
- **What issue are you experiencing?** dropdown (Screen issue, Battery issue, Charging problem, Camera issue, Sound/microphone, Software/performance, Other).
- **Is this the same issue that was repaired?** Yes / No.
- **Describe the issue** (required, max 500 characters, live counter).
- **Preferred resolution** (Repair again, Replace part, Refund).
- Footer `Submit claim`.

**Actions**
- `Submit claim` files the claim and goes to **Claim submitted**.

**States & edge cases**
- Without a completed repair + active warranty, shows *"A warranty claim needs a completed repair with an active warranty."*
- If a claim already exists, it shows the tracking view instead.

---

## 26. Claim submitted / track claim

- **Route:** `/claim-submitted` (`src/app/claim-submitted.tsx` → `ClaimSubmitted`)
- **Source:** `src/features/customer/warranty.tsx` → `ClaimSubmitted`
- **Role:** Customer
- **Purpose:** Confirms a claim and tracks its status.

**On screen**
- Just submitted: success mark, *"Claim submitted successfully"*.
- Details card (Claim ID, Warranty ID, Repair ID, Details) with copy-to-clipboard.
- Status banner reflecting the claim state (Submitted / Accepted / Disputed / Resolved).
- **Claim status** timeline: Submitted → With [technician] → Fixed under warranty / Not covered.
- Footer (just submitted): `Track claim` and `Back to home`.

**States & edge cases**
- No open claim → *"No open claim."*

---

## 27. Set up account / home address

- **Route:** `/cust-setup` (`src/app/cust-setup.tsx` → `CustomerSetup`)
- **Source:** `src/features/customer/account.tsx` → `CustomerSetup`
- **Role:** Customer
- **Purpose:** First-time profile completion (photo + address); later reused to edit the address.

**How you get there**
- Automatically after a new customer signs up; Profile → Home address to edit later.

**On screen**
- First time: *"Set up your account"* / *"Complete your profile"*. Later: *"Home address"*.
- Profile photo picker (camera or library).
- Name/phone/email card.
- **Home address** (required, min 8 characters).
- Footer: `Continue` (first time) or `Save` (editing).

**Actions**
- Saving via the API then lands on Home (first time) or returns to Profile (editing).

**States & edge cases**
- A user who has not completed setup is redirected here before they can use the customer tabs.
- Only a draft request picks up a changed address; a booked visit keeps its own address.

---

## 28. Profile

- **Route:** `/profile` (`src/app/(customer)/profile.tsx` → `CustomerProfile`)
- **Source:** `src/features/customer/account.tsx` → `CustomerProfile`
- **Role:** Customer
- **Purpose:** The customer profile tab and settings menu.

**On screen**
- Centred profile photo (tap to change), name, phone and email.
- Menu rows: **Home address** (or "Not set"), **Appointments** (or "None upcoming"), **Warranties** (active warranty ref or "None yet"), **Notifications**, **Change password**.
- `Log out` button (with confirmation).

**Actions**
- Each row opens its screen. Log out returns to Welcome.

---

## 29. Repair history

- **Route:** `/repairs` (`src/app/(customer)/repairs.tsx` → `RepairHistory`)
- **Source:** `src/features/customer/history.tsx` → `RepairHistory`
- **Role:** Customer
- **Purpose:** All of the customer's repairs, past and present.

**How you get there**
- Bottom tab **My Repairs**.

**On screen**
- Title *"Repair History"* (no back button).
- Segments: **All (n) · Completed · Cancelled**.
- Repair cards: device thumbnail, model, service, date and amount, technician, status chip (Active/Completed/Cancelled), warranty line, chevron.

**Actions**
- Tapping a card → Repair details.

**States & edge cases**
- No repairs: illustrated empty state with **Request a repair**.
- Empty tab: *"No completed/cancelled repairs."*

---

## 30. Repair details

- **Route:** `/repair` (`src/app/repair.tsx` → `RepairDetail`)
- **Source:** `src/features/customer/history.tsx` → `RepairDetail`
- **Role:** Customer
- **Purpose:** Details of a single repair from history (or the live one).

**On screen**
- Header card (thumbnail, model, service, status chip).
- Details card (Repair ID, Category, date, service, amount held/paid, warranty until, note).
- Problem description and photos (for the live repair).
- Technician card.
- Timeline of updates (live repair only).
- Footer button depending on state: `Track repair`, `Rate this repair` / `View warranty`, or `Request a repair`.

**States & edge cases**
- Missing repair: *"This repair is no longer available."*

---

## 31. Notifications

- **Route:** `/alerts` (`src/app/alerts.tsx` → `Alerts`)
- **Source:** `src/features/customer/account.tsx` → `Alerts`
- **Role:** Customer
- **Purpose:** The customer's notification inbox.

**On screen**
- Title *"Notifications"*.
- List of notifications; opening the screen marks them as read.

**States & edge cases**
- Empty: *"Updates about your repairs will show up here."*
- Tapping a notification can deep-link to the relevant screen (wired at the app root).
