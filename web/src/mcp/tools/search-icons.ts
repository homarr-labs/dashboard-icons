import { z } from "zod"
import { searchCatalog } from "@/lib/icons/catalog"
import { MAX_CATEGORY_LENGTH, MAX_QUERY_LENGTH } from "@/lib/icons/validate"
import { degradedSourcesSchema, iconHitSchema, sourcesInput } from "@/mcp/tools/schemas"
import { type PublicTool, READ_ONLY_ANNOTATIONS, structuredResult } from "@/mcp/tools/types"

const inputSchema = z.object({
	query: z
		.string()
		.trim()
		.min(1)
		.max(MAX_QUERY_LENGTH)
		.describe(
			"A service, brand or app name, alias or category, optionally with a Variant, e.g. 'jellyfin', 'password manager', 'github white' or 'helix wordmark'",
		),
	sources: sourcesInput,
	category: z.string().trim().max(MAX_CATEGORY_LENGTH).optional().describe("Only icons in this category (names from list_categories)"),
	limit: z.number().int().min(1).max(50).default(20),
})

const outputSchema = z.looseObject({
	results: z.array(iconHitSchema),
	total: z.number().int().describe("Number of matches before the limit"),
	degraded_sources: degradedSourcesSchema,
})

export const searchIconsTool: PublicTool<typeof inputSchema, typeof outputSchema> = {
	name: "search_icons",
	access: "public",
	config: {
		title: "Search icons",
		description:
			"Fuzzy-search icons by name, alias or category across dashboardicons.com and the selfh.st, LobeHub and Simple Icons catalogs, best match first (native icons win ties). Queries also match dashboardicons.com Variant names and synonyms: 'light'/'white'/'for dark background', 'dark'/'black', 'wordmark'/'text logo' and Custom variant names such as '4k'. The parent icon is returned and matched_variant says which Variant matched. Use it for one vague or partial name, or to explore options. For a list of known services use match_icons instead: one call for all of them. Each result's preview_url is a ready CDN image; pass its name and source to get_icon for every format and Variant (matched_variant.key is the key in its urls), or to get_icon_svg for inline SVG markup.",
		inputSchema,
		outputSchema,
		annotations: READ_ONLY_ANNOTATIONS,
		_meta: { category: "discovery" },
	},
	async handler({ query, sources, category, limit }) {
		const result: z.output<typeof outputSchema> = await searchCatalog(query, { sources, category, limit })
		return structuredResult(result)
	},
}
