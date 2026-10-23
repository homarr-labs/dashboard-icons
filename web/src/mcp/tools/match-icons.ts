import { unstable_rethrow } from "next/navigation"
import { z } from "zod"
import { getCatalogIcon, MAX_FUZZY_MATCHES, matchServices } from "@/lib/icons/catalog"
import { MAX_QUERY_LENGTH } from "@/lib/icons/validate"
import { ICON_PREVIEW_RESOURCE_URI } from "@/mcp/icon-preview"
import { degradedSourcesSchema, iconHitSchema, iconLicenseSchema, iconUrlsSchema, sourcesInput } from "@/mcp/tools/schemas"
import { type PublicTool, READ_ONLY_ANNOTATIONS, structuredResult } from "@/mcp/tools/types"

export const MAX_SERVICES = 50

const inputSchema = z.object({
	services: z
		.array(z.string().max(MAX_QUERY_LENGTH))
		.min(1)
		.max(MAX_SERVICES)
		.describe("Service or app names as the user wrote them, e.g. ['Plex', 'Home Assistant', 'Pi-hole', 'qBittorrent']"),
	sources: sourcesInput,
	include_details: z.boolean().default(false).describe("Include each best match's available format/variant URLs and license in this batch"),
})

const outputSchema = z.looseObject({
	matches: z
		.array(
			z.object({
				service: z.string().describe("The name you sent"),
				best: iconHitSchema
					.extend({ urls: iconUrlsSchema.optional(), license: iconLicenseSchema.optional() })
					.nullable()
					.describe(
						"Best icon, or null when nothing matched; urls and license are included when include_details is true and details are available",
					),
				alternatives: z.array(iconHitSchema).describe("Other candidates, usually the same icon from other sources"),
				details_unavailable: z
					.literal(true)
					.optional()
					.describe("The match has a preview but its format URLs and license could not be loaded"),
				reason: z
					.literal("fuzzy_limit")
					.optional()
					.describe(`Set when best is null because only ${MAX_FUZZY_MATCHES} names per call are fuzzy-searched; retry with search_icons`),
			}),
		)
		.describe("One entry per service, in the order sent"),
	degraded_sources: degradedSourcesSchema,
})

export const matchIconsTool: PublicTool<typeof inputSchema, typeof outputSchema> = {
	name: "match_icons",
	access: "public",
	config: {
		title: "Match icons to services",
		description: `Find the best icon for each of up to ${MAX_SERVICES} service names in one call, e.g. a whole homelab or docker-compose stack. Names, slugs and aliases are matched ignoring case, spaces and punctuation ('Pi-hole' = 'pihole'); otherwise the first ${MAX_FUZZY_MATCHES} unmatched names fall back to fuzzy search and typo tolerance. Use this first whenever you have more than one name. Set include_details=true when formats, variants or licenses are requested: every best match includes its available urls and license, keeping all previews in one result. Use those returned URLs without calling get_icon again or deriving paths from preview_url. details_unavailable means only the preview was loaded; do not invent formats or licenses. When best is null, try search_icons with a shorter or alternative name.`,
		inputSchema,
		outputSchema,
		annotations: READ_ONLY_ANNOTATIONS,
		_meta: { category: "discovery", ui: { resourceUri: ICON_PREVIEW_RESOURCE_URI } },
	},
	async handler({ services, sources, include_details }) {
		const result: z.output<typeof outputSchema> = await matchServices(services, { sources })
		if (include_details) {
			const degraded = new Set(result.degraded_sources)
			result.matches = await Promise.all(
				result.matches.map(async (match) => {
					if (!match.best) return match
					const { name, source } = match.best
					try {
						const details = await getCatalogIcon(name, { source })
						if (details.found) return { ...match, best: { ...match.best, urls: details.icon.urls, license: details.icon.license } }
						for (const unavailable of details.degraded_sources ?? []) degraded.add(unavailable)
					} catch (error) {
						unstable_rethrow(error)
						degraded.add(source)
					}
					return { ...match, details_unavailable: true as const }
				}),
			)
			if (degraded.size) result.degraded_sources = [...degraded].sort()
		}
		return structuredResult(result)
	},
}
