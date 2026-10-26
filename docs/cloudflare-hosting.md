# Cloudflare production deployment

Frontend: https://ecotracker.hypenn.xyz
API: https://ecotracker-api.hypenn.xyz
Persistent storage: Cloudflare D1 `ecotracker-data`. The backend and frontend bind the same database to different binding names; their tables are separate.

GitHub repository: Atharwa-Srivastava/google-hackathon
Deployment branch: deploy-cloudflare

## Automatic builds
Create a separate Workers GitHub build connection for each Worker, using that repository and branch:

| Worker | Root directory | Build command | Deploy command |
|---|---|---|---|
| ecotracker-api | repository root | npm run build:cloudflare | npx wrangler@4.92.0 deploy |
| ecotracker | frontend | npm run build:cloudflare | npx wrangler deploy --config .cloudflare/wrangler.json |

The backend build copies allowlisted static assets into `.cloudflare/assets`; model binaries are served as assets rather than embedded in the Worker bundle. The frontend build derives a standalone configuration from the framework output and `cloudflare.deploy.json`; it does not change the original Sites identity.

Secrets are stored in Cloudflare's runtime secret store, not GitHub source or build variables. Backend: APINEX_API_KEY, REWARDS_ADMIN_KEY (and GOOGLE_API_KEY if used). Frontend: WASTEWISE_REWARDS_ADMIN_KEY. Firebase's public web config must be supplied through WASTEWISE_FIREBASE_API_KEY, WASTEWISE_FIREBASE_AUTH_DOMAIN, WASTEWISE_FIREBASE_PROJECT_ID and WASTEWISE_FIREBASE_APP_ID. Add ecotracker.hypenn.xyz to Firebase Authentication's authorized domains.

The first deployment imported a consistent snapshot of the local backend SQLite database, including existing account hashes, bins and history. Keep the original database as a backup. Do not rerun the import against a populated production database. No frontend Firebase/member mappings existed in this local clone; existing identities require the original Firebase project and any mappings from the original deployment.

Free hosting has usage quotas and does not include AI provider charges. Never change to paid plans without approval. No laptop or ngrok is needed for the Cloudflare deployment.
GitHub build connections are configured for both Workers. Pushes to deploy-cloudflare trigger production builds; preview builds are disabled.

Firebase runtime configuration is installed for the existing project hackathon-b4119. Its owner must add ecotracker.hypenn.xyz under Authentication -> Settings -> Authorized domains for Google popup/redirect sign-in. The signed-in Cloudflare owner's Google account does not have permission to change that Firebase project. Do not create a replacement Firebase project unless intentionally migrating user identities.
