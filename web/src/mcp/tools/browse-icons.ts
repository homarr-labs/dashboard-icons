import { z } from "zod"
import { browseCatalog } from "@/lib/icons/catalog"
import { MAX_CATEGORY_LENGTH } from "@/lib/icons/validate"
import { ICON_PREVIEW_RESOURCE_URI } from "@/mcp/icon-preview"
import { degradedSourcesSchema, iconItemSchema, sourceSchema } from "@/mcp/tools/schemas"
import { type PublicTool, READ_ONLY_ANNOTATIONS, structuredResult } from "@/mcp/tools/types"

const inputSchema = z.object({
	category: z.string().trim().max(MAX_CATEGORY_LENGTH).optional().describe("A category name from list_categories"),
	source: sourceSchema.optional().describe("Only icons from this source. Default: all, dashboardicons.com icons first."),
	sort: z.enum(["alphabetical", "newest"]).default("alphabetical"),
	limit: z.number().int().min(1).max(100).default(50),
	cursor: z.string().max(20).optional().describe("next_cursor from the previous page"),
})

const outputSchema = z.looseObject({
	items: z.array(iconItemSchema),
	total: z.number().int(),
	next_cursor: z.string().nullable().describe("Pass as cursor to get the next page; null on the last page"),
	degraded_sources: degradedSourcesSchema,
})

export const browseIconsTool: PublicTool<typeof inputSchema, typeof outputSchema> = {
	name: "browse_icons",
	access: "public",
	config: {
		title: "Browse icons",
		description:
			"Page through icons without a search term: everything in a category, one source's catalog, or the newest additions (sort: 'newest'). Use search_icons or match_icons instead when you know what you are looking for.",
		inputSchema,
		outputSchema,
		annotations: READ_ONLY_ANNOTATIONS,
		_meta: { category: "discovery", ui: { resourceUri: ICON_PREVIEW_RESOURCE_URI } },
	},
	async handler(options) {
		const result: z.output<typeof outputSchema> = await browseCatalog(options)
		return structuredResult(result)
	},
}
