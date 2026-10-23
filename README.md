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

Greenfield Campus is fictional. No real local guide was supplied. `dist/catalog.js` contains a clearly labeled sample guide and 141 curated household entries, including 34 electronics, batteries and bulbs; replace it with approved local policy before real use. The app scans up to 30 visible object groups. Hidden or unsupported objects stay uncertain. Clear supported results receive exact guide passages and save automatically; corrections update only the relevant entry. Use **Try a mixed pile demo** to test without an API key.

The backend limits image request size and applies a basic per-instance request limit. This is a prototype limit, not a distributed production quota system.

## Live camera scans & Real-Time AR HUD

Choose **Live scan**, then **Start scan** and allow camera access. The app activates an in-browser **live waste overlay**:
- **Instant Object Identification:** Supported litter classes are detected on-device using WebGL. Detection starts after model download and warm-up; actual speed varies by device.
- **Dustbin Reticles & Floating Tags:** Renders a color-coded bounding box and a floating pill tag indicating the waste type and bin destination:
  - 🟢 **Wet / Biodegradable Waste** (`#22c55e`) → Green Food Waste Bin
  - 🔵 **Dry Recyclable Waste** (`#3b82f6`) → Blue Recycling Bin
  - 🟡 **General Waste** (`#eab308`) → Black / Grey Bin
  - 🔴 **Hazardous / E-Waste** (`#ef4444`) → Special Collection Desk
- **Dynamic Tracking & Exit Handling:** The tag smoothly tracks moving objects using exponential smoothing. As an item leaves the camera frame or is dropped into a bin, the tag is hidden on the next missing detection or after a short stale timeout.
- **Hybrid AI Fallback & Training Readiness:**
  - If an item is uncataloged or ambiguous, the live scan continues to capture snapshots for Gemini AI multi-item verification when you tap **Finish scan**.
  - Unsupported disposal rules receive a neutral Guide check label.

The live list is provisional. Each entry uses the largest observed count, not a sum across views; counts remain estimates. One scan should cover one waste pile. Finish stops the camera immediately, waits for any active analysis, then reconciles the first and seven most recent snapshots with earlier observations. Up to 30 groups are retained; hidden or unsupported objects remain uncertain. Corrections and removals persist across further analyses.

Scans, results, and up to eight JPEG photo Blobs save in the `wastewise-scans` IndexedDB database on the current device. Original photo/text history stays in its existing localStorage key. Scan history offers review, resume, corrections, and deletion of an entire scan and its photos. Switching tabs, navigating to History/Guide or backgrounding the page stops the camera and pauses scanning. Interrupted scans can be reopened from My history. Storage failure pauses capture and reports that results were not saved. Three consecutive analysis failures pause scanning; final-analysis failures preserve a partial result with retry.

The same server endpoint accepts optional `mode: live-frame` with one `photo`, or `mode: live-final` with up to eight `photos`, plus up to 30 descriptive `observations`. Both AI providers accept multiple image parts. All guide prompts and credentials stay server-side. Per-photo compression caps snapshots at 960px and 180KB, within the existing 3MB request limit. No cloud photo archive is created.

`npm test` covers merge/deduplication, corrections, timing, concurrency, failure/retry, storage-pause behavior and server/provider contracts. For deterministic browser tests, run `node tests/browser-server.mjs` and visit http://127.0.0.1:4174 (synthetic camera and mock AI only). Query options `?denied=1`, `?storage=1`, `?slow=1`, `?fail=1` exercise error paths. These fixture routes/scripts are not included in production assets. Real Android Chrome and iPhone Safari camera behavior still needs a physical-device check.

## Local waste tracking
The AR overlay uses the MIT-licensed Trash AI YOLOv5/TACO graph (opensacorg/trash-ai, revision a11de7cb60bfb21399f64c57e48384a61a5044f7), loaded on-device through TensorFlow.js 4.22.0. Attribution and license: licenses/trash-ai-MIT.txt. First use downloads approximately 29 MB of weights from the pinned upstream repository; camera images are not sent there. This is a 60-class litter detector, not a universal waste recognizer. People, hands, furniture and normal objects have no permitted tag mapping. Unknown or unsupported disposal classes remain neutral. No model can guarantee zero false positives.
Tags use stable per-object IDs, spatial matching, first-response tags, time-based smoothing, object-fit cover projection, tolerance for brief missed detections, and stale expiry. Camera capture requests 60 FPS where supported; overlay redraw targets the display refresh rate. Actual inference/display rates depend on hardware and are shown live. Inference is independent of the eight-second cloud verification and saved-photo sampling. Tags follow only currently visible detections; history preserves earlier discoveries.

New tags need a score of 0.30. Scores down to 0.18 may maintain an existing track. Scores below 0.55 are labeled Possible and remain uncertain in saved observations. Tags tolerate brief misses and expire after repeated absence or stale evidence. Remaining packaging classes receive neutral guide-check tags instead of being silently discarded. Run the local fixture and open /model-probe for real upstream litter photographs with the actual model and video-overlay pipeline (no mocked detections).

### Stable household tracking
The local ensemble now includes the Apache-2.0 TensorFlow.js COCO-SSD lite MobileNet v2 model, supplementing the litter model with produce and generic bottle/cup detection. Source: https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd . Its license is retained in licenses/tensorflow-models-Apache-2.0.txt. Only an explicit waste-relevant whitelist reaches the overlay. Fresh produce remains tentative and says if discarded. Generic cups and bottles do not receive an invented material or disposal rule. The new model adds approximately 17 MB on first use, in addition to the 29 MB litter model. This uses existing trained models, not a newly trained dataset or a claim of universal recognition.

Detection runs in a dedicated worker with OffscreenCanvas when supported, with a compatibility fallback. Pixel buffers stay on-device. Small appearance patches track position between neural responses, including through short missed detections. Label hysteresis prevents a single conflicting class from changing the tag. Weak detections can maintain an existing track but cannot spawn one. Visual loss removes a tag after a short confirmation period. Unconfirmed tracks have a bounded grace period and all tracks expire without fresh evidence.

The existing live-frame request additionally asks Gemini for individual normalized boxes for household waste, including banana/orange peels, cardboard and pizza boxes. This uses the configured server key, the same snapshot cadence and the existing single-request limit, not a second request queue. Returned boxes pass a whitelist and coordinate checks, then replay up to 14 seconds of bounded device-local camera history before attaching to the current view. Old responses, scene changes and scan-generation changes are discarded. Visually confirmed Gemini tracks can bridge local model misses and refresh in unchanged views. These tags depend on network/provider response time and cannot be instant. Final disposal results still cite the sample guide; unsupported items remain uncertain. No model can guarantee detection of every waste item.

Additional catalog entries use existing guide rules: Orange peel, Paper bag, Cardboard egg carton, Rigid plastic container and Plastic bottle cap. Pizza boxes still need their condition confirmed.

For browser regression checks, /model-probe uses actual model inference on public litter photos. The Simulate two missed detections button drops two of every three neural results to check tag persistence. Remove waste tests disappearance. Household fixture photos are from the CC BY 4.0 dataset linked by https://github.com/PhucHuwu/YOLOv8_Detecting_and_Classifying_Waste (dataset.v2i.yolov8, Roboflow project phan-vn-khi/dataset-usskc, version 2). The Ask Gemini button uses the local server key only and exercises actual bounding-box responses on these public test images. The fixture and probe routes are never published. Run node scripts/probe-live-tags.mjs [public-image-url] for a controlled API probe without printing credentials.
## Expanded household library and management plans

The Disposal guide has a searchable 141-item catalog and a JSON download. Exact item names, materials, families and existing sample-guide mappings are shared with the server prompt. Twenty-one uncovered items retain their identity but require a collection check. This is a curated knowledge catalog, not an annotated image dataset or a newly trained camera model.

Photo, text and live results show a grouped management plan with supporting guide passages. Plans recompute after corrections and when reviewing saved results. Composting and electronics reuse information is separately labelled general education with EPA source links; it does not change local collection rules. Try **Try household & e-waste demo** to exercise mixed cardboard, electronics and compostable scraps without using an API key.

The portable catalog is also checked into `data/wastewise-items.json`. `dist/catalog.js` is the application source of truth; keep the JSON export in sync when editing it.
