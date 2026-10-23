# WasteWise

Mobile-friendly waste sorting with single- and multiple-item photo recognition, guide citations, editable identifications and automatic browser-local history.

## Local API configuration

Open `.env` in this project and add your own key:

```dotenv
AI_PROVIDER=apinex
APINEX_API_KEY=your_apinex_key
APINEX_MODEL=free/gemini-3.8-flash
GOOGLE_API_KEY=
GOOGLE_MODEL=gemini-3.8-flash
```

Start with `npm start`, then open http://127.0.0.1:4173. Restart the server after changing `.env`. No dependency installation is needed; use Node.js 24 or later.

To use Google instead, set `AI_PROVIDER=google` and fill `GOOGLE_API_KEY`. Keys are selected on the server; visitors never enter them or receive them. Model IDs are editable to match the account's available models. Free availability is determined by Apinex.

`.env` is ignored by Git. `.env.example` contains blank placeholders and is tracked. Neither file is served to browsers. The server sends only the photo, description and supplied guide to the configured provider. Browser requests go to `/api/analyze`; credentials and provider requests stay server-side. History contains text results only, up to 100 entries on the current browser.

## Hosted website

The live Site uses a Worker backend. The local `.env` file is deliberately not bundled or deployed. Configure `APINEX_API_KEY` as a **secret runtime environment variable** in Sites and redeploy the saved version to apply it. Use the same environment variable names as `.env`; `AI_PROVIDER` defaults to `apinex`. To switch later, set `GOOGLE_API_KEY` as a secret and change `AI_PROVIDER` to `google`, then redeploy. Never place key values in `.openai/hosting.json`, public files, source commits or build output.

No key was supplied during implementation. The hosted site will show AI setup pending until a production key is configured. The local server will also remain pending until you populate `.env` and restart it. The sample demos remain usable meanwhile.

`npm run build` embeds public assets and server logic into `dist/server/index.js` and validates the Worker export. Build output uses runtime bindings, never values from `.env`. Run `npm test` for catalog, multi-item, provider-format and server tests. Hosted source packaging runs `node scripts/build-worker.mjs` and `node scripts/validate-artifact.mjs`.

## Prototype scope

Greenfield Campus is fictional. No real local guide was supplied. `dist/catalog.js` contains a clearly labeled sample guide and 20 supported common items; replace it with approved local policy before real use. The app scans up to 30 visible object groups. Hidden or unsupported objects stay uncertain. Clear supported results receive exact guide passages and save automatically; corrections update only the relevant entry. Use **Try a mixed pile demo** to test without an API key.

The backend limits image request size and applies a basic per-instance request limit. This is a prototype limit, not a distributed production quota system.

## Live camera scans

Choose **Live scan**, then **Start scan** and allow camera access. The app requests the rear camera with audio disabled. It samples useful views no more than once every eight seconds, skips nearly unchanged views, and allows only one frame-analysis request at a time. Scanning continues until you tap Finish; it does not record video.

The live list is provisional. Each entry uses the largest observed count, not a sum across views; counts remain estimates. One scan should cover one waste pile. Finish stops the camera immediately, waits for any active analysis, then reconciles the first and seven most recent snapshots with earlier observations. Up to 30 groups are retained; hidden or unsupported objects remain uncertain. Corrections and removals persist across further analyses.

Scans, results, and up to eight JPEG photo Blobs save in the `wastewise-scans` IndexedDB database on the current device. Original photo/text history stays in its existing localStorage key. Scan history offers review, resume, corrections, and deletion of an entire scan and its photos. Switching tabs, navigating to History/Guide or backgrounding the page stops the camera and pauses scanning. Interrupted scans can be reopened from My history. Storage failure pauses capture and reports that results were not saved. Three consecutive analysis failures pause scanning; final-analysis failures preserve a partial result with retry.

The same server endpoint accepts optional `mode: live-frame` with one `photo`, or `mode: live-final` with up to eight `photos`, plus up to 30 descriptive `observations`. Both AI providers accept multiple image parts. All guide prompts and credentials stay server-side. Per-photo compression caps snapshots at 960px and 180KB, within the existing 3MB request limit. No cloud photo archive is created.

`npm test` covers merge/deduplication, corrections, timing, concurrency, failure/retry, storage-pause behavior and server/provider contracts. For deterministic browser tests, run `node tests/browser-server.mjs` and visit http://127.0.0.1:4174 (synthetic camera and mock AI only). Query options `?denied=1`, `?storage=1`, `?slow=1`, `?fail=1` exercise error paths. These fixture routes/scripts are not included in production assets. Real Android Chrome and iPhone Safari camera behavior still needs a physical-device check.
