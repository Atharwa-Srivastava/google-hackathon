import test from "node:test";
import assert from "node:assert/strict";
import {
  createRewardPayload,
  parseRewardPayload,
  claimQrReward,
  getLocalBonusPoints,
  getLocalRewardTransactions,
} from "../lib/qr-rewards.ts";

// Mock localStorage for node test runner
const storage = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (k) => storage.get(k) ?? null,
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

test.beforeEach(() => {
  storage.clear();
});

test("createRewardPayload generates standard +25 reward format", () => {
  const p = createRewardPayload("Banana peel", "wet");
  assert.equal(p.points, 25);
  assert.equal(p.item, "Banana peel");
  assert.equal(p.bin, "wet");
  assert.match(p.code, /^WW-GRN-/);
});

test("parseRewardPayload parses JSON and raw code strings", () => {
  const payload = createRewardPayload("Apple core", "wet");
  const jsonStr = JSON.stringify(payload);
  const parsed = parseRewardPayload(jsonStr);
  assert.equal(parsed?.code, payload.code);
  assert.equal(parsed?.points, 25);

  const rawParsed = parseRewardPayload("WW-GRN-123-ABC");
  assert.equal(rawParsed?.code, "WW-GRN-123-ABC");
  assert.equal(rawParsed?.points, 25);

  assert.equal(parseRewardPayload("INVALID_CODE"), null);
});

test("claimQrReward requires signed-in UID", () => {
  const payload = createRewardPayload();
  const res = claimQrReward(null, JSON.stringify(payload));
  assert.equal(res.success, false);
  assert.match(res.error, /signed in/i);
});

test("claimQrReward awards +25 points and records transaction", () => {
  const uid = "user-123";
  const payload = createRewardPayload("Organic apple", "wet");
  const res = claimQrReward(uid, JSON.stringify(payload));

  assert.equal(res.success, true);
  if (res.success) {
    assert.equal(res.points, 25);
    assert.equal(res.totalPoints, 25);
  }

  assert.equal(getLocalBonusPoints(uid), 25);
  const txs = getLocalRewardTransactions(uid);
  assert.equal(txs.length, 1);
  assert.equal(txs[0].amount, 25);
});

test("claimQrReward prevents duplicate claims of the same code", () => {
  const uid = "user-123";
  const payload = createRewardPayload("Organic apple", "wet");
  const first = claimQrReward(uid, JSON.stringify(payload));
  assert.equal(first.success, true);

  const duplicate = claimQrReward(uid, JSON.stringify(payload));
  assert.equal(duplicate.success, false);
  assert.match(duplicate.error, /already been claimed/i);
  assert.equal(getLocalBonusPoints(uid), 25); // points not duplicated
});
