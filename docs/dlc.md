# DLC: dry-bin camera station

Open **Home → DLC bin camera** or **Actions → DLC**. A laptop webcam stands in for a bin-mounted camera. Start once, allow camera access, wait for model warm-up, and keep the square empty for one second to calibrate. Then show one item, hold it still, and remove it before the next item. Use Reset empty view only with an empty square. Sound starts from the Start gesture; Test beep checks browser audio support.

Green signals a confident visible material match for this prototype's dry-bin policy. Red signals a wrong-bin item or an unverified object, with two short beeps when audio is enabled. Only empty, clean and dry paper/cardboard, supported rigid plastic packaging, and empty metal cans/tins qualify under sample guide rules R1–R3. Food, glass, batteries, textiles and mixed/flexible packaging do not. This is a fictional campus guide, not a universal municipal definition of dry waste. The camera cannot verify hidden contents or contamination; the user must meet preparation conditions.

## Runtime and safety gates

Video remains on the device. A dedicated worker runs a quantized MobileNetV2 feature model plus a ten-class material head and the existing TACO packaging detector. No Gemini network round trip is needed for DLC. The original photo, live-scan, text, history and API features remain separate. DLC does not award points or claim a physical deposit occurred.

Preview rendering stays on the main thread. Only one inference is in flight, with no backlog. Green requires two matching fresh observations, material-specific confidence, class margin and feature similarity gates. Plastic and metal also need packaging evidence; certain unsuitable detected objects override a dry-majority classification. Scene changes clear approval, stale results are rejected, and an unverified item becomes red at the two-second decision target. A slow device may fail closed rather than grant green. Model download/warm-up precedes that decision window. No universal speed or accuracy guarantee is made.

Camera tracks and the worker stop on Stop, closing DLC, page exit or backgrounding; returning requires another tap. Browsers need secure camera access, workers, OffscreenCanvas and WASM SIMD (current laptop Chrome/Edge recommended). HTTPS hosting or localhost is required for camera access. Audio may require Test beep depending on browser policy. Avoid direct sunlight, moving backgrounds, hands covering the object, multiple items and small distant objects. Real bin deployment requires field validation and hardware integration.

## Training provenance

User-provided `archive/standardized_256` yielded 12,259 images in ten classes. Exact byte duplicates: zero; cross-label duplicate conflicts: zero. Only one image variant was used. Dataset licensing remains the provider's responsibility; no raw archive images are redistributed by DLC. Existing benchmark demonstration samples are not an independent webcam test set.

Train: 8,581 images; validation: 1,839; test: 1,839. Seeds 413 and 414. StandardScaler and balanced multinomial logistic regression were fitted only on training features. Validation selected regularization, temperature, per-class confidence thresholds and feature-similarity cutoffs. Test classification accuracy: **90.76%**. Full class report, confusion matrix and limitations: `data/dlc-evaluation.json`. This measures material classification, not contamination, unknown-object rejection, disposal correctness or physical deposits. Near-duplicate leakage was not measured.

Backbone: ONNX Models MobileNetV2-12 QDQ, pinned revision `4c46cd00fbdb7cd30b6c1c17ab54f2e1f4f7b177`, Apache-2.0. Extracted 1,280-dimensional pooled output, approximately 2.3 MB. ONNX Runtime Web 1.20.1: MIT. Licenses are retained in `licenses/`. The runtime checks the model's SHA-256 against the material-head metadata before use. TACO packaging detector provenance remains in README.

Reproduce with Python dependencies `onnx==1.17.0`, `onnxruntime==1.20.1`, `scikit-learn==1.5.2`, Pillow, NumPy and SciPy:

```powershell
python scripts/prepare-dlc-backbone.py --output dist/dlc-backbone.onnx
python scripts/train-dlc.py --dataset ../archive/standardized_256 --model dist/dlc-backbone.onnx --work-dir ../dlc-training/retrain --output dist/dlc-head.json
```

Copy the newly produced `evaluation.json` to `data/dlc-evaluation.json` after retraining, verify the report and rerun checks before deployment. The training script never uploads the images. `tests/dlc-fixture.js` supplies a test-only canvas camera stream while running the actual browser models; fixture routes and controls are not published. Use it for controlled regression checks, not as proof of field accuracy.
