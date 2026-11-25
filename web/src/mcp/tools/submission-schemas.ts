import { z } from "zod"
import { MAX_SUBMITTED_SVG_BYTES } from "@/lib/icons/svg-safety"
import { ICON_NAME_REGEX, MAX_NAME_LENGTH } from "@/lib/icons/validate"
import { SUBMISSION_CATEGORIES } from "@/lib/submission-categories"

const svgSchema = z
	.string()
	.min(1)
	.describe(
		`Complete inline SVG markup; at most ${MAX_SUBMITTED_SVG_BYTES / 1024} KiB of UTF-8 per SVG, including Base. No scripts, event handlers, foreignObject, external references or embedded raster images.`,
	)

const pngUrl = z
	.string()
	.url()
	.max(2048)
	.describe(
		"Direct HTTPS .png URL on upload.wikimedia.org, cdn.wikimg.net or raw.githubusercontent.com. No redirects, credentials, query or fragment; 5 MiB per PNG, 8 PNGs and 16 MiB combined per Icon.",
	)
const artwork = z.union([svgSchema, z.strictObject({ png_url: pngUrl })])

export const submissionFields = {
	name: z
		.string()
		.trim()
		.min(1)
		.max(MAX_NAME_LENGTH)
		.regex(ICON_NAME_REGEX, "Use a lowercase kebab-case slug such as 'my-app'")
		.describe(
			"Icon slug: lowercase letters, digits and single hyphens, e.g. 'my-app'. Becomes the file name. Reuse your rejected Submission's slug to resubmit it in place.",
		),
	svg: svgSchema.optional().describe("Colour Base as inline SVG, up to 48 KiB. For a new Icon supply exactly one of svg or png_url."),
	png_url: pngUrl.optional(),
	variants: z
		.strictObject({
			light: artwork.optional().describe("Light-coloured icon for dark backgrounds"),
			dark: artwork.optional().describe("Dark-coloured icon for light backgrounds"),
			wordmark: artwork.optional().describe("Colour brand name"),
			wordmark_light: artwork.optional().describe("Light-coloured brand name for dark backgrounds"),
			wordmark_dark: artwork.optional().describe("Dark-coloured brand name for light backgrounds"),
			custom: z
				.record(z.string(), artwork)
				.optional()
				.describe(
					"Custom variant name to inline SVG or { png_url }. Names are lowercase kebab-case, at most 32 characters, and cannot be well-known Variant names or collide with another Icon.",
				),
		})
		.optional()
		.describe(
			"All optional Variants for this Icon in the same call. Resubmission replaces the full file set: include every Variant to keep; omitted optional Variants are removed. Supply this object explicitly when resubmitting an Icon with optional or unresolved files; use {} to intentionally remove them all. Never submit separate variant slugs. The complete encoded JSON request, including escaping and MCP fields, must fit within 512 KiB.",
		),
	aliases: z
		.array(z.string().trim().min(1).max(MAX_NAME_LENGTH))
		.max(20)
		.optional()
		.describe("Other names people search for, e.g. 'Plex Media Server'"),
	categories: z.array(z.enum(SUBMISSION_CATEGORIES)).max(SUBMISSION_CATEGORIES.length).optional(),
	description: z.string().trim().max(2000).optional().describe("What the icon represents, for the reviewers"),
}

export const submissionOutputSchema = z.looseObject({
	id: z.string().describe("Submission id"),
	name: z.string(),
	status: z.string().describe("pending until a maintainer reviews it"),
	url: z.string().describe("Public page of the submission; give it to the user"),
	dashboard_url: z.string().describe("Where the user follows all their submissions while signed in"),
})
