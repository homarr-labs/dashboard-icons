import { z } from "zod"
import { getCatalogIcon } from "@/lib/icons/catalog"
import { ICON_PREVIEW_RESOURCE_URI } from "@/mcp/icon-preview"
import {
	degradedSourcesSchema,
	didYouMeanSchema,
	iconItemSchema,
	iconNameInput,
	resolvedFromSchema,
	sourceInput,
} from "@/mcp/tools/schemas"
import { type PublicTool, READ_ONLY_ANNOTATIONS, structuredResult } from "@/mcp/tools/types"

const variantUrlsSchema = z.record(z.string(), z.string())

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
		.object({ svg: variantUrlsSchema.optional(), png: variantUrlsSchema.optional(), webp: variantUrlsSchema.optional() })
		.describe(
			"CDN URLs by format, then Variant: default (Base), light (light-coloured, for dark backgrounds), dark (for light backgrounds), wordmark, wordmark-light, wordmark-dark, and Custom variants by name such as '4k'. A key is absent only when the icon has no file for it; legacy icons can map light or dark to the same URL as default",
		),
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
			"Get everything about one icon: CDN URLs for every available format (svg, png, webp) and every Variant (default, light, dark, wordmarks and Custom variants such as '4k'), aliases, categories, and license/attribution for external sources. Use it after search_icons or match_icons, or directly with a slug. Names are resolved loosely ('lm-studio' finds 'lmstudio'; resolved_from tells you). An unknown name is not an error: it returns found: false with did_you_mean suggestions to retry with. Use get_icon_svg instead when you need the SVG markup itself.",
		inputSchema,
		outputSchema,
		annotations: READ_ONLY_ANNOTATIONS,
		_meta: { category: "details", ui: { resourceUri: ICON_PREVIEW_RESOURCE_URI } },
	},
	async handler({ name, source }) {
		const result: z.output<typeof outputSchema> = await getCatalogIcon(name, { source })
		return structuredResult(result)
	},
}
