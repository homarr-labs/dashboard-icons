# ChatGPT icon previews

Checked 2026-10-23 against official documentation and source at `e329cd5ab9c13c24a0f89fb61cbfe2a2a808b73b`. Research only; no tests or live ChatGPT rendering verification were run.

## Recommendation

Use one dependency-free MCP App HTML resource for visible thumbnails inside ChatGPT. Keep the existing JSON text and `structuredContent` for other clients. ChatGPT supports HTML components rendered alongside the conversation through the MCP Apps standard. Plain HTML/CSS/JavaScript is enough; the SDK wrapper is optional. [OpenAI UI guide](https://developers.openai.com/plugins/build/chatgpt-ui), [MCP Apps framework guidance](https://modelcontextprotocol.io/extensions/apps/overview#framework-support)

| Approach | Finding |
| --- | --- |
| Ask the assistant to emit `![title](preview_url)` | Smallest best-effort improvement. The reviewed official docs do not establish a guarantee that Markdown inside tool text becomes visible ChatGPT thumbnails. It still depends on the assistant and host rendering. |
| Return MCP `ImageContent` | Valid protocol image output, but requires base64 image bytes and a MIME type; a URL is insufficient. Downloading every preview adds work, and SVG-to-raster compatibility may require conversion. The protocol leaves presentation to the client. This is not a documented ChatGPT thumbnail-grid contract. [MCP tool/image specification](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#image-content) |
| Return an MCP App | Documented host-rendered UI path. One small HTML resource can render the existing CDN URLs without server-side image downloads, a framework, or a new dependency. [OpenAI quickstart](https://developers.openai.com/plugins/build/app-quickstart) |

## Smallest implementation

1. Register a versioned resource such as `ui://dashboard-icons/previews-v1.html`, returning `text/html;profile=mcp-app` and a self-contained HTML document. Link selected tool descriptors with `_meta.ui.resourceUri`. Existing `registerResource` is sufficient. [OpenAI UI resource example](https://developers.openai.com/plugins/build/chatgpt-ui#embed-the-component-in-the-server-response)
2. Use the standard `postMessage` bridge: install the parent-message listener, send `ui/initialize`, acknowledge with `ui/notifications/initialized`, then render `params.structuredContent` from `ui/notifications/tool-result`. Check `event.source === window.parent` and the JSON-RPC envelope. The quickstart demonstrates this without client dependencies. [OpenAI bridge example](https://developers.openai.com/plugins/build/app-quickstart)
3. Render existing `results`, `items`, `matches[].best`, or `icon` into a small responsive grid with image, title, and source. Keep unmatched services and degraded-source warnings visible. Use DOM APIs/text content, validate image URLs, supply alt text, preserve aspect ratio, and show a useful failure state. These are implementation recommendations; OpenAI's accessibility guidance calls for image alt text. [UI accessibility guidance](https://developers.openai.com/plugins/concepts/ui-guidelines#accessibility)

For this bounded catalog, attaching the shared preview to `search_icons`, `match_icons`, `get_icon`, and `browse_icons` avoids adding a seventh tool. Keep `list_categories` and raw `get_icon_svg` without the template. This is a scope tradeoff: OpenAI generally recommends a separate render tool so chained data calls do not repeatedly render widgets. Use that split if repeated cards become a real problem. [OpenAI decoupled pattern](https://developers.openai.com/plugins/build/chatgpt-ui#separate-data-processing-from-ui-rendering)

## Compatibility and CSP

`window.openai.toolOutput` remains a compatibility alias for the structured result. `_meta["openai/outputTemplate"]` likewise aliases the resource link. New code should use the standard bridge; feature-detect any optional `window.openai` fallback and listen for `openai:set_globals` if using it. Neither alias requires replacing the generic MCP result. [OpenAI bridge reference](https://developers.openai.com/plugins/reference#windowopenai-component-bridge)

Set resource-content `_meta.ui.csp` with empty `connectDomains` and only the required image origins in `resourceDomains`. Source defaults currently need `https://cdn.jsdelivr.net` and `https://cdn.simpleicons.org`; add `https://dashboardicons.com` only if displaying existing same-site PNG routes. Do not allow arbitrary catalog-provided origins or use wildcard CSP. Imported `url_templates` can differ from defaults, so reject unapproved image origins and show a fallback. [Source defaults](../web/src/constants.ts), [URL resolution](../web/src/lib/external-icon-urls.ts), [OpenAI CSP reference](https://developers.openai.com/plugins/reference#component-resource-_meta-fields)

Before submitting a plugin with UI, declare the required unique component origin via `_meta.ui.domain`. Resource URIs are cache keys: version the URI for breaking HTML/CSS/JavaScript changes. [OpenAI resource metadata](https://developers.openai.com/plugins/reference#component-resource-_meta-fields), [resource caching guidance](https://developers.openai.com/plugins/build/chatgpt-ui#embed-the-component-in-the-server-response)

## Repository gotchas and proof boundary

- `publicOnly` currently returns before registering resources. Register the preview resource on that server too, or the marketplace endpoint cannot serve it. [Server registration](../web/src/mcp/server.ts)
- The local tool definition narrows `_meta` to `category`; extend that type without removing the category. Keep `structuredResult` unchanged. [Tool definitions](../web/src/mcp/tools/types.ts)
- Validate successful rendering in an actual ChatGPT development connection, including dark/light logos, zero results, missing assets, and the public endpoint. Source changes, MCP Inspector, and fetched HTML do not establish visible ChatGPT previews.
