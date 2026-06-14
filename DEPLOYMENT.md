# Deployment Guide

HOMi is a monorepo:

| Part      | Path      | Hosts on | Build / run                          |
| --------- | --------- | -------- | ------------------------------------ |
| Backend   | `server/` | Railway  | Nixpacks → `npm start` (`tsx`)       |
| Frontend  | `client/` | Vercel   | `vite build` → static `dist/`        |

Deploys are **push-to-deploy**: Railway and Vercel each watch the GitHub repo and
redeploy automatically on every push to `main`. GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml))
runs the server tests and the client build as a gate on every push and PR.

External services you must provision: **PostgreSQL** (Railway plugin) and an
**Upstash Redis** database (the server config requires the Upstash REST URL/token
to boot). Optional: SMTP (email), Google OAuth, Paymob, Gemini.

---

## 1. Backend — Railway

1. **Create the project**: [railway.com](https://railway.com) → *New Project* →
   *Deploy from GitHub repo* → select this repo.
2. **Set the service root**: open the service → *Settings* → **Root Directory** =
   `server`. Railway reads [server/railway.json](server/railway.json) from there
   (start command `npm start`, health check `GET /health`).
3. **Add PostgreSQL**: *New* → *Database* → *Add PostgreSQL*. Then in the API
   service *Variables*, reference the DB URL:
   `DATABASE_URL = ${{ Postgres.DATABASE_URL }}`.
   > The server enables SSL automatically when `NODE_ENV=production` + `DATABASE_URL`.
   > On boot it runs `sequelize.sync` and seeds reference data — no manual migration step.
4. **Add Upstash Redis**: create a database at [upstash.com](https://upstash.com)
   (or via the Railway template) and copy its **REST URL** and **REST token**.
5. **Set environment variables** (*Variables* tab) — see
   [server/.env.example](server/.env.example) for the full list. Minimum for prod:

   ```
   NODE_ENV=production
   DATABASE_URL=${{ Postgres.DATABASE_URL }}
   CORS_ORIGINS=https://<your-app>.vercel.app
   JWT_SECRET=<openssl rand -hex 32>
   JWT_REFRESH_SECRET=<openssl rand -hex 32>
   ENCRYPTION_KEY=<openssl rand -hex 32>          # 64 hex chars
   REDIS_ENABLED=true
   UPSTASH_REDIS_REST_URL=<from Upstash>
   UPSTASH_REDIS_REST_TOKEN=<from Upstash>
   CLIENT_URL=https://<your-app>.vercel.app
   ```

   Do **not** set `PORT` — Railway injects it and the server reads it.
   Add SMTP_*, VITE-side Google OAuth, Paymob, and Gemini vars if those features
   are used.
6. **Generate a domain**: *Settings* → *Networking* → *Generate Domain*. Note the
   URL, e.g. `https://homi-api.up.railway.app`. You'll feed this to the frontend.

---

## 2. Frontend — Vercel

1. **Import the repo**: [vercel.com](https://vercel.com) → *Add New* → *Project* →
   import this repo.
2. **Set the root**: **Root Directory** = `client`. Framework preset auto-detects
   *Vite*. [client/vercel.json](client/vercel.json) pins the build command and adds
   the SPA rewrite (so React Router deep links resolve to `index.html`).
3. **Environment variables** (*Settings* → *Environment Variables*) — see
   [client/.env.example](client/.env.example):

   ```
   VITE_API_BASE_URL=https://homi-api.up.railway.app/api   # NOTE the trailing /api
   VITE_GOOGLE_CLIENT_ID=<your google oauth client id>     # if using Google sign-in
   ```

   > Socket.IO derives its origin by stripping `/api`, so the value must end in `/api`.
4. **Deploy**. Vercel gives you a URL like `https://homi.vercel.app`.

---

## 3. Wire the two together

After both are live, make sure each knows the other's URL:

- **Railway** `CORS_ORIGINS` (and `CLIENT_URL`) = the Vercel URL. Multiple origins
  are comma-separated. This drives both Express CORS and Socket.IO CORS.
- **Vercel** `VITE_API_BASE_URL` = the Railway URL **+ `/api`**.

Changing a Railway variable redeploys automatically. Changing a Vercel variable
requires a redeploy (*Deployments* → *Redeploy*) since `VITE_*` values are baked
into the build.

If you later add a custom domain, also set `WEBAUTHN_RP_ID` (host, no scheme) and
`WEBAUTHN_ORIGIN` (full URL) on Railway for passkeys.

---

## 4. CI/CD

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on every push to `main`
and every PR:

- **`server` job** — `npm ci` + `npm test` (Vitest, 97 tests, DB fully mocked so
  no Postgres needed in CI). **Blocking.**
- **`client` job** — `npm ci`, then `typecheck` and `lint` (informational,
  non-blocking — the project has known pre-existing findings), then
  `npm run build` (**blocking** — the production bundle must compile).

Deployment itself is handled by Railway's and Vercel's native GitHub integrations,
not by Actions, so no deploy tokens/secrets live in GitHub.

**Recommended:** add a branch-protection rule on `main` requiring the `server` and
`client` checks to pass before merge (*GitHub → Settings → Branches*).

---

## 5. Post-deploy smoke test

```bash
curl https://homi-api.up.railway.app/health        # -> { success: true, ... }
```

Then open the Vercel URL, register/log in, and confirm API calls and the chat
(Socket.IO) work — those exercise CORS, the DB, and Redis end to end.

## Notes / known follow-ups

- The client has ~111 pre-existing TypeScript errors (mostly unused vars). The
  production build intentionally uses `vite build` (esbuild, no type-check) so they
  don't block deploys; run `npm run typecheck` in `client/` to see them.
- `tsx` was moved to `dependencies` so the server runs TypeScript directly in
  production without a compile step.
