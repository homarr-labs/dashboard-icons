import { McpServer } from "@modelcontextprotocol/server"
import { describe, expect, it, vi } from "vitest"

const { instrumentDashboardIconsMcpAnalytics, registerDashboardIconsTools } = vi.hoisted(() => ({
	instrumentDashboardIconsMcpAnalytics: vi.fn(),
	registerDashboardIconsTools: vi.fn(),
}))

vi.mock("@/mcp/analytics", () => ({ instrumentDashboardIconsMcpAnalytics }))
vi.mock("@/mcp/tools", () => ({ registerDashboardIconsTools }))
vi.mock("@/constants", () => ({ WEB_URL: "https://dashboardicons.com" }))

describe("createDashboardIconsServer", () => {
	it("registers the tools and instruments the high-level server", async () => {
		const { createDashboardIconsServer, DASHBOARD_ICONS_INSTRUCTIONS } = await import("@/mcp/server")

		const server = createDashboardIconsServer()

		expect(server).toBeInstanceOf(McpServer)
		expect(registerDashboardIconsTools).toHaveBeenCalledWith(server)
		expect(instrumentDashboardIconsMcpAnalytics).toHaveBeenCalledWith(server)
		expect(registerDashboardIconsTools.mock.invocationCallOrder[0]).toBeLessThan(
			instrumentDashboardIconsMcpAnalytics.mock.invocationCallOrder[0] ?? 0,
		)
		expect(DASHBOARD_ICONS_INSTRUCTIONS).toContain("search_icons")
	})
})
