import assert from "node:assert/strict"
import { JSDOM, VirtualConsole } from "jsdom"
import { ICON_PREVIEW_RESOURCE_URI, registerIconPreviewResource } from "../src/mcp/icon-preview.ts"

let read
registerIconPreviewResource({
	registerResource: (_name, _uri, _config, callback) => {
		read = callback
	},
})
const resource = await read(new URL(ICON_PREVIEW_RESOURCE_URI))
const sent = []
const errors = []
const virtualConsole = new VirtualConsole().on("jsdomError", (error) => errors.push(error))
const dom = new JSDOM(resource.contents[0].text, {
	runScripts: "dangerously",
	virtualConsole,
	beforeParse(window) {
		window.ResizeObserver = class {
			observe() {}
		}
		window.parent.postMessage = (message) => sent.push(message)
	},
})
const { window } = dom
const doc = window.document
const receive = (data, source = window.parent) => window.dispatchEvent(new window.MessageEvent("message", { data, source }))
try {
	assert.equal(sent[0].method, "ui/initialize")
	const initialized = { jsonrpc: "2.0", id: 1, result: { protocolVersion: "2026-01-26" } }
	receive(initialized, null)
	assert.equal(sent.length, 1)
	receive(initialized)
	assert.equal(sent[1].method, "ui/notifications/initialized")
	const icon = {
		name: "plex",
		title: "<img src=x onerror=alert(1)>",
		source: "native",
		preview_url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/plex.svg",
	}
	const render = (preview) =>
		receive({ jsonrpc: "2.0", method: "ui/notifications/tool-result", params: { structuredContent: { results: [preview] } } })
	render(icon)
	assert.equal(doc.querySelectorAll("img").length, 1)
	assert.equal(doc.querySelector("img").src, icon.preview_url)
	assert.equal(doc.querySelector("h2").textContent, icon.title)
	assert.equal(doc.querySelector("a").href, icon.preview_url)
	render({ ...icon, preview_url: "https://attacker.example/icon.svg" })
	assert.equal(doc.querySelectorAll("img").length, 0)
	assert.match(doc.body.textContent, /Preview unavailable/)
	assert.equal(doc.querySelectorAll('a[href*="attacker.example"]').length, 0)
	assert.equal(errors.length, 0, errors.map(String).join("\n"))
	console.log("MCP preview check passed")
} finally {
	window.close()
}
