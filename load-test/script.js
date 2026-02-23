/**
 * k6 load test — Holiday Expense Tracker
 *
 * Stages:   10 s ramp-up → 30 s sustain at 50 VUs → 10 s ramp-down
 * Endpoints: GET /api/expenses  (primary)
 *            GET /api/trips     (secondary — spreads load across both backends)
 * Thresholds: p95 < 500 ms, error rate < 1 %
 *
 * Run (macOS / Docker Desktop):
 *   docker run --rm -i grafana/k6 run \
 *     -e BASE_URL=http://host.docker.internal \
 *     - < load-test/script.js
 *
 * Run (Linux / Docker Engine with --network host):
 *   docker run --rm -i --network host grafana/k6 run - < load-test/script.js
 *
 * Or via Makefile:  make load-test
 */

import http   from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

export const options = {
  stages: [
    { duration: '10s', target: 50 },  // ramp up to 50 VUs
    { duration: '30s', target: 50 },  // sustain
    { duration: '10s', target: 0  },  // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95th percentile under 500 ms
    errors:            ['rate<0.01'],  // fewer than 1 % errors
  },
}

const BASE = __ENV.BASE_URL || 'http://localhost'

// ── setup() runs once before VUs start ───────────────────────────────────────
// Returns shared data injected into every default() call.
export function setup() {
  const res = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({ email: 'alice@example.com', password: 'password' }),
    { headers: { 'Content-Type': 'application/json' } }
  )

  const loginOk = check(res, { 'login → 200': r => r.status === 200 })
  if (!loginOk) {
    throw new Error(`Login failed — is the stack running? status=${res.status} body=${res.body}`)
  }

  const token = res.json('token')
  if (!token) throw new Error('No token in login response')

  return { token }
}

// ── default() runs for every VU on every iteration ───────────────────────────
export default function ({ token }) {
  const headers = { Authorization: `Bearer ${token}` }

  // Primary endpoint: list all expenses (hits Postgres via either API instance)
  const expRes = http.get(`${BASE}/api/expenses`, {
    headers,
    tags: { endpoint: 'expenses' },
  })
  const expOk = check(expRes, {
    'expenses → 200':         r => r.status === 200,
    'expenses → served-by':   r => r.headers['X-Served-By'] !== undefined,
  })
  errorRate.add(!expOk)

  // Secondary endpoint: list trips — round-robins between api-1 and api-2
  const tripRes = http.get(`${BASE}/api/trips`, {
    headers,
    tags: { endpoint: 'trips' },
  })
  const tripOk = check(tripRes, {
    'trips → 200': r => r.status === 200,
  })
  errorRate.add(!tripOk)

  sleep(1)  // 1 s think time — keeps ~50 req/s per endpoint at 50 VUs
}
