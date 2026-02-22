# Task 01 — Project Setup & Docker Compose Scaffold

## Goal
Bring up the full infrastructure skeleton with a single `docker compose up`. No features yet, just containers talking to each other correctly.

## Deliverables
- `docker-compose.yml` with Traefik, api-1, api-2, frontend (nginx), postgres
- `backend/Dockerfile` (Node 22 LTS, production-ready)
- `frontend/Dockerfile` (Vite build → Nginx)
- `backend/src/index.js` — Express app with one health check route `GET /health → 200 OK`
- Traefik routes `/api/*` to backend instances (round-robin), `/` to frontend
- `X-Served-By` response header set per container (use `INSTANCE_NAME` env var)
- Postgres container with named volume, ready for init SQL in task 02
- `.env.example` with all required variables documented

## Acceptance Criteria
- `docker compose up --build` starts all containers cleanly
- `curl localhost/health` returns 200 from both instances alternately
- Traefik dashboard accessible at `localhost:8080`
- Postgres container healthy and reachable from backend containers
