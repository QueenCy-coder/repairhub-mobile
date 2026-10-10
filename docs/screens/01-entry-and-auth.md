# Entry & Authentication

Screens that appear before (or around) being signed in. Shared by both roles.

---

## 1. Welcome / Onboarding

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

## 2. Role picker

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

## 3. Sign up

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

## 4. Log in

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

## 5. Forgot password

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

## 6. Change password

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
