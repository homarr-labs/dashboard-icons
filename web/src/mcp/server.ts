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
	"Several service names (a stack, a docker-compose file, a dashboard): call match_icons once with all of them. Set include_details=true when the user asks for formats, variants or licenses, and use the returned best.urls and best.license without calling get_icon again for those matches.",
	"One vague or partial name: search_icons.",
	"For a single chosen icon, get_icon with its name and source returns every URL (svg/png/webp, light/dark, wordmark and Custom variants) and license; get_icon_svg returns SVG markup to inline.",
	"A preview alone does not establish which formats or variants exist. Use only URLs returned by match_icons with include_details=true or by get_icon; never derive format URLs from preview_url. Report details_unavailable or absent formats accurately.",
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
