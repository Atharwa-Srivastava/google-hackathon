# Eco Tracker integrated prototype

Requires Node.js 24+. In this folder run:

```
npm ci
node scripts/setup-rewards.mjs
npm start
```

Open http://localhost:4173. Open Actions → Sort well. Earn rewards. Connect using the `account.token` from the generated `data/private/rewards-onboarding.json`. Only use a member token in the frontend. Each member needs their own provisioned account; the generated account is for demonstration.

The existing project on the original laptop already has a configured AI key. This shareable package intentionally contains no secrets. For a new installation, copy `.env.example` to `.env` and configure the desired AI provider key before photo analysis. Setup generates the reward admin key automatically. Keep the database folder backed up.

Rewards UI supports account connection, balances, transaction history, bin selection, deposit-session polling, cancellation, and session recovery after reload. The camera station integration is a separate trusted service: a visible accepted item alone cannot issue points. Connect real line-crossing and clear-after-deposit signals through examples/bin-station.mjs. Physical deposit tracking/hardware is not included or field-verified. Do not represent the current laptop green signal as verified physical disposal.

Full API integration: docs/rewards-api.md. Frontend API client: src/services/rewards.ts. Camera station API client: examples/bin-station.mjs. Database: SQLite on Node; Cloudflare deployment needs a REWARDS_DB D1 binding and schema initialization. Existing photo/text/live scanning features remain in this app. The separate hosted chatgpt.site deployment does not have reward storage provisioned.

For your friend's frontend, point the API client at your running shared backend/tunnel and provision a member token per account on a trusted server. If running this package independently, it creates a separate database and balances. Keep station/admin keys out of browsers. Your laptop and ngrok must remain running when using its tunnel.
