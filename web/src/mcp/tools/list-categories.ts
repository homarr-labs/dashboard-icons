import { z } from "zod"
import { listCatalogCategories } from "@/lib/icons/catalog"
import { degradedSourcesSchema, sourceSchema } from "@/mcp/tools/schemas"
import { type PublicTool, READ_ONLY_ANNOTATIONS, structuredResult } from "@/mcp/tools/types"

const inputSchema = z.object({
	source: sourceSchema.optional().describe("Only count icons from this source. Default: all sources."),
})

const outputSchema = z.looseObject({
	categories: z.array(z.object({ name: z.string(), count: z.number().int() })).describe("Largest first"),
	degraded_sources: degradedSourcesSchema,
})

export const listCategoriesTool: PublicTool<typeof inputSchema, typeof outputSchema> = {
	name: "list_categories",
	access: "public",
	config: {
		title: "List icon categories",
		description:
			"List icon categories with how many icons each has. Use a category name with browse_icons to see every icon in it, or as the category filter of search_icons.",
		inputSchema,
		outputSchema,
		annotations: READ_ONLY_ANNOTATIONS,
		_meta: { category: "discovery" },
	},
	async handler({ source }) {
		const result: z.output<typeof outputSchema> = await listCatalogCategories({ source })
		return structuredResult(result)
	},
}
