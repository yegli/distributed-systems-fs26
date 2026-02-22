# Holiday Expense Tracker — Project Plan

## Overview
A distributed, containerized holiday expense tracker with JWT auth, AI-powered trip summaries, and live failover demonstration. Built for the FS2026 Challenge Task.

**Stack:** Node.js (Express) · Vue 3 (Vite) · PostgreSQL · Traefik · Docker Compose · k6 · OpenAI API

---

## Architecture

```
Browser
  └── Traefik (port 80, load balancer + health checks)
        ├── api-1  (Express backend, port 3000)
        └── api-2  (same image, second container)
        └── frontend (Vue, served via Nginx container)
              └── PostgreSQL (single instance, named volume for persistence)
```

- Traefik round-robins between `api-1` and `api-2`
- Both API instances connect to the same Postgres instance
- JWT is stateless — killing one instance has zero session impact
- Traefik health checks auto-remove unhealthy instances and re-add on recovery

---

## Repository Structure

```
/
├── PLAN.md                  # this file
├── docker-compose.yml       # single command brings up full system
├── tasks/                   # detailed per-milestone task files
│   ├── 01-project-setup.md
│   ├── 02-database-auth.md
│   ├── 03-expense-api.md
│   ├── 04-frontend.md
│   ├── 05-ai-summary.md
│   ├── 06-load-testing.md
│   └── 07-presentation.md
├── backend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── index.js         # Express app entry
│   │   ├── routes/          # auth.js, expenses.js, trips.js, ai.js
│   │   ├── middleware/      # jwt.js
│   │   └── db/              # schema.sql, seed.sql, client.js
├── frontend/
│   ├── Dockerfile
│   └── src/
│       ├── views/           # Login, Register, Dashboard, Trip
│       ├── components/      # ExpenseForm, ExpenseList, TripCard, AISummary
│       └── stores/          # auth.js (pinia)
└── load-test/
    └── script.js            # k6 load test against protected endpoint
```

---

## Core Features

| Feature | Details |
|---|---|
| Auth | Register / Login → JWT (access token) stored in localStorage |
| Trips | Create named trips (e.g. "Thailand 2025"), assign expenses to them |
| Expenses | Amount, currency, category (food/transport/accommodation/activities/other), date, notes |
| Dashboard | Per-trip totals, category breakdown, currency conversion (static rates ok) |
| AI Summary | Button per trip → calls `/api/trips/:id/summary` → OpenAI generates natural language summary |
| Failover Demo | `docker stop expense-tracker-api-2-1` mid-demo, app keeps working |
| Load Test | k6 hits `GET /api/expenses` (JWT protected) with 50 VUs for 30s, results documented |

---

## API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login

GET    /api/trips              (JWT required)
POST   /api/trips              (JWT required)
GET    /api/trips/:id          (JWT required)
GET    /api/trips/:id/summary  (JWT required — calls OpenAI)

GET    /api/expenses           (JWT required)
POST   /api/expenses           (JWT required)
DELETE /api/expenses/:id       (JWT required)
```

---

## Database Schema (PostgreSQL)

```sql
users       (id, email, password_hash, created_at)
trips       (id, user_id, name, destination, start_date, end_date, created_at)
expenses    (id, trip_id, user_id, amount, currency, category, date, notes, created_at)
```

Seed data includes 2 demo users and Thailand trip expenses (real data from trip).

---

## Docker Compose Key Points

- **Single command:** `docker compose up --build`
- Traefik configured via labels on `api-1` and `api-2` containers
- Postgres uses named volume for persistence
- DB init runs via `init.sql` mounted into Postgres container (auto-runs on first start)
- `.env.example` committed, `.env` gitignored — OpenAI key + JWT secret configured there
- All services on internal Docker network, only Traefik exposed externally

---

## Milestones

| Date | Deliverable |
|---|---|
| 02.03.2026 | `PLAN.md` + repo access shared |
| 30.03.2026 | Initial commit: project structure, DB schema, auth endpoints working |
| 04.05.2026 | Full working system: all endpoints, frontend, load test results drafted |
| 18.05.2026 | Final presentation + demo (5 min arch, 5 min demo, 5 min Q&A) |

---

## Failover Demo Script (Presentation)

1. Show app running, both instances healthy in Traefik dashboard
2. Log in, browse expenses — note which instance handles requests (via response header `X-Served-By`)
3. Run k6 load test live, show throughput graph
4. `docker stop expense-tracker-api-2-1` — Traefik detects failure
5. Refresh app — still works, zero data loss (JWT stateless, DB untouched)
6. `docker start expense-tracker-api-2-1` — Traefik re-adds instance automatically
7. Discuss bottleneck: single Postgres instance, not the API layer

---

## Notes for Claude Code

- Always use latest stable versions of all packages
- Backend: Node.js 22 LTS, Express 5, pg (node-postgres), bcrypt, jsonwebtoken
- Frontend: Vue 3, Vite, Pinia, Vue Router, Axios
- No manual setup steps — everything via Docker Compose and init SQL
- JWT middleware should be a reusable function applied to all protected routes
- Add `X-Served-By: api-1` (or `api-2`) response header — useful for failover demo
- OpenAI key should gracefully degrade (return mock summary if key not set)
- Keep AI summary prompt in a dedicated file for easy tweaking
- Each `tasks/*.md` file contains the detailed spec for that feature — read the relevant one before starting work on that feature
