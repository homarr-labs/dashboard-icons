# Multi-icon submissions: PocketBase and MCP constraints

> **Decision since this research:** a Submission stays one Icon, so there is no grouping parent and no merging. "Submit many" creates several independent Submissions at once. MCP keeps one `submit_icon` call per Icon, with Variants inline, and a higher body cap for signed-in calls. See `GLOSSARY.md`.

Researched 2026-10-19. The question: how can one Submission hold many Icons, each with many Variant files (for example 2 icons × 3–6 SVG/PNG files, or 12 icons × 1 file)? It has to work from (a) the website form and (b) an MCP tool called by an agent, atomically or close to it. Every claim cites a primary source. Statements marked **Inference** are my reading and are not verified.

| Tag   | Location                                                                                                                                           |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PB`  | `github.com/pocketbase/pocketbase/blob/v0.40.5/` (the pinned release, `web/backend/pocketbase-release.json`)                                       |
| `PBD` | `https://pocketbase.io/docs/` (`api-records/`, `js-event-hooks/`, `working-with-relations/`, `collections/`)                                       |
| `SDK` | `pocketbase@0.26.9` npm tarball (`web/pnpm-lock.yaml:3119`), `src/services/BatchService.ts` read from `dist/pocketbase.es.mjs.map`                 |
| `MCP` | `https://modelcontextprotocol.io/specification/2026-07-28/server/tools.md`. 2026-07-28 is the current revision (`/specification/versioning.md:25`) |
| `M`   | `web/backend/pb_migrations/`                                                                                                                       |
| `H`   | `web/backend/pb_hooks/`                                                                                                                            |

## TL;DR

1. **The PocketBase batch API can do a parent and its children in one transaction with files, but it is off by default.** `Batch.Enabled: false`, `MaxRequests: 50`, `Timeout: 3` s, and `MaxBodySize` unset, which falls back to 128 MB (`PB/core/settings_model.go:172-176`, `PB/apis/batch.go:96-109`). No migration in this repo turns it on. Files go through multipart `requests.N.field`. Clients can pre-generate the 15-character ids, so later requests in a batch can reference earlier ones.
2. **Our hooks already run correctly inside a batch.** `onRecordCreateRequest`/`onRecordUpdateRequest` fire for each item with `e.app` set to the batch transaction (`PBD/js-event-hooks` "Batch request hooks"). `audit()`'s nested `runInTransaction` reuses that transaction (`PB/core/db_tx.go:26-29`), so audit events roll back with the batch.
3. **The real blocker is the domain model, not PocketBase.** Review, the `community_gallery` view, `reserve()`, and `scripts/import-icon.ts` all treat **one `submissions` record as one icon name**. **Inference:** the cheapest redesign keeps `submissions` as the per-icon unit and adds a grouping parent. Moving files into child "variant" records instead would mean rewriting the publish pipeline.
4. **MCP has no standard way to pass a file as a tool input.** Inputs are plain JSON `arguments` (`MCP` "Tool"). Both file-input SEPs were closed without merging, and the work moved to an experimental extension. Our transport caps the whole JSON-RPC body at **64 KB**. Measured on `svg/`, that holds about 12 icons only if each is ≤ ~5 KB (77% of the corpus). Two multi-variant families fit if each family is ≤ ~31 KB (91% of families).
5. **Recommendation.**
   - **Website:** one atomic write to PocketBase, either through the batch API or (preferred) a custom `pb_hooks` route that saves all records in one `runInTransaction`. Resolve variant filenames in the create hook, so no second write is needed.
   - **MCP:** a handle-based draft flow (the spec's "Stateful Tools" pattern). Each `add_file` call takes inline `svg` or an `https` `url` that is fetched with SSRF protection. A final `submit_for_review` flips all records in one PocketBase transaction. Skip presigned uploads for now.

---

## 1. PocketBase batch API (`POST /api/batch`, `pb.createBatch()`)

**Verified**

- **Off by default.** The defaults are `Batch{Enabled: false, MaxRequests: 50, Timeout: 3}` (`PB/core/settings_model.go:172-176`). The handler returns 403 "Batch requests are not allowed." when it is disabled or `maxRequests <= 0` (`PB/apis/batch.go:96-99`). The docs say it _"need[s] to be explicitly enabled and configured from the Dashboard > Settings > Application"_ (`PBD/api-records` "Batch").
- **Settings** (`PB/core/settings_model.go:450-462`):
  - `maxRequests` caps the number of requests (validated with `validation.Length(0, max)`, `batch.go:85-88`).
  - `timeout` is in seconds. A value ≤ 0 is forced to 3 s (`batch.go:101-104`). On timeout the transaction aborts with "batch transaction timeout" (`batch.go:225-229`). It also aborts if the client disconnects (`batch.go:230-231`).
  - `maxBodySize` is in bytes. A value ≤ 0 falls back to 128 MB (`batch.go:106-109`). The route unbinds the global body limit and applies this one inline (`batch.go:28`).
- **Default rate-limit rule.** `/api/batch` allows 3 requests per 1 s, but only when rate limits are enabled. They are disabled by default (`settings_model.go:177-184`).
- **Files: yes, through multipart.** Regular fields go as JSON in `@jsonPayload`, and files go under `requests.N.fileField` or `requests[N].fileField` (`batch.go:91-94, 127-143`; `PBD/api-records`: _"File upload is supported only via multipart/form-data"_). The SDK does this automatically. `send()` builds `FormData` with `requests.<i>.<key>` per file and an `@jsonPayload` (`SDK BatchService.ts:46-81`). `prepareRequest` separates `File`/`Blob` values from JSON, and appends `+` to the key for mixed arrays (`BatchService.ts:215-260`).
- **Allowed actions.** Record create (POST), update (PATCH), upsert (PUT) and delete only (`batch.go:38-72`).
- **Transactional.** The whole batch runs inside one `app.RunInTransaction` (`batch.go:193`). The first failure rolls everything back and returns 400 with `data.requests.<index>` naming the failed item (`batch.go:202-212`; `PBD/api-records` sample error). The docs warn that this is one read&write transaction: _"other queries may queue up … prefer using the smallest possible max processing time and body size limits; avoid large file uploads over slow S3 networks and custom hooks that communicate with slow external APIs"_.
- **Execution is nested, not sequential.** Item N+1 runs inside item N's `optFinalizer`, which is called at the end of item N's request-hook chain (`batch.go:245-264`; `PB/apis/record_crud.go:369`). Results are reversed at the end (`batch.go:214-217`).
- **One auth state for the whole batch.** Per-item `Authorization` headers are ignored, and each item gets `event.Auth = baseEvent.Auth` (`batch.go:340-346, 355-356`; `PBD/api-records`).
- **Children can reference a parent created in the same batch.** Each item's `event.App` is the transaction app (`batch.go:355`). The create-rule check queries `e.App.ConcurrentDB()` (`record_crud.go:309`), and inside a transaction app both DB handles _are_ the transaction (`PB/core/db_tx.go:51-61`). So a child's `createRule` such as `submission.created_by = @request.auth.id` can see the uncommitted parent. The client must supply the parent's `id`, since a batch has no "reference result #0" syntax (none exists in `batch.go`).
- **File cleanup on rollback.** Each file is uploaded to storage before its row is written (`PB/core/field_file.go:345-350`). If the transaction later fails, `OnModelAfterCreateError` runs on the parent (non-transaction) app after the transaction completes (`PB/core/db.go:343-357`). The file field then deletes the newly uploaded files (`field_file.go:362-388`). This is best effort: failures are only logged.

## 2. Client-supplied record ids

**Verified.** The create API accepts an optional `id`, a _"15 characters string to store as record ID. If not set, it will be auto generated"_ (`PBD/api-records`, "Create record" body parameters). Our `submissions.id` field uses pattern `^[a-z0-9]+$` with min/max 15 and autogenerate `[a-z0-9]{15}` (`M/1759312839_created_submission.js:8-15`). Creating a duplicate PK fails validation. With the default lowercase pattern the uniqueness check relies on the PK constraint, and the case-insensitive pre-check only runs for custom patterns (`PB/core/field_text.go:198-216`).

**Inference.** The browser or the Next server can generate ids with `crypto.getRandomValues` mapped to `[a-z0-9]`. That is about 77 bits of entropy, so collisions are negligible. A collision fails the whole batch, and the client can simply retry.

## 3. File fields and body limits

**Verified**

- **Per-file size.** `maxSize` ≤ 0 means the default of **5 MB per file** (`PB/core/field_file.go:28, 309-315`). The size and mime checks run on each uploaded file (`field_file.go:283-303`).
- **Mime types.** `maxSelect` ≤ 1 means a single file (`field_file.go:317-323`). Our `assets` field has `maxSelect: 99`, `maxSize: 0`, and `mimeTypes: ["image/png", "image/svg+xml"]` (`M/1759312839_created_submission.js:36-50`).
- **Request body limits.**
  - The global default is **32 MB** (`PB/apis/middlewares_body_limit.go:14`; bound on every route at `PB/apis/base.go:36`).
  - Record create/update replace it with a per-collection limit: 32 MB + Σ(`maxSize × maxSelect`) over file fields (`middlewares_body_limit.go:42-73`, `PB/core/field_file.go:325-329`; bound at `record_crud.go:31-32`). For `submissions` that is 32 MB + 5 MB × 99 ≈ 527 MB, so in practice the per-file 5 MB cap is the only limit.
  - A custom `routerAdd` route keeps the global 32 MB limit. Multipart parsing buffers up to 16 MB in memory and spills the rest to temp files (`PB/tools/router/event.go:100-104, 337`).
- **Stored filenames are randomized when the `File` object is created, not when it is saved.** `Name = normalizeName(..., OriginalName)` runs in `NewFileFromBytes`/`NewFileFromMultipart` (`PB/tools/filesystem/file.go:31-32, 64-87, 195-221`). Our hooks already read `asset.name` from such objects in request hooks (`H/dashboard.js:14-18`).

**Inference.** A create-request hook can rewrite `extras.colors.*` and `extras.wordmark.*` from original names to stored names before `e.next()`. That would remove the second `update` the form does today (`web/src/hooks/use-icon-submission-form.ts:159-193`) and the audit special case that hides it (`H/dashboard.js:72-91`). Today that second write is outside any transaction: if it fails, the submission is left with dangling `extras` filenames.

## 4. Relations, back-relations, views

**Verified**

- `RelationField` has `cascadeDelete`, `minSelect` and `maxSelect` (`PB/core/field_relation.go:78-98`). `target_submission` is a self-relation with `cascadeDelete: false` (`M/1791800000_submission_proposals.js:11-16`).
- **Back-relations.** Filter, sort and expand work with `<collection>_via_<field>`, for example `?expand=submission_icons_via_submission`. The result is always an array unless the relation field has a UNIQUE index, and it is **capped at 1000 records per relation** (`PBD/working-with-relations` "Back-relations", "Back-relation caveats"). Only relations whose View rule the requester satisfies get expanded (same page, "Expanding relations"). Nested expand goes up to 6 levels.
- **View collections.** They are read-only and get no realtime events (`PBD/collections` "View collection"). A file column selected directly from a source collection stays a file field: `FindRecordByViewFile` resolves `/api/files/<view>/<id>/<file>` back to the source record (`PB/core/view.go:202-262`). This is how `community_gallery` serves `s.assets` (`web/src/lib/community.ts:50, 86`).

## 5. Our hooks inside a batch

**Verified**

- The docs say: _"[onBatchRequest] will also fire the corresponding onRecordCreateRequest, onRecordUpdateRequest, onRecordDeleteRequest hooks, where e.app is the batch transactional app"_ (`PBD/js-event-hooks` "Batch request hooks"). The source matches: `processInternalRequest` calls `recordCreate`, which triggers `OnRecordCreateRequest` (`batch.go:63-65, 283`; `record_crud.go:346`). The request info context is `"batch"` (`batch.go:159`).
- Registered on `submissions` (`H/dashboard.pb.js:1-9`):
  - `guard` on create and update requests
  - `audit` on `onRecordCreate`/`onRecordUpdate`
  - `deleteRecord`
  - `onRecordAfterUpdateSuccess` → email (`H/submission_update_email.pb.js:1-5`). It fires after commit (`PB/core/db.go:343-360` pattern), so a rolled-back batch sends no email.
- `audit()` calls `e.app.runInTransaction(...)` (`H/dashboard.js:103-121`). Inside a batch, `e.app` is already a transaction app, and `runInTransaction` on a transaction runs `fn(app)` in that same transaction (`PB/core/db_tx.go:26-29`). As a result:
  - the `submission_events` rows commit or roll back with the batch;
  - the `updated` optimistic check and `reservation()` read the transaction's view (`dashboard.js:105-111`);
  - `validateProposalNames` runs twice, once in `guard` against `e.app` (`dashboard.js:148`, already the transaction in a batch) and once in `audit` (`dashboard.js:115`).
- `guard(e, true)` makes every non-superuser create be `status = "pending"` with `created_by = auth.id`, and clears `approved_by`/`admin_comment` (`dashboard.js:149-153`). **Any draft status for the MCP flow needs this changed.**
- None of these hooks exist for any other collection. A new child collection gets **no** guard, audit, reservation or delete protection unless one is added. Its API rules would be the only protection.

**Inference.** If the batch timeout stays at 3 s, it limits how many items fit. Each submission create runs `findRecordsByFilter("publish_batches", …)` and up to two `validateProposalNames` lookups, plus file writes. Local disk is fine for tens of items, but set `timeout` to about 10 s when enabling batch, and measure first.

## 6. Repo constraints on a parent/child redesign

**Verified**

- **One submission = one icon name, everywhere downstream.**
  - `reserve()` snapshots `name` per submission and rejects two proposals with the same name in one publish batch (`H/dashboard.js:235-242`).
  - `scripts/import-icon.ts` imports `submission.name` with `submission.assets` and `submission.extras.{colors,wordmark,base}` (`scripts/import-icon.ts:174-220, 385-424`), downloading `/api/files/submissions/<id>/<file>` (`:275`). The `add-icon.yml` workflow passes `submissionIds` (`.github/workflows/add-icon.yml:7, 81, 99`).
  - Review approves or rejects per submission id (`H/dashboard.js:179-208`).
- **`community_gallery` is a public view over every submission.**
  - The view query is `SELECT s.id, s.name, s.status, s.assets, s.updated, s.created, s.extras, u.username AS created_by FROM submissions s JOIN users u …` with no status filter (`M/1759332236_updated_community_gallery.js:7`), later prefixed with `s.target_submission` (`M/1791800000_submission_proposals.js:22-26`).
  - The list and view rules are `""`, which means public (`M/1759330033_updated_community_gallery.js:7-8`).
  - So any new `draft` status is **publicly listed** unless the view gets a `WHERE`. The proposal migration requires the view to keep the `FROM submissions AS s` shape (`1791800000_submission_proposals.js:22-24`).
- **Name history.** The old UNIQUE index on `name` was dropped in favour of `idx_submissions_name (name, created DESC, id DESC)`, and proposals share a name through `target_submission` (`1791800000_submission_proposals.js:6-10`). Several submissions with the same name are therefore already allowed.
- **Schema drift.** `admin_comment` is read and written by the hooks (`H/dashboard.js:57, 67, 153, 157, 197`) and by the web app (`web/src/lib/pb.ts`, `web/src/components/submission-details.tsx`, …), but **no migration creates it**. Only `approved_by` is added (`M/1759313306_updated_submission.js:13`). `description` is added only if missing (`M/1790000000_dashboard_workspace.js:58`). A fresh PocketBase built from these migrations would fail the hooks. Fix this before writing the next migration.
- **The website form writes straight from the browser to PocketBase** (`pb = new PocketBase(NEXT_PUBLIC_POCKETBASE_URL)`, `web/src/lib/pb.ts:5, 88`). It does one `create` with all variant files in `assets`, then one `update` to fix `extras` filenames (`use-icon-submission-form.ts:117-193`; `web/src/lib/submit-proposal.ts:15-17`). The client-side cap is 5 MB per file (`use-icon-submission-form.ts:78`), the same as the PocketBase default.

**Inference: two data shapes**

| Shape                                                                                                                                                             | Pros                                                                                                                         | Cons                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Group parent.** New `submission_groups` (owner, note); `submissions.group` relation; each icon stays one `submissions` record with its variants in `assets`. | Review, gallery, `reserve()`, import, proposals, audit and emails stay as they are. Group views use `submissions_via_group`. | Variants stay "files + `extras` filename map" instead of first-class records.                                                                                                                                              |
| **B. True children.** `submissions` (parent) → `submission_icons` → `submission_variants` (one file each).                                                        | Clean model, one file per record, no filename map.                                                                           | Rewrites the gallery view, review, `reserve()` naming, `import-icon.ts`, the proposal (`target_submission`) semantics and audit. New collections need their own guard/audit hooks. Back-relation expand is capped at 1000. |

A keeps every invariant above, so the rest of this note assumes A. Under A, "12 icons × 1 file" is 1 group plus 12 submission creates (13 batch items). "2 icons × 6 files" is 1 group plus 2 creates. Both are well under `maxRequests: 50`.

## 7. Our MCP server's limits

**Verified**

- **Body cap.** `/api/mcp` reads at most `MAX_REQUEST_BODY_BYTES = 64 * 1024` per POST and returns 413 above that (`web/src/lib/icons/validate.ts:5`; `web/src/app/api/mcp/route.ts:47-55, 78-83`). `maxDuration = 30` s (`route.ts:12`).
- **Rate limits.** 60 requests and 30 tool calls per minute per IP, held in memory per instance (`web/src/lib/icons/rate-limit.ts:3-8, 32-52`; applied at `route.ts:72-91`).
- **`submit_icon` today.** One icon and one SVG, `svg` ≤ `MAX_SUBMITTED_SVG_BYTES = 48 KB` (`web/src/lib/icons/svg-safety.ts:1`; `web/src/mcp/tools/submit-icon.ts:18-24`). It runs `checkSubmittedSvg`, checks the native catalog, and calls `submissions.create` as the user with a single `assets` file and `base: "svg"` (`submit-icon.ts:68-89`). It accepts no PNG and no variants.
- **The SVG safety check** rejects DOCTYPE/entities, `<script>`, `foreignObject`, iframes/embeds, `on*=`, href animation, `@import`, namespaced elements, attribute-changing animations, CSS escapes, undeclared entities, foreign namespaces, `javascript:` URLs and any non-`#` reference (`svg-safety.ts:11-54`). **88.4%** of the existing `svg/` files pass (3226/3650). The top rejections are >48 KB (139), namespaced elements (132), not a single document (59) and foreign namespaces (52). Measured with `checkSubmittedSvg` over `svg/*.svg` on this branch.
- **`svg-fetch.ts` is not a general fetcher.** `fetchTrustedSvg` only allows `https` on our own host and the external-source CDNs (`web/src/lib/icons/svg-fetch.ts:11-26`). It uses `redirect: "error"`, a 5 s timeout and a 512 KB cap (`:6, 9, 50-55`). Accepting arbitrary URLs needs new SSRF handling.
- **Auth.** Account tools re-create a user-scoped PocketBase client from the sealed token (`web/src/mcp/tools/account.ts:23-30`). Every PocketBase write therefore goes through the same rules and hooks as the website.

**Measured sizes** (`svg/`, n = 3650; "JSON" is the byte length inside a JSON string, i.e. after escaping quotes and newlines; the escaping overhead is a median ×1.024, p99 ×1.14, max ×1.57)

| SVG                                    | median | p75    | p90          | p95    | p99     | max     |
| -------------------------------------- | ------ | ------ | ------------ | ------ | ------- | ------- |
| raw bytes                              | 1,956  | 4,736  | 11,518       | 29,660 | 202,440 | 4.19 MB |
| JSON-escaped bytes                     | 2,016  | 4,852  | 11,774       | 30,117 | 207,553 | 4.23 MB |
| multi-file family, all files (n = 624) | 4,360  | 13,752 | 28,730 (p90) | —      | —       | 3.99 MB |

The share of files at or under a given escaped size is: 2 KB 50.6%, 4 KB 71.2%, 5.3 KB 76.7%, 10 KB 87.9%, 15 KB 92.1%, 30 KB 94.9%, 48 KB 96.2%. Of the `metadata.json` entries, 2,715 have one file, 502 two, 97 three, 77 four and 33 five. Five (base, dark, light, wordmark, wordmark dark) is the current maximum. The PNGs (n = 4459) have a median of 23.5 KB and a p90 of 71.8 KB, plus 33% for base64.

**What fits in one 64 KB call** (allowing about 2 KB for the JSON-RPC envelope, names, aliases and categories, so about 62 KB of SVG):

- **12 icons × 1 file:** fits if every SVG is ≤ ~5.2 KB escaped, which is about 77% of icons individually. A random 12 is likely to contain at least one bigger file.
- **2 icons × 3–5 variants:** fits if each family is ≤ ~31 KB, which is 91.5% of existing multi-file families.
- **1 icon** of any size up to the 48 KB per-SVG cap fits. That cap already excludes 3.8% of the corpus.
- **PNG inline:** only about 2 median PNGs per call. This is impractical.

**Inference.** Output tokens are the second limit. A 60 KB SVG payload is roughly 15–25k model output tokens, and models copying path data verbatim are prone to corrupting it. Inline SVG suits small or agent-generated icons, not batches of large vendor logos.

## 8. MCP spec: files as tool inputs

**Verified**

- Tool inputs are JSON `arguments` validated against `inputSchema` (JSON Schema, 2020-12 by default) (`MCP` "Tool", "Data Types"). `image`, `audio`, `resource_link` and embedded `resource` blocks are defined for **tool results** (`MCP` "Tool Result", ll. 407-490). The current spec has no file type for inputs.
- The spec describes multi-call, handle-based state as the intended pattern: _"Servers that need to maintain state across calls … should do so by returning an explicit handle from a creation tool and accepting that handle as an argument on subsequent calls"_. It also covers authorization per call, opaque handles, a lifetime stated in the creation tool's description, and an expiry error that tells the model to create a new handle (`MCP` "Stateful Tools", the `create_basket`/`add_item` example).
- `MCP` "Security Considerations": servers **MUST** validate inputs, enforce access controls and rate-limit tool invocations.
- **Status of file inputs:**
  - The File Uploads WG charter (2026-04-23) says that _"servers that need a file from the user resort to prose instructions asking for base64 strings or local paths"_. It anchors on SEP-2356 and lists presigned URLs as a possible approach (`https://modelcontextprotocol.io/community/working-groups/file-uploads.md`).
  - **SEP-2356** proposed `data:` URIs plus a `fileInputs` client capability. It was **closed unmerged** on 2026-06-26 _"in favor of #2631"_ (`github.com/modelcontextprotocol/modelcontextprotocol/pull/2356`).
  - **SEP-2631** proposed `x-mcp-file`, `files/authorizeUpload` and presigned HTTPS transfer. It was **closed unmerged**, and the WG _"is continuing this work as an experimental extension: github.com/modelcontextprotocol/experimental-ext-file-uploads/pull/1"_ (comment of 2026-10-14 on `pull/2631`).
  - A Files WG consolidation PR (#3389) was closed 2026-10-11.
- **Existing practice: inline content in one call.** GitHub's MCP server `push_files` takes `files: [{path, content}]` (`github.com/github/github-mcp-server/blob/main/pkg/github/repositories.go:1647-1692`, main @ `e3809fe91c75`). The SEP-2356 description also cites OpenAI Apps' `_meta["openai/fileParams"]` (upload first, then pass a fileId). That is secondary; I did not check OpenAI's docs.

## 9. MCP tool shapes compared

| Option                                                                                                            | Limits                                                                                                                              | Atomicity                                                                                                                                                           | Failure modes                                                                                                                                 | Agent ergonomics                                                                                                                                                                    | Abuse risk                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(i) One call, inline SVGs** `submit_icons({icons:[{name, variants:[{kind, svg}]}]})`                            | 64 KB total (§7). SVG only, realistically. One tool-call slot.                                                                      | Fully atomic: the server builds one PocketBase batch or custom-route call.                                                                                          | A 413 on the whole call gives the model no per-icon error. One bad SVG fails all of it, unless the call validates first and reports per item. | Simplest for small, generated icons. Breaks unpredictably on vendor logos.                                                                                                          | Low; same as today.                                                                                                                                                                                                                                                                                                                                                                       |
| **(ii) Draft handle** `create_submission` → `add_file(draft, icon, variant, svg)` ×N → `submit_for_review(draft)` | ≤ 48 KB per call (fits 64 KB). 30 tool calls/min/IP: 12 × 1 ≈ 14 calls, 12 × 5 ≈ 62 calls, which hits the limit. N × 30 s duration. | Staging is not atomic. Publication is: `submit_for_review` flips every record to `pending` in one PocketBase transaction, so reviewers never see half a submission. | Abandoned drafts need a TTL purge (`cronAdd`). Needs a draft status: guard change, gallery `WHERE`, excluded from review counts (§5–6).       | Per-file errors the model can fix. Resumable. The spec endorses the pattern.                                                                                                        | Storage filled with drafts: cap drafts per user, files per draft, and the TTL.                                                                                                                                                                                                                                                                                                            |
| **(iii) URL fetch** `{variant, url}`                                                                              | Bytes do not count against 64 KB. Can allow PNG and up to 5 MB per file.                                                            | Same as the shape that carries it ((i) or (ii)).                                                                                                                    | Host down, redirects, wrong content type, bot walls.                                                                                          | Best when the asset is public (vendor press kit, GitHub raw). No use for local or generated files.                                                                                  | **SSRF and open proxy.** Needs DNS resolution with private, link-local and metadata ranges blocked, a re-check after connect, redirects disallowed or re-validated, size and time caps, a mime sniff, and the SVG safety check. Today's `svg-fetch.ts` allowlist cannot be reused as is. PocketBase also has `NewFileFromURL` (`PB/tools/filesystem/file.go:101`) with the same concerns. |
| **(iv) Presigned upload** `request_upload` → agent `PUT`s bytes → `attach(upload_id)`                             | Any size we allow.                                                                                                                  | Same as (ii).                                                                                                                                                       | Needs a new authenticated upload endpoint, sealed upload tokens, and orphan cleanup.                                                          | Only agents with an HTTP or shell tool (Claude Code, Codex) can `PUT`. Chat-only hosts cannot. No standard yet: the experimental ext is moving toward `files/authorizeUpload` (§8). | A bearer-URL leak, mitigated with short TTLs and a single use.                                                                                                                                                                                                                                                                                                                            |

## 10. Recommendation

**Website form (one browser → PocketBase request, atomic)**

1. Use shape A (§6): a group parent plus N `submissions` records, each with its variants in `assets`.
2. Write it in one transaction. There are two routes:
   - **Preferred: a custom `pb_hooks` route** `POST /api/submissions/group`. It parses the multipart body, creates the group and N submissions in one `e.app.runInTransaction` with `e.app.save()`, and returns ids. This keeps `/api/batch` off for every other collection. It is bound by the global 32 MB body limit (`PB/apis/base.go:36`). **Caveat:** records saved with `app.save()` from a route do **not** fire `onRecordCreateRequest`, so `guard`'s checks must be called explicitly. `onRecordCreate` (`audit`) does fire on model save.
   - **Alternative: `pb.createBatch()`.** It needs a migration that enables batch with explicit `maxRequests` of about 30, a `timeout` of about 10 s and a `maxBodySize` of about 64 MB. Pre-generate the group id client-side. `guard`/`audit` run per item in the batch transaction (§5).
3. Rewrite `extras` variant filenames to their stored names inside the create hook (§3), so the second `update` and the audit special case can go.
4. Add `WHERE` and `group` columns to `community_gallery` only if group pages need them. Back-fill the missing `admin_comment` migration first (§6).

**MCP: draft handle (ii) with inline SVG or https URL per file (iii)**

- `create_submission_draft()` returns `draft_id`. Its description states the lifetime, e.g. 24 h.
- `add_icon_file(draft_id, name, variant, svg? | url?)` validates on every call (`checkSubmittedSvg`, the catalog check for new names, `ICON_NAME_REGEX`). It then stores the file in PocketBase under the draft as a `draft` status. This needs a guard exception, a gallery `WHERE status != 'draft'` and summary or review filters.
- `submit_for_review(draft_id)` flips every draft record to `pending` in one PocketBase transaction, through a hooks route so that `guard`/`audit` semantics hold.
- Keep `submit_icon` as the one-call path for a single small icon. Do not add a multi-icon inline tool. Its 64 KB ceiling fails unpredictably, as §7 shows.
- Allow `url` only behind a new SSRF-hardened fetcher. Until that exists, accept `svg` only. Defer presigned uploads (iv) until the MCP file-uploads extension settles.
- Raise or split the per-IP tool limit for authenticated account tools, keyed by user, since a 12 × 5 draft is about 62 calls.

## Open questions (not verified)

- Whether production PocketBase already has batch or rate limits enabled in its settings. No migration in the repo sets either.
- Whether production uses S3 file storage, which the docs warn makes batch transactions slow.
- Whether any reverse proxy in front of PocketBase or Next lowers the body limits below the values above.
