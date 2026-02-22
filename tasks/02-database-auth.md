# Task 02 — Database Schema & JWT Authentication

## Goal
Users can register and login. All subsequent API calls require a valid JWT.

## Deliverables
- `backend/src/db/schema.sql` — users, trips, expenses tables
- `backend/src/db/seed.sql` — 2 demo users, 1 Thailand trip, ~15 sample expenses
- `backend/src/db/client.js` — pg Pool, exported for use in routes
- `backend/src/routes/auth.js`:
  - `POST /api/auth/register` — validate input, hash password (bcrypt), return JWT
  - `POST /api/auth/login` — verify credentials, return JWT
- `backend/src/middleware/jwt.js` — verify Bearer token, attach `req.user`, return 401 if invalid
- Mount `schema.sql` + `seed.sql` into Postgres container via Docker Compose init so they auto-run on first start

## Schema
```sql
users (id SERIAL PK, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())
trips (id SERIAL PK, user_id INT REFERENCES users, name TEXT, destination TEXT, start_date DATE, end_date DATE, created_at TIMESTAMPTZ DEFAULT NOW())
expenses (id SERIAL PK, trip_id INT REFERENCES trips, user_id INT REFERENCES users, amount NUMERIC(10,2), currency CHAR(3), category TEXT, date DATE, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW())
```

## JWT
- Secret from `JWT_SECRET` env var
- Payload: `{ sub: user.id, email: user.email }`
- Expiry: 7 days (sufficient for demo/project)

## Acceptance Criteria
- Fresh `docker compose up` seeds DB automatically
- Register returns JWT, login returns JWT
- Request with no/invalid token to any protected route returns 401
- Passwords never stored or returned in plaintext
