---
title: Holiday Expense Tracker
sub_title: Distributed Systems FS 2026
theme:
  name: dark
---

<!-- font_size: 2 -->
&nbsp;
# Holiday Expense Tracker

**A fault-tolerant trip expense manager**

### Features
1. Supports login for multiple users.
4. Visual Representation of Expenses per Category.
5. Supports Speech-To-Text and Text-To-Speech.
6. Integrated AI Summaries and Money Saving Tips.
7. load balancing induced redundancy of the API component.
8. persistent storage of users, trips and expenses.
9. and many more ...

&nbsp;

### Short Facts
1. Built from scratch for the FS 2026 distributed systems challenge.
2. Assisted by Claude Code (Pro Subscription).
3. Time spent approximately 10h. 

<!-- end_slide -->

<!-- font_size: 2 -->
&nbsp;
## What was built

A multi-user web app for tracking travel expenses across trips.

- Login and register with **JWT authentication**
- Create trips, log expenses, filter by category
- Client-side currency conversion (USD / EUR / CHF)
- Runs across **two redundant API instances**

<!-- end_slide -->

<!-- font_size: 2 -->
&nbsp;
## Architecture

```
  Browser (Vue 3 + Nginx)
         │
         ▼
  ┌──────────────────┐
  │   Traefik  :80   │  ← load balancer + edge router
  └───────┬──────────┘
          │  round-robin
    ┌─────┴──────┐
    ▼            ▼
 ┌───────┐  ┌───────┐
 │ api-1 │  │ api-2 │  ← Node 22 / Express 5
 └───┬───┘  └───┬───┘
     └─────┬────┘
           ▼
    ┌─────────────┐
    │  PostgreSQL │  ← single persistent store
    └─────────────┘
```

<!-- end_slide -->

<!-- font_size: 2 -->
&nbsp;
## Traefik — Load Balancer

Routes all traffic and watches instance health.

- Polls `GET /health` on every container every **10 seconds**
- Dead instance is **removed automatically** — no manual intervention
- Dashboard at `localhost:8080` shows live backend status

&nbsp;

```
PathPrefix('/api') || PathPrefix('/health')  →  api-1, api-2
PathPrefix('/')                              →  Nginx (frontend)
```

<!-- end_slide -->

<!-- font_size: 2 -->
&nbsp;
## JWT — Why Failover Is Seamless

Tokens are **self-contained** meaning no shared session store is needed.

```
Login    →  server signs { sub, email, exp }  →  returns token
Request  →  any instance verifies with shared JWT_SECRET  →  done
```

&nbsp;

- api-1 and api-2 share the same `JWT_SECRET` env var
- No database lookup on every authenticated request
- Kill api-1 mid-session → api-2 handles the next request without re-login

<!-- end_slide -->

<!-- font_size: 2 -->
&nbsp;
## One-Command Setup

A fresh clone is fully running with a single command `make`


<!-- pause -->

In the background the following happens:
1. npm installs dependencies.
2. npm creates the database seed (ensures proper bcrypt hashes).
3. docker compose up --build brings up the entire stack.

&nbsp;
<!-- pause -->

This leads to the following state:
1. DB schema auto-applied on first Postgres start
2. Seed: 2 users · 6 trips · ~94 expenses
3. Only manual step: copy `.env.example` → `.env`

<!-- end_slide -->

<!-- jump_to_middle -->

<!-- font_size: 7 -->

# Demo

<!-- end_slide -->

<!-- font_size: 2 -->
&nbsp;
## Running containers
To view the currently running containers run the command: 
```bash +exec +id:containers
docker compose -p expense-tracker ps \
  --format "table {{.Name}}\t{{.Status}}"
```

<!-- snippet_output: containers -->

<!-- end_slide -->

<!-- font_size: 2 -->
&nbsp;
## Load balancing — live
Watch `X-Served-By` alternate between api-1 and api-2:

```bash +exec +id:lb
for i in 1 2 3 4 5 6; do
  curl -si localhost/health | grep X-Served-By
done
```

<!-- snippet_output: lb -->

<!-- end_slide -->

<!-- font_size: 2 -->
&nbsp;
## Register a new user
We can now register a new user in the Database by sending the following curl request and see that the JWT token is returned.
```bash +exec +id:register
curl -s -X POST localhost/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"tedy@example.com","password":"secret123"}' | jq
```

<!-- snippet_output: register -->

<!-- end_slide -->

<!-- font_size: 2 -->
&nbsp;
## Login and get a JWT
Alternatively we can also login with an existing user (added during seeding of database) and retrieve its JWT token.
```bash +exec +id:login
curl -s -X POST localhost/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"password"}' | jq
```

<!-- snippet_output: login -->

<!-- end_slide -->

<!-- font_size: 2 -->
&nbsp;
## Call a protected endpoint — no token
Now if we try to call one of the API endpoints without token we expect it to fail.
```bash +exec +id:no_token
curl -s localhost/api/trips | jq
```

<!-- snippet_output: no_token -->

<!-- end_slide -->

<!-- font_size: 2 -->
&nbsp;
## Call a protected endpoint — with token
Now if we retrieve the token of Alice and return it with jq for the curl command as $TOKEN we get a succesfull response.

```bash +exec +id:with_token
TOKEN=$(curl -s -X POST localhost/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"password"}' | jq -r '.token')

curl -s localhost/api/trips \
  -H "Authorization: Bearer $TOKEN" | jq '[.[] | {id,name,destination}]'
```

<!-- snippet_output: with_token -->

<!-- end_slide -->

<!-- font_size: 2 -->
&nbsp;
## User isolation

Bob cannot read Alice's data even with a valid JWT.

```bash +exec +id:isolation
BOB=$(curl -s -X POST localhost/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"bob@example.com","password":"password"}' | jq -r '.token')

curl -s localhost/api/trips/1 \
  -H "Authorization: Bearer $BOB" | jq
```

<!-- snippet_output: isolation -->

<!-- end_slide -->

<!-- font_size: 2 -->
&nbsp;
## Failover — kill api-2
Now to demonstrate the failover capabilities we kill the api-2 instance.
```bash +exec +id:failover_kill
docker stop expense-tracker-api-2-1
sleep 3
echo "=== api-2 is down — all traffic on api-1 ==="
for i in 1 2 3 4; do
  curl -si localhost/health | grep X-Served-By
done
```

<!-- snippet_output: failover_kill -->

<!-- end_slide -->

<!-- font_size: 2 -->
&nbsp;
## Failover — recover api-2

```bash +exec +id:failover_recover
docker start expense-tracker-api-2-1
sleep 12
echo "=== api-2 recovered ==="
for i in 1 2 3 4 5 6; do
  curl -si localhost/health | grep X-Served-By
done
```

<!-- snippet_output: failover_recover -->

<!-- end_slide -->

<!-- font_size: 2 -->
&nbsp;
## Load test

**50 virtual users · JWT-protected endpoints**
```bash +exec +id:load_test
docker run --rm -i grafana/k6 run \
	-e BASE_URL=http://host.docker.internal \
	- < load-test/script.js
```
```bash
  █ TOTAL RESULTS 

    checks_total.......: 6001    117.660736/s
    checks_succeeded...: 100.00% 6001 out of 6001
    checks_failed......: 0.00%   0 out of 6001

    ✓ login → 200
    ✓ expenses → 200
    ✓ expenses → served-by
    ✓ trips → 200
```

<!-- end_slide -->

<!-- font_size: 2 -->
&nbsp;
## Load test (killed API instance)

**50 virtual users · JWT-protected endpoints**


We run the load test in a docker container, followed by killing one of the redundant API instances:
```bash
docker run --rm -i grafana/k6 run \
	-e BASE_URL=http://host.docker.internal \
	- < load-test/script.js

docker stop expense-tracker-api-1
```
And receive the following (or similar) results, showing a mostly successful failover:
```bash

  █ TOTAL RESULTS 

    checks_total.......: 5230   74.862368/s
    checks_succeeded...: 94.76% 4956 out of 5230
    checks_failed......: 5.23%  274 out of 5230

    ✓ login → 200
    ✗ expenses → 200
      ↳  98% — ✓ 1714 / ✗ 29
    ✗ expenses → served-by
      ↳  86% — ✓ 1516 / ✗ 227
    ✗ trips → 200
      ↳  98% — ✓ 1725 / ✗ 18
```
<!-- end_slide -->

<!-- font_size: 2 -->
&nbsp;
## Bottleneck: PostgreSQL

The API is stateless — add replicas at any time. The DB is the limit.

```
API-1 ─── pool (10) ──┐
                       ├──► PostgreSQL  ← single instance
API-2 ─── pool (10) ──┘
```

&nbsp;

- 20 total DB connections under full load
- Every request runs a query — no cache
- **p99 >> p50** means requests queue at the connection pool

&nbsp;

To scale: **PgBouncer** (transaction pooling) or a **read replica**

<!-- end_slide -->

<!-- font_size: 7 -->
<!-- jump_to_middle -->

# Q&A

<!-- end_slide -->

<!-- font_size: 7 -->

<!-- jump_to_middle -->
# Thank you

<!-- end_slide -->

<!-- font_size: 2 -->
&nbsp;
## Make Commands
To run the project here a few helpful make commands. Have fun :)
```
make             →  full system up
make clean       →  wipe and rebuild
make load-test   →  k6 via Docker

localhost        →  frontend
localhost/api    →  backend (via Traefik)
localhost:8080   →  Traefik dashboard
```
