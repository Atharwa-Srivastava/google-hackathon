# Account history integration

History is stored in the backend SQLite database and scoped to the authenticated member token. Logout clears the frontend view; it does not delete backend records. Reusing the same account/token restores history after login or closing the browser. Reward transactions already work this way at `/api/rewards/transactions`.

**Critical:** do not use one shared `WASTEWISE_REWARD_TOKEN` for every signed-in person. Your frontend's trusted authentication server must map each logged-in identity to their own backend member token, retain that mapping, and select the token for that user on every request. Provision a member once through admin-only `POST /api/rewards/accounts`; store their returned token securely in that server's per-user record. Reuse it on subsequent logins. Never create a fresh backend account on every login, accept a client-supplied userId as proof of identity, or send the admin key to browsers.

Base URL: `https://harness-action-entail.ngrok-free.dev` while the shared laptop and tunnel run.

## Save automatically

After each successful photo/text result, live-scan update/final result, or user correction, call:

```js
await fetch(BASE + '/api/history', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    'x-api-client': 'wastewise',
    Authorization: `Bearer ${currentMemberToken}`
  },
  body: JSON.stringify({
    id: entry.id, // Generate crypto.randomUUID() once, retain for retries/corrections.
    item: 'Plastic bottle', source: 'photo', quantity: 1,
    material: 'Rigid plastic', category: 'Dry recycling', bin: 'Blue Bin',
    ruleId: 'R1', guideVersion: '1.0',
    preparation: 'Empty, rinse and dry', quotation: 'Relevant guide passage'
  })
});
```

Use the same entry ID to update corrections or retry failed saves without duplicates. For a mixed pile use one stable ID per item group and optional `scanId` to group a scan. Alternatively POST `{entries:[...]}` with 1–30 entries; the entire body must fit 16KB. Validate the response before displaying "Saved". Retry network failures using the same IDs; keep any retry queue scoped to the owning account. Do not reassign A's pending records to B after account switching.

Supported fields: `id`, `item`, `source` (`photo|text|live|dlc`), `quantity`, optional `material`, `category`, `bin`, `ruleId`, `guideVersion`, `preparation`, `quotation`, `condition`, `notes`, `scanId`. Item max160 chars, each optional text max2000. No photos/base64 or arbitrary payloads are stored. Backend timestamps determine ordering. This is user-saved sorting history, not proof of physical disposal and does not award points.

## Load on login / page open

`GET /api/history?limit=50` with the current member's bearer token returns:

```json
{"userId":"member-id","entries":[{"id":"entry-id","item":"Plastic bottle","createdAt":123456789,"updatedAt":123456789}],"nextCursor":null}
```

For another page use `GET /api/history?limit=50&cursor=${encodeURIComponent(nextCursor)}`. Limits 1–100. Token ownership is enforced by the server; providing `userId` in the body cannot select another user's history. Missing/invalid tokens return401. Responses are no-store.

## Frontend logout and account switches

1. On login, restore that user's authenticated session and member-token mapping, clear the previous history view, then fetch their history.
2. Autosave successful scan results and corrections through POST, rather than saving only to a shared localStorage array.
3. On logout immediately clear history state, reward state, selected scan, account token and account-specific query caches. Abort pending requests and stop polling. Do **not** delete backend history.
4. Guard asynchronous responses with a login generation/user ID. Discard responses belonging to an earlier login even if they finish after logout or switching to another user.
5. On reopening the app, restore authentication first. Fetch history only after the current account is known. If logged out show a sign-in prompt, with an empty history view.
6. Never display old unscoped `wastewise-history` browser records to whichever user happens to log in. Do not bulk-import them unless the user explicitly assigns those records to their account. Existing browser-only data has no reliable account owner.

The backend changes cannot clear another frontend's React state automatically. Your friend's frontend must implement the logout lifecycle above. Keep database backups: records persist independently of the browser, but losing the backend database loses server history.
