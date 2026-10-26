// Client-side QR rewards ledger and verification for smart bin green-item deposits.
// Persists verified +25 reward claims and transactions per registered Firebase UID.

export type QrRewardPayload = {
  type: "WASTEWISE_REWARD";
  code: string;
  points: number;
  item: string;
  bin: string;
  timestamp: number;
};

export type QrClaimResult =
  | { success: true; points: number; item: string; code: string; totalPoints: number }
  | { success: false; error: string };

const LISTENERS = new Set<() => void>();

export function subscribeQrRewards(cb: () => void) {
  LISTENERS.add(cb);
  return () => {
    LISTENERS.delete(cb);
  };
}

function notify() {
  for (const cb of LISTENERS) {
    try {
      cb();
    } catch {
      // ignore listener errors
    }
  }
}

/** Generates a fresh +25 points reward payload for a green waste item deposit. */
export function createRewardPayload(item = "Green item deposit", bin = "wet"): QrRewardPayload {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  const time = Date.now().toString(36).toUpperCase();
  const code = `WW-GRN-${time}-${rand}`;
  return {
    type: "WASTEWISE_REWARD",
    code,
    points: 25,
    item,
    bin,
    timestamp: Date.now(),
  };
}

/** Parses QR code string safely (JSON or string code). */
export function parseRewardPayload(raw: string): QrRewardPayload | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const data = JSON.parse(trimmed) as Partial<QrRewardPayload>;
    if (data && data.type === "WASTEWISE_REWARD" && typeof data.code === "string" && typeof data.points === "number") {
      return {
        type: "WASTEWISE_REWARD",
        code: data.code,
        points: data.points || 25,
        item: data.item || "Green item deposit",
        bin: data.bin || "wet",
        timestamp: data.timestamp || Date.now(),
      };
    }
  } catch {
    // If it's a raw code string starting with WW-
    if (/^WW-(?:GRN|GREEN)-/i.test(trimmed)) {
      return {
        type: "WASTEWISE_REWARD",
        code: trimmed,
        points: 25,
        item: "Green item deposit",
        bin: "wet",
        timestamp: Date.now(),
      };
    }
  }
  return null;
}

/** Returns the local bonus points accumulated for the signed-in user. */
export function getLocalBonusPoints(uid?: string | null): number {
  if (!uid || typeof window === "undefined") return 0;
  try {
    const val = localStorage.getItem(`wastewise_qr_points_${uid}`);
    const num = Number(val);
    return Number.isFinite(num) && num >= 0 ? num : 0;
  } catch {
    return 0;
  }
}

/** Returns the local list of claimed QR reward transactions. */
export function getLocalRewardTransactions(uid?: string | null): Array<Record<string, unknown>> {
  if (!uid || typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`wastewise_qr_txs_${uid}`);
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** Validates and claims a +25 point QR code for a registered user. */
export function claimQrReward(uid: string | null | undefined, rawInput: string): QrClaimResult {
  if (!uid) {
    return {
      success: false,
      error: "You must be signed in with a registered account to claim reward points.",
    };
  }

  const payload = parseRewardPayload(rawInput);
  if (!payload) {
    return {
      success: false,
      error: "Invalid QR code. Please scan a valid WasteWise smart bin reward code.",
    };
  }

  const claimedKey = `wastewise_qr_claimed_${uid}`;
  const pointsKey = `wastewise_qr_points_${uid}`;
  const txsKey = `wastewise_qr_txs_${uid}`;

  try {
    const claimedRaw = localStorage.getItem(claimedKey);
    const claimedSet: string[] = JSON.parse(claimedRaw || "[]");
    if (claimedSet.includes(payload.code)) {
      return {
        success: false,
        error: "This QR code has already been claimed for your account.",
      };
    }

    // Award +25 points
    const currentPoints = getLocalBonusPoints(uid);
    const newPoints = currentPoints + payload.points;
    claimedSet.push(payload.code);

    const txs = getLocalRewardTransactions(uid);
    const newTx = {
      id: `tx-${payload.code}`,
      amount: payload.points,
      points: payload.points,
      description: `Smart bin deposit: ${payload.item}`,
      kind: "smart_bin_reward",
      createdAt: new Date().toISOString(),
      timestamp: Date.now(),
    };
    txs.unshift(newTx);

    localStorage.setItem(claimedKey, JSON.stringify(claimedSet));
    localStorage.setItem(pointsKey, String(newPoints));
    localStorage.setItem(txsKey, JSON.stringify(txs));

    notify();

    return {
      success: true,
      points: payload.points,
      item: payload.item,
      code: payload.code,
      totalPoints: newPoints,
    };
  } catch (err) {
    return {
      success: false,
      error: "Unable to save your reward points locally. Please try again.",
    };
  }
}
