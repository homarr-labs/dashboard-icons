import { z } from "zod"
import { getCatalogIcon } from "@/lib/icons/catalog"
import {
	degradedSourcesSchema,
	didYouMeanSchema,
	iconItemSchema,
	iconNameInput,
	resolvedFromSchema,
	sourceInput,
} from "@/mcp/tools/schemas"
import { type PublicTool, READ_ONLY_ANNOTATIONS, structuredResult } from "@/mcp/tools/types"

const themedUrlsSchema = z.object({ default: z.string().optional(), light: z.string().optional(), dark: z.string().optional() })

const iconSchema = iconItemSchema.extend({
	aliases: z.array(z.string()),
	categories: z.array(z.string()),
	author: z.string().nullable(),
	updated_at: z.string(),
	brand_color: z.string().nullable(),
	license: z
		.object({
			name: z.string(),
			url: z.string().nullable(),
			attribution: z.string().nullable(),
			source_url: z.string().nullable(),
			guidelines_url: z.string().nullable(),
			provider: z.string(),
			provider_url: z.string(),
		})
		.nullable()
		.describe("License and attribution to show for external icons; null for dashboardicons.com icons"),
	page_url: z.string().describe("Icon page on dashboardicons.com"),
	urls: z
		.object({ svg: themedUrlsSchema.optional(), png: themedUrlsSchema.optional(), webp: themedUrlsSchema.optional() })
		.describe("CDN URLs by format, then theme; only existing variants are listed"),
})

const inputSchema = z.object({ name: iconNameInput, source: sourceInput })

const outputSchema = z.looseObject({
	found: z.boolean(),
	resolved_from: resolvedFromSchema,
	icon: iconSchema.optional(),
	did_you_mean: didYouMeanSchema,
	degraded_sources: degradedSourcesSchema,
})

export const getIconTool: PublicTool<typeof inputSchema, typeof outputSchema> = {
	name: "get_icon",
	access: "public",
	config: {
		title: "Get icon details",
		description:
			"Get everything about one icon: CDN URLs for every available format (svg, png, webp) and theme (default, light, dark), aliases, categories, and license/attribution for external sources. Use it after search_icons or match_icons, or directly with a slug. Names are resolved loosely ('lm-studio' finds 'lmstudio'; resolved_from tells you). An unknown name is not an error: it returns found: false with did_you_mean suggestions to retry with. Use get_icon_svg instead when you need the SVG markup itself.",
		inputSchema,
		outputSchema,
		annotations: READ_ONLY_ANNOTATIONS,
		_meta: { category: "details" },
	},
	async handler({ name, source }) {
		const result: z.output<typeof outputSchema> = await getCatalogIcon(name, { source })
		return structuredResult(result)
	},
}
