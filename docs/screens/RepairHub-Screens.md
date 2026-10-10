# RepairHub Mobile — Complete Screen Reference

A single-file catalogue of **every screen in the RepairHub mobile app** (Expo / React Native + TypeScript), written so technical writers can document the product without reading the source code.

It was extracted directly from the app in this repository. Each screen entry describes what the user sees, what they can do, where they came from, and where each action leads.

**Contents**

1. [Screen Reference (overview)](#screen-reference-overview) — roles, navigation, status model, glossary, and the full 50-screen inventory
2. [Entry & Authentication](#entry--authentication) — 6 screens
3. [Customer Screens](#customer-screens) — 25 screens
4. [Technician Screens](#technician-screens) — 19 screens

---

## Screen Reference (overview)

This pack is a plain-language catalogue of **every screen in the RepairHub mobile app**, written so technical writers can document the product without reading the source code.

It was extracted directly from the app in this repository (Expo / React Native + TypeScript, Expo Router). Each screen entry describes what the user sees, what they can do, where they came from, and where each action leads.

### How to use this pack

| File | What's in it |
| --- | --- |
| `README.md` (this file) | Roles, navigation model, status model, glossary, and the full screen inventory |
| `01-entry-and-auth.md` | Launch, welcome, role picker, sign up, log in, password screens |
| `02-customer.md` | All customer screens (request → quotes → booking → tracking → warranty) |
| `03-technician.md` | All technician screens (registration → jobs → job progress → earnings) |
| `screens.csv` | The same inventory as a spreadsheet (one row per screen) |

Every screen entry follows the same template:

- **Route** — the URL/path the screen is addressed at
- **Source** — the file and exported component in the code (for cross-checking)
- **Role** — Customer, Technician, or Both
- **Purpose** — one-sentence summary
- **How you get there** — entry points
- **On screen** — the visible content, top to bottom
- **Actions** — what each control does and where it goes
- **States & edge cases** — empty, error, offline, and other variations

### Roles

The app has two roles, chosen at sign-up and stored per account:

- **Customer** — requests a repair, receives quotes, books and pays into escrow, tracks the job, confirms completion, and holds a warranty.
- **Technician** — registers and is verified, browses jobs, sends quotes, accepts bookings, updates repair status, and withdraws earnings.

One device can hold both roles (a demo affordance), but the tab bar changes based on the signed-in role. Customers see **Home · My Repairs · Profile**; technicians see **Home · Jobs · Earnings · Profile**.

### Navigation model

- The app uses **Expo Router**; every file under `src/app/` is a route, and `_layout.tsx` files define the navigators.
- Screens live in two nested tab groups: `(customer)` and `(tech)`. The parentheses mean the folder name is not part of the URL, so `(customer)/home.tsx` is simply `/home`.
- Most route files are one line and simply point at a feature screen in `src/features/`. The docs reference the feature file because that is where the behaviour lives.
- The root stack (`src/app/_layout.tsx`) shows a blue launch splash on every app open and role switch, then lands on the user's home screen. A toast and (on web) dialogs are rendered here.
- Full-screen "moment" screens (`confirmed`, `review-done`, `job-done`, `withdraw-done`) disable the back gesture and animate up from the bottom.

### Job status model

The app tracks a repair through one shared status sequence (`JobStatus` in `src/shared/core/data.ts`). Technical writers should use these names consistently:

| Value | Status | Customer-facing label |
| --- | --- | --- |
| -1 | No request | No request |
| 0 | Requested | Waiting for quotes |
| 1 | Quoted | Quotes received |
| 2 | Booked | Booked · awaiting technician |
| 3 | Accepted | Booked |
| 4 | On the way | Technician on the way *or* Device dropped off (depends on service type) |
| 5 | In progress | Repair in progress (or **Awaiting parts** if paused) |
| 6 | Completed | Repair completed |
| 7 | Released | Completed · paid |

Supporting states: **Cancelled** (request cancelled before/at booking), **Disputed** (a problem was reported and escrow is frozen), and **Verification** states for technicians (`new`, `pending`, `rejected`, `verified`).

### Key domain rules & terms

- **Escrow** — customer payments are held by RepairHub and only released when the customer confirms the repair, or automatically **72 hours** after the technician marks it complete.
- **Commission** — RepairHub deducts **10%** from each job before crediting the technician's wallet.
- **Minimum withdrawal** — **₦1,000**.
- **Quotes** — technicians send one binding quote per request (labour + parts + repair time + warranty). Customers compare price, rating, speed and warranty. Quotes are valid for **7 days** unless noted.
- **Home service vs workshop** — the customer chooses either a home visit or dropping the device at the technician's workshop. (There is no separate travel fee; technicians include travel in their quote.)
- **Warranty** — starts on the repair date and covers the parts replaced and work done on that repair. Claims are raised in the app; the technician has 48 hours to respond, otherwise RepairHub decides within 48 hours.
- **Live categories** — only **Smartphones, Laptops, Tablets, Desktops, Printers** are live at launch (Lagos). TVs, Refrigerators and other groups show as "Coming soon".
- **Money format** — Nigerian Naira, e.g. `₦18,700`.

### Screen inventory

50 screens total, grouped by area and ordered roughly as a user meets them. See the area files for detail on each.

#### Entry & authentication (6)

| # | Screen | Route | Role |
| --- | --- | --- | --- |
| 1 | Welcome / Onboarding | `/` | Both |
| 2 | Role picker | `/role` | Both |
| 3 | Sign up | `/signup` | Both |
| 4 | Log in | `/login` | Both |
| 5 | Forgot password | `/forgot-password` | Both |
| 6 | Change password | `/new-password` | Both |

#### Customer (25)

| # | Screen | Route | Purpose |
| --- | --- | --- | --- |
| 7 | Home | `/home` | Dashboard: active repair, categories, quick requests, search |
| 8 | Search / find a technician | `/search` | Browse verified technicians |
| 9 | Technician profile | `/tech-profile` | A technician's public profile and their quote |
| 10 | Request a repair — step 1 | `/new-request` | Device, model, problem description, photos |
| 11 | Request a repair — step 2 | `/request-details` | Location, date, time, service preference |
| 12 | Review request — step 3 | `/review-request` | Confirm and submit the request |
| 13 | Waiting for quotes | `/waiting` | Live status while technicians respond |
| 14 | Compare quotes | `/compare` | Side-by-side comparison, sort and select |
| 15 | Book technician | `/book` | Confirm appointment and price |
| 16 | Checkout / pay (escrow) | `/pay` | Pay by card (Paystack) or cash |
| 17 | Booking confirmed | `/confirmed` | Success moment with booking summary |
| 18 | Appointments | `/appointments` | Manage upcoming appointment, reschedule, cancel |
| 19 | Track repair | `/track` | Timeline, map, progress photos, report a problem |
| 20 | Report an issue | `/report` | Freeze escrow and raise a dispute |
| 21 | Check & confirm repair | `/complete` | Release payment, optional quick checks |
| 22 | Rate your repair | `/review` | Star rating, tags, written review |
| 23 | Review submitted | `/review-done` | Success moment |
| 24 | Warranty info | `/warranty` | Warranty card, QR code, coverage, terms |
| 25 | Submit warranty claim | `/claim` | Raise a warranty claim |
| 26 | Claim submitted / track claim | `/claim-submitted` | Claim status |
| 27 | Set up account / home address | `/cust-setup` | Profile photo + address |
| 28 | Profile | `/profile` | Customer profile tab and menu |
| 29 | Repair history | `/repairs` | All repairs, filterable |
| 30 | Repair details | `/repair` | Details of one repair |
| 31 | Notifications | `/alerts` | Customer notification list |

#### Technician (19)

| # | Screen | Route | Purpose |
| --- | --- | --- | --- |
| 32 | Service profile (registration) | `/tech-register` | Skills, areas, ID and certificate upload |
| 33 | Verification status | `/verification` | Application progress and review state |
| 34 | Home dashboard | `/tech-home` | Earnings, stats, today's job, nearby jobs |
| 35 | Notifications | `/tech-alerts` | Technician notification list |
| 36 | Jobs board | `/jobs` | Available / Active / Completed job tabs |
| 37 | Job details | `/job-details` | One request's full details |
| 38 | Send / revise quote | `/send-quote` | Compose a quote |
| 39 | Booking request | `/booking-request` | Accept or decline a booking |
| 40 | Update repair status | `/job` | Move the job through stages, add notes |
| 41 | Repair completed | `/job-done` | Success moment after marking complete |
| 42 | Earnings | `/earnings` | Wallet, charts, recent transactions |
| 43 | Profile | `/me` | Technician profile tab and menu |
| 44 | Services & coverage | `/services` | Toggle services and service areas |
| 45 | Reviews | `/reviews` | Rating summary and review list |
| 46 | Warranty claims | `/tech-claim` | Respond to customer warranty claims |
| 47 | Payout account | `/payout-account` | Add or change the bank account |
| 48 | Withdraw | `/withdraw` | Request a withdrawal |
| 49 | Withdrawal receipt | `/withdraw-done` | Withdrawal status and receipt |
| 50 | Transaction details | `/transaction` | A single wallet transaction / receipt |

### Design system reference

Screens are built from a shared component library in `src/shared/components/ui.tsx`. Recurring building blocks a writer will see named across many screens:

- **Screen** — the standard page scaffold (title bar with optional back button, right-side action, scrollable body, sticky footer for primary buttons).
- **Card** — rounded content panel; tones include `soft`, `blue`, `strong`, `hi`, `selected`, `dash`.
- **Btn / Btns** — primary, secondary (`sec`), ghost, and danger buttons; `small` variant exists.
- **Field / Input / Opt / Chip(s) / ChoiceOrType / NumberChoice** — form controls.
- **KV** — key/value row used in detail cards.
- **Timeline / Stepper / MiniSteps / Segments** — progress and tabbing affordances.
- **Avatar, Badge, StatusPill, Chip, Banner, Empty, SuccessMark, Countdown, MediaGrid, Thumb, Puls** — status and feedback elements.

### Known limitations to note in documentation

These are genuine product limitations carried in the code and README; document behaviour as-is:

- Self-service **password reset** does not exist yet (`/forgot-password` explains to contact support).
- Preferred date/time and service type are stored inside the request's problem description on the backend.
- Technician progress/completion **photos** are not uploaded to the API.
- Review **replies** are not available.
- The **"Technician on the way"** map step maps to the `diagnosing` status on the backend.
- After a dispute is resolved with a full refund, the job becomes `cancelled` but the repair request stays `in_progress` on the backend.
## Entry & Authentication

Screens that appear before (or around) being signed in. Shared by both roles.

---

### 1. Welcome / Onboarding

- **Route:** `/` (`src/app/index.tsx` → `Onboarding`)
- **Source:** `src/features/auth/welcome.tsx` → `Onboarding`
- **Role:** Both
- **Purpose:** First-run introduction that pitches RepairHub and starts account creation or login.

**How you get there**
- App launch when no account is signed in on the device.
- Signing out returns here.

**On screen**
- RepairHub logo, centred.
- Headline: *"Trusted repair services, just a few taps away."*
- Supporting line about verified technicians, comparing quotes, tracking repairs and warranty.
- Illustration of a technician holding a wrench.
- Two full-width buttons stacked at the bottom: `Create Account` and `Log In`.

**Actions**
- `Create Account` → Role picker (`/role`) with sign-up mode.
- `Log In` → Role picker (`/role`) with login mode.

**States & edge cases**
- If a user is already signed in on the device, this screen is skipped and the launch splash lands directly on their home screen instead.

---

### 2. Role picker

- **Route:** `/role` (`src/app/role.tsx` → `RolePicker`)
- **Source:** `src/features/auth/welcome.tsx` → `RolePicker`
- **Role:** Both
- **Purpose:** Lets the user choose whether they are a customer or a technician, in either sign-up or login mode.

**How you get there**
- From Welcome's `Create Account` / `Log In` buttons.

**On screen**
- Logo and a heading that changes with mode:
  - Sign-up: *"Welcome to RepairHub"* / *"How would you like to use the app?"*
  - Login: *"Welcome back"* / *"Which account are you logging in to?"*
- Two illustrated cards:
  - **I need a repair** — "Find trusted technicians for your devices and home repairs".
  - **I'm a technician** — "Find repair jobs, send quotes and manage your services."
- Footer line that toggles mode: *"Already have an account? Log in"* or *"Don't have an account? Create one"*.

**Actions**
- Selecting either card stores the chosen role + mode and continues to **Sign up** or **Log in**.
- The footer link flips between login and sign-up mode in place.

**States & edge cases**
- The chosen role is remembered for the rest of the flow and determines which tab bar the user lands in.

---

### 3. Sign up

- **Route:** `/signup` (`src/app/signup.tsx` → `Signup`)
- **Source:** `src/features/auth/signup.tsx` → `Signup`
- **Role:** Both (copy adapts to role)
- **Purpose:** Creates a new account with name, email, phone and password.

**How you get there**
- Role picker → pick a role in sign-up mode.

**On screen**
- Title: *"Create your account"*.
- Intro: *"Let's get you started. Enter your details to create your [technician] account."*
- Fields:
  - **First name** and **Last name** (required, side by side) and **Middle name** (optional). Letters, spaces, hyphens and apostrophes only. Technicians see the hint *"Use the name on your government ID — we check it during verification."*
  - **Email address** (required).
  - **Phone number** (required) — Nigerian format, prefixed `🇳🇬 +234`, expects 10 digits after the country code (a leading 0 is accepted and dropped).
  - **Create password** (required) — at least 8 characters, letters and a number.
  - **Confirm password** (required).
- Checkbox: *"I agree to the Terms & Conditions and Privacy Policy"*.
- Footer link: *"Already have an account? Log In"*.

**Actions**
- `Create Account` validates every field, registers via the API, and signs the user in.
- On success the user is sent to **Set up account** (customer) or **Service profile / registration** (technician).
- `Log In` link switches to the login screen.

**States & edge cases**
- Errors appear in red only after the user has tried to submit.
- Messenger toasts for: check your name, fix fields marked in red, accept the terms.
- Button shows *"Creating account…"* while working.

---

### 4. Log in

- **Route:** `/login` (`src/app/login.tsx` → `Login`)
- **Source:** `src/features/auth/login.tsx` → `Login`
- **Role:** Both
- **Purpose:** Signs an existing user in with email + password.

**How you get there**
- Role picker → pick a role in login mode; or the "Log In" links on Welcome/Sign up.

**On screen**
- Title: *"Welcome Back!"*
- Subtitle adapts: *"Log in to your customer/technician account to continue."*
- Fields: **Email address** (required) and **Password** (required, with show/hide eye).
- Link: *"Forgot password?"*.
- Footer: `Log In` button and *"Don't have an account? Create Account"*.

**Actions**
- `Log In` authenticates via the API and lands the user on their role's home screen.
  - Customer → Home (`/home`).
  - Technician → Home dashboard, or back to registration if they never finished registering.
- `Forgot password?` → **Forgot password**.
- `Create Account` link → Sign up.

**States & edge cases**
- Button shows *"Logging in…"* while working; the password field is cleared on failure.
- Empty fields show inline errors once the user tries to submit.

---

### 5. Forgot password

- **Route:** `/forgot-password` (`src/app/forgot-password.tsx` → `ForgotPassword`)
- **Source:** `src/features/auth/login.tsx` → `ForgotPassword`
- **Role:** Both
- **Purpose:** Explains how to recover an account, because self-service reset does not exist yet.

**How you get there**
- Log in → `Forgot password?`.

**On screen**
- Title: *"Reset password"*.
- Card explaining that email reset is "coming soon" and that the user should contact RepairHub support from their account email.
- Note: *"Remember it? Log in, then change it any time from Profile → Change password."*

**Actions**
- `Back to log in` returns to the login screen.

**States & edge cases**
- This is an informational screen only — there is no reset form.

---

### 6. Change password

- **Route:** `/new-password` (`src/app/new-password.tsx` → `NewPassword`)
- **Source:** `src/features/auth/login.tsx` → `NewPassword`
- **Role:** Both
- **Purpose:** Changes the password while signed in.

**How you get there**
- Customer Profile → **Change password**.
- Technician Profile → **Change password**.

**On screen**
- Title: *"Change password"*.
- Fields: **Current password**, **New password** (at least 8 characters, letters + number), **Confirm new password**.

**Actions**
- `Save password` validates and saves via the API, then returns to the previous screen.

**States & edge cases**
- Shows *"Saving…"* while working.
- New/confirm mismatch and weak-password errors show in red.
## Customer Screens

All screens a customer can see, ordered roughly along the repair journey: request a repair → receive and compare quotes → book and pay → track → confirm → warranty.

The customer tab bar (defined in `src/app/(customer)/_layout.tsx`) is **Home · My Repairs · Profile**. The **My Repairs** tab shows a `!` badge when the customer has something to act on (quotes to compare, or a finished repair to confirm).

---

### 7. Home

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

### 8. Search / find a technician

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

### 9. Technician profile

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

### 10. Request a repair — step 1 (describe the problem)

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

### 11. Request a repair — step 2 (location & appointment)

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

### 12. Request a repair — step 3 (review & submit)

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

### 13. Waiting for quotes

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

### 14. Compare quotes

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

### 15. Book technician

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

### 16. Checkout / pay (escrow)

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

### 17. Booking confirmed

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

### 18. Appointments

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

### 19. Track repair

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

### 20. Report an issue (dispute)

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

### 21. Check & confirm repair

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

### 22. Rate your repair

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

### 23. Review submitted

- **Route:** `/review-done` (`src/app/review-done.tsx` → `ReviewDone`)
- **Source:** `src/features/customer/completion.tsx` → `ReviewDone`
- **Role:** Customer
- **Purpose:** Confirmation that the review was submitted.

**On screen**
- Success mark, *"Your review has been submitted"*, and a thank-you line.
- Footer: `View your warranty` and `Back to home`.

---

### 24. Warranty info

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

### 25. Submit warranty claim

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

### 26. Claim submitted / track claim

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

### 27. Set up account / home address

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

### 28. Profile

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

### 29. Repair history

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

### 30. Repair details

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

### 31. Notifications

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
## Technician Screens

All screens a technician can see, ordered roughly along their journey: register and get verified → browse jobs and quote → accept a booking → progress the job → get paid → manage earnings and reviews.

The technician tab bar (defined in `src/app/(tech)/_layout.tsx`) is **Home · Jobs · Earnings · Profile**. The **Jobs** tab shows a badge when there are open requests or an accepted booking to act on.

A technician whose verification is not yet complete is redirected to registration; while under review they can look around but quoting is disabled until verified.

---

### 32. Service profile (registration)

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

### 33. Verification status

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

### 34. Home dashboard

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

### 35. Notifications

- **Route:** `/tech-alerts` (`src/app/tech-alerts.tsx` → `TechAlerts`)
- **Source:** `src/features/technician/dashboard.tsx` → `TechAlerts`
- **Role:** Technician
- **Purpose:** The technician's notification inbox.

**On screen**
- Title *"Notifications"*; list of notifications. Unread ones are marked read on open, except warranty claims awaiting a response.

**States & edge cases**
- Empty: *"New bookings, payments and reviews show up here."*

---

### 36. Jobs board

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

### 37. Job details

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

### 38. Send / revise quote

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

### 39. Booking request

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

### 40. Update repair status

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

### 41. Repair completed

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

### 42. Earnings

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

### 43. Profile

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

### 44. Services & coverage

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

### 45. Reviews

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

### 46. Warranty claims

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

### 47. Payout account

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

### 48. Withdraw

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

### 49. Withdrawal receipt

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

### 50. Transaction details

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
