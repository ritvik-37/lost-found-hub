# Lost & Found Hub

A campus lost-and-found system for **Vision2Web · Theme 1: Smart Campus & Student Life**.
Students report lost or found items, admins verify them, owners claim them with a private proof
check, and a built-in matcher suggests likely LOST ↔ FOUND pairs.

**Stack:** React 19 + Vite + Tailwind CSS 4 + React Router · Node.js + Express 5 · MongoDB + Mongoose ·
JWT in httpOnly cookies · bcrypt · Multer · Zod · Recharts · lucide-react

---

## Quick start

Requirements: **Node.js 20.19+** (22 or 24 recommended). No database install needed.

```bash
npm install        # installs client + server (npm workspaces)
npm run dev        # starts MongoDB (embedded), the API and the web app
```

Open **http://localhost:5173**. On first run the database is created and filled with demo data automatically.

`npm run dev` runs three processes side by side:

| Name  | What                                   | Where                    |
|-------|----------------------------------------|--------------------------|
| `db`  | Embedded MongoDB (real `mongod` binary via `mongodb-memory-server`, data saved to `~/.lost-found-hub/mongo-data`) | `127.0.0.1:27027` |
| `api` | Express API (auto-restarts on change)  | http://localhost:5050    |
| `web` | Vite dev server (proxies `/api`, `/uploads`) | http://localhost:5173 |

Prefer your own MongoDB (Atlas or local)? Copy `server/.env.example` to `server/.env`, set `DB_URL`,
run `npm run seed` once, then `npm run dev:no-db`.

### Reset the demo data

```bash
npm run seed       # wipes users, items, claims and uploaded photos, then loads the demo data
```

Works whether or not `npm run dev` is running.

## Demo accounts

The seed creates one admin (`admin@campus.edu`) and four students (`avneet@`, `rahul@`, `sneha@`,
`arjun@campus.edu`). **No passwords are stored in this repo.**

- **Easiest:** the sign-in page shows one-click **Demo accounts** buttons (Admin, Avneet, Rahul). They call
  `POST /api/auth/demo`, which is on by default in development and controlled by `DEMO_LOGINS` elsewhere.
- **Typing a password:** `npm run seed` generates random passwords and prints them once. To choose your own,
  set `DEMO_ADMIN_PASSWORD` / `DEMO_STUDENT_PASSWORD` in `server/.env` (never committed) and seed again.

Public sign-up always creates a student; the only admin comes from the seed.

## 3-minute demo script

1. **Browse** as a visitor: search `blue bottle`, open *Blue Milton water bottle* and see the **100% match**
   with *Steel water bottle, blue* (same category, same place, 1 day apart, shared keywords).
2. **Sign in as Avneet** → *Report* → "I lost an item", fill the form, add a photo → submit.
   Your new report opens with its possible matches straight away. Private detail stays private.
3. Open a found item → **"This is mine"** → submit a claim with proof. Track it under *My Activity → My claims*.
4. **Sign in as Admin** → *Admin*: KPIs and charts; **verify** *Grey backpack with football keychain*
   (it then appears as a strong match for Rahul's lost backpack); in *Claims to review*, compare the
   reporter's private detail with the claimant's proof side by side and **approve**. Other pending claims on
   that item are auto-rejected and the item becomes *Claimed*.
5. *All items* only offers legal status moves (PENDING → VERIFIED/REJECTED → …); try the dark-mode toggle
   and a phone-sized window (bottom nav with the centre *Report* button).

---

## Features

- **Public:** home (search, weekly stats, recently found, how it works), browse with filters
  (keyword, type, category, location, status, date range, sort, pagination; state lives in the URL),
  item detail modal (URL-driven `?item=<id>`, so Back closes it and links are shareable).
- **Students:** register/sign in, report LOST/FOUND items with photo upload + preview + drag-and-drop,
  edit or withdraw while pending, submit claims with proof, *My Activity* with status timeline and admin remarks.
- **Admins:** dashboard (5 KPIs, reports by category, lost vs found, last 7 days), review queue with the private
  detail, claims review with side-by-side comparison and remarks, all-items table with only the allowed moves.
- **Smart matching** (no AI API): scores opposite-type VERIFIED reports out of 100 and shows the top 3 scoring 45+,
  each with the reasons it matched.
- **UX:** loading skeletons, empty states with a next action, toasts (~4 s), on-blur validation with specific
  messages, focus moved to the first invalid field, confirm dialogs for irreversible actions, dark mode,
  `prefers-reduced-motion`, 44 px touch targets, visible focus rings, keyboard-operable tabs and dialogs.

## Item status workflow

```
PENDING ──verify──▶ VERIFIED ──claim approved / handed over──▶ CLAIMED ──▶ CLOSED
   │                    └────────────── resolved ──────────────────────────▲
   └──reject──▶ REJECTED (final)                                  CLOSED is final
```

- Allowed moves live only in the backend (`server/src/constants.js → STATUS_FLOW`). An illegal jump returns **400**
  with a message that names the allowed moves; the admin UI renders the `nextStatuses` the API sends.
- Status changes are conditional updates (`{ _id, status: from }`), so two admins can't race each other.
- Approving a claim marks the item **CLAIMED** and auto-rejects the other pending claims with a remark.
  Moving an item to CLAIMED/CLOSED/REJECTED also rejects its pending claims.

### Claim rules

A user can't claim their own report · only VERIFIED items can be claimed · one active (pending/approved) claim per
user per item (checked in code **and** by a partial unique index) · admins review claims but can't file them.

## Matching algorithm

`server/src/services/matching.js`, the same formula as the prototype's `matchesFor()`:

| Signal | Points |
|---|---|
| Same category | +40 |
| Same location | +20 |
| Dates within 7 days | +20 − 2 × days apart |
| Shared keyword (3+ letters/digits, from title + description, filler words like "the"/"near" ignored) | +6 each, max +30 |

Capped at 100. Only **VERIFIED** items of the opposite type from other users are candidates; matches **≥ 45** are
shown, **top 3**. Matches are returned right after creating a report, and on `GET /api/items/:id/matches`.

---

## REST API

All responses use `{ success, message?, data? }`; errors use `{ success: false, message, errors? }` where `errors`
maps field → message. Auth is a JWT in an httpOnly `lfh_token` cookie.

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | public (rate-limited) | `{ name, email, password, phone? }` → always role `user` |
| POST | `/api/auth/login` | public (rate-limited) | `{ email, password }` |
| POST | `/api/auth/logout` | public | clears the cookie |
| GET | `/api/auth/me` | public | `{ user }` or `{ user: null }` when signed out |
| GET | `/api/items` | public | VERIFIED/CLAIMED/CLOSED only. Query: `q, type, category, location, status, dateFrom, dateTo, page, limit (≤50), sort=newest\|oldest` |
| GET | `/api/items/summary` | public | this week's found / lost / returned counts (home page) |
| GET | `/api/items/mine` | user | your reports, including your private detail |
| GET | `/api/items/:id` | public* | *PENDING/REJECTED only for reporter + admins. Includes `viewer` (canClaim, myClaim…) |
| GET | `/api/items/:id/matches` | public* | top 3 matches with `score` and `reasons` |
| POST | `/api/items` | user | multipart (`image` optional: jpg/png/webp ≤ 5 MB) or JSON. Returns `{ item, matches }` |
| PUT | `/api/items/:id` | owner, while PENDING | any subset of fields, new `image`, or `removeImage=true` |
| DELETE | `/api/items/:id` | owner or admin | owners can't delete CLAIMED/CLOSED records |
| POST | `/api/items/:id/claims` | user | `{ proofAnswer (≥10), message? }` |
| GET | `/api/claims/mine` | user | your claims with status and admin remarks |
| GET | `/api/admin/items` | admin | all statuses + private detail + `nextStatuses` + pending-claim counts; same filters |
| PATCH | `/api/admin/items/:id/status` | admin | `{ status, note? }`, workflow enforced (400 on illegal jumps) |
| GET | `/api/admin/claims` | admin | `?status=PENDING\|APPROVED\|REJECTED`, with reporter detail + claimant proof |
| PATCH | `/api/admin/claims/:id` | admin | `{ status: APPROVED\|REJECTED, adminRemarks? }` |
| GET | `/api/admin/stats` | admin | totals by status, by category, lost vs found, reports per day (last 7 days), claims by status |
| GET | `/api/health` | public | API + DB status |

## Architecture

```
┌──────────────── client (React + Vite) ────────────────┐        ┌────────── server (Express 5) ──────────┐
│ pages/        Home, Browse, Report, Activity, Admin,  │  /api  │ routes/ → middleware → controllers/     │
│               Login, Register, Account                │ ─────▶ │   helmet · cors · rate-limit · sanitize │
│ components/   layout, ui (Modal, Field…), items, admin│ cookie │   loadUser (JWT) · requireAuth/Admin    │
│ context/      Auth · Toast · Confirm · ItemModal ·    │ ◀───── │   validate (Zod) · multer upload        │
│               Data (refresh signal after mutations)   │  JSON  │ services/matching.js                    │
│ hooks/        useApi · useForm (on-blur validation)   │        │ models/ User · Item · Claim (Mongoose)  │
│ lib/          api client, validation rules, tokens    │        │ error.js → { success:false, message }   │
└───────────────────────────────────────────────────────┘        └──────────────┬─────────────────────────┘
                                                                                 ▼
                                                               MongoDB (embedded for dev, or DB_URL)
```

- **Frontend state:** server data comes from `useApi()`; after any mutation `invalidate()` bumps a version so every
  visible list refetches (keeping the old data dimmed, not flashing). Auth state comes only from `/api/auth/me`;
  the role is never decided by the client.
- **Backend layering:** routes declare access + validation; controllers stay thin; the status workflow and
  matching are pure, testable logic. Every error goes through one error handler.
- **Privacy:** `hiddenDetails` is `select: false` in the schema, so it's never loaded unless a query asks for it.
  Only admins and the reporter ever receive it. Other students see reporters as "First L.".

```
.
├── client/                 React app
│   ├── public/             favicon, theme-init.js (applies saved theme before paint)
│   └── src/  pages/ components/ context/ hooks/ lib/ index.css (design tokens)
├── server/
│   ├── scripts/local-db.js embedded MongoDB for dev
│   ├── src/  config/ constants.js models/ middleware/ validators/ controllers/ routes/ services/ seed/ utils/
│   └── test/api.test.js    57 API tests (node:test + supertest + in-memory MongoDB)
├── render.yaml             one-click Render deployment (Blueprint)
└── package.json            workspaces + dev/seed/test/build/start scripts
```

## Security

bcrypt (12 rounds) · JWT in an **httpOnly, SameSite** cookie (Secure in production) · **helmet** with a CSP ·
**CORS** restricted to `CLIENT_URL` with credentials · **rate limits** (10 failed sign-ins / 15 min, 10 sign-ups / hour,
300 req/min overall) · **Zod** validation on every body and query (unknown keys dropped) · HTML tags and control
characters stripped from text · regex-escaped search · `$`/dotted keys and prototype-pollution keys stripped ·
uploads checked by **MIME type and magic bytes**, 5 MB cap, stored in MongoDB only after validation passes
(so free hosts with a throwaway disk keep photos) and served from `/uploads/:id` with immutable caching ·
ownership checks on edit/delete · constant-time-ish login (a dummy hash for unknown emails) · centralised error
handler that never leaks stack traces · handlers for unhandled rejections.

## Design system

Recreated from `lost-found-hub-ui.html` (Swiss/minimal, "luggage tag" palette, Outfit + Work Sans, 14 px cards,
Lucide line icons). The prototype's `:root` tokens (light, OS-dark and `data-theme="dark"`) live in
`client/src/index.css` and are exposed to Tailwind via `@theme` (`bg-card`, `text-muted-fg`, `text-lost`…).
Components use the prototype's class names (`.btn`, `.card`, `.badge`, `.seg`, `.chip`…), so it's easy to compare.

Deliberate changes from the prototype, each for accessibility or the brief:

| Change | Why |
|---|---|
| `--primary-ink` token (dark: `#8FB3E0`) for navy used as **text** (links, active nav/tab) | the prototype's dark `#3D6A9E` text on dark surfaces is ~2.6:1; now ≥ 4.5:1 |
| Dark `--destructive` → `#F2A193` | brick red error text on the dark card was ~1.6:1 |
| "ID Cards" tint lavender → olive | brief says no purple/violet |
| Dark variants for category tints | light tints glared on dark cards |
| Chart tokens `--chart-lost/found` | the red/green pair failed colour-blind separation; re-stepped by lightness and checked with a palette validator (light: all checks pass; dark: CVD ΔE 6.5, so the donut also has a text legend with counts, a 2 px gap and a table view) |
| Demo role switch → real signed-in user pill | role comes from the JWT |
| Collapsible "More filters" on phones | keeps results visible on 375 px screens |
| Prototype `.container` renamed `.wrap` | Tailwind v4 ships its own `.container` utility |

## Configuration

`server/.env` (see `server/.env.example`; every value has a local default):

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `5050` | API port (Vite reads it too, for the proxy). `API_PORT` overrides it if a tool injects `PORT`. |
| `DB_URL` | *(empty → embedded DB)* | MongoDB connection string |
| `JWT_SECRET` | dev placeholder | **required** when `NODE_ENV=production` |
| `JWT_EXPIRES_IN` | `7d` | session length |
| `CLIENT_URL` | `http://localhost:5173` | CORS origin(s), comma-separated |
| `ALLOWED_EMAIL_DOMAIN` | *(empty)* | e.g. `srmist.edu.in` to restrict sign-ups |
| `COOKIE_SAMESITE` | `lax` | `none` for split-domain deploys (forces Secure) |
| `TRUST_PROXY` | *(empty)* | `1` behind Render/Railway/Nginx |
| `SEED_ON_EMPTY` | `false` | load demo data at startup if the DB has no users (the embedded dev DB always does) |
| `DEMO_LOGINS` | on in dev, off in production | one-click demo sign-in buttons (`/api/auth/demo`) |
| `DEMO_ADMIN_PASSWORD`, `DEMO_STUDENT_PASSWORD` | *(random)* | passwords the seed gives the demo accounts |

`client/.env` (optional): `VITE_API_URL` (split deploys), `VITE_CAMPUS_NAME`.

## Scripts (run from the project root)

| Command | Does |
|---|---|
| `npm run dev` | embedded DB + API + web app |
| `npm run dev:no-db` | API + web app (when `DB_URL` points to your own MongoDB) |
| `npm run seed` | reset to demo data |
| `npm test` | 57 API tests against a throwaway in-memory MongoDB |
| `npm run build` | production build of the client (`client/dist`) |
| `npm start` | API; also serves `client/dist` if built, so the whole app runs from one port |

### Production in one process

```bash
npm run build
NODE_ENV=production JWT_SECRET=<long-random> DB_URL=<mongodb-uri> npm start   # → http://localhost:5050
```

## Deploy (free): Render + MongoDB Atlas

The whole app runs as **one Render web service** (the API also serves the built React app, so cookies stay
same-origin). `render.yaml` describes it.

1. **MongoDB Atlas** (https://cloud.mongodb.com): create a free **M0** cluster (AWS Mumbai or Singapore), add a
   database user, and under *Network Access* allow `0.0.0.0/0` (Render's IPs change). Copy the connection
   string (`mongodb+srv://user:pass@cluster.../`) and put your real password in it.
2. **Render** (https://render.com, sign in with GitHub): *New → Blueprint* → pick this repo → paste the Atlas
   string into `DB_URL` → *Apply*. `JWT_SECRET` is generated for you.
3. The first boot loads the demo data (`SEED_ON_EMPTY=true`) and prints random passwords for the demo
   accounts in the Render log. Judges use the one-click demo buttons (`DEMO_LOGINS=true`), so anyone with the
   link can act as the demo admin; that is intended for judging. Your site is at `https://lost-found-hub-xxxx.onrender.com`.

Free-tier notes: the service sleeps after 15 idle minutes and the next visit takes ~50 s to wake (open it once
before judging). Photos are stored in MongoDB, so restarts don't lose them.
To reset the live demo data, put the Atlas string in `server/.env` as `DB_URL` and run `npm run seed`.

## Troubleshooting

- **Port already in use:** change `PORT` in `server/.env` (the Vite proxy follows it). Vite itself uses 5173.
- **First `npm install` is slow:** it downloads a MongoDB binary (~75 MB) once.
- **Project inside OneDrive/Dropbox:** works, but syncing `node_modules` is slow. The DB data folder is
  deliberately kept outside the project (`~/.lost-found-hub`).
- **Want a fresh start:** stop `npm run dev`, delete `~/.lost-found-hub/mongo-data`, run `npm run dev` again.
#
