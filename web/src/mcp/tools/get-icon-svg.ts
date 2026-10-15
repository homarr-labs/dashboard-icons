import { z } from "zod"
import { getCatalogIconSvg } from "@/lib/icons/catalog"
import {
	degradedSourcesSchema,
	didYouMeanSchema,
	iconNameInput,
	resolvedFromSchema,
	sourceInput,
	sourceSchema,
	themeSchema,
} from "@/mcp/tools/schemas"
import { type PublicTool, READ_ONLY_ANNOTATIONS, structuredResult } from "@/mcp/tools/types"

const inputSchema = z.object({
	name: iconNameInput,
	source: sourceInput,
	theme: themeSchema.default("default").describe("'light' and 'dark' are variants for light and dark backgrounds, when the icon has them"),
})

const outputSchema = z.looseObject({
	found: z.boolean(),
	resolved_from: resolvedFromSchema,
	name: z.string().optional(),
	source: sourceSchema.optional(),
	theme: themeSchema.optional(),
	svg: z.string().nullable().optional().describe("The SVG markup, or null when unavailable"),
	url: z.string().nullable().optional().describe("CDN URL of the SVG"),
	reason: z
		.enum(["no_svg", "no_variant", "fetch_failed"])
		.optional()
		.describe(
			"Why svg is null. no_svg: raster-only icon, use get_icon for PNG/WebP URLs. no_variant: no SVG for this theme, retry with theme 'default'. fetch_failed: the CDN did not answer, use url directly.",
		),
	did_you_mean: didYouMeanSchema,
	degraded_sources: degradedSourcesSchema,
})

export const getIconSvgTool: PublicTool<typeof inputSchema, typeof outputSchema> = {
	name: "get_icon_svg",
	access: "public",
	config: {
		title: "Get icon SVG",
		description:
			"Get the raw SVG markup of one icon, to inline in code, a README or a config file. When the SVG is available the text result is the markup itself. When it is not, `reason` explains why and `url` is given when one exists. Names are resolved like get_icon, and unknown names return did_you_mean. Prefer the CDN URLs from get_icon when a URL is enough.",
		inputSchema,
		outputSchema,
		annotations: READ_ONLY_ANNOTATIONS,
		_meta: { category: "details" },
	},
	async handler({ name, source, theme }) {
		const result: z.output<typeof outputSchema> = await getCatalogIconSvg(name, { source, theme })
		if (result.svg) return structuredResult(result, result.svg)
		return structuredResult(result)
	},
}
