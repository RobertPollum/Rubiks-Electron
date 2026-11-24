# Sync API contract

This is the HTTP API the app uses to back up and sync a signed-in player's
data between devices. You build and host the real server; this document is
what it has to implement. A small in-memory version for development and tests
lives in `rubiks-cube/tools/mock-sync-server.mjs`.

The app side is in `rubiks-cube/src/platform/syncClient.ts` (HTTP calls),
`rubiks-cube/src/app/syncEngine.ts` (when to sync) and
`rubiks-cube/src/core/syncMerge.ts` (how two copies are combined).

## Basics

- Base URL: set at build time with `VITE_SYNC_API_URL` (no trailing slash),
  e.g. `https://api.example.com`. All paths below are under `/v1`.
- JSON in and out (`Content-Type: application/json`).
- Every request except `GET /health` needs `Authorization: Bearer <access token>`.
  The token comes from sign-in (see `sign-in-checklist.md`). The server must
  check the token and work out which account it belongs to. The account id
  never comes from the request body or URL.
- CORS: the website and the Electron app (`Origin: null` for `file://`) call
  the API from a browser context, so allow the methods and headers below.
- Each account stores one document: the player's `GameData` (see
  `rubiks-cube/src/core/types.ts`). The server stores it as given and does
  not need to understand it, beyond an optional size limit (the app never
  sends more than 5 MB).

## Endpoints

### `GET /health`

No auth. `200 {"ok": true}`. Used by tooling and tests.

### `GET /v1/me`

The signed-in account.

| Status | Body |
| --- | --- |
| 200 | `{"id": "acct_123", "displayName": "Robert"}` (`email` optional) |
| 401 | Token missing, invalid or expired |

### `GET /v1/data`

The account's stored data.

| Status | Body |
| --- | --- |
| 200 | `{"revision": 7, "updatedAt": "2026-11-24T05:00:00.000Z", "data": { ...GameData }}` |
| 200 | `{"revision": 0, "updatedAt": null, "data": null}` if nothing is stored yet |
| 401 | Token missing, invalid or expired |

### `PUT /v1/data`

Replace the account's data, but only if nobody else has changed it since the
client last read it.

Request: `{"baseRevision": 7, "data": { ...GameData }}`

| Status | Body | Meaning |
| --- | --- | --- |
| 200 | `{"revision": 8, "updatedAt": "..."}` | Stored. `revision` is `baseRevision + 1`. |
| 409 | `{"revision": 9, "updatedAt": "...", "data": { ...GameData }}` | `baseRevision` doesn't match the stored revision (another device saved first). The body is the current stored copy. |
| 400 | `{"error": "..."}` | Body isn't `{baseRevision: number, data: object}` |
| 401 | | Token missing, invalid or expired |
| 413 | | Too large |

The revision check is what stops two devices silently overwriting each other.
It must be atomic, e.g. `UPDATE ... WHERE account_id = ? AND revision = ?`.
`baseRevision: 0` means "I believe nothing is stored yet".

## What the app does with it

1. **Sync** = `GET /v1/data`, merge with the local copy (`core/syncMerge.ts`),
   save the result locally, and `PUT` it back if it differs from what the
   server had. On `409`, merge with the copy in the response and try again
   (up to 3 times).
2. **Merge rules:** settings are taken whole from whichever copy changed them
   more recently (`settingsUpdatedAt`); solve histories are combined (by
   solve `id`); the current game is whichever was saved more recently
   (`currentGame.updatedAt`); stats are recomputed. So the server never has
   to merge anything itself.
3. **When:** when the app starts, when the window regains focus or the
   network comes back, every 5 minutes, about a second after any local change,
   and when the player presses "Sync now". Automatic syncing can be turned off
   per device in Settings.
4. **Signing in on a device that last synced a different account** replaces
   the local data with that account's data instead of merging, so one
   person's progress never ends up in another's account. The first sign-in on
   a device merges the device's existing progress into the account.
5. **On `401`** the app treats the player as signed out and keeps the local data.

## Server checklist

- [ ] `GET /health`, `GET /v1/me`, `GET /v1/data`, `PUT /v1/data` as above
- [ ] Token validation (from your sign-in provider) on every `/v1` request
- [ ] Atomic revision check on `PUT`; `409` returns the stored copy
- [ ] CORS for the website's origin and `null` (Electron)
- [ ] Size limit (e.g. 5 MB) and JSON validation
- [ ] HTTPS only in production
- [ ] Optional: keep a few previous revisions per account for recovery
- [ ] Optional: `DELETE /v1/data` (and account deletion) for privacy requests
