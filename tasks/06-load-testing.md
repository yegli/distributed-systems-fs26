# Task 06 — Load Testing with k6

## Goal
Demonstrate system behaviour under load, identify bottleneck, document results.

## Deliverables
- `load-test/script.js` — k6 test script
- `load-test/results.md` — documented findings (include in presentation)

## Test Script Outline
```javascript
// 1. Login once, grab JWT
// 2. Ramp to 50 VUs over 10s
// 3. Sustain 50 VUs for 30s hitting GET /api/expenses
// 4. Ramp down over 10s
// Thresholds: p95 < 500ms, error rate < 1%
```

## Run Command
```bash
docker run --rm -i --network host grafana/k6 run - < load-test/script.js
```

## What to Document in results.md
- Requests/sec at peak load
- p50, p95, p99 response times
- Error rate
- Which component is the bottleneck (expected: Postgres, not the API layer)
- What happens when one API instance is killed mid-test (run test, stop container, observe)

## Presentation Talking Points
- Show both instances handling traffic via Traefik dashboard
- Kill `api-2` during live load test — graph shows momentary blip, then recovery
- Explain why Postgres is the bottleneck (single instance, connection pool limits)
- Suggest theoretical next step: read replica or connection pooler (PgBouncer)

## Acceptance Criteria
- Script runs with a single command after `docker compose up`
- Results are reproducible and documented
- Can demonstrate live failover during load test in presentation
