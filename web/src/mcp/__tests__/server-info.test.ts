import { describe, expect, it } from "vitest"
import { getDashboardIconsServerInfo } from "@/mcp/server-info"

describe("getDashboardIconsServerInfo", () => {
	it("includes site favicon URLs for MCP clients", () => {
		const info = getDashboardIconsServerInfo("https://dashboardicons.com")

		expect(info.websiteUrl).toBe("https://dashboardicons.com")
		expect(info.icons).toEqual([
			{
				src: "https://dashboardicons.com/favicon-96x96.png",
				mimeType: "image/png",
				sizes: ["96x96"],
			},
			{
				src: "https://dashboardicons.com/favicon.svg",
				mimeType: "image/svg+xml",
				sizes: ["any"],
			},
		])
	})
})
