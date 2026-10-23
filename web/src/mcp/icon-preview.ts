import type { McpServer } from "@modelcontextprotocol/server"
import { WEB_URL } from "@/constants"

export const ICON_PREVIEW_RESOURCE_URI = "ui://dashboard-icons/icon-preview-v1.html"
export const ICON_PREVIEW_MIME_TYPE = "text/html;profile=mcp-app"

const RESOURCE_DOMAINS = ["https://cdn.jsdelivr.net", "https://cdn.simpleicons.org", WEB_URL]

const ICON_PREVIEW_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dashboard Icons previews</title>
  <style>
    :root { color-scheme: light dark; font: 14px/1.45 system-ui, sans-serif; color: CanvasText; }
    :root[data-theme="light"] { color-scheme: light; }
    :root[data-theme="dark"] { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 16px; }
    h1 { margin: 0 0 4px; font-size: 16px; }
    #status { margin: 0 0 12px; color: GrayText; }
    #icons { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; max-height: 520px; overflow: auto; }
    article { min-width: 0; padding: 12px; border: 1px solid color-mix(in srgb, CanvasText 18%, transparent); border-radius: 12px; background: Canvas; overflow-wrap: anywhere; }
    .preview { display: grid; place-items: center; height: 88px; margin-bottom: 8px; border-radius: 6px; color: #111; background: repeating-conic-gradient(#ddd 0% 25%, #888 0% 50%) 50% / 16px 16px; }
    .preview img { width: 64px; height: 64px; object-fit: contain; }
    h2 { margin: 0; font-size: 14px; }
    p { margin: 4px 0; }
    .source, .requested, .license { font-size: 12px; }
    .requested { color: GrayText; }
    .links { display: flex; flex-wrap: wrap; gap: 6px 12px; margin-top: 8px; }
    a { color: LinkText; text-underline-offset: 2px; }
    a:focus-visible, #icons:focus-visible { outline: 2px solid Highlight; outline-offset: 3px; }
    @media (max-width: 360px) { body { padding: 10px; } #icons { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main>
    <h1>Dashboard Icons</h1>
    <p id="status" role="status">Loading icon previews…</p>
    <section id="icons" aria-label="Icon results" tabindex="0"></section>
  </main>
  <script>
    const imageOrigins = new Set(${JSON.stringify(RESOURCE_DOMAINS)});
    const linkOrigins = new Set([...imageOrigins, "https://github.com", "https://selfh.st", "https://lobehub.com", "https://simpleicons.org", "https://creativecommons.org", "https://spdx.org"]);
    const sources = { native: "dashboardicons.com", selfhst: "selfh.st", lobehub: "LobeHub", simpleicons: "Simple Icons" };
    const list = document.getElementById("icons");
    const status = document.getElementById("status");
    let initialized = false;
    let openLinks = false;
    let requestId = 1;

    function post(message) {
      window.parent.postMessage({ jsonrpc: "2.0", ...message }, "*");
    }

    function safeUrl(value, origins) {
      if (typeof value !== "string" || value.length > 4096) return null;
      try {
        const url = new URL(value);
        if (url.protocol === "https:" && !url.username && !url.password && origins.has(url.origin)) return url.href;
      } catch {}
      return null;
    }

    function element(tag, text, className) {
      const node = document.createElement(tag);
      if (typeof text === "string") node.textContent = text.slice(0, 1000);
      if (className) node.className = className;
      return node;
    }

    function addLink(container, label, value, origins = linkOrigins) {
      const url = safeUrl(value, origins);
      if (!url) return;
      const link = element("a", label);
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.addEventListener("click", (event) => {
        if (!initialized || !openLinks) return;
        event.preventDefault();
        post({ id: ++requestId, method: "ui/open-link", params: { url } });
      });
      container.append(link);
    }

    function card(icon, requested) {
      const node = element("article");
      if (requested) node.append(element("p", requested, "requested"));
      if (!icon || typeof icon !== "object" || typeof icon.name !== "string" || !Object.hasOwn(sources, icon.source)) {
        node.append(element("h2", "No matching icon"));
        return node;
      }
      let title = icon.name.slice(0, 200);
      if (typeof icon.title === "string" && icon.title) title = icon.title.slice(0, 200);
      const preview = element("div", undefined, "preview");
      const imageUrl = safeUrl(icon.preview_url, imageOrigins);
      if (imageUrl) {
        const img = element("img");
        img.alt = title + " icon";
        img.width = 64;
        img.height = 64;
        img.loading = "lazy";
        img.referrerPolicy = "no-referrer";
        img.addEventListener("error", () => preview.replaceChildren(element("span", "Preview unavailable")), { once: true });
        img.src = imageUrl;
        preview.append(img);
      } else {
        preview.append(element("span", "Preview unavailable"));
      }
      node.append(preview, element("h2", title), element("p", sources[icon.source], "source"));
      if (icon.source !== "native") {
        let attribution = "Icon via " + sources[icon.source];
        if (typeof icon.license?.attribution === "string" && icon.license.attribution) attribution = icon.license.attribution;
        node.append(element("p", attribution, "license"));
        if (typeof icon.license?.name === "string") {
          const license = element("p", "License: " + icon.license.name, "license");
          addLink(license, " Read license", icon.license.url);
          node.append(license);
        }
      }
      const links = element("div", undefined, "links");
      if (icon.urls && typeof icon.urls === "object") {
        for (const format of ["svg", "png", "webp"]) {
          const variants = icon.urls[format];
          if (!variants || typeof variants !== "object") continue;
          for (const [variant, url] of Object.entries(variants).slice(0, 12)) {
            let label = format.toUpperCase();
            if (variant !== "default") label += " · " + variant;
            addLink(links, label, url, imageOrigins);
          }
        }
      } else {
        addLink(links, "CDN image", imageUrl, imageOrigins);
      }
      let page = ${JSON.stringify(WEB_URL)} + "/icons/" + encodeURIComponent(icon.name);
      if (icon.source !== "native") page = ${JSON.stringify(WEB_URL)} + "/icons/external/" + icon.source + "/" + encodeURIComponent(icon.name);
      addLink(links, "Icon details", page);
      node.append(links);
      return node;
    }

    function render(result) {
      list.replaceChildren();
      const data = result?.structuredContent;
      if (result?.isError || !data || typeof data !== "object") {
        status.textContent = "Icons could not be loaded. Try again.";
        return;
      }
      let rows = [];
      if (Array.isArray(data.matches)) rows = data.matches.slice(0, 50).map((match) => ({ icon: match?.best, requested: match?.service }));
      else if (Array.isArray(data.results)) rows = data.results.slice(0, 100).map((icon) => ({ icon }));
      else if (Array.isArray(data.items)) rows = data.items.slice(0, 100).map((icon) => ({ icon }));
      else if (data.icon) rows = [{ icon: data.icon }];
      else if (Array.isArray(data.did_you_mean)) rows = data.did_you_mean.slice(0, 5).map((icon) => ({ icon }));
      for (const row of rows) list.append(card(row.icon, row.requested));
      let message = rows.length + " icon results";
      if (rows.length === 0) message = "No matching icons found.";
      else if (data.found === false) message = "No exact match. Suggested icons:";
      if (Array.isArray(data.degraded_sources) && data.degraded_sources.length) message += " Some catalogs are unavailable.";
      if (typeof data.total === "number" && data.total > rows.length) message += " Showing " + rows.length + " of " + data.total + ".";
      status.textContent = message;
    }

    function applyTheme(context) {
      if (context?.theme === "light" || context?.theme === "dark") document.documentElement.dataset.theme = context.theme;
    }

    window.addEventListener("message", (event) => {
      if (event.source !== window.parent) return;
      const message = event.data;
      if (!message || message.jsonrpc !== "2.0") return;
      if (message.id === 1 && !message.method && !initialized) {
        if (message.error || message.result?.protocolVersion !== "2026-01-26") {
          status.textContent = "Icon previews are unavailable in this client.";
          return;
        }
        openLinks = Boolean(message.result.hostCapabilities?.openLinks);
        applyTheme(message.result.hostContext);
        initialized = true;
        post({ method: "ui/notifications/initialized", params: {} });
        reportSize();
        return;
      }
      if (!initialized) return;
      if (message.method === "ui/notifications/tool-result") render(message.params);
      else if (message.method === "ui/notifications/host-context-changed") applyTheme(message.params);
      else if (message.method === "ui/notifications/tool-cancelled") status.textContent = "Icon lookup was cancelled.";
      else if ((message.method === "ping" || message.method === "ui/resource-teardown") && message.id !== undefined) post({ id: message.id, result: {} });
      else if (message.error) status.textContent = "The link could not be opened. Its address is available from the link menu.";
    });

    function reportSize() {
      if (initialized) post({ method: "ui/notifications/size-changed", params: { width: document.documentElement.clientWidth, height: document.body.scrollHeight } });
    }
    new ResizeObserver(reportSize).observe(document.body);
    post({ id: 1, method: "ui/initialize", params: { appInfo: { name: "dashboard-icons-preview", version: "1.0.0" }, appCapabilities: { availableDisplayModes: ["inline"] }, protocolVersion: "2026-01-26" } });
  </script>
</body>
</html>`

export function registerIconPreviewResource(server: McpServer): void {
	server.registerResource(
		"icon_preview",
		ICON_PREVIEW_RESOURCE_URI,
		{ title: "Icon previews", description: "Read-only icon thumbnails, sources and CDN links.", mimeType: ICON_PREVIEW_MIME_TYPE },
		async (uri) => ({
			contents: [
				{
					uri: uri.href,
					mimeType: ICON_PREVIEW_MIME_TYPE,
					text: ICON_PREVIEW_HTML,
					_meta: { ui: { domain: WEB_URL, prefersBorder: true, csp: { connectDomains: [], resourceDomains: RESOURCE_DOMAINS } } },
				},
			],
		}),
	)
}
