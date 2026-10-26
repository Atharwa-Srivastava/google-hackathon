"use client";

// Bin station (DLC): a camera at the bin watches each item as it is deposited and says, live,
// whether it belongs in this bin. Uses the same on-device detector as the live scanner
// (public/live-detector.js, TensorFlow.js in the browser), so decisions take milliseconds.
// When an accepted/green item is captured, generates an interactive +25 pts QR code with a green background for 15s.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCheck,
  Copy,
  Leaf,
  LoaderCircle,
  Pause,
  QrCode,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import { BINS, rewardsApi, type DisposalBin } from "../lib/wastewise";
import { decide, type Detected, type Verdict } from "../lib/dlc-rules";
import { createRewardPayload, claimQrReward } from "../lib/qr-rewards";
import { useAuth } from "./auth-gate";
import { useLanguage } from "../lib/i18n";

type Detector = { start(): void; stop(): void };

const HOLD_MS = 500; // item must be seen steadily this long before a decision
const RESET_MS = 2200; // then the station resets for the next item (as in the DLC engine)
const QR_EXPIRY_MS = 15000; // 15 seconds validity

// Complete standard campus bins so the station can be operated at any bin type
const CAMPUS_DEFAULT_BINS: DisposalBin[] = [
  { id: "bin-campus-wet", name: "Green Bin (Wet / Organic Waste)", category: "wet" },
  { id: "5de67379-6a6c-44e7-adec-e9a69805603b", name: "Blue Bin (Dry Recyclables)", category: "dry" },
  { id: "bin-campus-general", name: "Black Bin (General Waste)", category: "general" },
  { id: "bin-campus-special", name: "Red Bin (Special / E-Waste)", category: "special" },
  { id: "bin-campus-glass", name: "Purple Point (Glass Bottles & Jars)", category: "glass" },
];

export function DlcStation() {
  const { t } = useLanguage();
  const auth = useAuth();
  const uid = auth.status === "signedIn" ? auth.user.uid : null;

  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const detector = useRef<Detector | null>(null);
  const latest = useRef<Detected[]>([]);
  const candidate = useRef<{ key: string; since: number } | null>(null);
  const lockedUntil = useRef(0);
  const decided = useRef(new Set<string>()); // items already judged; judged again only after leaving the view
  const audio = useRef<AudioContext | null>(null);

  const [bins, setBins] = useState<DisposalBin[] | null>(null);
  const [binsError, setBinsError] = useState("");
  const [binId, setBinId] = useState("bin-campus-wet");
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [sound, setSound] = useState(true);
  const [counts, setCounts] = useState({ accept: 0, reject: 0 });

  // 15-second reward QR state
  const [qrReward, setQrReward] = useState<{
    code: string;
    dataUrl: string;
    points: number;
    item: string;
    expiresAt: number;
  } | null>(null);
  const [qrRemaining, setQrRemaining] = useState(15);
  const [quickClaimMsg, setQuickClaimMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const bin = bins?.find((b) => b.id === binId) || CAMPUS_DEFAULT_BINS[0];
  const binInfo = BINS.find((b) => b.id === bin?.category);

  useEffect(() => {
    rewardsApi.bins().then(
      (list) => {
        // Merge with full campus bins to ensure Green Bin and all categories are available
        const merged = [...list];
        for (const def of CAMPUS_DEFAULT_BINS) {
          if (!merged.some((m) => m.id === def.id || m.category === def.category)) {
            merged.push(def);
          }
        }
        setBins(merged);
        setBinId((id) => id || merged[0]?.id || "");
      },
      () => {
        // Fallback to complete campus default bins if offline
        setBins(CAMPUS_DEFAULT_BINS);
        setBinId("bin-campus-wet");
      },
    );
  }, []);

  const beep = useCallback(
    (ok: boolean) => {
      if (!sound) return;
      try {
        audio.current ??= new AudioContext();
        const ctx = audio.current,
          osc = ctx.createOscillator(),
          gain = ctx.createGain();
        osc.frequency.value = ok ? 880 : 220;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } catch {
        /* sound is optional */
      }
    },
    [sound],
  );

  const triggerRewardQr = useCallback(
    async (itemName = "Green waste item", binCat = bin?.category || "wet") => {
      try {
        const payload = createRewardPayload(itemName, binCat);
        const dataUrl = await QRCode.toDataURL(JSON.stringify(payload), {
          width: 220,
          margin: 2,
          color: {
            dark: "#052e16",
            light: "#ffffff",
          },
        });
        const expiresAt = Date.now() + QR_EXPIRY_MS;
        setQrReward({
          code: payload.code,
          dataUrl,
          points: 25,
          item: itemName,
          expiresAt,
        });
        setQrRemaining(15);
        setQuickClaimMsg("");
        setCopied(false);
      } catch {
        // ignore
      }
    },
    [bin?.category],
  );

  // 15-second countdown timer for QR
  useEffect(() => {
    if (!qrReward) return;
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((qrReward.expiresAt - Date.now()) / 1000));
      setQrRemaining(left);
      if (left <= 0) {
        setQrReward(null);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [qrReward]);

  const stop = useCallback(() => {
    detector.current?.stop();
    detector.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    latest.current = [];
    candidate.current = null;
    decided.current.clear();
    setRunning(false);
    setStarting(false);
    setVerdict(null);
  }, []);

  useEffect(() => {
    const hidden = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      stop();
    };
  }, [stop]);

  // Decision loop: an item must stay in view for HOLD_MS, then one verdict per item.
  useEffect(() => {
    if (!running || !bin?.category) return;
    const timer = setInterval(() => {
      const now = performance.now();
      if (now < lockedUntil.current) return;
      if (verdict && now >= lockedUntil.current) setVerdict(null);
      const visible = latest.current.filter((d) => !d.isNonWaste && (d.score ?? 0) >= 0.35);
      const visibleKeys = new Set(visible.map((d) => `${d.id ?? ""}:${d.label ?? ""}`));
      for (const k of decided.current) if (!visibleKeys.has(k)) decided.current.delete(k);
      const top = visible
        .filter((d) => !decided.current.has(`${d.id ?? ""}:${d.label ?? ""}`))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
      if (!top) {
        candidate.current = null;
        return;
      }
      const key = `${top.id ?? ""}:${top.label ?? ""}`;
      if (candidate.current?.key !== key) {
        candidate.current = { key, since: now };
        return;
      }
      if (now - candidate.current.since < HOLD_MS) return;
      const v = decide(bin.category as string, top);
      setVerdict(v);
      if (v.kind !== "check") {
        const k = v.kind;
        setCounts((c) => ({ ...c, [k]: c[k] + 1 }));
        beep(k === "accept");

        // When bin captures an accepted / green item, generate the +25 pts QR code for 15 seconds!
        if (k === "accept" || bin.category === "wet") {
          void triggerRewardQr(v.item, bin.category as string);
        }
      }
      decided.current.add(key);
      lockedUntil.current = now + RESET_MS;
      candidate.current = null;
    }, 100);
    return () => clearInterval(timer);
  }, [running, bin?.category, beep, verdict, triggerRewardQr]);

  async function start() {
    if (!bin) return;
    stop();
    setStarting(true);
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error("Camera access needs HTTPS or localhost and a browser with camera support.");
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 } },
        audio: false,
      });
      stream.current = media;
      const v = video.current!;
      v.srcObject = media;
      await v.play();
      setRunning(true);
      setStarting(false);
      setStatus("Loading on-device detector…");
      try {
        const url = `${window.location.origin}/live-detector.js`;
        const importModule = new Function("u", "return import(u)");
        const mod = (await importModule(url)) as { LiveARDetector: new (o: object) => Detector };
        if (!stream.current) return;
        const d = new mod.LiveARDetector({
          video: v,
          canvas: canvas.current,
          onStatus: (text: string) => setStatus(text),
          onDetect: (list: Detected[]) => {
            latest.current = list || [];
          },
        });
        detector.current = d;
        d.start();
      } catch (detectorErr) {
        console.warn("Could not load on-device detector:", detectorErr);
        setStatus("On-device detector unavailable · Camera active for scanning");
      }
    } catch (e) {
      const name = (e as Error).name;
      setError(
        name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access, then try again."
          : name === "NotFoundError"
            ? "No camera was found."
            : (e as Error).message,
      );
      stop();
    }
  }

  function handleQuickClaim() {
    if (!qrReward) return;
    if (!uid) {
      setQuickClaimMsg("You must be signed in with a registered account to claim +25 points.");
      return;
    }
    const res = claimQrReward(uid, qrReward.code);
    if (res.success) {
      setQuickClaimMsg(`✓ +25 points credited to your account! Total: ${res.totalPoints} pts.`);
      beep(true);
    } else {
      setQuickClaimMsg(res.error);
    }
  }

  function handleCopy() {
    if (!qrReward) return;
    navigator.clipboard.writeText(qrReward.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="dlc-station">
      <p className="muted">
        {t.dlcSubtitle}
      </p>

      {binsError && <p className="error">{binsError}</p>}
      {!bins && !binsError && (
        <p className="muted">
          <LoaderCircle className="spin" size={15} /> Loading bins…
        </p>
      )}

      {bins && bins.length > 0 && (
        <label className="dlc-bin-select">
          This station is at
          <select
            value={binId}
            onChange={(e) => {
              setBinId(e.target.value);
              setCounts({ accept: 0, reject: 0 });
            }}
            disabled={running}
          >
            {bins.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name || "Bin"}
                {b.category ? ` · ${BINS.find((x) => x.id === b.category)?.title || b.category}` : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      <div
        className={`camera-stage dlc-stage ${verdict ? `verdict-${verdict.kind}` : ""}`}
        style={{ aspectRatio: 4 / 3, ["--bin" as string]: binInfo?.color || "#94a3b8" }}
      >
        <video ref={video} playsInline muted />
        <canvas ref={canvas} />
        {!running && (
          <div className="camera-placeholder">
            <Camera size={44} />
            <h3>Bin station</h3>
            <p>{binInfo ? `Accepting ${binInfo.title.toLowerCase()} · ${binInfo.destination}` : "Choose a bin to start."}</p>
          </div>
        )}
        {running && binInfo && (
          <span className="dlc-accepting">
            <i style={{ background: binInfo.color }} /> Accepting {binInfo.title.toLowerCase()}
          </span>
        )}
        {verdict && (
          <div className={`dlc-verdict ${verdict.kind}`} role="status" aria-live="assertive">
            {verdict.kind === "accept" ? <CheckCheck size={34} /> : verdict.kind === "reject" ? <X size={34} /> : <LoaderCircle size={30} />}
            <strong>{verdict.kind === "accept" ? "Accepted" : verdict.kind === "reject" ? "Wrong bin" : "Check item"}</strong>
            <span>{verdict.item}</span>
            <small>{verdict.message}</small>
          </div>
        )}
      </div>

      <div className="dlc-controls">
        <button className="button dark full" disabled={starting || !bin} onClick={running ? stop : start}>
          {starting ? (
            <LoaderCircle className="spin" size={18} />
          ) : running ? (
            <Pause size={18} />
          ) : (
            <Camera size={18} />
          )}{" "}
          {starting ? t.openingCamera : running ? t.stopStation : t.startStation}
        </button>

        <button
          className="button light"
          type="button"
          onClick={() => void triggerRewardQr("Banana peel (Wet waste)", bin?.category || "wet")}
          title="Simulate capturing a green waste item to test generating the 15-second reward QR code"
        >
          <Sparkles size={16} /> {t.testGreenItemBtn}
        </button>

        <button
          className="icon-button"
          onClick={() => setSound((s) => !s)}
          aria-label={sound ? "Mute beeps" : "Turn beeps on"}
          type="button"
        >
          {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
        </button>
      </div>

      {running && <p className="detector-status">{status}</p>}
      {(counts.accept > 0 || counts.reject > 0) && (
        <p className="dlc-counts">
          <span className="ok">✓ {counts.accept} accepted</span>
          <span className="no">✕ {counts.reject} redirected</span>
        </p>
      )}

      {/* 15-second Green Reward QR Code Section */}
      {qrReward && (
        <div className="dlc-green-qr-card" role="region" aria-label="Smart Bin Reward QR Code">
          <div className="qr-header-row">
            <div className="qr-badge">
              <Leaf size={16} />
              <span>{t.rewardAvailable}</span>
            </div>
            <div className="qr-timer-pill">
              <span>⏳ {qrRemaining}s</span>
            </div>
            <button
              className="qr-dismiss-btn"
              onClick={() => setQrReward(null)}
              aria-label="Dismiss QR code"
              type="button"
            >
              <X size={16} />
            </button>
          </div>

          <div className="qr-progress-track">
            <div
              className="qr-progress-bar"
              style={{ width: `${(qrRemaining / 15) * 100}%` }}
            />
          </div>

          <div className="qr-body-row">
            <div className="qr-image-wrapper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrReward.dataUrl} alt="Reward QR Code" width={180} height={180} className="qr-code-img" />
            </div>

            <div className="qr-details-col">
              <h4>Green Item Deposit Verified!</h4>
              <p className="qr-item-name">{qrReward.item}</p>
              <p className="qr-instruction">
                {t.scanInRewardsNote}
              </p>
              <p className="qr-expiry-note">{t.disappearsIn} {qrRemaining}s.</p>

              <div className="qr-action-buttons">
                {uid ? (
                  <button className="button light small" type="button" onClick={handleQuickClaim}>
                    <CheckCheck size={14} /> {t.quickClaimBtn}
                  </button>
                ) : (
                  <span className="qr-auth-notice">{t.signInRequiredAlert}</span>
                )}
                <button className="button light small" type="button" onClick={handleCopy}>
                  <Copy size={14} /> {copied ? t.copied : t.copyCodeBtn}
                </button>
              </div>

              {quickClaimMsg && <p className="qr-quick-claim-feedback">{quickClaimMsg}</p>}
            </div>
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}
      <p className="privacy-note">
        Detection runs entirely in your browser; camera frames are not uploaded.
      </p>
    </div>
  );
}
