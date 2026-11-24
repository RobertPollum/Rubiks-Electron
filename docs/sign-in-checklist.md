# Sign-in checklist

The app side of accounts is ready for real sign-in. Everything below is what's
left, roughly in order. The sync protocol itself is in `sync-api.md`.

## How it plugs in

- A sign-in method is an `AuthProvider` (`rubiks-cube/src/platform/auth.ts`):
  `signIn()` runs the flow and resolves a `Session` = `{ token, account, provider }`,
  where `token` is what the app sends to your API as `Authorization: Bearer ...`.
- `createSyncServices()` in `rubiks-cube/src/platform/index.ts` chooses the
  provider. Today it only offers the development provider, which is enabled
  by `VITE_SYNC_DEV_AUTH=true` and accepted only by the mock server.
- The Settings "Account & Sync" section (`ui/accountPanel.ts`) shows one
  button per provider; it currently supports one, so offering several
  (Google, GitHub, ...) means rendering a button for each.

## Decisions

- [ ] Which providers to offer first (e.g. Google and GitHub, then Apple and
      Microsoft). Apple sign-in is required on iOS if others are offered there.
- [ ] Who issues the API token:
      - **Your API issues its own session token** (recommended): the app runs
        the provider's OAuth flow, sends the result to your API (e.g.
        `POST /v1/auth/{provider}`), the API verifies it with the provider,
        finds or creates the account, and returns its own short-lived access
        token plus a refresh token. One token format for the API to check.
      - Or the API accepts provider tokens directly and verifies each one.
- [ ] How accounts with the same email from different providers are linked
      (or not).

## Server (your API)

- [ ] OAuth apps registered with each provider (client ids/secrets kept on the server)
- [ ] Token exchange endpoint(s), e.g. `POST /v1/auth/{provider}` -> `{ accessToken, refreshToken, account }`
- [ ] `POST /v1/auth/refresh` and `POST /v1/auth/logout` (revokes the refresh token)
- [ ] Short-lived access tokens; reject expired ones with `401`
- [ ] Account deletion (and its data) for privacy requests

## Website

- [ ] Authorization Code flow with PKCE, using a redirect back to the site
      (a popup or full-page redirect); no client secrets in the browser
- [ ] Handle the redirect on load: exchange the code via your API, then
      return the `Session` from `signIn()`
- [ ] Add the site's URL as an allowed redirect URI with each provider

## Desktop app (Electron)

- [ ] Open the provider's page in the system browser (`shell.openExternal`),
      not inside the app window
- [ ] Receive the result with a custom protocol (`rubiks-cube://auth/...`,
      registered with `app.setAsDefaultProtocolClient`) or a loopback
      redirect on `http://127.0.0.1:<port>`, handled in the main process and
      passed to the renderer over IPC (like `fileStore.ts`)
- [ ] Store the refresh token with Electron `safeStorage` in the main
      process instead of localStorage (see `platform/syncState.ts`)

## App changes when this lands

- [ ] Provider implementations of `AuthProvider` (one per provider, or one
      generic OAuth provider configured per provider)
- [ ] Refresh the access token when the API returns `401`, before signing
      the player out (`app/syncEngine.ts` `handleError`)
- [ ] Turn off `VITE_SYNC_DEV_AUTH` in every non-development build (it
      already defaults to off; only `.env.development` and `.env.e2e` set it)
- [ ] Set `VITE_SYNC_API_URL` for production builds (e.g. a GitHub Actions
      variable in `.github/workflows/web.yml`)
