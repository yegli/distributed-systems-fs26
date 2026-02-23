# Load Test Results

## Environment

| Item            | Value                                      |
|-----------------|--------------------------------------------|
| Date            | <!-- fill in -->                           |
| Hardware        | <!-- e.g. MacBook Pro M3, 16 GB RAM -->    |
| Stack           | 2 × API (Node 22 / Express 5), 1 × Postgres 16, Traefik v3 |
| k6 version      | grafana/k6 (latest Docker image)           |

## Test Parameters

| Parameter  | Value                                      |
|------------|--------------------------------------------|
| VUs        | 50 (ramp 10 s → sustain 30 s → ramp 10 s) |
| Endpoints  | `GET /api/expenses`, `GET /api/trips`      |
| Think time | 1 s per iteration                          |
| Thresholds | p95 < 500 ms, error rate < 1 %             |

---

## Run 1 — Baseline (both API instances healthy)

```
# Command used:
make load-test
```

### k6 Summary Output

```
<!-- paste k6 stdout here after running -->
```

### Key Metrics

| Metric                    | Value |
|---------------------------|-------|
| Total requests            |       |
| Requests/sec (peak)       |       |
| p50 response time         |       |
| p95 response time         |       |
| p99 response time         |       |
| Error rate                |       |
| Threshold p95 < 500 ms    | ✅ / ❌ |
| Threshold error rate < 1% | ✅ / ❌ |

### Observations

<!-- What did you notice? Which X-Served-By values appeared? Did both instances handle traffic? -->

---

## Run 2 — Failover (kill api-2 mid-test)

```bash
# In a second terminal while load-test is running:
docker stop expense-tracker-api-2-1
```

### k6 Summary Output

```
<!-- paste k6 stdout here -->
```

### Key Metrics

| Metric                | Before kill | During kill | After recovery |
|-----------------------|-------------|-------------|----------------|
| Requests/sec          |             |             |                |
| p95 response time     |             |             |                |
| Error rate            |             |             |                |

### Observations

<!-- Did error rate spike briefly? How long until Traefik stopped routing to the dead instance?
     Did the test recover and continue meeting thresholds? -->

---

## Bottleneck Analysis

### Expected Bottleneck: PostgreSQL

The API layer is stateless and horizontally scalable — adding more replicas in `docker-compose.yml`
is trivial. The single Postgres instance is the bottleneck because:

- All API instances share one connection pool (`pg.Pool`, max 10 connections each → 20 total)
- Every `GET /api/expenses` executes a DB query (`SELECT … WHERE user_id = $1`)
- Postgres processes queries serially per connection; under high concurrency, queries queue

**Evidence from test:** p99 latency should be significantly higher than p50, indicating
wait time in the Postgres connection queue rather than query execution time.

### Traefik Load Balancing

Both `api-1` and `api-2` should appear in the `X-Served-By` response header across requests,
confirming Traefik distributes load round-robin between instances.

---

## Theoretical Next Steps

| Problem                        | Solution                                      |
|--------------------------------|-----------------------------------------------|
| Postgres single point of failure | Streaming replication + read replica         |
| Connection pool exhaustion     | PgBouncer (transaction-mode pooling)          |
| API throughput ceiling         | Add more replicas to `docker-compose.yml`     |
| Cold-start after failover      | Kubernetes liveness/readiness probes          |
