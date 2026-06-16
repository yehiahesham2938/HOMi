# HOMi Load Testing

Validates the abstract's claims: **2,500 concurrent users, avg/p50 API latency, ~0% error rate**.

## ⚠️ Pre-flight (do this first, or your results are garbage)

1. **Disable the rate limiter on the test target.** The global limiter keys on client
   IP (`rate-limit.middleware.ts`) and allows only 50 req / 600s. A load generator is
   one IP, so it gets `429`-throttled almost immediately and you measure the limiter,
   not the app. On the **test environment** set:
   ```
   RATE_LIMIT_ENABLED=false
   ```
2. **Do not hammer production.** Paymob, real emails, and the live DB are wired in.
   Deploy a **staging Railway service** that mirrors prod (same instance size, same
   `DB_POOL_MAX`, separate Postgres + Upstash) and point the tests there. Capacity
   numbers are only valid for the instance size you actually test.
3. **Seed test users.** Login runs bcrypt (CPU-heavy by design). Pre-create N users so
   VUs log in as distinct accounts. See `seed-loadtest-users` note below.
4. **"Concurrent users" must be defined.** 2,500 *idle* sockets ≠ 2,500 *active*
   requesters. Report which you tested (the k6 script below models active users with
   think-time; the Artillery script models concurrent chat sockets).

## Tools

| Goal | Tool | File |
|------|------|------|
| HTTP latency / error rate / throughput (the abstract's core numbers) | [k6](https://k6.io) | `http-load.js` |
| Concurrent Socket.IO chat connections (the real bottleneck) | [Artillery](https://artillery.io) | `socketio-load.yml` |

Install:
```bash
# k6 (Windows)
winget install k6   # or: choco install k6
# Artillery
npm i -g artillery artillery-engine-socketio-v3
```

## Run

```bash
# 1. HTTP — ramp to 2,500 active VUs
BASE_URL=https://staging-api.homi-platform.com \
TEST_EMAIL=loadtest+1@homi.test TEST_PASSWORD='LoadTest123!' \
k6 run http-load.js

# 2. Socket.IO — 2,500 concurrent chat connections
artillery run socketio-load.yml \
  --target wss://staging-api.homi-platform.com
```

## Reading the results vs. the abstract

k6 prints exactly the metrics you're claiming:

| Abstract claim | k6 metric |
|----------------|-----------|
| avg API latency 176 ms | `http_req_duration ... avg=` |
| p50 latency 56 ms | `http_req_duration ... p(50)=` |
| ~0% error rate | `http_req_failed ........: 0.00%` |
| 2,500 concurrent | `vus_max` reached during the test |

The `thresholds` block makes k6 **exit non-zero if reality misses the claim**, so this
doubles as a regression gate.

## Watch the server while it runs (this is where it breaks)

Open these in parallel — the single-instance + 30-connection pool is the ceiling:
- **Railway → service → Metrics**: CPU (one core saturating = the cap), memory, restarts.
- **Postgres**: `SELECT count(*) FROM pg_stat_activity;` — if it pins at ~30, requests
  are queuing on the pool (`DB_POOL_ACQUIRE_MS` timeouts → 500s under load).
- **p95/p99 vs p50**: a p50 of 56 ms with a high p95 means a heavy tail (pool waits).
  Report p95/p99 too — reviewers will ask.

If you need beyond ~1 instance: add the Socket.IO Redis adapter + multiple replicas
(see the scaling notes from the architecture review).
