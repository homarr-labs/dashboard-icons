import { afterEach, describe, expect, it, vi } from "vitest"

const { PostHogMock, instrumentMock } = vi.hoisted(() => {
	return {
		PostHogMock: vi.fn(function PostHogMock() {
			return { flush: vi.fn(async () => {}) }
		}),
		instrumentMock: vi.fn(),
	}
})

vi.mock("@posthog/mcp", () => ({
	PostHog: PostHogMock,
	instrument: instrumentMock,
}))

// Mock the icon service so the real handler wiring can run outside Next.js
vi.mock("@/lib/icons/service", () => ({
	searchIcons: vi.fn(async () => ({ icons: [], total: 0 })),
	getIconByName: vi.fn(async () => null),
	getIconUrl: vi.fn(async () => null),
	suggestIcons: vi.fn(async () => ({ suggestions: [] })),
}))

// Mock constants (WEB_URL etc.) that may pull in server-only code
vi.mock("@/constants", () => ({
	WEB_URL: "https://dashboardicons.com",
}))

function req(body: unknown) {
	return new Request("http://localhost/api/mcp", {
		method: "POST",
		headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
		body: JSON.stringify(body),
	})
}

describe("MCP analytics integration (real handler wiring)", () => {
	afterEach(() => {
		vi.unstubAllEnvs()
		vi.clearAllMocks()
		vi.resetModules()
	})

	it("instruments the low-level server and handles requests", async () => {
		vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test")
		vi.stubEnv("NEXT_PUBLIC_DISABLE_POSTHOG", "false")

		// Fresh import so the analytics module reads the stubbed env at module scope
		const { createDashboardIconsMcpHandler } = await import("@/mcp/handler")
		const handler = createDashboardIconsMcpHandler()

		// Requests should succeed (200), proving instrumentation didn't break the handler.
		// mcp-handler builds the server lazily per request, so instrumentation runs here.
		const init = await handler(
			req({
				jsonrpc: "2.0",
				id: 1,
				method: "initialize",
				params: {
					protocolVersion: "2024-11-05",
					capabilities: {},
					clientInfo: { name: "diag", version: "1.0" },
				},
			}),
		)
		expect(init.status).toBe(200)

		const list = await handler(req({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }))
		expect(list.status).toBe(200)

		const call = await handler(
			req({
				jsonrpc: "2.0",
				id: 3,
				method: "tools/call",
				params: { name: "search_icons", arguments: { query: "plex" } },
			}),
		)
		expect(call.status).toBe(200)

		// The analytics module should have created a PostHog client and called instrument()
		expect(PostHogMock).toHaveBeenCalledWith("phc_test", { host: "https://eu.i.posthog.com" })
		// mcp-handler creates a fresh server per request, so instrument() runs once per request
		expect(instrumentMock).toHaveBeenCalledTimes(3)

		// instrument must be called with the low-level server (server.server), not the McpServer
		const [instrumentedServer] = instrumentMock.mock.calls[0] ?? []
		expect(instrumentedServer).toBeDefined()
		// @modelcontextprotocol/server v2 McpServer exposes the low-level server as `.server`;
		// the SDK must receive that low-level server (which has no `tool()` method).
		expect(instrumentedServer?.tool).toBeUndefined()
		expect(typeof instrumentedServer?.setRequestHandler).toBe("function")
	})
})
