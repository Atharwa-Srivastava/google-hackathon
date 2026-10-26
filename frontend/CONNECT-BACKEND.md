# Connect the frontend once, then change only the backend base URL

Frontend: `D:\google-hackathon - UI\MAGIC-WASTE-frontend`.
Backend: `D:\google-hackathon - UI\wastewise`.

## Local use

Start the existing backend on port 4173. In this frontend folder:

```powershell
npm run install:ci
# .env is already configured for the local backend in this clone.
npm run check:connection
npm run dev -- --port 5186
```

Open http://localhost:5186. The frontend server calls the backend; the browser calls
same-origin `/api/wastewise/*` and `/vision/*`. Do not change individual components,
API functions, model URLs, or CORS rules when moving the backend.

On Windows, double-click `Start-Frontend.cmd` after installing dependencies. Keep
its window open while using the app. Stop it with Ctrl+C before restarting.

## When the backend is hosted

Change this one line in the frontend server's `.env`:

```dotenv
WASTEWISE_API_BASE_URL=https://YOUR-BACKEND-HOST
```

Restart the frontend. On a deployment platform change the same runtime environment
variable and restart/redeploy there. A trailing `/api` is also accepted. Reverse-proxy
path prefixes are preserved. Invalid or missing configuration returns a clear 503
instead of silently connecting to somebody else's tunnel.

Everything uses this base: config, rules, catalog, classify, photo/text/live analysis,
rewards, transactions, bin sessions, history, member provisioning, and model assets.
Existing client-side tracker scripts remain frontend assets and fetch their model
files through `/vision/*`, which forwards to the selected backend.

The new backend must implement the same API contract. Moving an existing deployment
also requires retaining/migrating its reward/history database and credentials. A new
empty database cannot recover the old deployment's users or history from a URL.

## Sign-in and per-user data: one-time setup

Firebase settings were not included in the public Git clone. Set the four
`WASTEWISE_FIREBASE_*` fields from the existing Firebase project's public web config.
Use the same Firebase project as your friend's app to retain login identities.
The local frontend's ignored `.env` has been configured with the existing backend's
reward admin credential. Do not paste that secret into browser code or Git.

History/rewards require a verified Firebase session and the local D1 member mapping.
Each signed-in user is mapped once to their own backend member token. Keep that D1
database persisted/backed up (`.wrangler/state` locally, a real DB binding in production).
Public sorting/config/rules/catalog/model downloads do not require Firebase.

If you intentionally move to an independent backend, provision/migrate its accounts
appropriately; don't reuse an admin credential for a different deployment blindly.

## Runtime

This is a Vinext + Cloudflare Workers frontend; use `npm run dev` with the included
Vite/Cloudflare configuration. Do not execute its Workers route files with plain
Node or use the backend's `node server.mjs` command here. Its server-only
`cloudflare:workers` imports require the Workers runtime. The separate backend is
the Node server. These are two different processes.

## Verification

`npm test` includes API/model base-URL switching, path prefixes, missing configuration,
JSON errors, account isolation, rewards and history checks. `npm run check:connection`
checks actual public backend endpoints. The proxy refuses redirects and HTML ngrok
interstitials instead of parsing them as successful AI responses.
