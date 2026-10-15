import type { CallToolResult, McpServer } from "@modelcontextprotocol/server"
import type { McpCaller } from "@/mcp/caller"
import { browseIconsTool } from "@/mcp/tools/browse-icons"
import { getIconTool } from "@/mcp/tools/get-icon"
import { getIconSvgTool } from "@/mcp/tools/get-icon-svg"
import { listCategoriesTool } from "@/mcp/tools/list-categories"
import { matchIconsTool } from "@/mcp/tools/match-icons"
import { searchIconsTool } from "@/mcp/tools/search-icons"
import type { DashboardIconsTool } from "@/mcp/tools/types"

export const DASHBOARD_ICONS_TOOLS: readonly DashboardIconsTool[] = [
	matchIconsTool,
	searchIconsTool,
	getIconTool,
	getIconSvgTool,
	browseIconsTool,
	listCategoriesTool,
]

const ACCOUNT_TOOL_NAMES = new Set(DASHBOARD_ICONS_TOOLS.filter((tool) => tool.access === "account").map((tool) => tool.name))

export function isAccountTool(name: string): boolean {
	return ACCOUNT_TOOL_NAMES.has(name)
}

async function runTool(tool: DashboardIconsTool, args: Record<string, unknown>, caller: McpCaller | null): Promise<CallToolResult> {
	if (tool.access === "public") return tool.handler(args, { caller })
	if (!caller) {
		return {
			content: [
				{ type: "text", text: `${tool.name} needs a signed-in dashboardicons.com account. Sign in to this MCP server, then retry.` },
			],
			isError: true,
		}
	}
	return tool.handler(args, { caller })
}

export function registerDashboardIconsTools(server: McpServer, caller: McpCaller | null): void {
	for (const tool of DASHBOARD_ICONS_TOOLS) {
		server.registerTool(tool.name, tool.config, (args) => runTool(tool, args, caller))
	}
}
