# MCP sign-in (OAuth 2.1)

The MCP server at `/api/mcp` works anonymously. Account tools (submit an icon, list your submissions) need the caller to sign in with their Dashboard Icons (PocketBase) account. MCP clients such as Claude Code, Cursor and VS Code do that through a small, stateless OAuth 2.1 authorization server built into the Next.js app.

PocketBase cannot act as an OAuth authorization server, so the Next.js app plays that role. It reuses the site's existing login and never adds a database table.

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

| Variable           | Description                                                                                                                                                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MCP_OAUTH_SECRET` | At least 32 bytes (e.g. `openssl rand -hex 48`). Unset or too short: sign-in is disabled, every OAuth route returns 404, and `/api/mcp` stays anonymous-only. Rotating it invalidates every client registration and token.                                |
| `MCP_OAUTH_ISSUER` | Public origin, e.g. `https://dashboardicons.com`. Recommended in production. When unset the issuer comes from `X-Forwarded-Host`/`X-Forwarded-Proto` (first value) or `Host`, so the reverse proxy must overwrite those headers. Only the origin is used. |

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
cd backend
./pocketbase superuser upsert admin@example.test 'replace-with-local-test-password' --dir pb_data
DASHBOARD_DISABLE_EMAIL=1 ./pocketbase serve --http 127.0.0.1:8090 --dir pb_data   # pb_data is gitignored
cd ..
curl -X POST http://127.0.0.1:8090/api/collections/users/records -H 'content-type: application/json' \
  -d '{"username":"mcpsmoke","email":"mcp-smoke@example.test","password":"replace-with-local-test-password","passwordConfirm":"replace-with-local-test-password"}'
MCP_OAUTH_SECRET=$(openssl rand -hex 48) MCP_ANALYTICS_DEBUG=true MCP_RATE_LIMIT_ENABLED=false \
  NEXT_PUBLIC_DISABLE_POSTHOG=true PB_URL=http://127.0.0.1:8090 NEXT_PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090 \
  npx next dev --webpack --port 3005 > /tmp/next.log 2>&1
MCP_SMOKE_PASSWORD='replace-with-local-test-password' npx tsx scripts/mcp-oauth-smoke.ts http://localhost:3005 http://127.0.0.1:8090 mcp-smoke@example.test "" /tmp/next.log
```

The smoke script checks the anonymous 401 challenge, metadata, DCR, the consent POST with the user's PocketBase token, the PKCE code exchange and replay, `submit_icon` on the 2026 era (and the stored PocketBase record), `list_my_submissions` on the 2025 era, refresh rotation and a tampered bearer. With the log path it also checks that signed-in `$mcp_tool_call` events use the PocketBase user id and that no bearer token or JWT reaches the analytics log. It deletes its submission at the end. Use `--webpack`: Turbopack breaks on pnpm's global virtual store.

## Security properties

- **Sealed, not signed.** Client IDs, codes, access and refresh tokens are AES-256-GCM with a per-purpose key (HKDF-SHA256 from `MCP_OAUTH_SECRET`; purposes `client`, `code`, `access`, `refresh`) and the purpose as associated data. A token of one kind can never be replayed as another, and clients cannot read or alter the contents.
- **PocketBase tokens never leave the server in usable form.** They only travel inside sealed tokens, so an MCP token is useless against PocketBase and a PocketBase token is useless against `/api/mcp`.
- **Audience-bound.** Access tokens carry `aud = {issuer}/api/mcp`; the verifier rejects tokens minted for another host.
- **PKCE S256 required**, compared in constant time. Codes live 60 seconds and are single-use (burned on first presentation, even if the exchange then fails).
- **Fresh identity.** The authorize endpoint re-validates every parameter and calls PocketBase `authRefresh` before minting a code. Every refresh calls `authRefresh` again, which also refreshes the `admin` flag.
- **Error handling.** Rejected PocketBase sessions return `invalid_grant` (the client restarts sign-in). PocketBase outages return `503 temporarily_unavailable`, so clients keep their refresh token and retry.
- **No cookies.** The approval POST carries the PocketBase token in its body, so cross-site request forgery cannot approve a client. The page inherits `X-Frame-Options: DENY`.
- **Phishing hint.** The consent card names the self-declared client and the redirect host, and says to approve only connections the user started.

## Limitations

- **Single-process replay guards.** Used authorization-code and refresh-token IDs live in bounded in-memory guards that fail closed when full. Reuse is rejected in one process, but a restart clears the guards and several replicas do not share them. Move the guards to shared storage before scaling out.
- **Token lifetimes are capped by PocketBase.** Access tokens last at most 1 hour and refresh tokens at most 30 days, never beyond the embedded PocketBase token's expiry. Successful refresh rotates the token and rejects reuse in the current process; it does not revoke a whole token family.
- **PocketBase idle expiry.** PocketBase tokens last 7 days by default. A connection idle for longer cannot refresh and needs one more consent click (the browser session usually still exists).
- **Revocation is coarse.** There is no per-client revocation. Changing the password or signing out everywhere in PocketBase (token key reset) stops account tools at once (they refresh the PocketBase session on every call) and ends the rest of MCP access within 1 hour, when the current access token expires and the next refresh fails.
- **No CIMD yet.** Clients register through DCR, which the 2026-07-28 spec deprecates but still allows. Claude Code, Cursor and VS Code all support it.
- The access token's `client_id` is a SHA-256 fingerprint of the registered client ID, which keeps tokens short.
