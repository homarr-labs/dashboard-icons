# MCP sign-in (OAuth 2.1)

The MCP server at `/api/mcp` works anonymously. Account tools (submit an icon, list your submissions) need the caller to sign in with their Dashboard Icons (PocketBase) account. MCP clients such as Claude Code, Cursor and VS Code do that through a small OAuth 2.1 authorization server built into the Next.js app.

PocketBase cannot act as an OAuth authorization server, so the Next.js app plays that role. It reuses the site's existing login and stores consumed grant IDs in the existing PocketBase SQLite database, not in process memory. Registrations and tokens remain sealed, self-contained values.

## Flow

```
MCP client                         Next.js (dashboardicons.com)                 PocketBase
    │  POST /api/mcp (no token)          │                                           │
    │──────────────────────────────────▶ │  account tool → 401                       │
    │ ◀── WWW-Authenticate: Bearer resource_metadata=".../.well-known/oauth-protected-resource/api/mcp", scope="account"
    │  GET PRM, GET AS metadata          │                                           │
    │──────────────────────────────────▶ │                                           │
    │  POST /api/oauth/register (DCR)    │  client_id = sealed {name, redirect_uris} │
    │──────────────────────────────────▶ │                                           │
    │  open browser: /oauth/authorize?client_id&redirect_uri&code_challenge(S256)&resource&state
    │                                    │  page validates client + redirect_uri     │
    │                     browser ─────▶ │  login (existing modal) if signed out ───▶│ authWithPassword / GitHub
    │                                    │  consent card → Approve                   │
    │                     browser ─────▶ │  POST /api/oauth/authorize {params, pbToken}
    │                                    │  ── authRefresh(pbToken) ────────────────▶│
    │                                    │  code = sealed {cid, redirect_uri, PKCE, resource, user, pbToken}, 60 s
    │ ◀── redirect_uri?code&state&iss ── │                                           │
    │  POST /api/oauth/token (code + code_verifier + resource)                       │
    │──────────────────────────────────▶ │  single-use, PKCE, client, redirect, audience checks
    │ ◀── access_token (1 h), refresh_token (30 d)                                   │
    │  POST /api/mcp  Authorization: Bearer <access_token>                           │
    │──────────────────────────────────▶ │  verifyMcpBearer → AuthInfo.extra.pbToken │
    │  POST /api/oauth/token (refresh_token)                                         │
    │──────────────────────────────────▶ │  ── authRefresh(pbToken) ────────────────▶│ fresh token + admin flag
    │ ◀── rotated access + refresh tokens                                            │
```

## Endpoints

| Method | Path                                                                                               | Purpose                                                                                                                                                                            |
| ------ | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/.well-known/oauth-protected-resource/api/mcp` (and root `/.well-known/oauth-protected-resource`) | RFC 9728 protected resource metadata: `resource = {issuer}/api/mcp`, `authorization_servers = [issuer]`, `scopes_supported = ["account"]`, `bearer_methods_supported = ["header"]` |
| GET    | `/.well-known/oauth-authorization-server`                                                          | RFC 8414 metadata: code flow, S256 only, public clients only (`none`), refresh tokens, `authorization_response_iss_parameter_supported`                                            |
| POST   | `/api/oauth/register`                                                                              | RFC 7591 dynamic client registration (public clients only)                                                                                                                         |
| GET    | `/oauth/authorize`                                                                                 | Login + consent page                                                                                                                                                               |
| POST   | `/api/oauth/authorize`                                                                             | Called by the page with the original parameters and the browser's PocketBase token (or `deny: true`); returns `{ redirectTo }`                                                     |
| POST   | `/api/oauth/token`                                                                                 | `authorization_code` and `refresh_token` grants (form-encoded)                                                                                                                     |

Metadata, registration and token endpoints send `Access-Control-Allow-Origin: *` and answer `OPTIONS`. Token and registration responses are `Cache-Control: no-store`. Registration, authorize and token share the existing per-IP `request` rate limit (60/min) with `/api/mcp`.

### Validation rules

- Redirect URIs: `https`, `http` on `localhost`/`127.0.0.1`/`[::1]`, or a private-use scheme (`cursor://…`, `vscode://…`, `com.example.app:/…`). No fragments, no credentials, no `javascript:`/`data:`/`file:`/`vbscript:`/`blob:`… At most 5 per client, 512 characters each.
- Loopback redirects match on scheme, host, path and query; any port is accepted (RFC 8252 §7.3). Everything else must match exactly.
- A bad `client_id` or `redirect_uri` shows an error page and never redirects. Other errors (`unsupported_response_type`, missing S256 PKCE, wrong `resource`, unknown scope) redirect back with `error`, `state` and `iss`.
- `resource` must be the canonical MCP URL `{issuer}/api/mcp` (a trailing slash is tolerated) on both the authorize and token requests. The only scope is `account` (the default).

## Environment variables

| Variable                  | Description                                                                                                                                                                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MCP_OAUTH_SECRET`        | At least 32 bytes (e.g. `openssl rand -hex 48`). Unset or too short: sign-in is disabled, every OAuth route returns 404, and `/api/mcp` stays anonymous-only. Rotating it invalidates every client registration and token.                                                                                                                             |
| `MCP_OAUTH_REPLAY_SECRET` | A distinct random server-only secret of at least 32 bytes; provision the identical value to **both Next.js and PocketBase**. Do not use `MCP_OAUTH_SECRET`, a user token or superuser credentials. Never use a `NEXT_PUBLIC_` variable. Docker Compose forwards this variable to the combined runtime; split deployments must set it on both services. |
| `PB_URL`                  | Server-reachable PocketBase origin (including any deployment path prefix). Every Next.js replica must use the **same PocketBase service and persistent database**. Use loopback/private networking, or HTTPS across hosts. The bundled container defaults to `http://127.0.0.1:8090`.                                                                  |
| `MCP_OAUTH_ISSUER`        | Public origin, e.g. `https://dashboardicons.com`. Recommended in production. When unset the issuer comes from `X-Forwarded-Host`/`X-Forwarded-Proto` (first value) or `Host`, so the reverse proxy must overwrite those headers. Only the origin is used.                                                                                              |

With a valid `MCP_OAUTH_SECRET`, Next.js startup fails if the replay service is not authenticated, migrated and writable. OAuth metadata, registration, authorization and token endpoints recheck readiness and return `503 temporarily_unavailable` during an outage; no successful metadata is advertised without durable storage. The synchronous `isMcpAuthEnabled()` helper reports sealing configuration only, not live storage health.

### Replay storage and rollout

Deploy `backend/pb_migrations/1792000000_mcp_oauth_replay.js` and `backend/pb_hooks/mcp_oauth_replay.pb.js` together. Apply migrations and start PocketBase **before** starting Next.js. The bundled Docker entrypoint does this automatically, and both processes inherit `MCP_OAUTH_REPLAY_SECRET`; do not bake either secret into the image. Keep `/pb/pb_data` on its persistent volume.

The hook exposes `POST /api/dashboard/mcp-oauth-replay`, authenticated using the separate `X-MCP-Replay-Key` server header, compared in constant time. It accepts `{purpose: "code" | "refresh", id, expiry}` (Unix seconds). An atomic SQLite `INSERT ... ON CONFLICT DO NOTHING` against the `(purpose, id)` primary key returns 200 for the sole winner and 409 for duplicates. No user identity, PocketBase token or OAuth token is stored. The table is not a PocketBase collection and has no public CRUD API. Requests are limited to 1 KiB, IDs to 128 characters, and retention to the maximum refresh lifetime plus clock tolerance. An authenticated `{purpose: "probe"}` tests the migrated write path without adding rows. The endpoint rejects unauthenticated callers before reading claims or writing storage; it is not a public grant-storage endpoint. Restrict its ingress to application servers where possible, and redact `X-MCP-Replay-Key` from proxy/APM logs.

On the **first upgrade from memory-only guards**, stop all old Next.js replicas and rotate `MCP_OAUTH_SECRET` before serving traffic. Previously consumed grants cannot be reconstructed; keeping the old sealing key would allow them one more redemption. Users must reconnect and clients re-register. The same rule applies after restoring an older PocketBase backup, losing the replay database, or rolling back/removing this migration: stop OAuth, rotate the sealing secret, restore a consistent deployment, then reconnect clients. Never run replicas against separate PocketBase databases, or mount one SQLite file across independent PocketBase servers.

Keep clocks synchronized. Cleanup runs every five minutes and removes only rows expired for at least five minutes; live rows are never evicted. Disk-full, missing-schema, credential mismatch, timeout and database errors fail closed. An ambiguous network failure after a committed consume may burn the grant: the client must reconnect rather than risk issuing a second token. Rotate the replay secret on both services together during a maintenance window; it does not itself invalidate sealed tokens.

## Integration (`src/mcp/auth`)

```ts
import {
  isMcpAuthEnabled,
  mcpAuthChallenge,
  verifyMcpBearer,
  type McpAuthExtra,
} from "@/mcp/auth";

const authInfo = await verifyMcpBearer(req);
// undefined: no Authorization header, or sign-in disabled → anonymous
// throws OAuthError(invalid_token): malformed, forged, expired or wrong audience → answer mcpAuthChallenge(req, { error: "invalid_token", description: err.message })
// AuthInfo: { token, clientId (client fingerprint), scopes, expiresAt, resource, resourceMetadataUrl, extra: McpAuthExtra }

mcpAuthChallenge(req); // 401 + WWW-Authenticate for an anonymous call to an account tool; null when sign-in is disabled
```

`src/app/api/mcp/route.ts` runs this after the rate limit and body bound: a bad token gets the `invalid_token` challenge on every request, and an anonymous `tools/call` for an account tool gets the plain challenge. With sign-in disabled the call reaches the registry, which answers with a "sign in" tool error.

`createDashboardIconsServer` turns the auth info into an `McpSession` (`caller` + `pbToken`) that only account tool handlers receive. Each account call refreshes the PocketBase session first (`authRefresh`) and acts with the fresh token, so a revoked PocketBase session fails right away with a "reconnect" tool error instead of an empty result. The analytics `beforeSend` drops the SDK request context from `$identify` events, because PostHog's redactor does not know the `pbToken` key.

## Local stack

Run PocketBase, Next.js and the smoke script in separate terminals from `web/`. Use local-only test credentials; keep `pb_data` out of commits and stop both servers afterward.

```sh
pnpm backend:download                                    # sha-pinned PocketBase into backend/pocketbase
export MCP_OAUTH_SECRET=$(openssl rand -hex 48)
export MCP_OAUTH_REPLAY_SECRET=$(openssl rand -hex 48)
cd backend
./pocketbase superuser upsert admin@example.test 'replace-with-local-test-password' --dir pb_data
DASHBOARD_DISABLE_EMAIL=1 ./pocketbase serve --http 127.0.0.1:8090 --dir pb_data   # pb_data is gitignored
cd ..
curl -X POST http://127.0.0.1:8090/api/collections/users/records -H 'content-type: application/json' \
  -d '{"username":"mcpsmoke","email":"mcp-smoke@example.test","password":"replace-with-local-test-password","passwordConfirm":"replace-with-local-test-password"}'
MCP_ANALYTICS_DEBUG=true MCP_RATE_LIMIT_ENABLED=false \
  NEXT_PUBLIC_DISABLE_POSTHOG=true PB_URL=http://127.0.0.1:8090 NEXT_PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090 \
  npx next dev --webpack --port 3005 > /tmp/next.log 2>&1
MCP_SMOKE_PASSWORD='replace-with-local-test-password' npx tsx scripts/mcp-oauth-smoke.ts http://localhost:3005 http://127.0.0.1:8090 mcp-smoke@example.test "" /tmp/next.log
```

The smoke script checks the anonymous 401 challenge, metadata, DCR, the consent POST with the user's PocketBase token, the PKCE code exchange and replay, `submit_icon` on the 2026 era (and the stored PocketBase record), `list_my_submissions` on the 2025 era, refresh rotation and a tampered bearer. With the log path it also checks that signed-in `$mcp_tool_call` events use the PocketBase user id and that no bearer token or JWT reaches the analytics log. It deletes its submission at the end. Use `--webpack`: Turbopack breaks on pnpm's global virtual store.

Run `node --test scripts/mcp-replay-integration.mjs` from `web/` with Node 24 and the downloaded PocketBase binary. It uses a disposable local database and generated server secret, verifies 16 concurrent requests yield exactly one winner for each grant purpose, restarts PocketBase and rejects the same grants, and checks unauthenticated, unconfigured and missing-schema failures. It never uses a superuser account or existing `pb_data`.

## Security properties

- **Sealed, not signed.** Client IDs, codes, access and refresh tokens are AES-256-GCM with a per-purpose key (HKDF-SHA256 from `MCP_OAUTH_SECRET`; purposes `client`, `code`, `access`, `refresh`) and the purpose as associated data. A token of one kind can never be replayed as another, and clients cannot read or alter the contents.
- **PocketBase tokens never leave the server in usable form.** They only travel inside sealed tokens, so an MCP token is useless against PocketBase and a PocketBase token is useless against `/api/mcp`.
- **Audience-bound.** Access tokens carry `aud = {issuer}/api/mcp`; the verifier rejects tokens minted for another host.
- **PKCE S256 required**, compared in constant time. Codes live 60 seconds and are single-use (burned on first presentation, even if the exchange then fails).
- **Durable single use.** Code consumption precedes PKCE/client checks, preserving burn-on-presentation. Refresh consumption occurs after request validation and successful PocketBase session refresh, but before issuing any replacement tokens. Concurrent refreshes can validate the upstream session, but only the SQLite insertion winner receives OAuth tokens. Replay rejection survives Next.js/PocketBase restarts and is shared across Next.js replicas using the same PocketBase database.
- **Fresh identity.** The authorize endpoint re-validates every parameter and calls PocketBase `authRefresh` before minting a code. Every refresh calls `authRefresh` again, which also refreshes the `admin` flag.
- **Error handling.** Rejected PocketBase sessions return `invalid_grant` (the client restarts sign-in). PocketBase outages before consumption return `503 temporarily_unavailable`, so clients can retry. If a consume committed but its response was lost, retry safely rejects the spent grant and requires reconnecting.
- **No cookies.** The approval POST carries the PocketBase token in its body, so cross-site request forgery cannot approve a client. The page inherits `X-Frame-Options: DENY`.
- **Phishing hint.** The consent card names the self-declared client and the redirect host, and says to approve only connections the user started.

## Limitations

- **Token lifetimes are capped by PocketBase.** Access tokens last at most 1 hour and refresh tokens at most 30 days, never beyond the embedded PocketBase token's expiry. Successful refresh rotates the token and durably rejects reuse; it does not revoke a whole token family.
- **PocketBase idle expiry.** PocketBase tokens last 7 days by default. A connection idle for longer cannot refresh and needs one more consent click (the browser session usually still exists).
- **Revocation is coarse.** There is no per-client revocation. Changing the password or signing out everywhere in PocketBase (token key reset) stops account tools at once (they refresh the PocketBase session on every call) and ends the rest of MCP access within 1 hour, when the current access token expires and the next refresh fails.
- **No CIMD yet.** Clients register through DCR, which the 2026-07-28 spec deprecates but still allows. Claude Code, Cursor and VS Code all support it.
- The access token's `client_id` is a SHA-256 fingerprint of the registered client ID, which keeps tokens short.
