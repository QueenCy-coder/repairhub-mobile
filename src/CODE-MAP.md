# RepairHub code map

```
src/
├── app/                       Routes (Expo Router). One small file per screen address; each just points at a feature screen.
│   ├── (customer)/            Customer tab bar: home, repairs, profile
│   └── (tech)/                Technician tab bar: tech-home, jobs, earnings, me
├── features/
│   ├── auth/                  Signing in — shared by both roles
│   │   ├── welcome.tsx        Welcome screen, "I need a repair / I'm a technician"
│   │   ├── signup.tsx         Create account (email + password, via the API)
│   │   ├── login.tsx          Log in (email + password), forgot password, change password
│   │   ├── fields.tsx         Name, phone and password fields
│   │   └── session.ts         Entering the signed-in app
│   ├── customer/
│   │   ├── home.tsx           Home: active repair card, categories, quick requests, search
│   │   ├── request.tsx        Request a repair (device & problem → location & time → review)
│   │   ├── quotes.tsx         Waiting for quotes, compare quotes, technician profile
│   │   ├── booking.tsx        Book, pay into escrow, confirmation, appointments
│   │   ├── tracking.tsx       Live tracking, report a problem
│   │   ├── completion.tsx     Check & confirm, release payment, rate the repair
│   │   ├── history.tsx        Repair history and repair details
│   │   ├── warranty.tsx       Warranty card (QR) and warranty claims
│   │   ├── account.tsx        Profile set-up, profile photo, profile tab, notifications
│   │   └── common.tsx         Helpers used by several customer screens
│   └── technician/
│       ├── registration.tsx   Registration and verification status
│       ├── dashboard.tsx      Home dashboard and notifications
│       ├── jobs.tsx           Jobs board, job details, send a quote
│       ├── job-progress.tsx   Accept a booking, update repair status, job completed
│       ├── warranty-claims.tsx Respond to a warranty claim
│       ├── earnings.tsx       Earnings overview
│       ├── profile.tsx        Profile tab, services & coverage, reviews
│       ├── payouts/           verification (BVN/selfie/PIN), payout-account, withdraw, transactions
│       └── common.tsx         Helpers used by several technician screens
└── shared/
    ├── components/            Design system (ui.tsx), logo, dialogs, call sheet, notifications list, live map
    └── core/                  RepairHub API client (api.ts), API ⇄ app-state mapping and actions (backend.ts),
                               data & business rules (data.ts), app state + server polling (store.tsx), device features (native.ts)
```
