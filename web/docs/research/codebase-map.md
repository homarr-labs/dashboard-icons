# Codebase Map — Dashboard Icons (`web/`)

Historical snapshot taken before the MCP v2 implementation on 2026-10-15. MCP transport, tools, authentication and replay storage have since changed; use [MCP.md](../MCP.md) and [MCP-AUTH.md](../MCP-AUTH.md) for current behavior.

Scope: Next.js 16 app at `web/` (repo root also holds native assets: `svg/`, `png/`, `webp/`, `metadata.json`, `meta/`, `scripts/`). PocketBase backend lives at `web/backend/`. This map targets the MCP rebuild + user sign-in work.

Path convention: paths are relative to `web/` unless noted.

---

## 1. Current MCP implementation (end to end)

### 1.1 HTTP route — `src/app/api/mcp/route.ts`

- `runtime = "nodejs"`, `maxDuration = 30` (`:7-8`). Handler created at module scope (`:10`), so it is shared across requests in a process.
- `SECURITY_HEADERS` = `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (`:11-15`); applied to every response incl. 429 (`applySecurityHeaders` `:24-28`).
- Exports `GET` and `POST` both = `guardedHandler` (`:104-105`). **No auth, no CSRF/origin check** — fully public. Protocol handling is stateless (Streamable HTTP via `mcp-handler`); each request builds a fresh MCP server.
- `guardedHandler(req)` (`:71-102`):
  1. `getClientIp(req.headers)` → `checkRateLimit(ip, "request")` (60/min); 429 w/ `Retry-After` (`:72-77`).
  2. POST only: `readBoundedPostRequest` enforces 64 KiB `MAX_REQUEST_BODY_BYTES` from `validate.ts` → 413 (`:39-69`, `:79-84`). Checks declared `content-length` **and** re-reads the stream to catch understated lengths.
  3. POST only: `isToolCallRequest` clones + JSON-parses body; `method === "tools/call"` → second bucket `checkRateLimit(ip, "tool")` (30/min) → 429 (`:30-37`, `:86-91`). Invalid JSON ⇒ treated as non-tool.
  4. `mcpHandler(req)`; `flushDashboardIconsMcpAnalytics()` in `finally`; security headers applied (`:94-101`).

### 1.2 Rate limit — `src/lib/icons/rate-limit.ts`

- In-memory `Map` buckets keyed `${ip}:${scope}` (`:11`, `:22-24`). Limits `request:60`, `tool:30`, 60 s window (`:3-8`).
- `getClientIp` = first `x-forwarded-for` hop, else `x-real-ip`, else `"unknown"` (`:26-30`).
- Bypass: `process.env.MCP_RATE_LIMIT_ENABLED === "false"` (`:33-35`).
- Test hooks: `resetRateLimitsForTests`, `getRateLimitBucketCountForTests` (`:54-61`).

### 1.3 Body bound — `src/lib/icons/validate.ts:9`

`MAX_REQUEST_BODY_BYTES = 64 * 1024`.

### 1.4 Handler — `src/mcp/handler.ts`

- `createDashboardIconsMcpHandler()` → `createMcpHandler(init, options)` from `mcp-handler` ^2 (`:6-18`).
- init registers **tools first**, then analytics (comment `:9-10`: `@posthog/mcp` low-level instrumentation clashes with `registerTool`'s `tools/call` handler otherwise).
- options: `serverInfo: getDashboardIconsServerInfo()`, `verboseLogs: process.env.MCP_VERBOSE_LOGS === "true"`.

### 1.5 Server info — `src/mcp/server-info.ts`

`getDashboardIconsServerInfo(webUrl = WEB_URL)` → `{name:"dashboard-icons", title:"Dashboard Icons", version:"1.0.0", websiteUrl, description, icons:[favicon-96x96.png, favicon.svg]}` (`:3-23`).

### 1.6 Tools — `src/mcp/tools.ts`

`registerDashboardIconsTools(server)` registers 4 tools via `server.registerTool(name, {title,description,inputSchema}, handler)`; results wrapped by `jsonContent` = `{content:[{type:"text",text:JSON.stringify(data)}]}` (`:5-7`):

| Tool (`:10-66`) | inputSchema         | calls                                                                   |
| --------------- | ------------------- | ----------------------------------------------------------------------- |
| `search_icons`  | `searchIconsSchema` | `searchIcons(query, limit, category)`                                   |
| `get_icon`      | `getIconSchema`     | `getIconByName(name)`; null → `{error:"not_found",...}`, `isError:true` |
| `get_icon_url`  | `getIconUrlSchema`  | `getIconUrl(name, format, theme)`; null → not_found+isError             |
| `suggest_icon`  | `suggestIconSchema` | `suggestIcons(service_name, limit)`                                     |

### 1.7 Validation — `src/lib/icons/validate.ts`

- `ICON_NAME_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/`; limits `MAX_QUERY_LENGTH 100`, `MAX_NAME_LENGTH 80`, `MAX_LIMIT_SEARCH 50`, `MAX_LIMIT_SUGGEST 20`, `MAX_CATEGORY_LENGTH 50` (`:3-9`).
- `assertIconName` trims + blocks `..` `/` `\` `\0`, enforces kebab slug, throws `ValidationError` (`:18-30`).
- Zod schemas (`:43-70`): `searchIconsSchema` (query required ≤100, `limit` default 20 ≤50, optional category ≤50); `getIconSchema` (`iconNameField` superRefine→`assertIconName`); `getIconUrlSchema` (`format` enum svg/png/webp default svg, `theme` enum default/light/dark default default); `suggestIconSchema` accepts `service_name` **or** `name` alias, `.transform` to `{service_name, limit default 5 ≤20}`.

### 1.8 Service / search / urls / types

- `src/lib/icons/service.ts` (`import "server-only"`):
  - Metadata cache: process-global `globalThis.__dashboardIconsMetadata` + `__dashboardIconsMetadataPending` (`:26-30`), TTL 900 s (`:13-14`), retry backoff 60 s (`:15`), ETag conditional fetch w/ `If-None-Match` (`:32-57`), 10 s timeout (`:12`).
  - Source: `DASHBOARD_ICONS_METADATA_PATH` (local file; **blocked in production** `:64-74`) else remote `METADATA_URL` (`:36`).
  - `getAllIcons()` (`:80-108`) dedupes concurrent refreshes, serves stale on failure, `unstable_rethrow`.
  - `searchIcons(query, limit=20, category?)` → `{results:{name,aliases,categories,score}[], total}` (`:121-137`).
  - `getIconByName(name)` → `IconDetail|null` incl. `urls` (`:139-154`).
  - `getIconUrl(name, format, theme)` resolves light/dark color-variant filenames from `icon.colors?.light/dark` (`:156-182`).
  - `suggestIcons(serviceName, limit=5)` → `{suggestions:{name,score,url}[]}` (`:184-198`).
  - `warmMetadataCache`, `clearMetadataCacheForTests` (`:76-78`, `:200-203`).
- `src/lib/icons/search.ts` (pure, no env): `normalizeForSearch`, `levenshteinDistance`, `calculateStringSimilarity`, `containsCharsInOrder`, `fuzzySearch`, `scoreIcon` (weights name 2.0/alias 1.5/category 1.0), `filterAndSortIcons` (score threshold >0.7, native-first tiebreak, sort options `relevance|alphabetical-asc|alphabetical-desc|newest`).
- `src/lib/icons/urls.ts`: `buildIconUrl(name, format, theme)` → `${BASE_URL}/${format}/${file}.${format}`; `buildIconUrls(name, icon)` adds `light`/`dark` when `icon.colors`.
- `src/lib/icons/types.ts`: `SearchResult`, `IconDetail`, `Suggestion`, `IconUrlResult`.

### 1.9 Analytics — `src/mcp/analytics.ts`

- PostHog client from `@posthog/mcp` `PostHog` + `instrument`; key `NEXT_PUBLIC_POSTHOG_KEY`, disabled if `NEXT_PUBLIC_DISABLE_POSTHOG === "true"` (`:5-11`). Host hard-coded `https://eu.i.posthog.com`.
- Filters (`:15-60`): drop `$mcp_tools_list` entirely; sample `$mcp_initialize` at 10% deterministic FNV-1a on `distinct_id` (`isSampledIn` `:41-45`); drop client `mcp-remote-fallback-test` (`:25`).
- `instrumentDashboardIconsMcpAnalytics(server)` instruments the **low-level** `server.server` (`context:false`, `enableExceptionAutocapture:false`, `beforeSend`) because `@modelcontextprotocol/server` v2 `McpServer` has no `tool()` (`:62-73`).
- `flushDashboardIconsMcpAnalytics()` flushes, swallows errors (`:75-78`). Note comment `:104` in docs says "flushed after each serverless invocation" — actually flushed per request here.

### 1.10 MCP tests (what each asserts)

| File                                              | Asserts                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/mcp/__tests__/route.test.ts`                 | 429 after 60 GETs; 413 for declared/undeclared/lying `content-length` oversize; 200 empty POST; 429 after 30 tool calls; invalid JSON ⇒ non-tool path + handler+flush called; security headers on 200; default `Retry-After: 60` for both scopes. Mocks `@/mcp/handler` + `@/mcp/analytics` via `vi.hoisted`. |
| `src/mcp/__tests__/handler.test.ts`               | tools + analytics registered; `createMcpHandler` called with exactly 2 args `[init, {serverInfo, verboseLogs:false}]`; returns function.                                                                                                                                                                      |
| `src/mcp/__tests__/tools.test.ts`                 | exactly 4 `registerTool` calls; each tool's JSON shape incl. not_found `isError`; `suggest_icon` `name`→`service_name` alias transform passed to service.                                                                                                                                                     |
| `src/mcp/__tests__/analytics.test.ts`             | no key ⇒ no PostHog/instrument/flush; disable flag respected; instrument+flush called with EU host; flush rejection swallowed.                                                                                                                                                                                |
| `src/mcp/__tests__/analytics-integration.test.ts` | real handler wiring: `initialize`/`tools/list`/`tools/call` over SSE (`data:` line) succeed; serverInfo name; tool list contains `search_icons`; `instrument` called 3× (per-request server) on the low-level server (`registerTool` undefined, `setRequestHandler` function).                                |
| `src/mcp/__tests__/server-info.test.ts`           | favicon icon URLs.                                                                                                                                                                                                                                                                                            |
| `src/lib/icons/__tests__/validate.test.ts`        | `assertIconName` accept/reject; schema boundaries/defaults/alias precedence/empty coercion.                                                                                                                                                                                                                   |
| `src/lib/icons/__tests__/search.test.ts`          | pure scoring + sorting + filtering + native priority.                                                                                                                                                                                                                                                         |
| `src/lib/icons/__tests__/service.test.ts`         | search/getIconByName/getIconUrl/suggestIcons; metadata cache behaviours (concurrent dedupe, stale-serve, cold retry, ETag/304, local path, prod block). Mocks `node:fs/promises` + global `fetch`.                                                                                                            |
| `src/lib/icons/__tests__/urls.test.ts`            | URL building incl. light/dark + webp + absolute-base fallback.                                                                                                                                                                                                                                                |
| `src/lib/icons/__tests__/rate-limit.test.ts`      | `getClientIp`, per-scope limits, window reset, bucket cleanup, env disable.                                                                                                                                                                                                                                   |
| `src/lib/__tests__/mcp-setup-config.test.ts`      | endpoint + snippet builders for every client.                                                                                                                                                                                                                                                                 |
| `tests/mcp-setup.spec.ts` (Playwright)            | dialog contents, all clients listed, Claude variants, copy button, docs links; entry points hero + `/icons`; absent on icon detail pages.                                                                                                                                                                     |

Supporting libs/UI/docs: `src/lib/mcp-setup-config.ts` (`MCP_TOOLS`, `MCP_CLIENT_GUIDES` for vscode/cursor/claude/windsurf/zed/custom, snippet builders), `src/components/add-mcp-button.tsx`, `src/components/mcp-setup-dialog-content.tsx`, `src/components/mcp-highlighted-code.tsx`, `docs/MCP.md` (declares v1 = native icons only, no external sources, no auth).

---

## 2. Auth

### 2.1 PocketBase client — `src/lib/pb.ts`

- `PUBLIC_PB_URL = NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090"` (browser-reachable) (`:5`); `serverUrl() = PB_URL || PUBLIC_PB_URL` (server-only) (`:6-8`).
- Browser singleton `pb = new PocketBase(PUBLIC_PB_URL)` (`:88`); `createServerPB()` (`:90-92`); `getPocketBaseUrl()` (`:94-96`).
- SDK **persists auth to `localStorage`** by default (no cookie). Confirmed by client code reading `pb.authStore.record`/`.token`. `src/lib/__tests__/pb.test.ts` asserts SSR asset URL stays public while server queries use `PB_URL`.
- Typed records: `User` (`:10-19`, has `admin?`, `github_id?`), `Submission` (`:21-50`, status union `approved|rejected|pending|added_to_collection`, `extras.{aliases,categories,base,colors,wordmark}`, `target_submission?`, `admin_comment`, `description`), `CommunityGallery` (`:52-78`), `ExternalIcon` from `@/types/icons`.

### 2.2 How users sign in

- `src/components/login-modal.tsx` (`LoginModalContent`):
  - Register: `pb.collection("users").create({username,email,password,passwordConfirm})` then `authWithPassword` (`:62-68`).
  - Login: `authWithPassword(email, password)` (`:77`). Identity fields accept username **or** email.
  - GitHub: `pb.collection("users").authWithOAuth2({ provider: "github" })` (`:107-109`).
  - PostHog identify + capture `user_registered` / `user_logged_in` / `user_oauth_login` (`:70-84`, `:111-115`).
- `src/components/user-button.tsx` `LoginPopup` also uses `authWithPassword` (`:141-144`).
- OAuth app setup documented in `README.md` (`:86-110`): callback `http://localhost:8090/api/oauth2-redirect`, prod `https://dashboardicons.com/pb/api/oauth2-redirect`.
- `src/components/header.tsx` `:64-111`: reads `pb.authStore.isValid/record`, `pb.authStore.onChange`, avatar URL `${pb.baseURL}/api/files/_pb_users_auth_/${id}/${avatar}`; sign-out `pb.authStore.clear()` + PostHog reset.

### 2.3 Auth state hooks / contexts

- **No React auth context/provider.** Auth is read directly from the PB singleton.
- `src/hooks/use-posthog-auth.ts`: `useEffect` identifies/resets PostHog on `pb.authStore.onChange` (mounted by `PostHogProvider`).
- `useAuth()` in `src/hooks/use-submissions.ts:265-303`: React Query `["auth"]`; valid ⇒ fetches `pb.collection("users").getOne(userId)` and returns `{isAuthenticated, isAdmin: user.admin===true, userId}`; 5 min stale.
- `src/app/submit/page.tsx` gates on `pb.authStore.isValid` + onChange.

### 2.4 Server-side auth

- **No cookies, no Next.js session, no middleware auth.** `src/proxy.ts` only does host canonicalization / HTTPS / tracking-param stripping (`:7-41`); matcher excludes `api/`.
- Server Actions trust a **raw PB token passed from the client** (`pb.authStore.token`) and re-validate against PB:
  `src/app/actions/github.ts` `:8-11`: `createServerPB()`, `authStore.save(authToken,null)`, `authRefresh()`, `if (!auth.record.admin) throw`. Then `pb.send("/api/dashboard/publish/dispatch", …)`.
- Admin-only backend routes are guarded in PB hooks, not in Next.js.

### 2.5 PocketBase schema (`web/backend/pb_migrations/*`, `web/backend/pb_hooks/*`)

Latest migration `1791800000_submission_proposals.js` (Oct 2026); prior `1790000000_dashboard_workspace.js`.

| Collection                                                  | Type     | Key fields                                                                                                                                                                                                                                                                                                                                | API rules (final)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users` (`_pb_users_auth_`)                                 | auth     | `username` (min5/255, required), `email`, `emailVisibility`, `verified`, `tokenKey`, `name`, `avatar`, **`admin` bool** (`1759313082+`)                                                                                                                                                                                                   | `createRule`: `@request.body.admin = false \|\| @request.body.admin = null` (`1759335187`); `updateRule`: `id = @request.auth.id && (@request.body.admin = false \|\| @request.body.admin = admin)` (`1759320673`); `listRule`/`viewRule`: `id = @request.auth.id \|\| @request.auth.admin = true` (`1759324878/1759324890`); `manageRule`: null (`1759335166`). `passwordAuth.identityFields = ["username","email"]` (`1759323526`); `oauth2.mappedFields.name` (`1759312120`); `authAlert` off (`1759312218`) |
| `submissions` (id `pbc_632646243`, originally `submission`) | base     | `name` text(≤128), `assets` file(≤99; image/png,image/svg+xml; required), `created_by` rel users, `status` select `[approved,pending,rejected,added_to_collection]`, `extras` json, `approved_by` rel users, `admin_comment`, `description` text(≤10000) (`1790000000`), **`target_submission` rel self** (`1791800000`), created/updated | `list`/`view`/`create`/`delete`: `@request.auth.id = created_by.id \|\| @request.auth.admin = true`; `updateRule` final: `@request.auth.id = created_by.id \|\| @request.auth.admin = true` (`1791800000`, supersedes the brief `\|\| status='rejected'` from `1778059131`). Indexes: `idx_submissions_name ON (name, created DESC, id DESC)` (non-unique) + dashboard indexes                                                                                                                                  |
| `community_gallery` (id `pbc_2668482079`)                   | **view** | `viewQuery` selects from `submissions s JOIN users u` → `s.target_submission, id, name, status, assets, updated, created, extras, admin_comment, description, u.github_id AS created_by_github_id, u.username AS created_by`                                                                                                              | `listRule=""`, `viewRule=""` (**public read**, `1759330033`); create/update/delete null                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `external_icons`                                            | base     | `source` select `[selfhst,lobehub,simpleicons]`, `slug`, `name`, `aliases` json, `categories` json, `formats` json, `variants` json, `url_templates` json, `license`, `attribution`, `source_url`, `updated_at_source`, `brand_color`, `guidelines_url`, `license_url`, `stable_svg_url`, `upstream_version`, `upstream_data`             | `listRule=""`,`viewRule=""` (public); create/update/delete null. Unique `(source, slug)`                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `submission_events`                                         | base     | `submission_id`, `submission_name`, `actor_id/name/kind`, `action`, `changes` json, `feedback`, `operation_id`, `batch_id`                                                                                                                                                                                                                | `listRule`/`viewRule` = `@request.auth.id != "" && @request.auth.admin = true` (admin only); create/update/delete null (written by hooks)                                                                                                                                                                                                                                                                                                                                                                       |
| `publish_batches`                                           | base     | `requester_id/name`, `items` json, `state` text, `run_id`, `run_url`, `message`, `commit_sha`, `active` bool                                                                                                                                                                                                                              | admin-only list/view; unique partial index `active=1`                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

Hooks:

- `pb_hooks/dashboard.pb.js` — wires model+request hooks and custom routes: `GET /api/dashboard/summary`, `POST /api/dashboard/review`, `POST /api/dashboard/publish/{id}/result` (superuser only), `/api/dashboard/publish/dispatch`, `/api/dashboard/publish/reconcile` (all `$apis.requireAuth()`).
- `pb_hooks/dashboard.js` — `audit`, `guard` (ownership/admin/proposal rules), `requireAdmin`, `summary`, `review`, `reserve`, `updateBatch`, `reserved`, `context`, `dispatch` (GitHub workflow_dispatch), `reconcile` (polls GitHub runs), `deleteRecord`. Guards also enforce proposal-name/target invariants.
- `pb_hooks/submission_update_email.pb.js` + `submission-email.js` — email notifications; bulk rejection route `POST /api/submissions/bulk-rejection-email` (`$apis.requireAuth("users")`, admin check + `X-Bulk-Reject-Id` header).

---

## 3. Domain features → candidate MCP tools / resources / prompts

Legend: **S**=server-only, **C**=client-only, **B**=both; auth column = needs a signed-in user.

| Feature             | Functions / entry points                                                                                                                                                                                                                                                                                                                                                                                                                      | S/C                                    | Auth                               | Notes for MCP                                                                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native icons        | `service.ts`: `getAllIcons, searchIcons, getIconByName, getIconUrl, suggestIcons` (`:80-198`); `api.ts`: `getAllIcons, getIconNames, getIconsArray, getIconData, getAuthorData, getTotalIcons, getRecentlyAddedIcons, computeRelatedIcons`                                                                                                                                                                                                    | S                                      | no                                 | Already the tool surface. `api.ts` adds recent/total/related/author — good new tools/resources.                                                                                                                                     |
| External icons      | `external-icons.ts`: `getExternalIcons` (React `cache` + 15 min mem TTL), `getExternalIconBySourceAndSlug`, `getExternalIconBySlug`, `listExternalIcons({q,category,page,perPage})`, `searchAllSources(q)`; `external-icon-urls.ts`: `canResolveExternalIconUrl, resolveExternalIconUrl, getExternalIconPreviewUrl`; sources `EXTERNAL_SOURCES` (`constants.ts:28-65`)                                                                        | S (urls are pure)                      | no (PB public read)                | **Docs/UI currently say external sources are "coming soon"** — high-value additions: list/search external, resolve external URLs.                                                                                                   |
| Community gallery   | `community.ts`: `fetchCommunitySubmissions`, `getCommunitySubmissions` (`unstable_cache`, 900 s, tag `community-gallery`), `getCommunitySubmission`, `getCommunityGalleryRecordByName`, `getCommunityGalleryRecord`; public read                                                                                                                                                                                                              | S                                      | no                                 | Could expose "community/browse pending icons".                                                                                                                                                                                      |
| Submissions         | create: `submit-proposal.ts:submitProposal(data)` (client, requires auth), `use-icon-submission-form.ts`, `editable-icon-details.tsx`; list/status: hooks in `use-submissions.ts` (`useSubmissions`, `useApproveSubmission`, `useBulkApprove/Reject`, `useRejectSubmission`, `useExistingIconNames`); trigger publish `useTriggerWorkflow`/`useBulkTriggerWorkflow` via `actions/github.ts`; list own: `pb.collection("submissions").getList` | C (+S action)                          | **yes**                            | "Submit icon", "my submissions", "submission status" tools need auth (PB token).                                                                                                                                                    |
| Dashboard workspace | `app/dashboard/page.tsx` + `components/dashboard/workspace.tsx`; data via `hooks/use-dashboard.ts` (`useDashboardSubmissions`, `useDashboardSummary`, `useDashboardActivity`, `usePublishBatches`, `useDashboardUpdates`) using `pb.send("/api/dashboard/*")`; server routes in `pb_hooks/dashboard.*`; types `lib/dashboard/types.ts`; views overview/review/publish/submissions/activity                                                    | C (S routes)                           | **yes** + admin for review/publish | **What it is:** admin review/publish console + contributor "My submissions" (non-admin forced to `submissions` view, `workspace.tsx:50`). Candidate admin MCP tools: pending queue, approve/reject, publish batches, activity feed. |
| Categories          | derived from native metadata + external icons; no collection                                                                                                                                                                                                                                                                                                                                                                                  | B                                      | no                                 | Could expose "list categories"/"icons by category".                                                                                                                                                                                 |
| Colors / SVG        | `svg-color-utils.ts` (`normalizeColor`, `extractColorsFromSvg`, `applyColorMappingsToSvg`, `ensureSvgAttributes`; **browser APIs** DOMParser/XMLSerializer); `rasterize-svg.ts` `rasterizeRemoteSvg(url,size,fillColor)` (server, `sharp`)                                                                                                                                                                                                    | svg-color-utils **C**, rasterize **S** | no                                 | SVG recolor likely needs a server-safe port; rasterize already server-side (used by simpleicons PNG route).                                                                                                                         |
| Icon URL building   | `icons/urls.ts` (CDN), `external-icon-urls.ts`, `icon-url.ts:getIconImageUrl`                                                                                                                                                                                                                                                                                                                                                                 | B                                      | no                                 | Core of `get_icon_url`; external preview URL resolution worth exposing.                                                                                                                                                             |

Auth mechanics for any authed tool: PB tokens are opaque and currently only validated via `createServerPB().authStore.save(token,null); authRefresh()` (`actions/github.ts:8-10`). MCP has no notion of the PB token today — a sign-in flow would need to introduce one (e.g. bearer header → `pb.send`/`authRefresh`).

---

## 4. PostHog usage

### 4.1 Client

- `src/components/PostHogProvider.tsx` mounted in `src/app/layout.tsx:155-165`. `posthog.init(NEXT_PUBLIC_POSTHOG_KEY, {ui_host:"https://eu.posthog.com", api_host: NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com", autocapture:false, capture_pageview:false, capture_pageleave:false, person_profiles:"identified_only", before_send})` (`:49-68`). Manual `$pageview` on pathname change (`:84-106`). Two `before_send` noise filters (`:12-47`).
- **Identity:** `src/lib/posthog-utils.ts` `identifyUserInPostHog(posthog, user?)` → `posthog.identify(userData.id, {email, username, name, created, updated, admin, avatar, user_id, email_verified})`; **distinct_id = PocketBase user id** (`:19-30`). `resetPostHogIdentity` → `posthog.reset()` (`:39-44`). Auto-run by `use-posthog-auth.ts` on mount + `pb.authStore.onChange` (identify once per session).
- Events captured in app: `user_registered`, `user_logged_in`, `user_oauth_login` (`login-modal.tsx`), `user_logged_out` (`header.tsx:99`), `mcp_setup_opened` (`add-mcp-button.tsx:42`), `mcp_config_copied` (`mcp-setup-dialog-content.tsx:134`), plus `posthog` direct usage in `command-menu.tsx`, `icon-details.tsx`, `icon-search.tsx`, error pages.
- `next.config.ts`: **no rewrites/proxy**; `withPostHogConfig` is commented out (`:127-136`). Any `POSTHOG_API_KEY`/`POSTHOG_ENV_ID` sourcemap upload is disabled.

### 4.2 Server

- `src/instrumentation.ts` (`posthog-node`, `flushAt:1`): `getPostHogClient()` gated by key + `NEXT_PUBLIC_DISABLE_POSTHOG` (`:5-16`); `register()` optionally warms metadata when `MCP_WARM_CACHE==="true"` (`:18-22`); `onRequestError` captures exceptions, **distinct_id parsed from the `ph_phc_..._posthog` cookie** (`extractDistinctId` `:24-36`, `:38-62`).
- MCP analytics uses `@posthog/mcp` `PostHog` (node) — see §1.9.

### 4.3 Env vars

`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (client ingestion host), `NEXT_PUBLIC_DISABLE_POSTHOG`. Documented `docs/MCP.md:100-102`, `README.md:305-313` (build args).

**Caveat for the rebuild:** MCP requests are anonymous (no cookie/identify on `server.server`), so `$mcp_*` events carry SDK-generated distinct_ids — not linkable to a signed-in user today.

---

## 5. Conventions & deployment

### 5.1 Biome — `biome.jsonc`

Tabs, `lineWidth 140`, double quotes, `semicolons: asNeeded`, `organizeImports on`; `includes: ["src/**","!src/components/ui"]`. Scripts `format`/`lint`/`ci` = `biome check --write`. Lint relaxations: `noExplicitAny` off, `noArrayIndexKey` off, `useUniqueElementIds` off.

### 5.2 Vitest — `vitest.config.ts`

`environment: jsdom`, `globals: true`, setup `./vitest.setup.ts`, `include: ["src/**/*.test.ts"]` (so Playwright specs in `tests/` are excluded). Alias `@ → src`. **Coverage is enforced at 100% statements/branches/functions/lines per file** for a fixed include list (`:4-10`): `src/lib/api.ts`, `src/lib/icon-url.ts`, `src/lib/icons/**`, `src/mcp/**`, `src/app/api/mcp/**`. → Any new MCP file must carry full-coverage tests.
Route/handler test pattern: `vi.mock` + `vi.hoisted`, stub env, then **dynamic `await import(...)`** inside the test so module-scope env reads (analytics, handler) pick up the stub; reset modules with `vi.resetModules()`. `node:fs/promises` and global `fetch` are mocked for metadata.

### 5.3 E2E — `playwright.config.ts`, `pnpm test:e2e`

Specs live in `tests/*.spec.ts` (e.g. `tests/mcp-setup.spec.ts`). `.env.test.example` holds `TEST_ADMIN_EMAIL`/`TEST_ADMIN_PASSWORD`.

### 5.4 Constants — `src/constants.ts`

`BASE_URL = https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons` (`:1`), `METADATA_URL = raw.githubusercontent.com/.../main/metadata.json` (`:4`), `WEB_URL = https://dashboardicons.com` (`:5`), `REPO_PATH`, `REPO_NAME`, `EXTERNAL_SOURCES`/`ExternalSourceConfig` (`:28-65`), `getExternalSource`.

### 5.5 Env vars (documented)

`README.md` (~`:80-82`, `:290-313`), `docs/MCP.md:92-104`:
`GITHUB_TOKEN`, `NEXT_PUBLIC_POCKETBASE_URL`, `PB_URL`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_DISABLE_POSTHOG`, `MCP_RATE_LIMIT_ENABLED`, `MCP_VERBOSE_LOGS`, `MCP_WARM_CACHE`, `DASHBOARD_ICONS_METADATA_PATH`, `SIMPLE_ICONS_VERSION`, `SERVICE_MODE`, `DASHBOARD_MOCK_GITHUB_URL`, `DASHBOARD_DISABLE_EMAIL`, `NEXT_ALLOWED_DEV_ORIGINS`. Note: `NEXT_PUBLIC_*` are **build args** (baked into browser assets).

### 5.6 Deployment — long-running Node, **not serverless**

- `next.config.ts`: `output: "standalone"` (`:70`); security headers incl. `/api/mcp/:path*` (`:96-102`); image remotePatterns for jsdelivr/simpleicons/lobehub/PB.
- `Dockerfile`: Next standalone + **co-located PocketBase** + Caddy; runs `node /app/server.js` (via `docker/start.sh:64`) alongside `pocketbase serve` and `caddy run`. `SERVICE_MODE` = `all|web|backend`. PocketBase pinned `0.40.5` (sha-pinned).
- `docker-compose.yml`: single service, port 8080, volume `pb_data`, runtime `GITHUB_TOKEN`.
- `docker/Caddyfile`: port 8080 → Next :3000; `/pb/*` and `pb.dashboardicons.com` → PB :8090.
- `netlify.toml`: **only** a build-ignore rule (`git diff … web`) — Netlify is not the runtime.
- **Implication:** the app is a long-running Node process → in-memory session state (like the current rate-limit Map) is viable, but is **per-process**; multiple replicas/Caddy round-robin would fragment it. PocketBase JWT (`pb.authStore.token`) is the natural stateless session primitive; alternatively persist sessions in PB.

---

## 6. API routes & server actions

### 6.1 Route handlers (`src/app/api/**`)

- `src/app/api/health/route.ts` — `GET` → `{status:"ok"}`.
- `src/app/api/mcp/route.ts` — MCP (see §1).
- `src/app/api/icons/search/route.ts` — `GET` returns merged native+external icon entries for the command palette, `Cache-Control s-maxage=900` (`:33-41`).
- `src/app/api/icons/external/simpleicons/[slug]/[variant]/route.tsx` — `GET` rasterizes Simple Icons SVG → PNG (640px) with `brand|light|dark` variant fills; `Cache-Control` public; 400/404/502 errors. Uses `getExternalIconBySourceAndSlug` + `rasterizeRemoteSvg`. Test: `…/simpleicons/__tests__/route.test.ts`.

### 6.2 Server actions (`"use server"`)

- `src/app/actions/github.ts` — `triggerAddIconWorkflow(authToken, submissionIds, dryRun)` / `triggerBulkAddIconWorkflow(...)`; validates admin via PB token, then `PB /api/dashboard/publish/dispatch`.
- `src/app/actions/submissions.ts` — `revalidateCommunitySubmissions()`, `revalidateAllSubmissions()` → tag/path revalidation.
- `src/lib/revalidate.ts` — `revalidateCommunityPage`, `revalidateCommunityIcon`, `revalidateSubmissions` (`updateTag`+`revalidatePath` for `community-gallery`/`community-submission`/`community-gallery-record`).

### 6.3 Backend custom routes (PocketBase)

`/api/dashboard/summary|review|publish/dispatch|publish/reconcile|publish/{id}/result`, `/api/submissions/bulk-rejection-email` — all guarded by `$apis.requireAuth()` + admin checks in `dashboard.js`/`submission_update_email.pb.js`.

---

## Quick reference — file index

- MCP: `src/app/api/mcp/route.ts`, `src/mcp/{handler,tools,analytics,server-info}.ts`, `src/lib/icons/{service,search,urls,validate,types,rate-limit}.ts`, `src/lib/mcp-setup-config.ts`, `docs/MCP.md`, `src/components/{add-mcp-button,mcp-setup-dialog-content,mcp-highlighted-code}.tsx`.
- Auth/PB: `src/lib/pb.ts`, `src/components/{login-modal,user-button,header}.tsx`, `src/hooks/{use-posthog-auth,use-submissions}.ts`, `src/app/actions/github.ts`, `web/backend/pb_migrations/*`, `web/backend/pb_hooks/*`.
- Domain: `src/lib/{api,external-icons,external-icon-urls,community,submit-proposal,svg-color-utils,rasterize-svg,icon-url}.ts`, `src/hooks/{use-dashboard,use-icon-submission-form}.ts`, `src/lib/dashboard/types.ts`, `src/components/dashboard/*`.
- PostHog: `src/components/PostHogProvider.tsx`, `src/lib/posthog-utils.ts`, `src/instrumentation.ts`, `src/proxy.ts`.
- Conventions/deploy: `biome.jsonc`, `vitest.config.ts`, `next.config.ts`, `Dockerfile`, `docker/start.sh`, `docker/Caddyfile`, `docker-compose.yml`, `netlify.toml`, `README.md`.
