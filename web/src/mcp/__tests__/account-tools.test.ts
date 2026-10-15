import type { CallToolResult, McpServer } from "@modelcontextprotocol/server"
import { describe, expect, it, vi } from "vitest"
import { z } from "zod"
import type { AccountTool } from "@/mcp/tools/types"

const handler = vi.hoisted(() => vi.fn(async (): Promise<CallToolResult> => ({ content: [{ type: "text", text: "submitted" }] })))

vi.mock("@/mcp/tools/list-categories", () => {
	const accountTool: AccountTool = {
		name: "submit_icon",
		access: "account",
		config: {
			title: "Submit icon",
			description: "Submit an icon for review.",
			inputSchema: z.object({ name: z.string() }),
			outputSchema: z.object({}),
			annotations: {},
			_meta: { category: "account" },
		},
		handler,
	}
	return { listCategoriesTool: accountTool }
})

type ToolCallback = (args: Record<string, unknown>) => Promise<CallToolResult>

async function callSubmit(caller: Parameters<typeof import("@/mcp/tools").registerDashboardIconsTools>[1]) {
	const { registerDashboardIconsTools } = await import("@/mcp/tools")
	let submit: ToolCallback | undefined
	const registerTool = (name: string, _config: unknown, callback: ToolCallback) => {
		if (name === "submit_icon") submit = callback
	}
	registerDashboardIconsTools({ registerTool } as unknown as McpServer, caller)
	return submit?.({ name: "plex" })
}

describe("account tools", () => {
	it("are listed for everyone and flagged for the route gate", async () => {
		const { DASHBOARD_ICONS_TOOLS, isAccountTool } = await import("@/mcp/tools")
		expect(DASHBOARD_ICONS_TOOLS.map((tool) => tool.name)).toContain("submit_icon")
		expect(isAccountTool("submit_icon")).toBe(true)
		expect(isAccountTool("search_icons")).toBe(false)
	})

	it("refuse anonymous callers without running the handler", async () => {
		const result = await callSubmit(null)
		expect(result).toMatchObject({ isError: true })
		expect(handler).not.toHaveBeenCalled()
	})

	it("run with the signed-in caller", async () => {
		const caller = { userId: "u1", username: "iconfan", admin: false }
		expect(await callSubmit(caller)).toEqual({ content: [{ type: "text", text: "submitted" }] })
		expect(handler).toHaveBeenCalledWith({ name: "plex" }, { caller })
	})
})
