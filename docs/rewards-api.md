# Eco Tracker rewards and public-bin API

This backend runs with Node 24 and persistent SQLite. Existing analysis, catalog, rules and classification APIs remain available. Start from this project directory:

```powershell
node scripts/setup-rewards.mjs
npm start
```

Setup creates a server admin secret in `.env`, the SQLite database in `data/private/`, and a demo member plus dry-bin station in `data/private/rewards-onboarding.json`. All are ignored by Git. Back up this folder. Do not share the full onboarding file: the frontend receives only `account.token`; the trusted camera service receives only `station.stationKey` and `station.bin.id`. Setup is idempotent.

If a backend is already running, restart it once to load the new routes and database. Local URL is `http://localhost:4173`. When ngrok forwards that port, use `https://harness-action-entail.ngrok-free.dev` (provided that tunnel is still assigned to you). Remote phones cannot reach your laptop through their own `localhost`.

## Authentication and request headers

Send `Content-Type: application/json`, `x-api-client: wastewise`, `ngrok-skip-browser-warning: true`, and `Authorization: Bearer <token>`. CORS preflight supports those headers. Never put the admin secret, station key, or AI provider key in your friend's browser bundle. User bearer tokens grant access to their account; use HTTPS and your frontend's authenticated session storage. Existing app login integration should provision/map an account on your own trusted server and return only that member's token. This prototype provides admin-provisioned token accounts; password login and recovery are not implemented.

## Endpoints

| Method | Endpoint | Credential | Body / result |
|---|---|---|---|
| POST | `/api/rewards/accounts` | Admin | `{name}` → `{user,token,points}`. Token returned once. |
| GET | `/api/rewards/me` | Member | `{user,points,deposits}` from the persisted ledger |
| GET | `/api/rewards/transactions?before=<timestamp>` | Member | Up to 50 entries, newest first; use last `created_at` as next cursor |
| POST | `/api/dlc/bins` | Admin | `{name,category}` → `{bin,stationKey}` |
| GET | `/api/dlc/bins` | Public | `{bins:[{id,name,category}]}` |
| POST | `/api/dlc/sessions` | Member | `{binId}` → `{session:{id,binId,expiresAt,status},pointsPerDeposit:10}` |
| GET | `/api/dlc/sessions/:id` | Owning member | Current status and `awardedPoints` |
| POST | `/api/dlc/sessions/:id/cancel` | Owning member | `{}` → `{cancelled:true}` |
| POST | `/api/dlc/sessions/:id/events` | That bin's station | Camera event, described below |

Categories: `dry`, `wet`, `general`, `hazardous`, `glass`. The current DLC camera policy supports a dry-bin station. Other bin policies need corresponding camera acceptance logic.

## Frontend connection

Copy `src/services/rewards.ts` into your friend's TypeScript frontend:

```ts
import {createRewardsClient} from './rewards';
const api = createRewardsClient(
  'https://harness-action-entail.ngrok-free.dev',
  () => currentUser.rewardToken
);
const {bins} = await api.bins();
const {session} = await api.startSession(bins[0].id);
// Pass session.id to the matching bin station through its QR/pairing flow.
// Poll every 1–2 seconds while this screen is visible; stop on a terminal status.
const result = await api.session(session.id);
if (result.session.status === 'credited') {
  const account = await api.balance();
  displayPoints(account.points);
}
// Stop polling and cancel the session when the user leaves without depositing.
```

Do not increment points locally. Read the balance after confirmation, including after reload. Sessions expire after two minutes. One active session per bin prevents ambiguous credit ownership. A second visitor receives 409 until the current visitor finishes, cancels, or expires.

## Trusted camera service

The camera service must know the paired session ID and use its station key. First report a stable, accepted object:

```json
{
  "eventId": "unique-observation-uuid",
  "kind": "item_seen",
  "item": "Plastic bottle",
  "category": "dry",
  "accepted": true,
  "confidence": 0.92
}
```

This awards **zero** points. After tracking that object across the calibrated bin entry line and confirming the entry area clears, send within 15 seconds:

```json
{
  "eventId": "unique-deposit-uuid",
  "kind": "deposit_confirmed",
  "crossedDepositLine": true,
  "clearAfterDeposit": true
}
```

Response: `{status:"credited",awardedPoints:10,newCredit:true,verification:"trusted-camera-attestation"}`. A matching duplicate event returns `duplicate:true`; it never adds points twice. A session has at most one ledger credit, including concurrent requests. Server time enforces freshness. Wrong category, confidence below 0.8, missing observation, missing crossing/clear evidence, expired sessions and member-forged station events cannot earn points.

Use `examples/bin-station.mjs` from a trusted bin computer/service. Keep its token outside the public frontend. The shared laptop DLC currently proves a visible accepted-item decision; **its existing green signal does not establish that a deposit happened**. Wire the camera tracker's line-crossing/clear callbacks to this service before enabling real public rewards. Taking an object out of frame alone is insufficient. This backend validates the trusted station's attestation; it does not independently analyze video, prove physical deposits, or prevent a compromised station from lying. A calibrated camera or deposit sensor and field validation are needed for redeemable rewards.

## Errors and deployment

400 malformed request; 401 missing/wrong credential; 403 another member's session; 404 missing resource; 409 bin busy/ended session; 413 oversized event; 422 insufficient or wrong-bin evidence; 503 storage unavailable. Error shape: `{error:string}`. Retry network failures with the same event ID, and query session state to resolve uncertain submissions.

Local SQLite survives server restarts. Keep a single shared backend database for all teammates; separate copies do not synchronize. Hosted Cloudflare Worker deployment requires a persistent D1 binding named `REWARDS_DB`, initialized with `REWARD_SCHEMA` from `lib/rewards.js`, plus `REWARDS_ADMIN_KEY` as a server secret. The existing hosted site has not been provisioned with that database: new reward routes are ready locally, and must not be advertised as live there. No cloud memory fallback issues pretend credits.
