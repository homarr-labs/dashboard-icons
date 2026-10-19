import { z } from "zod"
import { CATALOG_SOURCES } from "@/lib/icons/catalog"
import { MAX_NAME_LENGTH } from "@/lib/icons/validate"

export const sourceSchema = z.enum(CATALOG_SOURCES)

export const themeSchema = z.enum(["default", "light", "dark"])

export const sourcesInput = z
	.array(sourceSchema)
	.optional()
	.describe("Only search these sources. Default: all. native = dashboardicons.com, then selfh.st, LobeHub (AI brands), Simple Icons.")

export const sourceInput = sourceSchema
	.optional()
	.describe("Catalog to read from when the same slug exists in several. Default: native first, then selfhst, lobehub, simpleicons.")

export const iconNameInput = z
	.string()
	.trim()
	.min(1)
	.max(MAX_NAME_LENGTH)
	.describe("Icon slug from search_icons or match_icons, e.g. 'home-assistant'. Loose names like 'LM Studio' or 'lm-studio' are resolved.")

export const iconItemSchema = z.object({
	name: z.string().describe("Icon slug; pass it with `source` to get_icon or get_icon_svg"),
	title: z.string(),
	source: sourceSchema,
	preview_url: z.string().describe("Default CDN image URL, ready to use"),
})

export const iconHitSchema = iconItemSchema.extend({
	score: z.number().describe("Relevance, higher is better"),
	matched_variant: z
		.object({
			key: z.string().describe("Key of this Variant in get_icon urls, e.g. 'light', 'wordmark' or '4k'"),
			label: z.string(),
			stem: z.string().describe("File name without extension on the CDN"),
		})
		.optional()
		.describe("The Variant the query named, e.g. the Light variant for 'github white'; absent when the query matched the icon itself"),
})

export const resolvedFromSchema = z.string().optional().describe("The name you asked for, when it was resolved loosely to `name`")

export const didYouMeanSchema = z
	.array(iconHitSchema)
	.optional()
	.describe("Closest icons when found is false; retry with one of their names and sources")

export const degradedSourcesSchema = z
	.array(sourceSchema)
	.optional()
	.describe("Sources that could not be loaded right now; results may be missing icons from them")
