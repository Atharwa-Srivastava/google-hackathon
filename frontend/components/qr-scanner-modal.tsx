"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, CheckCheck, LoaderCircle, QrCode, Upload, Volume2, VolumeX, X } from "lucide-react";
import jsQR from "jsqr";
import { claimQrReward, type QrClaimResult } from "../lib/qr-rewards";
import { useLanguage } from "../lib/i18n";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onClaimed?: (points: number, item: string) => void;
  uid?: string | null;
  onRequireSignIn?: () => void;
};

export function QrScannerModal({ isOpen, onClose, onClaimed, uid, onRequireSignIn }: Props) {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number | null>(null);
  const scanningRef = useRef(false);

  const [mode, setMode] = useState<"camera" | "manual" | "upload">("camera");
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [claimStatus, setClaimStatus] = useState<QrClaimResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [processing, setProcessing] = useState(false);
  const [sound, setSound] = useState(true);

  const playChime = useCallback((success: boolean) => {
    if (!sound) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(success ? 587.33 : 220, ctx.currentTime); // D5 or A3
      if (success) {
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      }
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio is optional
    }
  }, [sound]);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleClaim = useCallback((codeString: string) => {
    if (processing) return;
    setProcessing(true);
    setErrorMsg("");

    if (!uid) {
      setErrorMsg("You must be registered and signed in to claim reward points.");
      playChime(false);
      setProcessing(false);
      return;
    }

    const res = claimQrReward(uid, codeString);
    if (res.success) {
      setClaimStatus(res);
      playChime(true);
      onClaimed?.(res.points, res.item);
      // Auto close after 2.5s
      setTimeout(() => {
        onClose();
      }, 2500);
    } else {
      setErrorMsg(res.error);
      playChime(false);
      setProcessing(false);
    }
  }, [uid, processing, onClaimed, onClose, playChime]);

  // Camera scan loop
  const tick = useCallback(() => {
    if (!scanningRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (width > 0 && height > 0) {
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          if (code && code.data && code.data.trim()) {
            stopCamera();
            handleClaim(code.data);
            return;
          }
        }
      }
    }
    animRef.current = requestAnimationFrame(tick);
  }, [stopCamera, handleClaim]);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError("");
    setErrorMsg("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera is unavailable on this device or connection.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        scanningRef.current = true;
        animRef.current = requestAnimationFrame(tick);
      }
    } catch (err) {
      const e = err as Error;
      setCameraError(
        e.name === "NotAllowedError"
          ? "Camera permission was denied. Please allow camera access or use code entry."
          : e.message || "Failed to start camera.",
      );
    }
  }, [stopCamera, tick]);

  useEffect(() => {
    if (isOpen && mode === "camera") {
      void startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, mode, startCamera, stopCamera]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  // Image upload decoding
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height);
        if (code && code.data) {
          handleClaim(code.data);
        } else {
          setErrorMsg("No readable QR code found in this image. Try another photo.");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function handleManualSubmit(e: FormEvent) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleClaim(manualCode.trim());
  }

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="qr-modal-title">
      <div className="modal-card qr-scanner-modal">
        <header className="qr-modal-header">
          <div className="qr-title-box">
            <span className="qr-badge-icon" aria-hidden="true">
              <QrCode size={20} />
            </span>
            <div>
              <h2 id="qr-modal-title">{t.qrModalTitle}</h2>
              <p className="muted">{t.qrModalSub}</p>
            </div>
          </div>
          <div className="header-actions">
            <button
              className="icon-button"
              onClick={() => setSound((s) => !s)}
              aria-label={sound ? "Mute audio" : "Unmute audio"}
              type="button"
            >
              {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button className="icon-button" onClick={onClose} aria-label="Close scanner" type="button">
              <X size={20} />
            </button>
          </div>
        </header>

        {!uid && (
          <div className="qr-unregistered-banner" role="alert">
            <p>
              {t.signInRequiredAlert}
            </p>
            {onRequireSignIn && (
              <button
                className="button dark small"
                onClick={() => {
                  onClose();
                  onRequireSignIn();
                }}
              >
                {t.signIn}
              </button>
            )}
          </div>
        )}

        {/* Tab switcher */}
        <div className="qr-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={mode === "camera"}
            className={`qr-tab ${mode === "camera" ? "active" : ""}`}
            onClick={() => {
              setMode("camera");
              setErrorMsg("");
            }}
          >
            <Camera size={15} /> {t.liveCameraTab}
          </button>
          <button
            role="tab"
            aria-selected={mode === "manual"}
            className={`qr-tab ${mode === "manual" ? "active" : ""}`}
            onClick={() => {
              setMode("manual");
              stopCamera();
              setErrorMsg("");
            }}
          >
            <QrCode size={15} /> {t.enterCodeTab}
          </button>
          <button
            role="tab"
            aria-selected={mode === "upload"}
            className={`qr-tab ${mode === "upload" ? "active" : ""}`}
            onClick={() => {
              setMode("upload");
              stopCamera();
              setErrorMsg("");
            }}
          >
            <Upload size={15} /> {t.uploadPhotoTab}
          </button>
        </div>

        {/* Success View */}
        {claimStatus && claimStatus.success && (
          <div className="qr-success-card" role="status" aria-live="assertive">
            <div className="qr-success-icon">
              <CheckCheck size={36} />
            </div>
            <h3>{t.awardedTitle}</h3>
            <p className="qr-success-item">{claimStatus.item}</p>
            <p className="qr-success-sub">
              {t.creditedMsg} Total: <strong>{claimStatus.totalPoints} {t.pointsUnit}</strong>
            </p>
            <span className="qr-verified-pill">{t.verifiedPill}</span>
          </div>
        )}

        {/* Camera View */}
        {!claimStatus && mode === "camera" && (
          <div className="qr-camera-container">
            <div className="qr-viewfinder">
              <video ref={videoRef} playsInline muted className="qr-video" />
              <canvas ref={canvasRef} style={{ display: "none" }} />
              <div className="qr-overlay-frame">
                <div className="viewfinder-corner top-left" />
                <div className="viewfinder-corner top-right" />
                <div className="viewfinder-corner bottom-left" />
                <div className="viewfinder-corner bottom-right" />
                <div className="qr-laser-line" />
              </div>
            </div>
            <p className="qr-hint">{t.alignQrHint}</p>
            {cameraError && (
              <div className="qr-error-box">
                <p>{cameraError}</p>
                <button className="text-link" onClick={() => setMode("manual")}>
                  Enter code manually instead
                </button>
              </div>
            )}
          </div>
        )}

        {/* Manual Code View */}
        {!claimStatus && mode === "manual" && (
          <form className="qr-manual-form" onSubmit={handleManualSubmit}>
            <label htmlFor="manual-reward-code">
              {t.manualCodeLabel}
            </label>
            <input
              id="manual-reward-code"
              type="text"
              placeholder="e.g. WW-GRN-XXXX-XXXX"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              disabled={processing}
              autoFocus
            />
            <button
              className="button dark full"
              type="submit"
              disabled={!manualCode.trim() || processing}
            >
              {processing ? <LoaderCircle className="spin" size={16} /> : <CheckCheck size={16} />} {t.claimPointsBtn}
            </button>
          </form>
        )}

        {/* Photo Upload View */}
        {!claimStatus && mode === "upload" && (
          <div className="qr-upload-box">
            <Upload size={36} className="muted" />
            <p>Upload a screenshot or photo of the smart bin QR code.</p>
            <label className="button light">
              Select Image File
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: "none" }}
              />
            </label>
          </div>
        )}

        {errorMsg && (
          <div className="qr-error-msg" role="alert">
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}
