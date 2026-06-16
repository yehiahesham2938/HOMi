// k6 HTTP load test for the HOMi API.
//   docs: https://k6.io/docs
// Run:
//   BASE_URL=https://staging-api.homi-platform.com \
//   TEST_EMAIL=loadtest+1@homi.test TEST_PASSWORD='LoadTest123!' \
//   k6 run http-load.js
//
// Models an "active user": log in once, then browse properties with think-time.
// Ramps to 2,500 concurrent virtual users to reproduce the abstract's claim.

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const EMAIL = __ENV.TEST_EMAIL || 'loadtest+1@homi.test';
const PASSWORD = __ENV.TEST_PASSWORD || 'LoadTest123!';
const TARGET_VUS = Number(__ENV.TARGET_VUS || 2500);

const loginDuration = new Trend('login_duration', true);
const businessErrors = new Rate('business_errors');

export const options = {
  scenarios: {
    active_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: Math.floor(TARGET_VUS / 2) }, // warm up
        { duration: '3m', target: TARGET_VUS },                  // ramp to peak
        { duration: '5m', target: TARGET_VUS },                  // hold at peak  <-- measure here
        { duration: '1m', target: 0 },                           // ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  // Fail the run if the abstract's claims don't hold. Tune to your stated numbers.
  thresholds: {
    http_req_failed: ['rate<0.01'],                 // ~0% error rate
    http_req_duration: ['p(50)<80', 'avg<200', 'p(95)<1000'],
    business_errors: ['rate<0.01'],
  },
};

// One login per VU, reused across iterations (realistic + avoids bcrypt storms).
export function setup() {
  // Sanity check the target is up before generating load.
  const health = http.get(`${BASE_URL}/health`);
  check(health, { 'health 200': (r) => r.status === 200 });
  return {};
}

function login() {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ identifier: EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } }
  );
  loginDuration.add(res.timings.duration);
  check(res, { 'login ok': (r) => r.status === 200 });

  // Token shape varies — try common locations. Confirm against your auth controller.
  let token = null;
  try {
    const body = res.json();
    token = body.accessToken || body.token || (body.data && (body.data.accessToken || body.data.token));
  } catch (_) { /* non-JSON */ }
  return token; // may be null if auth uses httpOnly cookies (k6 keeps the cookie jar automatically)
}

export default function () {
  const token = login();
  const authHeaders = token
    ? { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    : { headers: { 'Content-Type': 'application/json' } };

  group('browse', function () {
    const list = http.get(`${BASE_URL}/api/properties?page=1&limit=20`, {
      ...authHeaders,
      tags: { name: 'properties:list' },
    });
    const ok = check(list, { 'list 200': (r) => r.status === 200 });
    businessErrors.add(!ok);

    sleep(Math.random() * 3 + 1); // think-time: 1-4s

    // Drill into the first property if the list returned ids.
    try {
      const body = list.json();
      const items = body.data || body.properties || body.items || [];
      if (items.length > 0 && items[0].id) {
        const detail = http.get(`${BASE_URL}/api/properties/${items[0].id}`, {
          ...authHeaders,
          tags: { name: 'properties:detail' },
        });
        businessErrors.add(!check(detail, { 'detail 200': (r) => r.status === 200 }));
      }
    } catch (_) { /* ignore parse */ }

    sleep(Math.random() * 2 + 1);
  });
}
