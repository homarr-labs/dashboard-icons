import { McpServer } from "@modelcontextprotocol/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
	instrumentDashboardIconsMcpAnalytics: vi.fn(),
	registerDashboardIconsTools: vi.fn(),
	registerDashboardIconsResources: vi.fn(),
	registerDashboardIconsPrompts: vi.fn(),
}))

vi.mock("@/mcp/analytics", () => ({ instrumentDashboardIconsMcpAnalytics: mocks.instrumentDashboardIconsMcpAnalytics }))
vi.mock("@/mcp/tools", () => ({ registerDashboardIconsTools: mocks.registerDashboardIconsTools }))
vi.mock("@/mcp/resources", () => ({ registerDashboardIconsResources: mocks.registerDashboardIconsResources }))
vi.mock("@/mcp/prompts", () => ({ registerDashboardIconsPrompts: mocks.registerDashboardIconsPrompts }))
vi.mock("@/constants", () => ({ WEB_URL: "https://dashboardicons.com" }))

describe("createDashboardIconsServer", () => {
	beforeEach(() => vi.clearAllMocks())

	it("keeps the public server anonymous and excludes account instructions, resources, prompts and analytics", async () => {
		const { createDashboardIconsServer, PUBLIC_ICONS_INSTRUCTIONS } = await import("@/mcp/server")
		const server = createDashboardIconsServer({ token: "secret", clientId: "account-client", scopes: ["account"] }, true)

		expect(server).toBeInstanceOf(McpServer)
		expect(mocks.registerDashboardIconsTools).toHaveBeenCalledWith(server, null, true)
		expect(mocks.registerDashboardIconsResources).not.toHaveBeenCalled()
		expect(mocks.registerDashboardIconsPrompts).not.toHaveBeenCalled()
		expect(mocks.instrumentDashboardIconsMcpAnalytics).not.toHaveBeenCalled()
		for (const accountTerm of ["submit_icon", "propose_icon_update", "list_my_submissions", "sign in", "account"]) {
			expect(PUBLIC_ICONS_INSTRUCTIONS).not.toContain(accountTerm)
		}
	})

	it("registers tools, resources and prompts, then instruments the high-level server", async () => {
		const { createDashboardIconsServer, DASHBOARD_ICONS_INSTRUCTIONS } = await import("@/mcp/server")

		const server = createDashboardIconsServer()

		expect(server).toBeInstanceOf(McpServer)
		expect(mocks.registerDashboardIconsTools).toHaveBeenCalledWith(server, null)
		expect(mocks.registerDashboardIconsResources).toHaveBeenCalledWith(server)
		expect(mocks.registerDashboardIconsPrompts).toHaveBeenCalledWith(server)
		expect(mocks.instrumentDashboardIconsMcpAnalytics).toHaveBeenCalledWith(server)
		for (const register of [
			mocks.registerDashboardIconsTools,
			mocks.registerDashboardIconsResources,
			mocks.registerDashboardIconsPrompts,
		]) {
			expect(register.mock.invocationCallOrder[0]).toBeLessThan(mocks.instrumentDashboardIconsMcpAnalytics.mock.invocationCallOrder[0] ?? 0)
		}
		for (const tool of [
			"match_icons",
			"search_icons",
			"get_icon",
			"get_icon_svg",
			"browse_icons",
			"list_categories",
			"submit_icon",
			"propose_icon_update",
			"list_my_submissions",
		]) {
			expect(DASHBOARD_ICONS_INSTRUCTIONS).toContain(tool)
		}
	})

	it("hands the signed-in session to the tools", async () => {
		const { createDashboardIconsServer } = await import("@/mcp/server")

		const server = createDashboardIconsServer({
			token: "t",
			clientId: "c",
			scopes: [],
			extra: { userId: "user_1", username: "iconfan", admin: true, pbToken: "pb" },
		})

		expect(mocks.registerDashboardIconsTools).toHaveBeenLastCalledWith(server, {
			caller: { userId: "user_1", username: "iconfan", admin: true },
			pbToken: "pb",
		})
	})
})
