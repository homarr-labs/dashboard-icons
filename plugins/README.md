# OpenAI plugin draft

`dashboard-icons/` is the portable Agent Plugins source. Its only integration is
`https://dashboardicons.com/api/mcp/public`: six public, read-only icon tools with
no authentication. The existing account-enabled `/api/mcp` remains available to
other clients. `assets/logo.png` is the existing 512 × 512 website branding asset,
copied unchanged from `web/public/web-app-manifest-512x512.png`.

Run the source check from the repository root:

```sh
python3 scripts/package-openai-plugin.py --self-check
```

To produce a draft, commit the package and builder, deploy the public endpoint,
then run **Actions → Build OpenAI plugin draft → Run workflow**. There are no
inputs: the selected Git ref supplies the source revision and
`dashboard-icons/plugin.json` supplies the stable semantic version. Download the
run's artifact for `dashboard-icons-openai-<version>.zip`, its SHA-256 checksum,
and `release-report.json`. The workflow uploads a downloadable artifact; it does
not publish a GitHub release or submit anything to OpenAI.

The same build works locally with Python 3 and no dependencies:

```sh
python3 scripts/package-openai-plugin.py --output /tmp/dashboard-icons-openai
cd /tmp/dashboard-icons-openai
shasum -a 256 -c dashboard-icons-openai-0.1.3.zip.sha256
```

The builder checks an exact three-file inventory, rejects symlinks and private
bindings, validates references/version/icon dimensions, and reopens the generated
ZIP. Before writing artifacts it verifies that the deployed endpoint advertises
exactly six public tools with read-only annotations and no conversation/model
inputs. An unavailable or incompatible endpoint fails the build. The offline
check does not claim deployed behavior.

The package follows OpenAI's documented per-server
`extensions.com.openai.auth.type: "none"`. The published Agent Plugins 1.0 MCP
JSON Schema currently omits server extensions, despite
[OpenAI documenting them](https://developers.openai.com/plugins/build/plugins#configure-mcp-authentication).
This focused validator checks the documented OpenAI shape; a portal import and
its validation remain separate checks.

The artifact remains a **draft**. Version 0.1.3 includes the confirmed Homarr Labs
publisher, worldwide/free declarations, eight review cases, and a recorded
ChatGPT walkthrough URL. Local video playback passed; public URL availability
and playback remain pending after merge. See
[`web/docs/OPENAI-MARKETPLACE.md`](../web/docs/OPENAI-MARKETPLACE.md) for the visible
case outcomes and remaining argument/portal checks. A ZIP cannot establish
developer/domain verification, required scans or attestations, OpenAI approval,
or publication.
