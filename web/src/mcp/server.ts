import type { AuthInfo } from "@modelcontextprotocol/server"
import { McpServer } from "@modelcontextprotocol/server"
import { instrumentDashboardIconsMcpAnalytics } from "@/mcp/analytics"
import { getMcpCaller } from "@/mcp/caller"
import { registerDashboardIconsPrompts } from "@/mcp/prompts"
import { registerDashboardIconsResources } from "@/mcp/resources"
import { getDashboardIconsServerInfo } from "@/mcp/server-info"
import { registerDashboardIconsTools } from "@/mcp/tools"

export const DASHBOARD_ICONS_INSTRUCTIONS = [
	"Icons for self-hosted services, homelab dashboards and app directories: dashboardicons.com plus the selfh.st, LobeHub and Simple Icons catalogs, all served from CDNs.",
	"Several service names (a stack, a docker-compose file, a dashboard): call match_icons once with all of them.",
	"One vague or partial name: search_icons.",
	"Then get_icon with the chosen name and source for every URL (svg/png/webp, light/dark) and license, or get_icon_svg for the SVG markup to inline.",
	"get_icon and get_icon_svg resolve loose names and answer unknown ones with did_you_mean instead of failing.",
	"browse_icons and list_categories explore the catalog without a query.",
	"Prefer linking the CDN URLs over copying files, and show the license for icons whose source is not native.",
].join(" ")

export function createDashboardIconsServer(authInfo?: AuthInfo): McpServer {
	const server = new McpServer(getDashboardIconsServerInfo(), { instructions: DASHBOARD_ICONS_INSTRUCTIONS })
	registerDashboardIconsTools(server, getMcpCaller(authInfo))
	registerDashboardIconsResources(server)
	registerDashboardIconsPrompts(server)
	instrumentDashboardIconsMcpAnalytics(server)
	return server
}
