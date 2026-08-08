import { describe, expect, it, vi } from "vitest"

const registerDashboardIconsTools = vi.fn()
const instrumentDashboardIconsMcpAnalytics = vi.fn()
const createMcpHandler = vi.fn((init: (server: unknown) => void, _options?: unknown) => {
	init({})
	return vi.fn()
})

vi.mock("@/mcp/analytics", () => ({
	instrumentDashboardIconsMcpAnalytics,
}))

vi.mock("@/mcp/tools", () => ({
	registerDashboardIconsTools,
}))

vi.mock("mcp-handler", () => ({
	createMcpHandler,
}))

describe("createDashboardIconsMcpHandler", () => {
	it("registers dashboard icon tools on init", async () => {
		const { createDashboardIconsMcpHandler } = await import("@/mcp/handler")
		const handler = createDashboardIconsMcpHandler()
		expect(instrumentDashboardIconsMcpAnalytics).toHaveBeenCalled()
		expect(registerDashboardIconsTools).toHaveBeenCalled()
		// mcp-handler 2.x takes (init, options) — two arguments
		expect(createMcpHandler.mock.calls[0]).toHaveLength(2)
		expect(createMcpHandler.mock.calls[0]?.[1]).toMatchObject({
			serverInfo: expect.any(Object),
			verboseLogs: false,
		})
		expect(typeof handler).toBe("function")
	})
})
