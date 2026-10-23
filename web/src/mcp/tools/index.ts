import type { CallToolResult, McpServer } from "@modelcontextprotocol/server"
import type { McpSession } from "@/mcp/caller"
import { browseIconsTool } from "@/mcp/tools/browse-icons"
import { getIconTool } from "@/mcp/tools/get-icon"
import { getIconSvgTool } from "@/mcp/tools/get-icon-svg"
import { listCategoriesTool } from "@/mcp/tools/list-categories"
import { listMySubmissionsTool } from "@/mcp/tools/list-my-submissions"
import { matchIconsTool } from "@/mcp/tools/match-icons"
import { proposeIconUpdateTool } from "@/mcp/tools/propose-icon-update"
import { searchIconsTool } from "@/mcp/tools/search-icons"
import { submitIconTool } from "@/mcp/tools/submit-icon"
import type { DashboardIconsTool } from "@/mcp/tools/types"

export const DASHBOARD_ICONS_TOOLS: readonly DashboardIconsTool[] = [
	matchIconsTool,
	searchIconsTool,
	getIconTool,
	getIconSvgTool,
	browseIconsTool,
	listCategoriesTool,
	submitIconTool,
	proposeIconUpdateTool,
	listMySubmissionsTool,
]

const ACCOUNT_TOOL_NAMES = new Set(DASHBOARD_ICONS_TOOLS.filter((tool) => tool.access === "account").map((tool) => tool.name))

export function isAccountTool(name: string): boolean {
	return ACCOUNT_TOOL_NAMES.has(name)
}

async function runTool(tool: DashboardIconsTool, args: Record<string, unknown>, session: McpSession | null): Promise<CallToolResult> {
	if (tool.access === "public") return tool.handler(args, { caller: session?.caller ?? null })
	if (!session) {
		return {
			content: [
				{ type: "text", text: `${tool.name} needs a signed-in dashboardicons.com account. Sign in to this MCP server, then retry.` },
			],
			isError: true,
		}
	}
	return tool.handler(args, session)
}

export function registerDashboardIconsTools(server: McpServer, session: McpSession | null, publicOnly = false): void {
	for (const tool of DASHBOARD_ICONS_TOOLS) {
		if (publicOnly && tool.access !== "public") continue
		server.registerTool(tool.name, tool.config, (args) => runTool(tool, args, session))
	}
}
