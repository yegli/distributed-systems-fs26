# Holiday Expense Tracker

A full-stack web application for tracking travel expenses across multiple trips. Built as a distributed-systems challenge project for FS 2026.

## What it does

Users register an account, create trips, and log expenses per trip. Each expense has an amount, currency, category, date, and optional notes. The dashboard shows all trips with totals converted to a chosen home currency (USD, CHF, or EUR). A trip detail view lists all expenses with per-row conversion alongside the original currency. An optional AI-powered summary can generate a natural-language breakdown of spending for any trip.

The stack is designed to demonstrate distributed systems concepts: two stateless API instances sit behind a Traefik reverse proxy that load-balances requests between them, every response carries an `X-Served-By` header identifying which instance handled it, and a PostgreSQL database is shared between both instances.

## Architecture

```
Browser
  └── Traefik (port 80)
        ├── /api, /health  →  api-1 (Node/Express)  ─┐
        │                  →  api-2 (Node/Express)  ─┤── PostgreSQL
        └── /              →  frontend (Nginx/Vue)    │
                                                      └── round-robin
Traefik dashboard: http://localhost:8080
```

## Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin)
- Node.js 22 (only needed to run `make up`, which generates the seed file locally before building images)
- `make`

## Getting started

### 1. Clone and enter the repository

```bash
git clone <repo-url>
cd distributed-systems-fs26
```

### 2. Create the environment file

```bash
cp .env.example .env
```

Open `.env` and set the following variables:

| Variable           | Required | Description |
|--------------------|----------|-------------|
| `POSTGRES_PASSWORD` | Yes      | Password for the PostgreSQL `postgres` user. Any non-empty string works for local use. |
| `JWT_SECRET`        | Yes      | Secret used to sign JWT tokens. Generate a strong value with `openssl rand -hex 32`. |
| `OPENAI_API_KEY`    | No       | OpenAI API key for the AI trip summary feature. Leave blank to receive a mock summary instead. |

Example `.env`:

```
POSTGRES_PASSWORD=supersecret
JWT_SECRET=b3f1a2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2
OPENAI_API_KEY=
```

### 3. Start the stack

```bash
make
```

This single command:
1. Runs `npm install` in both `backend/` and `frontend/`
2. Generates `backend/src/db/seed.sql` with bcrypt-hashed demo passwords
3. Builds Docker images and starts all services (`docker compose up --build`)

The application is ready when you see Traefik and both API instances reporting healthy in the logs.

Open **http://localhost** in your browser.

### Demo accounts

| Email | Password | Trips |
|-------|----------|-------|
| `alice@example.com` | `password` | Thailand 2025, Japan 2024, Swiss Alps 2023 |
| `bob@example.com`   | `password` | New York City 2025, Lisbon & Porto 2024, Iceland 2023 |

## Common operations

| Command | Effect |
|---------|--------|
| `make up` | Same as `make` — install deps and bring up the stack |
| `make down` | Stop containers, keep the database volume |
| `make clean` | Stop containers and delete the database volume (full reset) |
| `make logs` | Tail logs for all services |
| `make ps` | Show running container status |
| `make load-test` | Run a k6 load test against the running stack (requires `make up` first) |

## Important: first-run seeding

The database schema and seed data are loaded by PostgreSQL's init scripts on the **first** start of a fresh volume. If the stack starts and the dashboard shows empty or zeroed-out trip cards, the database container may not have finished initialising before the frontend made its first requests. Refresh the page once the API containers report healthy — the data will be present. To guarantee a clean state, run `make clean` followed by `make up`.

## API overview

All endpoints except `/health`, `/api/auth/register`, and `/api/auth/login` require a `Bearer` token in the `Authorization` header. The token is obtained at login and stored in `localStorage` by the frontend.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check — returns `{ status: "ok", instance: "api-1" }` |
| POST | `/api/auth/register` | Create a new account |
| POST | `/api/auth/login` | Obtain a JWT |
| GET | `/api/trips` | List trips for the authenticated user |
| POST | `/api/trips` | Create a trip |
| GET | `/api/trips/:id` | Get a single trip |
| PUT | `/api/trips/:id` | Update a trip |
| DELETE | `/api/trips/:id` | Delete a trip and all its expenses |
| GET | `/api/expenses` | List all expenses for the authenticated user |
| GET | `/api/expenses?trip_id=:id` | List expenses filtered by trip |
| POST | `/api/expenses` | Add an expense |
| PUT | `/api/expenses/:id` | Update an expense |
| DELETE | `/api/expenses/:id` | Delete an expense |
| GET | `/api/ai/trip-summary/:tripId` | Generate an AI spending summary for a trip |

## Project structure

```
.
├── backend/
│   └── src/
│       ├── db/
│       │   ├── schema.sql          # Table definitions (auto-run on first DB start)
│       │   ├── seed.sql            # Generated demo data (gitignored)
│       │   └── generate-seed.js    # Generates seed.sql with bcrypt hashes
│       ├── middleware/
│       │   └── jwt.js              # JWT authentication middleware
│       ├── routes/
│       │   ├── auth.js
│       │   ├── trips.js
│       │   ├── expenses.js
│       │   └── ai.js
│       └── index.js
├── frontend/
│   └── src/
│       ├── views/                  # DashboardView, TripView, LoginView, RegisterView
│       ├── components/             # TripCard, ExpenseList, ExpenseForm, AISummary
│       ├── stores/                 # Pinia auth store
│       ├── api/                    # Axios instance with JWT interceptor
│       └── utils/currency.js       # Client-side currency conversion
├── load-test/
│   └── script.js                   # k6 load test (50 VUs, 30 s)
├── docker-compose.yml
├── Makefile
└── .env.example
```
