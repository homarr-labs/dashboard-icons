import { describe, expect, it, vi } from "vitest"

const registerDashboardIconsTools = vi.fn()
const instrumentDashboardIconsMcpAnalytics = vi.fn()

vi.mock("@/mcp/analytics", () => ({
	instrumentDashboardIconsMcpAnalytics,
}))

vi.mock("@/mcp/tools", () => ({
	registerDashboardIconsTools,
}))

vi.mock("mcp-handler", () => ({
	createMcpHandler: (init: (server: unknown) => void) => {
		init({})
		return vi.fn()
	},
}))

describe("createDashboardIconsMcpHandler", () => {
	it("registers dashboard icon tools on init", async () => {
		const { createDashboardIconsMcpHandler } = await import("@/mcp/handler")
		const handler = createDashboardIconsMcpHandler()
		expect(instrumentDashboardIconsMcpAnalytics).toHaveBeenCalled()
		expect(registerDashboardIconsTools).toHaveBeenCalled()
		expect(typeof handler).toBe("function")
	})
})
