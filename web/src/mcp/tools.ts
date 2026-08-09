import type { McpServer } from "@modelcontextprotocol/server"
import { getIconByName, getIconUrl, searchIcons, suggestIcons } from "@/lib/icons/service"
import { getIconSchema, getIconUrlSchema, searchIconsSchema, suggestIconSchema } from "@/lib/icons/validate"

function jsonContent(data: unknown) {
	return { content: [{ type: "text" as const, text: JSON.stringify(data) }] }
}

export function registerDashboardIconsTools(server: McpServer): void {
	server.registerTool(
		"search_icons",
		{
			title: "Search Icons",
			description: "Search dashboard icons by name, alias, or category.",
			inputSchema: searchIconsSchema,
		},
		async ({ query, limit, category }) => jsonContent(await searchIcons(query, limit, category)),
	)

	server.registerTool(
		"get_icon",
		{
			title: "Get Icon",
			description: "Get full metadata and CDN URLs for a dashboard icon.",
			inputSchema: getIconSchema,
		},
		async ({ name }) => {
			const icon = await getIconByName(name)
			if (!icon) {
				return {
					...jsonContent({ error: "not_found", message: `Icon '${name}' not found`, name }),
					isError: true,
				}
			}
			return jsonContent(icon)
		},
	)

	server.registerTool(
		"get_icon_url",
		{
			title: "Get Icon URL",
			description: "Get a direct CDN URL for a dashboard icon.",
			inputSchema: getIconUrlSchema,
		},
		async ({ name, format, theme }) => {
			const result = await getIconUrl(name, format, theme)
			if (!result) {
				return {
					...jsonContent({ error: "not_found", message: `Icon '${name}' not found`, name }),
					isError: true,
				}
			}
			return jsonContent(result)
		},
	)

	server.registerTool(
		"suggest_icon",
		{
			title: "Suggest Icon",
			description: "Fuzzy match a service name to dashboard icon slugs. Pass the service name as `service_name` (or `name`).",
			inputSchema: suggestIconSchema,
		},
		async ({ service_name, limit }) => jsonContent(await suggestIcons(service_name, limit)),
	)
}
