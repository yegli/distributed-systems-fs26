# Demo Script — Holiday Expense Tracker

All commands run against `localhost:80` (Traefik). No direct container access needed.

---

## Prerequisites

```bash
make clean   # wipe any existing database volume
make         # npm install → generate seed.sql → docker compose up --build
```

---

## 1. Infrastructure — Load Balancing & Failover

```bash
# Both API instances answer health checks.
# Run this twice and watch X-Served-By alternate between api-1 and api-2.
curl -si localhost/health | grep -E 'X-Served-By|^\{'
curl -si localhost/health | grep -E 'X-Served-By|^\{'
```

```bash
# Traefik dashboard — shows both backends as healthy (green).
open http://localhost:8080
```

```bash
# Kill one instance mid-demo to show zero-downtime failover.
# Traefik detects the failure via health check and stops routing to it.
docker stop expense-tracker-api-2-1

# App still responds — api-1 handles all traffic.
curl -si localhost/health | grep X-Served-By

# Bring it back — Traefik re-adds it automatically within ~10 seconds.
docker start expense-tracker-api-2-1
curl -si localhost/health | grep X-Served-By
```

---

## 2. Authentication

### Register a new user

```bash
# Register returns a signed JWT immediately.
# The password is bcrypt-hashed (cost 12) before being stored — never plaintext.
curl -s -X POST localhost/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"secret123"}' | jq
```

Expected response:
```json
{ "token": "<jwt>" }
```

```bash
# Duplicate email returns 409 — not 500, not a generic error.
curl -s -X POST localhost/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"anything"}' | jq
```

### Login with a seeded demo account

```bash
# alice@example.com is seeded with 15 real Thailand trip expenses.
# Correct credentials return a fresh JWT (7-day expiry).
curl -s -X POST localhost/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"password"}' | jq
```

```bash
# Save the token to an environment variable for the requests below.
TOKEN=$(curl -s -X POST localhost/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"password"}' | jq -r '.token')

echo $TOKEN
```

### Auth failures

```bash
# Missing Authorization header → 401
curl -s localhost/api/expenses | jq

# Malformed token → 401
curl -s localhost/api/expenses \
  -H 'Authorization: Bearer thisisnotavalidtoken' | jq

# Wrong password → 401 (same message as wrong email — no enumeration)
curl -s -X POST localhost/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"wrongpassword"}' | jq
```

---

## 3. Trips & Expenses *(implemented in Task 03)*

```bash
# List all trips for the logged-in user
curl -s localhost/api/trips \
  -H "Authorization: Bearer $TOKEN" | jq

# Create a new trip
curl -s -X POST localhost/api/trips \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Japan 2026","destination":"Japan","start_date":"2026-04-01","end_date":"2026-04-14"}' | jq

# Get a single trip with its expenses
curl -s localhost/api/trips/1 \
  -H "Authorization: Bearer $TOKEN" | jq

# List all expenses for the logged-in user
curl -s localhost/api/expenses \
  -H "Authorization: Bearer $TOKEN" | jq

# Add an expense to a trip
curl -s -X POST localhost/api/expenses \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"trip_id":1,"amount":120.50,"currency":"EUR","category":"accommodation","date":"2026-04-02","notes":"Ryokan in Kyoto"}' | jq

# Delete an expense
curl -s -X DELETE localhost/api/expenses/1 \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 4. AI Trip Summary *(implemented in Task 05)*

```bash
# Generates a natural-language summary of the trip using OpenAI.
# If OPENAI_API_KEY is not set, returns a mock summary instead.
curl -s localhost/api/trips/1/summary \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 5. Load Test *(implemented in Task 06)*

```bash
# Run k6 against the protected expenses endpoint with 50 virtual users for 30s.
# Shows requests/sec, p95 latency, and error rate across both API instances.
docker run --rm -i --network expense-tracker_default \
  grafana/k6 run - < load-test/script.js
```

---

## Key Architecture Points (for Q&A)

| Question | Answer |
|---|---|
| Why does JWT make failover seamless? | Tokens are verified with a shared secret — no session store, no sticky sessions needed |
| What's the actual bottleneck? | Postgres (single instance). The API layer scales horizontally; the DB does not. |
| How does Traefik know a backend is unhealthy? | It polls `GET /health` on each container every 10 s. Failures remove the instance from the pool automatically. |
| Where are passwords stored? | Only bcrypt hashes (cost 12) in the `password_hash` column — never plaintext anywhere |
