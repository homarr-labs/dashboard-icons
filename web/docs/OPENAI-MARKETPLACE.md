# OpenAI plugin release

The first directory release includes six public Icon tools: matching, search, details/CDN URLs, SVG markup, browsing, and categories. It does not include account access or contribution tools. Existing account-enabled MCP connections remain at `/api/mcp`.

The public package connects to:

```text
https://dashboardicons.com/api/mcp/public
```

This endpoint requires no sign-in and does not use the MCP analytics SDK. The hosting/CDN still processes requests, and opening an Icon URL contacts its asset provider. See the [privacy policy](https://dashboardicons.com/privacy).

Version 0.1.1 adds one read-only MCP Apps resource for inline thumbnails on `match_icons`, `search_icons`, `get_icon`, and `browse_icons`. The HTML is served by the MCP endpoint; the ZIP still contains only the two manifests and logo. Other clients retain the same structured results. The resource permits images from the catalog CDNs and dashboardicons.com, with no network API access, account access, or analytics. [Implementation research](../../docs/chatgpt-icon-previews-research.md).

Version 0.1.2 lets `match_icons` return format URLs and licenses for the entire batch with `include_details=true`. This keeps the final preview grid together when the host displays only the latest tool result. It also records the publisher's confirmed Homarr Labs identity, worldwide availability, and free/no-commerce declaration. Portal verification of that identity remains separate.

Version 0.1.3 changes review metadata only: it adds the recorded ChatGPT walkthrough URL. Runtime source remains `0b29982c415b62078102a45771276a53b9aff5ae`, as qualified for 0.1.2 below. Public recording availability and unauthenticated Chrome playback are verified.

From `web/`, run `pnpm exec tsx --tsconfig tsconfig.json scripts/check-mcp-preview.mjs` to check the registered HTML bridge, thumbnails, links, text escaping, and rejected image origins.

## Build the ZIP

Use the manual **Build OpenAI plugin draft** GitHub Actions workflow after the public endpoint has deployed. The package version comes from the manifest. See [package instructions](../../plugins/README.md) for local validation and the exact build command.

Download the generated ZIP, checksum, and build receipt. Inspect the archive itself before uploading it through **With MCP** in the [OpenAI submission portal](https://developers.openai.com/plugins/deploy/submission). A generated archive does not establish ChatGPT qualification or review readiness.

## Qualify the candidate in ChatGPT

Use a development connection to the public endpoint in ChatGPT. Select **No authentication**, install the connection as a plugin, and start a fresh chat. This tests the server; after uploading the final ZIP, also check the saved package and imported review metadata. Follow [OpenAI's current development setup](https://developers.openai.com/plugins/quickstart) if the UI differs.

The package manifest is the source of the five positive and three negative review cases. Run each prompt in ChatGPT, compare actual tools/arguments and visible results with its expectations, and record **Passed**, **Failed**, **Blocked**, or **Not run**. Do not record a direct HTTP call or offline check as a ChatGPT pass.

| Evidence | Status |
| --- | --- |
| Real ChatGPT case execution | All five positive and three negative prompts rerun against 0.1.2 with expected visible outcomes. Raw argument traces are not exposed by this UI. |
| Review walkthrough recording | Complete: 103-second macOS window recording; local browser playback passed |
| Reviewer-accessible recording URL | Verified: HTTP 200 `video/mp4`; unauthenticated Chrome played all 103 seconds with no media error |
| OpenAI verified publisher identity | Not verified |
| Country availability and commerce declaration | Publisher confirmed worldwide and free/no commerce; portal import pending |
| Domain challenge, connection, and required scans | Not run |
| Review submission, approval, and publication | Not performed |

For each case, record candidate version, source revision, date, ChatGPT surface, tool calls, outcome, and an evidence link. Keep all cases on the same candidate; rerun affected cases after changing its behavior.

### Baseline observations, 2026-10-23

The signed-in ChatGPT **Work** surface used a personal development connection to the deployed public endpoint at `e329cd5ab9c13c24a0f89fb61cbfe2a2a808b73b`. Its automatically assigned development-plugin version is 1.0.0; the ZIP was not imported. Only Dashboard Icons was selected. These consecutive prompts ran in [one development conversation](https://chatgpt.com/c/6adb2c69-6894-83eb-b0e9-1cbec4a1c47c). This link requires account access and is not a reviewer-accessible recording.

| Case | Visible result | Qualification limit |
| --- | --- | --- |
| Batch Docker/Plex/Home Assistant | Returned native SVG/PNG links and Plex variants | Activity showed matching and only Plex details; required per-icon detail calls were not established. Tightened server instructions in 0.1.1; rerun required. |
| Native `home` search | Five native names: homer, homey, homebox, homehub, homebrew | Search activity visible; exact arguments not exposed. Preview rerun required. |
| Native Plex SVG | Returned SVG markup with the native Plex source | SVG retrieval activity/arguments require final capture. |
| Native categories and browsing | `tools` was largest (237); five native icons listed | Category/browse activity visible; exact arguments not exposed. Preview rerun required. |
| Simple Icons Home Assistant | Returned SVG URL, CC0-1.0, source attribution and brand guidelines | Exact arguments not exposed. Preview rerun required. |
| Upload/publish | Explained read-only limitation; no tool activity or stored contribution claimed | Visible boundary passed. |
| Private submissions/comments | Explained public-data limitation; no tool activity or private data claimed | Visible boundary passed. |
| Modify Homarr | Explained inability to connect/change dashboards; no tool activity or changes claimed | Visible boundary passed. |

The UI activity labels are observable evidence, not raw tool-call traces. Do not mark all acceptance criteria complete from these observations. Capture the affected cases after deploying and refreshing the preview resource, and verify package metadata separately during portal import.

### Runtime candidate 0.1.2; review package 0.1.3

Source `0b29982c415b62078102a45771276a53b9aff5ae` deployed successfully in [Main CI](https://github.com/homarr-labs/dashboard-icons/actions/runs/39941006218). The [0.1.2 ZIP workflow](https://github.com/homarr-labs/dashboard-icons/actions/runs/39942607328) produced an inspected three-file archive; SHA-256: `d85ebb416be884a625195077a360c2fdc5e6babefe230d26966e2ff06b70613f`. That archive predates the 0.1.3 review metadata and recording URL.

The [0.1.3 ZIP workflow](https://github.com/homarr-labs/dashboard-icons/actions/runs/39952808495) passed in 22 seconds at main source `fd8f1b4f2f65948bd19cd5acb5974b5d8ec53961`. The downloaded three-file archive contains version 0.1.3 and the actual recording URL; SHA-256: `57bd01c8733aa627e96c496689ba4599a18fdc39e6d4bd9951f1e2b955390a0a`.

The [current development conversation](https://chatgpt.com/c/6adb3d48-21c4-83eb-b533-852cf36c7548) uses ChatGPT Work, selected model label **GPT-6.1 Sol Light**, and only Dashboard Icons selected. Custom-app CSP enforcement was enabled for this pass. The connection was refreshed after deployment. Its development version remains 1.0.0; the ZIP has not been imported into a submission draft.

| Case | Visible result |
| --- | --- |
| Batch matching | One matching preview grid contains Docker, Plex, and Home Assistant together, with SVG/PNG/WebP links and Plex light/dark variants. |
| Native search | Five native thumbnails and names: homer, homey, homebox, homehub, homebrew. |
| Native SVG | Plex SVG code returned, with the expected background and logo paths. SVG retrieval activity is visible. |
| Categories and browse | Native `tools` is largest (237); five previews: a3, aion, airdc, akvorado, aliasvault. |
| External license | Simple Icons Home Assistant preview, returned CC0-1.0 label, attribution, variant links, and brand-guidelines link. |
| Upload/publish | Explained the read-only limit without tool activity or claiming a stored contribution. |
| Private submissions | Explained the public-data limit without tool activity or claiming private data access. |
| Modify Homarr | Explained it cannot connect or change dashboards; reused an already-returned Docker URL without tool activity or claiming a change. |

These are live visible-outcome checks. Raw argument traces are not exposed by this UI, and portal validation remains pending.

The [recorded walkthrough](../../docs/media/openai-walkthrough-0.1.2.mp4) is a 103-second macOS window capture: 1188 × 1856 H.264, 3,542,903 bytes, with no audio. Local browser playback passed. It reviews the eight existing visible outcomes above and records a fresh `match_icons` lookup for Grafana, Prometheus, and Nginx (6 seconds).

The package's [public recording URL](https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@main/docs/media/openai-walkthrough-0.1.2.mp4) returned HTTP 200 with `Content-Type: video/mp4`, a content length of 3,542,903 bytes, and byte-range support. Unauthenticated Chrome completed all 103 seconds of playback, reached `readyState: 4`, and had no media error. The recording does not establish raw tool arguments, imported package metadata, or portal review readiness.

## Submit and publish

Before submission, confirm the public publisher identity, all four listing destinations, country availability, and commerce declaration. The package must contain the real listing values and review evidence. Do not invent a verified identity or a demo URL to make validation pass.

1. Select the intended organization/project and verified developer identity.
2. Upload the complete ZIP through **With MCP**, connect the public endpoint, and complete the domain challenge using the exact token supplied by OpenAI.
3. Inspect imported listing/review fields and discovered tools; resolve required findings and scans.
4. Have the authorized publisher complete the legal/policy attestations, then submit the selected version for review.
5. After approval, publish that version. Install it from the public directory in a fresh ChatGPT session and verify its advertised flows.

Keep preparation, upload, submission, approval, and publication as separate states. Account-enabled review and OAuth are outside this release.

## Tracking

- [#2997: ZIP workflow and public endpoint](https://github.com/homarr-labs/dashboard-icons/issues/2997)
- [#2998: Listing and privacy](https://github.com/homarr-labs/dashboard-icons/issues/2998)
- [#2999: ChatGPT qualification and recording](https://github.com/homarr-labs/dashboard-icons/issues/2999), blocked by #2997
- [#3000: OpenAI review submission](https://github.com/homarr-labs/dashboard-icons/issues/3000), blocked by #2998 and #2999
- [#3001: Publish and verify installation](https://github.com/homarr-labs/dashboard-icons/issues/3001), blocked by #3000 and OpenAI approval
