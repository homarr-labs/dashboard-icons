import type { McpServer, ReadResourceTemplateCallback } from "@modelcontextprotocol/server"
import { ResourceNotFoundError, ResourceTemplate } from "@modelcontextprotocol/server"
import { getCatalogIconSvg, searchCatalog } from "@/lib/icons/catalog"
import { MAX_NAME_LENGTH, MAX_QUERY_LENGTH } from "@/lib/icons/validate"

export const ICON_RESOURCE_TEMPLATE = "dashboard-icons://icons/{name}"

const COMPLETION_LIMIT = 20

function decodeName(value: string): string | null {
	try {
		return decodeURIComponent(value)
	} catch {
		return null
	}
}

export async function completeIconName(value: string): Promise<string[]> {
	if (value.length > MAX_QUERY_LENGTH) return []
	const { results } = await searchCatalog(value, { limit: COMPLETION_LIMIT })
	return [...new Set(results.map((hit) => hit.name))]
}

const readIconSvg: ReadResourceTemplateCallback = async (uri, variables) => {
	const name = decodeName(String(variables.name))
	if (name === null || name.length > MAX_NAME_LENGTH) {
		throw new ResourceNotFoundError(uri.href, `Invalid icon name: use valid URI encoding and at most ${MAX_NAME_LENGTH} characters.`)
	}
	const result = await getCatalogIconSvg(name)
	if (!result.found) {
		const suggestions = result.did_you_mean.map((hit) => hit.name).join(", ")
		throw new ResourceNotFoundError(uri.href, `No icon named "${name}". Closest: ${suggestions || "none"}.`)
	}
	if (result.svg === null) {
		throw new ResourceNotFoundError(uri.href, `"${result.name}" has no SVG (${result.reason}). Use the get_icon tool for PNG/WebP URLs.`)
	}
	return { contents: [{ uri: uri.href, mimeType: "image/svg+xml", text: result.svg }] }
}

export function registerDashboardIconsResources(server: McpServer): void {
	server.registerResource(
		"icon_svg",
		new ResourceTemplate(ICON_RESOURCE_TEMPLATE, { list: undefined, complete: { name: completeIconName } }),
		{
			title: "Icon SVG",
			description:
				"Read-only SVG markup of an icon by slug, e.g. dashboard-icons://icons/home-assistant. Looks in dashboardicons.com first, then selfh.st, LobeHub and Simple Icons. Use get_icon_svg to pick a source or a light/dark theme. Icon changes require the signed-in propose_icon_update tool when enabled; resources never modify Icons.",
			mimeType: "image/svg+xml",
		},
		readIconSvg,
	)
}
