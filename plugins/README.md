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
shasum -a 256 -c dashboard-icons-openai-0.1.4.zip.sha256
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

Version 0.1.3 is **In review** in the OpenAI portal, with the imported Homarr Labs
listing, worldwide/free declarations, verified developer/domain, six configured
tools without MCP findings, and completed publisher attestations. Its eight
review cases and public ChatGPT walkthrough remain recorded evidence; raw tool
arguments are not exposed by the host. Version 0.1.4 is a **prepared listing
update only**: “Choose from 8,000+ icons,” with runtime unchanged from 0.1.3.
It has not been uploaded or submitted. See
[`web/docs/OPENAI-MARKETPLACE.md`](../web/docs/OPENAI-MARKETPLACE.md) for the receipt
and evidence. The submitted 0.1.3 remains in review; OpenAI approval and
publication are pending.
