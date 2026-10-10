# RepairHub Mobile — Screen Reference

This pack is a plain-language catalogue of **every screen in the RepairHub mobile app**, written so technical writers can document the product without reading the source code.

It was extracted directly from the app in this repository (Expo / React Native + TypeScript, Expo Router). Each screen entry describes what the user sees, what they can do, where they came from, and where each action leads.

## How to use this pack

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

## References for technical writers

- **Figma design (Group 9 — Repair Hub):** https://www.figma.com/design/orAUZeW4pHVGIFejPLTjWP/Group-9-Project---Repair-Hub?node-id=0-1&t=yc179zs6Mfv0l5IX-1
- **Backend API:** https://repairhub-api-1.onrender.com/api · **Swagger docs:** https://repairhub-api-1.onrender.com/api-docs · **Backend repo:** https://github.com/Code4Frankie/RepairHub_api
- **Screen index:** this document, plus `screens.csv` (machine-readable inventory).

## Roles

The app has two roles, chosen at sign-up and stored per account:

- **Customer** — requests a repair, receives quotes, books and pays into escrow, tracks the job, confirms completion, and holds a warranty.
- **Technician** — registers and is verified, browses jobs, sends quotes, accepts bookings, updates repair status, and withdraws earnings.

One device can hold both roles (a demo affordance), but the tab bar changes based on the signed-in role. Customers see **Home · My Repairs · Profile**; technicians see **Home · Jobs · Earnings · Profile**.

## Navigation model

- The app uses **Expo Router**; every file under `src/app/` is a route, and `_layout.tsx` files define the navigators.
- Screens live in two nested tab groups: `(customer)` and `(tech)`. The parentheses mean the folder name is not part of the URL, so `(customer)/home.tsx` is simply `/home`.
- Most route files are one line and simply point at a feature screen in `src/features/`. The docs reference the feature file because that is where the behaviour lives.
- The root stack (`src/app/_layout.tsx`) shows a blue launch splash on every app open and role switch, then lands on the user's home screen. A toast and (on web) dialogs are rendered here.
- Full-screen "moment" screens (`confirmed`, `review-done`, `job-done`, `withdraw-done`) disable the back gesture and animate up from the bottom.

## Job status model

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

## Key domain rules & terms

- **Escrow** — customer payments are held by RepairHub and only released when the customer confirms the repair, or automatically **72 hours** after the technician marks it complete.
- **Commission** — RepairHub deducts **10%** from each job before crediting the technician's wallet.
- **Minimum withdrawal** — **₦1,000**.
- **Quotes** — technicians send one binding quote per request (labour + parts + repair time + warranty). Customers compare price, rating, speed and warranty. Quotes are valid for **7 days** unless noted.
- **Home service vs workshop** — the customer chooses either a home visit or dropping the device at the technician's workshop. (There is no separate travel fee; technicians include travel in their quote.)
- **Warranty** — starts on the repair date and covers the parts replaced and work done on that repair. Claims are raised in the app; the technician has 48 hours to respond, otherwise RepairHub decides within 48 hours.
- **Live categories** — only **Smartphones, Laptops, Tablets, Desktops, Printers** are live at launch (Lagos). TVs, Refrigerators and other groups show as "Coming soon".
- **Money format** — Nigerian Naira, e.g. `₦18,700`.

## Screen inventory

50 screens total, grouped by area and ordered roughly as a user meets them. See the area files for detail on each.

### Entry & authentication (6)

| # | Screen | Route | Role |
| --- | --- | --- | --- |
| 1 | Welcome / Onboarding | `/` | Both |
| 2 | Role picker | `/role` | Both |
| 3 | Sign up | `/signup` | Both |
| 4 | Log in | `/login` | Both |
| 5 | Forgot password | `/forgot-password` | Both |
| 6 | Change password | `/new-password` | Both |

### Customer (25)

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

### Technician (19)

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

## Design system reference

Screens are built from a shared component library in `src/shared/components/ui.tsx`. Recurring building blocks a writer will see named across many screens:

- **Screen** — the standard page scaffold (title bar with optional back button, right-side action, scrollable body, sticky footer for primary buttons).
- **Card** — rounded content panel; tones include `soft`, `blue`, `strong`, `hi`, `selected`, `dash`.
- **Btn / Btns** — primary, secondary (`sec`), ghost, and danger buttons; `small` variant exists.
- **Field / Input / Opt / Chip(s) / ChoiceOrType / NumberChoice** — form controls.
- **KV** — key/value row used in detail cards.
- **Timeline / Stepper / MiniSteps / Segments** — progress and tabbing affordances.
- **Avatar, Badge, StatusPill, Chip, Banner, Empty, SuccessMark, Countdown, MediaGrid, Thumb, Puls** — status and feedback elements.

## Known limitations to note in documentation

These are genuine product limitations carried in the code and README; document behaviour as-is:

- Self-service **password reset** does not exist yet (`/forgot-password` explains to contact support).
- Preferred date/time and service type are stored inside the request's problem description on the backend.
- Technician progress/completion **photos** are not uploaded to the API.
- Review **replies** are not available.
- The **"Technician on the way"** map step maps to the `diagnosing` status on the backend.
- After a dispute is resolved with a full refund, the job becomes `cancelled` but the repair request stays `in_progress` on the backend.
