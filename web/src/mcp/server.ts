import type { AuthInfo } from "@modelcontextprotocol/server"
import { McpServer } from "@modelcontextprotocol/server"
import { instrumentDashboardIconsMcpAnalytics } from "@/mcp/analytics"
import { getMcpSession } from "@/mcp/caller"
import { registerIconPreviewResource } from "@/mcp/icon-preview"
import { registerDashboardIconsPrompts } from "@/mcp/prompts"
import { registerDashboardIconsResources } from "@/mcp/resources"
import { getDashboardIconsServerInfo } from "@/mcp/server-info"
import { registerDashboardIconsTools } from "@/mcp/tools"

export const PUBLIC_ICONS_INSTRUCTIONS = [
	"Icons for self-hosted services, homelab dashboards and app directories: dashboardicons.com plus the selfh.st, LobeHub and Simple Icons catalogs, all served from CDNs.",
	"Several service names (a stack, a docker-compose file, a dashboard): call match_icons once with all of them.",
	"One vague or partial name: search_icons.",
	"Then get_icon with the chosen name and source for every URL (svg/png/webp, light/dark, wordmark and Custom variants) and license, or get_icon_svg for the SVG markup to inline.",
	"match_icons, search_icons and browse_icons previews do not establish which formats or variants exist. When the user requests SVG or PNG URLs, call get_icon for each chosen icon and use only its returned URLs; never derive format URLs from preview_url.",
	"get_icon and get_icon_svg resolve loose names and answer unknown ones with did_you_mean instead of failing.",
	"browse_icons and list_categories explore the catalog without a query.",
	"Prefer linking the CDN URLs over copying files, and show the license for icons whose source is not native.",
].join(" ")

export const DASHBOARD_ICONS_INSTRUCTIONS = [
	PUBLIC_ICONS_INSTRUCTIONS,
	"submit_icon, propose_icon_update and list_my_submissions act on the user's dashboardicons.com account and need them to sign in to this MCP server; only submit or propose updates the user asked for. propose_icon_update targets existing Icons and is currently unavailable pending shared update validation integration.",
].join(" ")

export function createDashboardIconsServer(authInfo?: AuthInfo, publicOnly = false): McpServer {
	if (publicOnly) {
		const server = new McpServer(getDashboardIconsServerInfo(), { instructions: PUBLIC_ICONS_INSTRUCTIONS })
		registerDashboardIconsTools(server, null, true)
		registerIconPreviewResource(server)
		return server
	}
	const server = new McpServer(getDashboardIconsServerInfo(), { instructions: DASHBOARD_ICONS_INSTRUCTIONS })
	registerDashboardIconsTools(server, getMcpSession(authInfo))
	registerDashboardIconsResources(server)
	registerIconPreviewResource(server)
	registerDashboardIconsPrompts(server)
	instrumentDashboardIconsMcpAnalytics(server)
	return server
}
