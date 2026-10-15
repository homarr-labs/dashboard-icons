# MCP v2 research: PostHog MCP Analytics, auth, SDK v2

Researched 2026-10-15. Every claim cites a primary source. Path shorthands:

Historical design research, not deployment instructions. The shipped implementation uses sealed tokens and a private PocketBase SQLite replay table, without superuser credentials or CIMD. Follow [MCP-AUTH.md](../MCP-AUTH.md) for the final design and rollout requirements.

| Tag    | Location                                                                                                                            |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `PH11` | `web/node_modules/@posthog/mcp/src` (installed **0.11.0**)                                                                          |
| `PH22` | `@posthog/mcp@0.22.2/src` (`npm pack @posthog/mcp@0.22.2`; same tree at `github.com/PostHog/posthog-js/tree/main/packages/mcp/src`) |
| `SDK`  | `web/node_modules/@modelcontextprotocol/server/dist` (installed **2.1.0**; latest 2.3.1)                                            |
| `SDKd` | `SDK/createMcpHandler-Bt6U_Fqb.d.mts` (type declarations)                                                                           |
| `MH`   | `web/node_modules/mcp-handler/dist` (installed **2.2.0**; latest 2.3.0)                                                             |
| `PHD`  | `https://posthog.com/docs/mcp-analytics/`                                                                                           |

## TL;DR: why every PostHog event lands in its own session today

1. **The installed `@posthog/mcp@0.11.0` predates SDK v2 support.** Its high-level gate requires `server.tool()` (`PH11/extensions/compatibility.ts:55-58`), but v2 `McpServer` only has `registerTool`. That is why `web/src/mcp/analytics.ts` instruments `server.server` (the low-level server) instead. 0.11.0 also reads headers only from v1's `extra.requestInfo.headers` (`PH11/extensions/session.ts:113`, `transport-identity.ts:51`, `instrumentation.ts:691`). v2 puts the request at `ctx.http.req` (`SDK/mcp-Dw2OlZ1f.mjs:1056-1084`), so 0.11.0 reads no headers: no session token, no User-Agent, and no `Authorization` for identify. v2 support (`registerTool` gate and `getRequestHeaders`) shipped in **0.11.1** (changelog #4462).
2. **mcp-handler serves 2025-era traffic statelessly, over SSE.** It calls the SDK's `createMcpHandler(..., { legacy: "stateless" })` (`MH/index.mjs:195-206`). The SDK builds the legacy transport with only `sessionIdGenerator: undefined` (`SDK/index.mjs:1058-1062`), so `enableJsonResponse` is false. The response is SSE, and its headers go out before handlers run (`SDK/index.mjs:795-801`). PostHog writes its stateless session token into `transport.sessionId` during `initialize` (`PH22/extensions/instrumentation.ts:1026-1081`), and only the JSON-mode response reads that field afterwards (`SDK/index.mjs:971-973`). PostHog's docs say so: _"The legacy path in `createMcpHandler` can't send the token, so `$mcp_client_name` and `$mcp_client_version` are absent there"_ (`PHD/installation/typescript.md`, "Stateless and multi-pod servers").
3. **Two settings remove every other correlation signal.** `context: false` turns off intent capture. There is no `identify`, so no `distinct_id`. The `beforeSend` also drops every `$mcp_tools_list` and 90% of `$mcp_initialize` (`web/src/mcp/analytics.ts`).

---

## 1. PostHog MCP Analytics (TypeScript): how each feature works

**Install and lifecycle** (`PHD/installation/typescript.md`)

- Call `instrument(server, posthog, options?)` once per server instance, before it serves. It accepts a high-level `McpServer` or a low-level `Server`, and it instruments tools registered later. A second call on the same server logs a warning and returns early. It returns `{ capture({event, properties}) }` for custom events.
- `posthog-node` batches events. In serverless, `await posthog.flush()` per invocation, or call `waitUntil(posthog.flush())`.
- mcp-handler section: _"`mcp-handler` creates a new server for each request and sends no `Mcp-Session-Id` header … each request gets its own `$session_id`. To group a client's calls: return a `distinctId` from `identify` … keep conversation IDs on (the default)."_
- Stateless and multi-pod servers: on `2025-11-25`, the SDK mints a token at `initialize` and returns it in the `Mcp-Session-Id` response header. This works **only in JSON mode** (`new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })`). With SSE, set the header yourself with `MCP_SESSION_HEADER`, `encodeSessionId` and `newSessionId` from `@posthog/mcp`. `2026-07-28` has no `initialize`, so conversation IDs carry the session there.
- Read headers with `getRequestHeaders(extra)`. It works on both SDK majors and returns lowercase keys. Reading `extra.requestInfo` on v2 silently returns `undefined` (same page, "This fails silently").
- Custom dispatchers can use `PostHogMCP` (a subclass of `posthog-node`) with `prepareToolList`, `prepareToolCall`, `prepareToolResult`, `captureToolCall`, `captureInitialize` and `captureMissingCapability`. Pass `originalTool` to `prepareToolCall` on stateless servers.

**`instrument()` options** (full type: `PH22/types.ts:96-229`; defaults: `PH22/index.ts:142-147`)

| Option                                        | Default       | Notes                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `context`                                     | on            | `boolean \| { description }`. Injects a **required** `context: string` argument. The default prompt asks for 15-25 words, third person, and no PII (`PH22/extensions/constants.ts:8`).                                                                                                                                                      |
| `intentFallback`                              | none          | `(request, extra) => string \| null` (may be async). Runs only when `context` is empty. The result is tagged `$mcp_intent_source="inferred"`.                                                                                                                                                                                               |
| `captureModel`                                | `true`        | `boolean \| { description }`. Reads Codex `params._meta["x-codex-turn-metadata"].model` first, then the injected `llm_model` argument (`PH22/extensions/model-parameters.ts:54,79`).                                                                                                                                                        |
| `enableConversationId`                        | `true`        | Injects an optional `conversation_id` argument and returns the handle as a text block.                                                                                                                                                                                                                                                      |
| `identify`                                    | none          | `(request, extra) => Promise<UserIdentity \| null>`, or a static `UserIdentity`. Called on every request (`types.ts:173-176`).                                                                                                                                                                                                              |
| `reportMissing`                               | `false`       | Adds the virtual tool `get_more_tools`. Rename it with `missingCapabilityToolName`.                                                                                                                                                                                                                                                         |
| `collectFeedback`                             | `false`       | **Not in the docs table.** Adds the virtual tool `send_feedback` and emits `$mcp_feedback`. It covers missing capabilities (`feedback_type: "missing_capability"`) plus issues and praise. _"New integrations should enable only one of the two"_ (`types.ts:111-124, 238-305`). Optional `onFeedback(report)` routes reports to a backend. |
| `enableExceptionAutocapture`                  | `true`        | Emits a `$exception` sibling event per failed call.                                                                                                                                                                                                                                                                                         |
| `beforeSend`                                  | none          | `(event) => event \| null`. Runs after sanitization and truncation, once per event. A throw drops the event.                                                                                                                                                                                                                                |
| `eventProperties`                             | none          | `(request, extra) => Record`. Spread onto every auto-captured event.                                                                                                                                                                                                                                                                        |
| `serverBuild`                                 | none          | 1-256 characters. Becomes `$mcp_server_build`.                                                                                                                                                                                                                                                                                              |
| `shouldRecordInputKey`, `resolveInputAliases` | declared keys | Control `$mcp_input_keys` and `$mcp_input_aliases_used`.                                                                                                                                                                                                                                                                                    |
| `resolveOriginalTool`                         | none          | Low-level servers only. Lets a fresh instance strip injected arguments without having served `tools/list`. Ignored on `McpServer` (`types.ts:209-220`).                                                                                                                                                                                     |
| `logger`                                      | no-op         | stdio-safe log sink.                                                                                                                                                                                                                                                                                                                        |

**Sessions** (`PHD/events.md` "Session resolution"; `PH22/extensions/session.ts:120-156`). The first match wins:

1. A valid echoed `conversation_id` (UUIDv7 only; anything else gets a freshly minted ID; `conversation-id.ts:89,109-121`) becomes `$session_id = deterministicPrefixedId('ses', convId)`, unsalted, so separate pods agree (`session.ts:103-105`).
2. A session carried by the request: either PostHog's token in the `mcp-session-id` header (`session.ts:189-207`), or a transport `extra.sessionId`, hashed.
3. The instance's own ID, which rotates after 30 minutes idle (`constants.ts:6`, `session.ts:218-225`). On per-request servers this means **one session per request**.

**Stateless session token.** The token is unsigned `base64url(JSON {sid, cn, cv, pv})`, capped at 4096 characters (`PH22/extensions/session-token.ts:34-63`). It is minted only for HTTP, legacy-era requests, when the client sent no session header and the transport is stateless (`instrumentation.ts:1026-1081`). It is written via `transport.sessionId = token` (`session-token.ts:119-141`). The v2 `WebStandardStreamableHTTPServerTransport.sessionId` is a plain writable field (`SDK/index.mjs:376`). With `sessionIdGenerator === undefined`, `validateSession` returns early, so replayed tokens are accepted (`SDK/index.mjs:864-865`). `initialize` resets `this.sessionId` before dispatch (`SDK/index.mjs:741`), and the PostHog write happens after that.

**Conversation IDs** (`PHD/conversation-id.md`; `PH22/extensions/conversation-id.ts`)

- The argument description tells the agent to reuse the exact value and to _"not issue parallel tool calls until you have it"_ (`constants.ts:12`).
- A minted handle is appended as `{"type":"text","text":"{\"conversation_id\":\"…\"}"}` (`conversation-id.ts:159-181`). If the tool declares an `outputSchema`, it is also mirrored into `structuredContent._mcp_instructions`. Mirroring needs the instance to have served `tools/list` (`output-instructions.ts`; `instrumentation.ts:279-286`).
- If the request already carries a session (token or transport), the minted handle is dropped and no prompt-back is added (`instrumentation.ts:231-242`). The token and conversation IDs therefore don't fight.
- It can't be injected into `oneOf`/`allOf`/`anyOf`/`$ref` schemas. The handle is visible in raw tool output. Don't use it as a security boundary.

**Intent** (`PHD/intent.md`). The source is the `context` argument (`$mcp_intent_source="context_parameter"`) or `intentFallback` (`"inferred"`). The injected argument is stripped before your handler runs. Its `required` status is advertised but not enforced. `get_more_tools` always reports `context_parameter`. Since 0.13.1, emails, phones, IPs, card numbers and SSNs are auto-redacted from `$mcp_intent` (changelog).

**Identify** (`PHD/identifying-users.md`; `PH22/extensions/internal.ts:129-198`)

- `distinct_id` resolves in this order: the `identify().distinctId`, then the `ses_…` session ID, then `"anonymous"` (`posthog-events.ts:25`).
- Anonymous events carry `$process_person_profile: false` (`posthog-events.ts:117`).
- `$identify` fires once per session, with `$anon_distinct_id` set to the session ID so earlier events merge. `UserIdentity = { distinctId, properties → $set, groups → $groups }` (`types.ts:512-529`).
- **Caveat:** on token sessions, the first `$identify` after `initialize` is suppressed (`internal.ts:176-180`). Resolve identity at `initialize` if possible (the token is present on every request).
- The web app already calls `posthog.identify(pbUser.id, …)` (`web/src/lib/posthog-utils.ts:19`). Returning `distinctId: <PocketBase user id>` therefore merges MCP and web persons.

**Missing capabilities** (`PHD/missing-capability.md`; `PH22/extensions/tools.ts:22-63`). `get_more_tools` takes `{ context: string }` (required) and has annotations `readOnlyHint`, `idempotentHint` and `openWorldHint`. It returns the canned text _"Unfortunately, we have shown you the full tool list…"_. It emits `$mcp_missing_capability`, and the agent's reason becomes `$mcp_intent`. It is injected only on the first `tools/list` page. On stateless servers, the SDK checks the raw listing (`isToolAdvertised`) so a real tool with the same name still wins (`instrument-highlevel.ts:249-265`).

**Events** (`PHD/events.md`): `$mcp_tool_call`, `$mcp_tools_list`, `$mcp_resources_list`, `$mcp_resource_read` (no body), `$mcp_initialize` (2025-11-25 only), `$mcp_missing_capability`, `$mcp_feedback`, `$identify`, `$exception`, and custom events.

**Harness label** priority is `$mcp_vendor_client` (`x-anthropic-client`), then `$mcp_client_user_agent`, then `$mcp_client_name`. On HTTP these are read automatically through `getRequestHeaders`, so 0.11.0 on v2 gets none of them.

**Privacy** (`PHD/privacy.md`): automatic sanitization (media, `authorization`/`token`/`password` keys, `ph*` keys, URL credentials, high-entropy words), then truncation (100 KB per event), then `beforeSend`.

**Dashboards** (`PHD/surfaces/web-app.md`): the MCP Analytics tabs are Dashboard, Activity, Sessions ("session replay for agents"), Tool quality ("Create fix task"), and Intent clustering. All are built from `$mcp_tool_call`.

### Upgrade path 0.11.0 → latest

- The npm `latest` tag is **0.22.3** (2026-10-09). `~/.npmrc` sets `min-release-age=7`, so `npm`/`pnpm` refuse it until 2026-10-16. **0.22.2 installs now.** The only change in 0.22.3 is `$mcp_interface: "mcp"` on events (diffed: `constants.ts`, `posthog-events.ts`).
- Peer dependencies in 0.22.x: `@modelcontextprotocol/server >=2.0.0`, `posthog-node ^5` (`PH22/../package.json`).
- Changes that matter here (CHANGELOG at `raw.githubusercontent.com/PostHog/posthog-js/main/packages/mcp/CHANGELOG.md`):

| Version         | Change                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 0.11.1          | v2 `McpServer` support, `getRequestHeaders`                                                                               |
| 0.11.2 / 0.11.3 | Client and protocol version via v2 envelope and `MCP-Protocol-Version` header                                             |
| 0.11.4          | Era-gated token minting                                                                                                   |
| 0.11.5          | `identify` resolved on `tools/list`; intent captured on fresh instances                                                   |
| 0.11.7          | Data-only conversation handle                                                                                             |
| 0.13.1          | PII redaction in intent                                                                                                   |
| 0.14 / 0.15     | Model capture; resource events                                                                                            |
| 0.16.0          | `send_feedback` (`collectFeedback`)                                                                                       |
| 0.17.0          | **`captureModel` and `enableConversationId` on by default** (adds the `llm_model` argument and a handle block to results) |
| 0.18.1          | Conversation sessions stable across user messages                                                                         |
| 0.21.0          | `serverBuild`                                                                                                             |
| 0.22.0          | `resolveOriginalTool`                                                                                                     |

---

## 2. `@posthog/mcp` internals that matter

- **High-level vs low-level.** Prefer `instrument(mcpServer, …)` on 0.22.x. It patches `initialize`, `tools/list`, `tools/call`, `resources/list`, `resources/templates/list` and `resources/read` on `server.server._requestHandlers` (`instrument-highlevel.ts:312-343`). It proxies `_registeredTools`, so later `registerTool` calls get wrapped, and it **strips injected arguments before Zod validation** using the registry schema (`instrument-highlevel.ts:287-309`).
  - On the low-level path, a fresh per-request instance has never seen `tools/list` and can't prove it owns `context`/`conversation_id`/`llm_model`. It still reads them (fail-open) but strips them only when `resolveOriginalTool` is provided (`instrumentation.ts:249-301`; changelog 0.11.5 and 0.22.0).
  - `setRequestHandler` is monkey-patched, so handlers registered later are also wrapped (`instrumentation.ts:673-715`). The order of `registerTool` vs `instrument` no longer matters.
- **Compatibility gate (0.22.x).** It accepts `registerTool()` or `tool()` (`PH22/extensions/compatibility.ts:62-75`). It needs `_requestHandlers` (a Map), `getClientVersion()` and `_serverInfo.name`. v2 has all of them: `_registeredTools` at `SDK/mcp-Dw2OlZ1f.mjs:1621`, `_requestHandlers` at `SDK/src-D-y6h4N7.mjs:6192`, `_serverInfo` at `SDK/mcp-Dw2OlZ1f.mjs:355`. `get transport()` is at `SDK/src-D-y6h4N7.mjs:6596`.
- **Per-instance state.** State lives in a module `WeakMap<Server, data>` (`internal.ts:68-76`), so each per-request server gets fresh state. Identity caching only helps within an instance.
- **Flush.** `McpEventSink.capture` calls `posthog.capture(...)` synchronously, after an async sanitize step (`sink.ts:102-146`). The host owns `flush()` and `shutdown()`. The current `finally { await posthog.flush() }` in `route.ts` is correct. Alternatives are `after(() => posthog.flush())` from `next/server` (Next 16.2.12 exports `after`: `web/node_modules/next/server.d.ts:21`), which keeps flush latency off the response, or `flushAt: 1, flushInterval: 0`.
- **`$lib` override.** The SDK relabels **every** event sent by the passed client as `$lib: posthog-node-mcp` (`index.ts:81-85`). Use a dedicated `PostHog` instance for MCP; the current code already does.

---

## 3. `mcp-handler` 2.2.0 (installed) and 2.3.0

- **Construction.** `createMcpHandler(initializeServer, options)` builds `new McpServer(serverInfo, mcpServerOptions)` and calls `initializeServer(server)` **per request**, through the SDK's `createMcpHandler(factory, { legacy: "stateless", onerror, maxSubscriptions })` (`MH/index.mjs:164-206`).
  - The SDK factory receives `{ era, authInfo, requestInfo }` (`SDKd:3854-3881`), but mcp-handler **discards** it: the factory is `async () => {…}` (`MH/index.mjs:196`). Per-user tool registration is therefore impossible through mcp-handler.
  - There's no `responseMode` passthrough and no legacy JSON mode.
- **Stateless vs session mode.** 2.x is stateless only. 2025 GET/DELETE return 405. _"Redis is no longer needed or used"_ (`MH/../README.md:87`). 2.3.0 adds only experimental event subscriptions (`diff` of `index.d.ts`); the legacy leg is unchanged.
- **`withMcpAuth(handler, verifyToken, { required=false, resourceMetadataPath="/.well-known/oauth-protected-resource", requiredScopes, resourceUrl })`** (`MH/index.mjs:307-363`):
  - `verifyToken(req, bearerToken?) => AuthInfo | undefined`.
  - If verification throws, it returns a 401 challenge.
  - `required` and no `authInfo` → 401. Not required and no `authInfo` → passes through **anonymously**. So with `required: false`, a verifier that _returns undefined_ for a bad or expired token silently downgrades the caller to anonymous, and the client never refreshes. **Throw instead** to comply with "Invalid or expired tokens MUST receive a HTTP 401" (spec §Token Handling).
  - It enforces scopes (403) and `expiresAt`, then sets `req.auth = authInfo`. mcp-handler forwards that as `sdkHandler.fetch(req, { authInfo: req.auth, parsedBody })` (`MH/index.mjs:239-242`).
- **Metadata helpers.** `protectedResourceHandler({ authServerUrls, resourceUrl? })` derives `resource` by stripping `/.well-known/<name>` from the request path, serves it with CORS `*` and `Cache-Control: max-age=3600` (`MH/index.mjs:372-397`). Also available: `generateProtectedResourceMetadata`, `metadataCorsOptionsRequestHandler`, `getPublicOrigin` (honors `X-Forwarded-*` and `Forwarded`).
  - **Gotcha:** served at the root path, `resource` becomes the origin and not `https://host/api/mcp`. Serve it at `/.well-known/oauth-protected-resource/api/mcp` (or pass `resourceUrl`), and set the same `resourceMetadataPath`.
  - Next.js route location: `app/.well-known/oauth-protected-resource/route.ts` (mcp-handler `docs/AUTHORIZATION.md`).
- **How `authInfo` reaches tools.** In tools it is `ctx.http?.authInfo`. In the legacy SDK transport, `onmessage(msg, { authInfo, request })` (`SDK/index.mjs:761-780`) feeds the Protocol, which builds `http: { authInfo }` (`SDK/src-D-y6h4N7.mjs:6520`), and `McpServer.buildContext` adds `http.req` (`SDK/mcp-Dw2OlZ1f.mjs:1056-1084`). The README confirms: _"`extra.authInfo` is now `ctx.http?.authInfo`"_.

---

## 4. MCP authorization spec (current: **2026-07-28**; previous: 2025-11-25)

Source: `modelcontextprotocol.io/specification/2026-07-28/basic/authorization` (+ `/authorization-server-discovery`, `/client-registration`, `/changelog.md`).

- **Authorization is OPTIONAL.** When implemented over HTTP, the MCP server is an OAuth 2.1 resource server (RS).
- **Resource server MUST** implement RFC 9728 Protected Resource Metadata (PRM) with `authorization_servers` (at least one), and advertise it either via `WWW-Authenticate: Bearer resource_metadata="…"` on 401 or at a well-known URI.
  - Path-suffixed form: `/.well-known/oauth-protected-resource/<mcp path>`.
  - Root form: `/.well-known/oauth-protected-resource`.
  - Clients try the header first, then path-suffixed, then root.
- **Authorization server MUST** offer RFC 8414 (`/.well-known/oauth-authorization-server`) or OIDC discovery. The `issuer` must equal the identifier the client used to build the well-known URL.
- **PKCE and resource indicators.** The client must use PKCE and send `resource=<canonical MCP URI>` (RFC 8707) on both the authorize and token requests. The RS **MUST** validate audience, accept only tokens issued for itself, and never pass tokens through to upstreams.
- **Client registration**, in the client's priority order: pre-registered credentials, then CIMD (if `client_id_metadata_document_supported: true`), then DCR (`registration_endpoint`), then manual entry.
  - **DCR is deprecated in 2026-07-28** (changelog item 4) but still allowed (MAY).
  - CIMD: `client_id` is an HTTPS URL. The AS fetches it, checks `client_id` equals the URL exactly, validates `redirect_uris`, and caches per HTTP headers.
- **RFC 9207 `iss`.** The AS SHOULD return `iss` on the authorization response and advertise `authorization_response_iss_parameter_supported: true`. Clients compare it to the recorded issuer.
- **Errors.** 401 for missing or invalid tokens; 403 `insufficient_scope` with `scope=` and `resource_metadata=` for step-up. The challenge `scope` is authoritative. `scopes_supported` is the minimal base set. Don't put `offline_access` in the RS challenge or PRM.
- **2026-07-28 also removes** `initialize` and `Mcp-Session-Id`. Every request carries `_meta` (`io.modelcontextprotocol/protocolVersion`, `clientCapabilities`, `clientInfo`), and `server/discover` was added (changelog 1-3). Cross-call state must use server-minted handles in tool arguments, which is exactly PostHog's `conversation_id`.

**Minimal compliant "optional auth" setup.** Anonymous requests get 200. A request carrying a bad or expired token gets 401 with a challenge. An anonymous call to an account-only operation gets 401 with `WWW-Authenticate: Bearer resource_metadata="https://<host>/.well-known/oauth-protected-resource/api/mcp", scope="<scopes>"`. Serve PRM at the path-suffixed URL, plus AS metadata, authorize, token and (optionally) register endpoints. Nothing in the spec forbids mixing anonymous and authenticated access on one endpoint.

**Client behavior**

- **Claude Code** (`code.claude.com/docs/en/mcp.md` §"Authenticate with remote MCP servers"):
  - Flags a server as needing auth on **401 or 403** and offers OAuth in `/mcp`. Shows a startup notice. `claude mcp login <name>` runs the flow from the shell.
  - Supports DCR **and CIMD** (_"discovers these automatically"_), `--client-id`, and `--callback-port`. Refreshes on 401 and retries once.
  - A configured static `headers.Authorization` that gets a 401 is reported as a failure, not an OAuth trigger.
  - **A server that never returns 401/403 is never flagged.** Docs don't say whether `claude mcp login` works without a prior challenge (unverified).
- **VS Code** (`code.visualstudio.com/api/extension-guides/ai/mcp` §Authorization): tries DCR first, then falls back to a manual client-ID/secret prompt. Redirect URIs to allow: `http://127.0.0.1:33418` and `https://vscode.dev/redirect`. No CIMD mentioned.
- **Cursor** (`cursor.com/docs/mcp`): OAuth for servers that require it. Static OAuth via `"auth": { "CLIENT_ID", "CLIENT_SECRET", "scopes" }` when DCR is unsupported. Fixed redirect URIs: `http://localhost:8787/callback` (desktop) and `https://www.cursor.com/agents/mcp/oauth/callback` (web). Discovers scopes from `/.well-known/oauth-authorization-server`.
- **Conclusion:** to support all three clients, offer **CIMD and DCR** on the AS (DCR is still needed for VS Code and likely Cursor). Optional auth works, but sign-in is only _discoverable_ after a 401 or 403.

---

## 5. PocketBase as an OAuth AS, and the sign-in options

- **PocketBase cannot be an OAuth2 authorization server.** It is only an OAuth2 _client_ of providers like GitHub (`pocketbase.io/docs/authentication/` "Authenticate with OAuth2"). The maintainer says no: _"at least for v1 there are no plans to allow using PocketBase as OAuth2 provider … we also currently don't have a definition for 'scopes'"_ (github.com/pocketbase/pocketbase/discussions/1144; issues #3567, #4456). Discussion #7451 (2026-01) covers exactly this MCP use case.
  - Third-party Go plugin: `benjamesfleming/pocketbase-ext-oauth2` (fosite; PKCE, DCR, RFC 9728). It needs a **custom-compiled PocketBase binary**, but this repo downloads the release binary (`web/backend/pocketbase-release.json` → `0.40.5`; `scripts/download-pocketbase.mjs`) and uses JS `pb_hooks`. Not a fit.
- **Useful PocketBase primitives (v0.23+ API, current docs)**
  - Impersonate (superuser only): `pb.collection("users").impersonate(userId, durationSec)` returns a **non-renewable** token (`pocketbase.io/docs/api-records/` "Impersonate"; `docs/authentication/` "Users impersonation").
  - In `pb_hooks`: `record.newStaticAuthToken(optDurationSec)` (non-renewable), `record.newAuthToken()`, and `$app.findAuthRecordByToken(token, "auth")` to verify (`pocketbase.io/docs/js-records/`). Also `$apis.requireAuth()` and `e.auth` (`docs/js-routing/`).
  - **Revocation is coarse.** Tokens die only when the record's token key changes (password change or tokenKey reset), which also logs the user out of the site (docs/authentication "API keys" note). Granular MCP revocation needs your own token table.
- **How the site authenticates today.** Client-side `pb.collection("users").authWithOAuth2({ provider: "github" })` (`web/src/components/login-modal.tsx:107`) uses the SDK's default localStorage store. **There is no server cookie** (`web/src/lib/pb.ts:88`). Server code verifies a client-supplied PB token with `createServerPB().authStore.save(token); collection("users").authRefresh()` (`web/src/app/actions/github.ts:8-10`). An MCP authorize page therefore has to be a **client page** that reads `pb.authStore` (or opens the existing LoginModal) and POSTs the PB token to a server route.
- **What `@modelcontextprotocol/server` v2 ships for auth: resource-server pieces only.** `verifyBearerToken`, `requireBearerAuth({ verifier, requiredScopes, resourceMetadataUrl })`, `bearerAuthChallengeResponse`, `oauthMetadataResponse`, `buildOAuthProtectedResourceMetadata`, `getOAuthProtectedResourceMetadataUrl`, `OAuthTokenVerifier`, `requireScopes` and per-tool `scopeChallenge` (`SDK/index.d.mts:52-271`; `SDKd:2798-2814`).
  - **There is no `mcpAuthRouter` or `ProxyOAuthServerProvider`.** Those were v1 `@modelcontextprotocol/sdk/server/auth`; grep finds 0 matches in `SDK/`.
  - `verifyBearerToken` **rejects tokens without `expiresAt`** (`SDK/mcp-Dw2OlZ1f.mjs:510-520`), so personal tokens must carry an expiry.
  - `requireScopes` ignores unauthenticated requests (`SDK/mcp-Dw2OlZ1f.mjs:741-742`). A custom `scopeChallenge` that returns a challenge for anonymous callers produces a 403 `insufficient_scope` (`SDK/mcp-Dw2OlZ1f.mjs:774-779`). It is evaluated on both the modern (`SDK/index.mjs:1391`) and legacy (`SDK/index.mjs:446`) legs.
- **better-auth MCP / OIDC provider plugin:** this would introduce a second user store and session system next to PocketBase. It isn't in the dependencies; rejected on the "reuse existing tools" rule.

| Option                                  | Effort                             | UX                                              | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------- | ---------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a) Minimal OAuth 2.1 AS in Next.js** | ~6 routes plus 1 PB collection     | One-click in Claude Code, Cursor and VS Code    | Implements: AS metadata, PRM, `/oauth/authorize` client page reusing LoginModal, `POST /api/oauth/authorize` (verify the PB token via `authRefresh`, check client and redirect, issue code), `POST /api/oauth/token` (`authorization_code` with S256 PKCE plus `refresh_token`), `POST /api/oauth/register` (DCR). Access token: HMAC-signed JWT with `node:crypto` (no new dependency), `{sub: pbUserId, aud: resource, scope, exp: 1h}`, verified locally. Codes and refresh tokens stored hashed in PB `mcp_grants`, which also gives "connected apps" revocation. CIMD: fetch and validate the `client_id` URL. Stateless DCR: `client_id` = signed blob of the registration metadata, so no client table. |
| **(b) Personal API tokens**             | 1 PB collection plus a settings UI | Copy-paste `--header "Authorization: Bearer …"` | Works everywhere headers are supported. Not discoverable; no 401-driven sign-in. Shares the same verifier as (a).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| (c) PB impersonate tokens as MCP tokens | Small                              | Same as (a)                                     | Leaks PB superuser-minted tokens to clients, and they can't be revoked per grant. They would also be usable directly against the PB API, which violates "MUST only accept tokens issued for itself" (audience). **Don't.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| (d) Go AS plugin / better-auth          | Large                              | Good                                            | Infra change or a second auth system.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

**Recommendation: (a), with (b) as an optional later add-on using the same verifier.** When a tool needs to act on PocketBase as the user (e.g. submit icon, list my submissions), mint a short-lived server-side PB token through `impersonate(userId, 300)` with a server superuser credential (the repo already uses `PB_ADMIN`/`PB_ADMIN_PASS` in scripts). Alternatively, add a `pb_hooks` route that verifies a shared secret and calls `newStaticAuthToken(300)`. Neither token is ever exposed to the MCP client.

---

## 6. `@modelcontextprotocol/server` v2 surface (2.1.0)

- **`registerTool(name, { title, description, inputSchema, outputSchema, annotations, icons, scopeChallenge, _meta }, cb)`** (`SDKd:3359-3380`).
  - Schemas are Standard Schema objects (`z.object(...)`). The raw shape form is deprecated.
  - `cb(args, ctx) => CallToolResult | InputRequiredResult`. Return `structuredContent` when `outputSchema` is set; it is validated (`SDKd:3285-3289`).
  - The returned `RegisteredTool` has `enable()`, `disable()`, `update({...})` and `remove()` (`SDKd:3526-3565`).
- **`registerResource(name, uri | ResourceTemplate, { …metadata, cacheHint, scopeChallenge }, read)`** (`SDKd:3321-3328`). `new ResourceTemplate("icon://{name}", { list, complete: { name: (v) => [...] } })` (`SDKd:3473-3500`). `cacheHint { ttlMs, cacheScope: 'public'|'private' }` applies on 2026-07-28 (`SDKd:2673-2691`).
- **`registerPrompt(name, { title, description, argsSchema, icons, scopeChallenge, _meta }, cb)`** (`SDKd:3407-3424`). `completable(schema, (value, ctx) => string[])` drives prompt-argument completions (`SDK/index.d.mts:6-46`).
- **Server options and icons.** `ServerOptions` (`capabilities`, `instructions`, …) is at `SDKd:2816ff`. `serverInfo.icons` is already used in `web/src/mcp/server-info.ts`.
- **Handler context `ctx`** (`SDKd:2108-2263`):
  - `ctx.sessionId` (the transport's).
  - `ctx.mcpReq.{ id, method, _meta, envelope (2026 clientInfo/protocolVersion), inputResponses, requestState, signal, send, notify, log (deprecated), elicitInput (deprecated; throws on 2026-era; legacy only), requestSampling (deprecated) }`.
  - `ctx.http.{ authInfo, req (WHATWG Request), closeSSE, closeStandaloneSSE }`.
  - On 2026-07-28, elicitation becomes `inputRequired(...)` multi-round-trip (`SDKd:2230-2235`; exported `inputRequired`, `inputResponse`).
- **`AuthInfo`** = `{ token, clientId, scopes, expiresAt?, resource?: URL, resourceMetadataUrl?, extra? }` (`SDKd:774-813`).
- **`createMcpHandler(factory, { legacy: 'stateless'|'reject', responseMode: 'auto'|'sse'|'json', onerror, bus, maxSubscriptions, keepAliveMs, maxRequestBodySize })`** returns `{ fetch(req, { authInfo, parsedBody }), close, notify, bus }` (`SDKd:3902-4008`).
  - `factory(ctx: { era, authInfo, requestInfo })` is called once per request (`SDK/index.mjs:1053-1057, 1362-1366`).
  - `isLegacyRequest(request)` exposes the same routing decision, so you can hand-wire the legacy leg (`SDKd:4029-4098`).
  - The entry does **no** token verification and no Origin/Host checks; put those in front (`SDKd:4099-4142`).

---

## Recommended architecture

```
GET/POST /api/mcp  (route.ts: rate-limit + body bound as today)
  ├─ authInfo = await optionalBearer(req)          // header absent → undefined; present+bad/expired → 401 challenge
  ├─ if anonymous && tools/call targets AUTH_TOOLS → 401 WWW-Authenticate(resource_metadata, scope)
  ├─ if (await isLegacyRequest(req)) → legacyLeg(req, authInfo)      // 2025-11-25 clients
  │      new McpServer → buildServer(server, authInfo) → instrument(server, ph, opts)
  │      transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  │      await server.connect(transport); res = await transport.handleRequest(req, { authInfo, parsedBody }); close both
  │      → PostHog token rides Mcp-Session-Id: one $session_id + client name/version per connection
  └─ else modern.fetch(req, { authInfo })   // modern = createMcpHandler(factory, { legacy: "reject" }) from @modelcontextprotocol/server
         factory({ authInfo }) → same buildServer + instrument → conversation_id handles carry the session
finally: after(() => posthog.flush())
```

- **Drop mcp-handler's `createMcpHandler`.** It hides `ctx.authInfo` from the factory and forces SSE on the legacy leg. Its helpers (`getPublicOrigin`, `generateProtectedResourceMetadata`) are optional; the SDK's `bearerAuthChallengeResponse` and `buildOAuthProtectedResourceMetadata` cover the same ground.
- **Upgrade to `@posthog/mcp@0.22.2`** (0.22.3 after 2026-10-16) and call `instrument(mcpServer /* not .server */, posthog, {...})` with:
  - `identify: (_r, extra) => { const a = extra?.http?.authInfo; return a ? { distinctId: a.extra.userId, properties: { username, admin } } : null }`. Use the PB user ID, which is the same distinct ID as the web app.
  - `context` left at its default (on), optionally with a custom `description`.
  - `captureModel` and `enableConversationId` on (defaults). Use `reportMissing: true` **or** `collectFeedback: true`, not both.
  - `serverBuild: process.env.GIT_SHA` (or the Railway/Dokploy SHA variable).
  - `beforeSend`: stop dropping `$mcp_tools_list` (it feeds "advertised but never called" and harness views). Keep the `mcp-remote-fallback-test` filter.
- **Auth.** A minimal OAuth 2.1 AS in Next.js (option (a) in §5):
  - `app/.well-known/oauth-protected-resource/api/mcp/route.ts` (PRM with `resource=https://<host>/api/mcp`) plus the root fallback.
  - `app/.well-known/oauth-authorization-server/route.ts` with `client_id_metadata_document_supported: true`, `registration_endpoint`, `code_challenge_methods_supported: ["S256"]`, `token_endpoint_auth_methods_supported: ["none"]`, and `authorization_response_iss_parameter_supported: true`.
  - `app/oauth/authorize/page.tsx` (client page: LoginModal and consent), `app/api/oauth/{authorize,token,register}/route.ts`.
  - A PB collection `mcp_grants` holding hashed codes and refresh tokens, `userId`, `clientId`, `scopes`, `expiresAt` and `revoked`.
- **Tools.** Keep the public icon tools for anonymous callers. Register account tools in the factory only when `authInfo` is present, or always list them and 401 anonymous callers so clients trigger sign-in.
  - Add `annotations: { readOnlyHint: true }`, an `outputSchema` with `structuredContent` on read tools, `icons`, and `_meta.category` (which becomes `$mcp_tool_category`).
  - Add resources such as `icon://{name}` (a `ResourceTemplate` with `complete`) and a prompt such as `pick-icons-for-stack`.

## Open risks

- **Client protocol mix is unknown.** If most clients have already moved to 2026-07-28, the session token never applies. Correlation then depends on agents echoing `conversation_id`, and the argument description tells them to avoid parallel calls until they have it. Measure with `$mcp_protocol_version`.
- **The JSON-only legacy leg drops mid-call notifications** (progress/logging). That's fine for the current fast tools, but it's a regression for any future streaming tool.
- **Hand-wiring the legacy leg** means re-implementing what `createLegacyStatelessFallback` does: 405 on GET/DELETE, teardown on abort, 415 content-type checks (`SDKd:4054-4055`). This is a small but real surface to test.
- **Token-session identity gap.** When identity resolves only after `initialize`, there's no `$identify`, so pre-auth anonymous events aren't merged (`internal.ts:172-175`). Bearer tokens arrive at `initialize`, so this is minor.
- **Optional auth is not discoverable.** Clients only offer sign-in after a 401 or 403. Claude Code behavior for `claude mcp login` without a prior challenge is undocumented. VS Code needs DCR plus fixed redirect URIs (`127.0.0.1:33418`, `vscode.dev/redirect`). Cursor's static OAuth uses `localhost:8787/callback`.
- **`withMcpAuth(required:false)` bypass.** A verifier that returns `undefined` on bad tokens silently serves the caller anonymously, which is non-compliant. The verifier must throw.
- **PocketBase revocation is all-or-nothing.** Never hand PB auth or impersonation tokens to MCP clients; this also covers the audience rule.
- **Single-instance assumption.** One-time codes and refresh tokens must live in PocketBase, not in memory, if the web app ever scales horizontally.
- **Beta SDK.** `@posthog/mcp` is pre-1.0 and minor releases may break, so pin the exact version. 0.17 changed tool schemas and results by default (`llm_model` argument, conversation block), which tests that snapshot `tools/list` will see.
- **Schema features.** PostHog can't inject `conversation_id` or `context` into `oneOf`/`anyOf`/`$ref` input schemas, so keep tool inputs as plain `z.object`.
