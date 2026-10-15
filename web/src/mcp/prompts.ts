import type { GetPromptResult, McpServer } from "@modelcontextprotocol/server"
import { completable } from "@modelcontextprotocol/server"
import { z } from "zod"
import { MAX_SERVICES } from "@/mcp/tools/match-icons"

export const DASHBOARDS = ["homarr", "homepage", "dashy", "generic"] as const

type Dashboard = (typeof DASHBOARDS)[number]

const OUTPUT_FORMATS: Record<Dashboard, string> = {
	homarr: "a list for Homarr: one line per app with its name and the icon URL to paste into the app's icon URL field",
	homepage: "a Homepage (gethomepage.dev) services.yaml snippet where every service has `icon:` set to the full icon URL",
	dashy: "a Dashy conf.yml `sections` snippet where every item has `icon:` set to the full icon URL",
	generic: "a JSON object mapping each service name to its icon URL",
}

export function parseServices(value: string): string[] {
	const names = value
		.split(/[,\n]/)
		.map((name) => name.trim())
		.filter(Boolean)
	return [...new Set(names)].slice(0, MAX_SERVICES)
}

export function buildIconsForDashboardPrompt(services: string[], dashboard: Dashboard): GetPromptResult {
	let text = "Ask me which services I run, then find their icons with the match_icons tool."
	if (services.length > 0) {
		text = [
			`Find icons for these services: ${services.join(", ")}.`,
			`1. Call the match_icons tool once with services ${JSON.stringify(services)}.`,
			"2. Use best.preview_url as each icon URL. Call get_icon with best.name and best.source only when a light/dark variant or another format fits the dashboard better. When best is null, try search_icons with a shorter or alternative name, and say plainly which services still have no icon instead of inventing a URL.",
			`3. Reply with ${OUTPUT_FORMATS[dashboard]}. Only use URLs returned by the tools, and mention the license for icons whose source is not native.`,
		].join("\n")
	}
	return { messages: [{ role: "user", content: { type: "text", text } }] }
}

export function completeDashboard(value: string | undefined): Dashboard[] {
	const prefix = (value ?? "").toLowerCase()
	return DASHBOARDS.filter((dashboard) => dashboard.startsWith(prefix))
}

export function registerDashboardIconsPrompts(server: McpServer): void {
	server.registerPrompt(
		"icons_for_dashboard",
		{
			title: "Icons for my dashboard",
			description: "Find icons for a list of services and write the config snippet for Homarr, Homepage, Dashy or a plain JSON map.",
			argsSchema: z.object({
				services: z.string().max(5_000).describe("Service names separated by commas or new lines, e.g. 'Plex, Sonarr, Home Assistant'"),
				dashboard: completable(
					z.enum(DASHBOARDS).default("generic").describe("Dashboard to write the config for: homarr, homepage, dashy or generic"),
					completeDashboard,
				),
			}),
		},
		({ services, dashboard }) => buildIconsForDashboardPrompt(parseServices(services), dashboard),
	)
}
