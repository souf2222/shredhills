# Shredhills Timeclock

A simple self-hosted web app for employees to punch in / punch out, with an admin dashboard for managing employees, editing punches, viewing reports, and exporting CSV timesheets for payroll.

**Stack:** Node.js + Express + PostgreSQL, vanilla HTML/CSS/JS frontend.

## Features

- Kiosk-style punch in / punch out using **Employee Code + PIN**
- PostgreSQL-backed storage, PINs are bcrypt-hashed
- Prevents double-punch (DB-level unique index on open punches)
- Admin dashboard (`/admin`) protected by session login:
  - View / filter all punches by employee and date range
  - Add / edit / delete employees
  - Edit or delete individual punch entries
  - Weekly / monthly hours report per employee
  - CSV export for payroll
- **Employee self-service** (`/me`):
  - View own punch history with weekly/monthly totals
  - Edit or delete own punch entries
  - Self-edits are flagged in the admin dashboard with the original values preserved (audit trail)

## Prerequisites

- Node.js 18+
- PostgreSQL 13+ running locally (or reachable from the server)

## Setup

```bash
# 1. Clone & install
npm install

# 2. Create a database
createdb shredhills_timeclock
# (or: psql -c "CREATE DATABASE shredhills_timeclock;")

# 3. Configure environment
cp .env.example .env
# edit .env with your PG credentials and a strong SESSION_SECRET / ADMIN_PASSWORD

# 4. Initialize schema
npm run init-db

# 5. (Optional) seed a few demo employees
npm run seed
#   Seeded codes/PINs:
#     1001 / 1234  Alice Johnson
#     1002 / 5678  Bob Martinez
#     1003 / 4321  Carol Nguyen

# 6. Start the server
npm start
# or with auto-reload on file changes:
npm run dev
```

Open:

- Kiosk:  http://localhost:3000/
- Admin:  http://localhost:3000/admin  (login with `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env`)

## Running on a server

It's a plain Node process. Common patterns:

- **systemd** service running `node src/server.js` with `EnvironmentFile=/etc/shredhills.env`
- **pm2**: `pm2 start src/server.js --name shredhills-timeclock`
- Reverse-proxy behind nginx/Caddy for TLS and LAN access

Point clients (tablets, shared computer, etc.) at `http://<server-ip>:3000/` as a kiosk.

## Project layout

```
.
├── src/
│   ├── server.js          # Express app entrypoint
│   ├── db/
│   │   ├── pool.js        # PG connection pool
│   │   ├── init.js        # Creates schema (npm run init-db)
│   │   └── seed.js        # Demo employees (npm run seed)
│   └── routes/
│       ├── punch.js       # /api/punch/in | /out | /toggle | /status
│       └── admin.js       # /admin/* — login, employees, punches, reports, CSV
├── public/
│   ├── index.html         # Kiosk UI
│   ├── app.js
│   ├── styles.css
│   └── admin/
│       ├── login.html
│       ├── index.html     # Admin dashboard
│       └── admin.js
├── package.json
├── .env.example
└── README.md
```

## API quick reference

Kiosk (public):

- `POST /api/punch/in`     `{ code, pin }` → clock in
- `POST /api/punch/out`    `{ code, pin }` → clock out
- `POST /api/punch/toggle` `{ code, pin }` → auto in/out
- `POST /api/punch/status` `{ code, pin }` → current status

Employee self-service (auth via `code` + `pin` per request):

- `GET    /api/me/summary`        → week + month totals, current status
- `GET    /api/me/history`        → list of own punches (filters: `from`, `to`)
- `PUT    /api/me/punches/:id`    → edit own punch
- `DELETE /api/me/punches/:id`    → delete own punch

Admin (session required):

- `GET|POST /admin/api/employees`
- `PUT|DELETE /admin/api/employees/:id`
- `GET|POST /admin/api/punches` (filters: `employee_id`, `from`, `to`)
- `PUT|DELETE /admin/api/punches/:id`
- `GET /admin/api/report?from=&to=&employee_id=`
- `GET /admin/api/export.csv?from=&to=&employee_id=`

## Security notes

- Change `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `SESSION_SECRET` in `.env` before deploying.
- The admin password is compared as plaintext from env; this is a single-admin setup for small-team local use. For multi-admin, extend `routes/admin.js` to authenticate against a DB table with hashed passwords.
- Put the app behind HTTPS on any network other than a trusted LAN.
