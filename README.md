# RepairHub — mobile app (Group 9)

A repair-services marketplace for Lagos. Customers request a repair with photos, verified technicians send quotes, the customer books and pays into escrow (Paystack), the technician updates the job, and payment is released when the customer confirms. Every repair comes with a warranty.

This is the Expo (React Native + TypeScript) app, connected to the **RepairHub API**:

- Base URL: https://repairhub-api-1.onrender.com/api
- Swagger: https://repairhub-api-1.onrender.com/api-docs
- Backend repo: https://github.com/Code4Frankie/RepairHub_api

## Run it

Requirements: Node 20+, and the **Expo Go** app on your phone (SDK 57).

```bash
npm install --legacy-peer-deps
npx expo start --go --lan      # scan the QR code with your phone (same Wi-Fi)
```

Press `w` in the Expo terminal for the web version.

The app talks to the live API by default (`.env`). The hosted API sleeps when idle, so the first request after a while can take up to a minute.

## Run against your own copy of the API (optional)

`tools/run-local-api.mjs` starts the backend on your computer with a throw-away MongoDB (no install needed), a local admin and the app's categories. Payments run in the API's Paystack mock mode and uploads are saved locally.

```bash
cd ../RepairHub_api && npm install && cd -          # once
BACKEND_DIR=../RepairHub_api node tools/run-local-api.mjs
echo "EXPO_PUBLIC_API_URL=local" > .env.local        # then restart Expo
```

`local` means "the computer running Expo, port 5055", so phones on the same Wi-Fi use it too. The local admin's login is in `.local-api-db/admin.json`, for approving technicians while testing.

## What the app does with the API

| Area | Endpoints |
|---|---|
| Sign up / log in (email + password) | `POST /users/register`, `POST /users/login`, `POST /users/change-password` |
| Customer profile (home address) | `GET/PATCH /customer-profiles` |
| Repair requests with photos | `POST /repair-requests` (multipart), `GET /repair-requests`, `PATCH /repair-requests/:id/cancel` |
| Quotes | `POST /quotations`, `GET /quotations/mine`, `GET /quotations/repair-request/:id`, `PATCH /quotations/:id/accept` / `withdraw` |
| Booking | `POST /appointments`, `PATCH /appointments/:id/reschedule` / `cancel` |
| Payment (escrow) | `POST /transactions/pay` (Paystack checkout or cash), `GET /transactions/verify/:ref` |
| Job progress | `GET /repair-jobs`, `PATCH /repair-jobs/:id/status`, `POST /repair-jobs/:id/confirm` |
| Reviews, warranty, disputes | `POST /reviews`, `GET /warranty-records/job/:id`, claims, `POST /disputes` |
| Technicians | `GET/PATCH /technician-profiles`, `POST /technician-profiles/:id/verification-docs` |
| Wallet | `GET /wallets/me`, `POST /wallets/withdraw`, `GET /transactions/me` |
| Notifications | `GET /notifications`, mark read |

The app checks the newest notification every 12 seconds and reloads in full only when something changed, because the API allows about 300 requests per 15 minutes per device.

## Notes for the backend team

- **Admin account and categories:** someone with the Render `MONGO_URI` needs to run `seed:admin`. `scripts/seedCategories.js` (and `generatePostman.js`) are empty in the backend repo. The app expects these categories: Smartphones, Laptops, Tablets, Desktops, Printers (active); TVs, Refrigerators (inactive).
- **Web preview CORS:** the live server only allows `CLIENT_URL`. Add the web preview origin to test in a browser (phones are not affected).
- **Not in the API yet (the app works around these):**
  - Preferred date/time/service type on a request: added to the end of `problemDescription`.
  - Technician progress/completion photos: not uploaded.
  - Review replies: not available.
  - Self-service password reset.
  - "Technician on the way" step: mapped to `diagnosing`.
- **Possible backend fix:** after a dispute is resolved with a full refund, the job becomes `cancelled`, but the repair request stays `in_progress`.

## Code layout

See `src/CODE-MAP.md`. The API client is `src/shared/core/api.ts`. The mapping between API data and the screens is `src/shared/core/backend.ts`.
