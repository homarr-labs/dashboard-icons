# Dashboard Icons: OpenAI directory release research

Checked 2026-10-23 against current OpenAI documentation and canonical `main` at `320c819da84048d5a3066e2578bfa83be9019fdf`. The working checkout contains unrelated changes and predates that commit; findings below use the canonical source. No application code, tests, uploads, or tracker issues were changed for this research.

## Finding

The MCP foundation already exists. The remaining work is to qualify its submitted surface, package it, prepare review evidence, and pass the portal gates. A downloadable ZIP is an intermediate deliverable; directory publication requires review and a separate publish action. Remote MCP-only packages are supported: OpenAI says a plugin may contain MCP connections, skills, or both. Do not add a filler skill. [Submission guide](https://developers.openai.com/plugins/deploy/submission)

## What OpenAI requires

| Area | Requirement | Source |
| --- | --- | --- |
| Portable package | Root `plugin.json`, root `mcp.json`, and referenced assets; OpenAI presentation metadata belongs under `extensions.com.openai`. Skills are optional. | [Package guide](https://developers.openai.com/plugins/build/plugins#plugin-structure) |
| Hosting | Submit the existing service through **With MCP**, using a stable public HTTPS remote endpoint. | [Submission guide](https://developers.openai.com/plugins/deploy/submission) |
| Listing | Provide website, support, privacy, and terms HTTPS URLs; identify the publisher and supply the listing icon and required presentation metadata. A root homepage does not fill the four listing fields automatically. | [Listing field reference](https://developers.openai.com/plugins/deploy/submission#listing-metadata) |
| Authentication | `none` for public-only access; `mixed` means anonymous plus OAuth. OAuth already exists here. API-key declarations do not have a supported portal connection flow. Secrets and reviewer credentials stay outside the ZIP. | [Authentication reference](https://developers.openai.com/plugins/build/plugins#configure-mcp-authentication), [portal limitations](https://developers.openai.com/plugins/deploy/submission#authentication-limitations) |
| Tools and privacy | Advertise reliable operations with explicit boolean `readOnlyHint`, `destructiveHint`, and `openWorldHint`; annotation justifications are no longer required. Minimize inputs and telemetry; disclose collection, recipients, retention, and user controls. | [Plugin guidelines](https://developers.openai.com/plugins/plugin-guidelines) |
| Review evidence | Exactly five positive and three negative cases, with exact expected tools and observable outcomes; run the positives. Supply an accessible demonstration recording and release notes. If sign-in is included, provide a ready-to-use dedicated reviewer account through the secure form. | [Review instructions](https://developers.openai.com/plugins/deploy/submission#complete-review-information) |
| Portal gates | Verified publishing identity, domain challenge, successful connection/tool scan, review, approval, then publication. These are distinct from local package validation. | [Submission guide](https://developers.openai.com/plugins/deploy/submission) |

The current error-reference page still contains a generic “valid skill” diagnostic that conflicts with the current remote MCP submission flow. Follow the package and submission guides for this MCP-only release; confirm actual portal validation rather than inventing a skill requirement. [Error reference](https://developers.openai.com/plugins/deploy/submission-errors#plugin-content-errors), [submission guide](https://developers.openai.com/plugins/deploy/submission)

## Evidence and gaps

| Area | Current evidence | Remaining work |
| --- | --- | --- |
| Icon capabilities | Six public tools already cover batch matching, search, icon URLs, SVG markup, browsing, and categories. Three account tools are also registered. [Registry](https://github.com/homarr-labs/dashboard-icons/blob/320c819da84048d5a3066e2578bfa83be9019fdf/web/src/mcp/tools/index.ts#L14-L24) | Confirm first-release scope and verify the exact surface advertised to ChatGPT. |
| Account access | Existing OAuth supports discovery, registration, PKCE, tokens, and public/account access. [Auth documentation](https://github.com/homarr-labs/dashboard-icons/blob/320c819da84048d5a3066e2578bfa83be9019fdf/web/docs/MCP-AUTH.md#L1-L47) | If included, qualify the real ChatGPT sign-in and reviewer account. Building a new auth system is unnecessary. |
| Account-tool description inconsistency | Server instructions say `propose_icon_update` is unavailable, while its handler contains an implementation. [Server instructions](https://github.com/homarr-labs/dashboard-icons/blob/320c819da84048d5a3066e2578bfa83be9019fdf/web/src/mcp/server.ts#L10-L19), [handler](https://github.com/homarr-labs/dashboard-icons/blob/320c819da84048d5a3066e2578bfa83be9019fdf/web/src/mcp/tools/propose-icon-update.ts#L140-L179) | Do not infer that it is disabled from instructions alone. Account tools are outside the agreed first release; resolve and qualify the behavior before any later account-enabled release. |
| Telemetry | Analytics enables context, model capture, conversation IDs, and missing-tool reporting; it records IP properties and account identity when present. [Analytics configuration](https://github.com/homarr-labs/dashboard-icons/blob/320c819da84048d5a3066e2578bfa83be9019fdf/web/src/mcp/analytics.ts#L87-L115) | Audit the actual advertised schemas, analytics-added `get_more_tools`, and collected data; remove unnecessary collection and align policy and controls. Configuration flags alone do not prove the exact transmitted payload. |
| Policies | Existing privacy text discusses website/account analytics, providers, retention, and rights. [Privacy source](https://github.com/homarr-labs/dashboard-icons/blob/320c819da84048d5a3066e2578bfa83be9019fdf/web/src/app/%28legal%29/privacy/page.tsx#L38-L95) | Explicitly cover MCP data and meaningful controls; complete and verify all four listing destinations and publisher details. |
| Package/workflow | Canonical source contains MCP documentation and CI, but no marketplace plugin manifest or ZIP release workflow was found. [Canonical tree](https://github.com/homarr-labs/dashboard-icons/tree/320c819da84048d5a3066e2578bfa83be9019fdf) | Add the minimum package and manually triggered downloadable artifact workflow. |
| ChatGPT qualification | Source and a reachable MCP endpoint establish implementation and transport evidence. | No completed ChatGPT review-case record, accessible recording, or final release notes was found in the repository audit. |
| OpenAI portal | No portal state was established in this audit. | Publishing identity, domain verification, draft/scans, review status, approval, and publication remain **unknown**, not assumed missing or complete. |

The current deployed endpoint is [dashboardicons.com/api/mcp](https://dashboardicons.com/api/mcp). A successful direct MCP handshake or tool call does not establish ChatGPT installation, OAuth compatibility, directory acceptance, or publication.

## Smallest release approach

The user confirmed the first release should contain only the six public icon tools: `match_icons`, `search_icons`, `get_icon`, `get_icon_svg`, `browse_icons`, and `list_categories`. Account contributions are deferred. A later account-enabled release should reuse and qualify the existing OAuth flow.

The portable MCP configuration documents no distributable per-tool allowlist. `enabled_tools` in the package guide is a user's Codex configuration override, not evidence of a ChatGPT submission filter. Choose the smallest supported way to expose the agreed surface after checking the actual portal; do not prescribe a second server or new architecture in advance. [MCP configuration and user overrides](https://developers.openai.com/plugins/build/plugins#bundled-mcp-servers-and-lifecycle-hooks)

Use one manual GitHub Actions workflow to validate the selected manifest/assets and produce the ZIP as a downloadable artifact. Reuse existing repository tools and native archive support. No automatic portal submission, new release service, custom UI, or application rewrite is needed for that deliverable. This is an implementation recommendation, not an OpenAI requirement.

## Suggested tracer-bullet tickets

1. **Release a public-icons plugin ZIP from GitHub Actions.** No blockers.
   - A maintainer can run one manual workflow and download a versioned ZIP, checksum, and source revision.
   - The package contains valid portable manifests and actual branding assets, targeting the six anonymous icon tools. The submitted surface advertises and routes only the agreed operations; a manifest claim alone is insufficient.
   - Remove broad conversation-context requirements and unnecessary analytics discovery from the submitted surface. Preserve existing account-enabled clients.
   - Validate the archive contents, referenced assets, schema fields, version consistency, and absence of secrets/private bindings using native or installed tools. Show missing review metadata explicitly; a draft artifact is not submission-ready.
2. **Complete the marketplace listing and MCP privacy disclosures.** No blockers.
   - Reuse and content-check the existing website, privacy, terms, and a real support page rather than building a new support system.
   - Confirm verified publisher identity, country availability, commerce declaration, concise listing text, and actual icon assets.
   - Publish MCP-specific disclosures matching the agreed collection, providers, retention, and controls. Reconcile final policy text against the deployed surface before submission.
3. **Prove the release in ChatGPT and record its review demo.** Blocked by 1.
   - Install the packaged release through a supported development path and record the actual ChatGPT surface, version, environment, tool calls, and outcomes.
   - Execute five distinct positive and three negative natural-language cases. Cover icon matching, lookup/URLs, SVG, catalog exploration, and relevant unsupported requests; do not count direct HTTP checks as ChatGPT proof.
   - Record and host a reviewer-accessible walkthrough; verify playback and access. A script is not a recording.
   - Include exact tool names, observable expectations, the real demo URL, and release notes in the manifest, then rebuild through the workflow.
4. **Submit the completed release for OpenAI review.** Blocked by 2 and 3.
   - Rebuild and inspect the final archive containing complete listing and reviewer materials.
   - Use the intended verified publishing identity, finish domain verification, connect the scoped MCP, inspect imported metadata, and resolve required scans/findings.
   - Have the authorized publisher complete attestations; submit the selected release and record the portal's actual review state.
5. **Publish the approved plugin and verify catalog installation.** Blocked by 4 and the external gate of OpenAI approval.
   - Publish the approved version using the intended publisher.
   - Install through the public directory in a fresh ChatGPT session and verify the advertised icon flows.
   - Record the real listing/version and availability observed. Document the directory installation path alongside existing custom-MCP instructions.

The user approved this breakdown and implementation. Tickets [#2997](https://github.com/homarr-labs/dashboard-icons/issues/2997) through [#3001](https://github.com/homarr-labs/dashboard-icons/issues/3001) were published with native blocking relationships. Implementation and qualification progress are tracked in [the release guide](../web/docs/OPENAI-MARKETPLACE.md). These research findings are the initial audit, not proof of deployed or published behavior.
