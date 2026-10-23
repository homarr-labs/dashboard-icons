# OpenAI plugin release

The first directory release includes six public Icon tools: matching, search, details/CDN URLs, SVG markup, browsing, and categories. It does not include account access or contribution tools. Existing account-enabled MCP connections remain at `/api/mcp`.

The public package connects to:

```text
https://dashboardicons.com/api/mcp/public
```

This endpoint requires no sign-in and does not use the MCP analytics SDK. The hosting/CDN still processes requests, and opening an Icon URL contacts its asset provider. See the [privacy policy](https://dashboardicons.com/privacy).

Version 0.1.1 adds one read-only MCP Apps resource for inline thumbnails on `match_icons`, `search_icons`, `get_icon`, and `browse_icons`. The HTML is served by the MCP endpoint; the ZIP still contains only the two manifests and logo. Other clients retain the same structured results. The resource permits images from the catalog CDNs and dashboardicons.com, with no network API access, account access, or analytics. [Implementation research](../../docs/chatgpt-icon-previews-research.md).

Version 0.1.2 lets `match_icons` return format URLs and licenses for the entire batch with `include_details=true`. This keeps the final preview grid together when the host displays only the latest tool result. It also records the publisher's confirmed Homarr Labs identity, worldwide availability, and free/no-commerce declaration. Portal verification of that identity remains separate.

From `web/`, run `pnpm exec tsx --tsconfig tsconfig.json scripts/check-mcp-preview.mjs` to check the registered HTML bridge, thumbnails, links, text escaping, and rejected image origins.

## Build the ZIP

Use the manual **Build OpenAI plugin draft** GitHub Actions workflow after the public endpoint has deployed. The package version comes from the manifest. See [package instructions](../../plugins/README.md) for local validation and the exact build command.

Download the generated ZIP, checksum, and build receipt. Inspect the archive itself before uploading it through **With MCP** in the [OpenAI submission portal](https://developers.openai.com/plugins/deploy/submission). A generated archive does not establish ChatGPT qualification or review readiness.

## Qualify the candidate in ChatGPT

Use a development connection to the public endpoint in ChatGPT. Select **No authentication**, install the connection as a plugin, and start a fresh chat. This tests the server; after uploading the final ZIP, also check the saved package and imported review metadata. Follow [OpenAI's current development setup](https://developers.openai.com/plugins/quickstart) if the UI differs.

The package manifest is the source of the five positive and three negative review cases. Run each prompt in ChatGPT, compare actual tools/arguments and visible results with its expectations, and record **Passed**, **Failed**, **Blocked**, or **Not run**. Do not record a direct HTTP call or offline check as a ChatGPT pass.

| Evidence | Status |
| --- | --- |
| Real ChatGPT case execution | Eight baseline prompts executed on 2026-10-23; candidate 0.1.2 batch preview qualification pending |
| Review walkthrough recording | Not recorded |
| Reviewer-accessible recording URL | Not supplied |
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

Record a short real walkthrough showing the development connection, a dashboard Icon lookup, SVG or Variant lookup, catalog exploration, and one unsupported request. Keep prompts and results readable and unrelated private content off screen. Verify the recording plays at a reviewer-accessible URL, then set `review.demo_recording_url` under `extensions.com.openai` and rebuild. A script or local recording alone does not complete this requirement.

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
