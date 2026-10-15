import { z } from "zod"
import { MAX_FUZZY_MATCHES, matchServices } from "@/lib/icons/catalog"
import { MAX_QUERY_LENGTH } from "@/lib/icons/validate"
import { degradedSourcesSchema, iconHitSchema, sourcesInput } from "@/mcp/tools/schemas"
import { type PublicTool, READ_ONLY_ANNOTATIONS, structuredResult } from "@/mcp/tools/types"

export const MAX_SERVICES = 50

const inputSchema = z.object({
	services: z
		.array(z.string().max(MAX_QUERY_LENGTH))
		.min(1)
		.max(MAX_SERVICES)
		.describe("Service or app names as the user wrote them, e.g. ['Plex', 'Home Assistant', 'Pi-hole', 'qBittorrent']"),
	sources: sourcesInput,
})

const outputSchema = z.looseObject({
	matches: z
		.array(
			z.object({
				service: z.string().describe("The name you sent"),
				best: iconHitSchema.nullable().describe("Best icon, or null when nothing matched"),
				alternatives: z.array(iconHitSchema).describe("Other candidates, usually the same icon from other sources"),
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
		description: `Find the best icon for each of up to ${MAX_SERVICES} service names in one call, e.g. a whole homelab or docker-compose stack. Names, slugs and aliases are matched ignoring case, spaces and punctuation ('Pi-hole' = 'pihole'); otherwise the first ${MAX_FUZZY_MATCHES} unmatched names fall back to fuzzy search and typo tolerance. Use this first whenever you have more than one name. best.preview_url is a ready CDN image URL; call get_icon with best.name and best.source for light/dark or PNG/WebP variants. When best is null, try search_icons with a shorter or alternative name.`,
		inputSchema,
		outputSchema,
		annotations: READ_ONLY_ANNOTATIONS,
		_meta: { category: "discovery" },
	},
	async handler({ services, sources }) {
		const result: z.output<typeof outputSchema> = await matchServices(services, { sources })
		return structuredResult(result)
	},
}
