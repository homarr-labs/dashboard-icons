import type { AuthInfo } from "@modelcontextprotocol/server"
import { McpServer } from "@modelcontextprotocol/server"
import { instrumentDashboardIconsMcpAnalytics } from "@/mcp/analytics"
import { getDashboardIconsServerInfo } from "@/mcp/server-info"
import { registerDashboardIconsTools } from "@/mcp/tools"

export const DASHBOARD_ICONS_INSTRUCTIONS =
	"Find icons for self-hosted services and dashboards. Use search_icons or suggest_icon to find an icon slug, then get_icon for its metadata and CDN URLs, or get_icon_url for a single URL."

export function createDashboardIconsServer(_authInfo?: AuthInfo): McpServer {
	const server = new McpServer(getDashboardIconsServerInfo(), { instructions: DASHBOARD_ICONS_INSTRUCTIONS })
	registerDashboardIconsTools(server)
	instrumentDashboardIconsMcpAnalytics(server)
	return server
}
