import { z } from "zod"
import { WEB_URL } from "@/constants"
import { getAllIcons } from "@/lib/icons/service"
import { checkSubmittedSvg, MAX_SUBMITTED_SVG_BYTES } from "@/lib/icons/svg-safety"
import { ICON_NAME_REGEX, MAX_NAME_LENGTH } from "@/lib/icons/validate"
import { SUBMISSION_CATEGORIES } from "@/lib/submission-categories"
import { createSubmission, prepareSubmission, type SubmissionInput, type SubmissionOutcome } from "@/lib/submission-service"
import { updateOwnSubmission } from "@/lib/submission-update-service"
import { customVariantNameError, resolveSubmissionAssets, type SubmissionVariant, variantKind } from "@/lib/submission-variants"
import { DASHBOARD_URL, pocketBaseAsUser, pocketBaseFailure, submissionUrl, toolError } from "@/mcp/tools/account"
import { submissionConflict } from "@/mcp/tools/submission-policy"
import { type AccountTool, structuredResult } from "@/mcp/tools/types"

const svgSchema = z
	.string()
	.min(1)
	.describe(
		`Complete inline SVG markup; at most ${MAX_SUBMITTED_SVG_BYTES / 1024} KiB of UTF-8 per SVG, including Base. No scripts, event handlers, foreignObject, external references or embedded raster images.`,
	)

const inputSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1)
		.max(MAX_NAME_LENGTH)
		.regex(ICON_NAME_REGEX, "Use a lowercase kebab-case slug such as 'my-app'")
		.describe(
			"Icon slug: lowercase letters, digits and single hyphens, e.g. 'my-app'. Becomes the file name. Reuse your rejected Submission's slug to resubmit it in place.",
		),
	svg: svgSchema.describe('Required colour Base SVG, from <svg xmlns="http://www.w3.org/2000/svg" ...> to </svg>. At most 48 KiB UTF-8.'),
	variants: z
		.strictObject({
			light: svgSchema.optional().describe("Light-coloured icon for dark backgrounds"),
			dark: svgSchema.optional().describe("Dark-coloured icon for light backgrounds"),
			wordmark: svgSchema.optional().describe("Colour brand name"),
			wordmark_light: svgSchema.optional().describe("Light-coloured brand name for dark backgrounds"),
			wordmark_dark: svgSchema.optional().describe("Dark-coloured brand name for light backgrounds"),
			custom: z
				.record(z.string(), svgSchema)
				.optional()
				.describe(
					"Custom variant name to inline SVG, e.g. { '4k': '<svg ...>...</svg>' }. Names are lowercase kebab-case, at most 32 characters, and cannot be well-known Variant names or collide with another Icon.",
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
})

const outputSchema = z.looseObject({
	id: z.string().describe("Submission id"),
	name: z.string(),
	status: z.string().describe("pending until a maintainer reviews it"),
	url: z.string().describe("Public page of the submission; give it to the user"),
	dashboard_url: z.string().describe("Where the user follows all their submissions while signed in"),
})

async function nativeCatalog() {
	try {
		return await getAllIcons()
	} catch {
		return null
	}
}

function alreadyExists(name: string) {
	return toolError(
		`"${name}" already exists on dashboardicons.com (${WEB_URL}/icons/${name}); submit_icon creates new Icons or resubmits your own rejected Submissions. To change an existing icon, the user opens ${WEB_URL}/submit, picks "${name}" from the icon name list and uploads the new file, which files an update proposal for review.`,
	)
}

export const submitIconTool: AccountTool<typeof inputSchema, typeof outputSchema> = {
	name: "submit_icon",
	access: "account",
	config: {
		title: "Submit a new icon",
		description:
			"Submit one Icon with its required Base svg and all optional well-known and Custom inline SVG Variants in one call per Icon. Never split Variants into separate Submissions or variant slugs. Needs the user to sign in to this MCP server. Signed-in account calls allow at most 512 KiB for the complete encoded JSON body (including escaping and MCP fields), and each SVG is capped at 48 KiB UTF-8. A rejection is not final: fix the files and resubmit the same slug to return your rejected Submission to pending in place. Resubmission replaces the FULL file set: include Base and ALL Variants to keep; omitted optional Variants are removed. Only submit icons the user asked for and has the right to share; check search_icons first. Approval and publishing are separate steps. Returns the submission page URL to share; track it with list_my_submissions.",
		inputSchema,
		outputSchema,
		annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
		_meta: { category: "account" },
	},
	async handler({ name, svg, variants, aliases, categories, description }, { pbToken }) {
		const inline: Partial<Record<SubmissionVariant, string>> = { base: svg }
		if (variants) {
			const { custom, ...standard } = variants
			Object.assign(inline, standard)
			for (const [key, markup] of Object.entries(custom ?? {})) {
				const error = customVariantNameError(key)
				if (error) return toolError(`Custom variant "${key}" was not accepted: ${error}.`)
				inline[`custom:${key}`] = markup
			}
		}
		const assets: SubmissionInput["assets"] = {}
		for (const [key, markup] of Object.entries(inline)) {
			if (markup === undefined) continue
			const variant = key as SubmissionVariant
			const checked = checkSubmittedSvg(markup)
			if (!checked.ok) return toolError(`The ${variantKind(variant).label} SVG was not accepted: ${checked.reason}.`)
			assets[variant] = new File([checked.svg], `${name}${variantKind(variant).suffix}.svg`, { type: "image/svg+xml" })
		}
		const input: SubmissionInput = {
			name,
			description: description ?? "",
			aliases: aliases ?? [],
			categories: categories ?? [],
			targetSubmission: "",
			assets,
		}
		const native = await nativeCatalog()
		if (native === null) return toolError("The native icon catalog is unavailable. Try again before submitting a new icon.")

		const session = await pocketBaseAsUser(pbToken)
		if (!session.ok) return session.result
		try {
			const own = await session.pb.collection("submissions").getList(1, 1, {
				filter: session.pb.filter("created_by = {:userId} && name = {:name} && status = 'rejected'", { userId: session.user.id, name }),
				sort: "-updated,-id",
				requestKey: null,
			})
			const rejected = own.items.find((item) => item.created_by === session.user.id && item.name === name && item.status === "rejected")
			if (rejected) {
				const resolved = resolveSubmissionAssets(rejected.extras, rejected.assets, rejected.name)
				if (variants === undefined && (resolved.references.length > 0 || resolved.assets.some((asset) => asset.variant !== "base"))) {
					return toolError(
						"Resubmission replaces the FULL file set. Include the required Base svg and an explicit variants object containing ALL optional Variants to keep; omitted optional Variants are removed. Use variants: {} only to intentionally remove all optional or unresolved files. No files were changed.",
					)
				}
				input.targetSubmission = rejected.target_submission || ""
				input.aliases = aliases ?? rejected.extras?.aliases ?? []
				input.categories = categories ?? rejected.extras?.categories ?? []
				input.description = description ?? rejected.description ?? ""
			} else if (Object.hasOwn(native, name)) return alreadyExists(name)
			const prepared = prepareSubmission(session.user.id, input)
			if (!prepared.ok) return toolError(`The submission was not accepted: ${prepared.error}.`)
			const pending = await session.pb.collection("community_gallery").getFullList({
				filter: "status = 'pending' || status = 'approved'",
				fields: "id,name,extras",
				requestKey: null,
			})
			const conflict = submissionConflict(name, prepared.data.extras, native, pending)
			if (conflict) return toolError(conflict)
			const existing = pending.find((item) => item.name === name)
			if (existing && !rejected)
				return toolError(
					`"${name}" already has a community Submission (${submissionUrl(existing.id)}). Send changes as an update proposal at ${WEB_URL}/submit, not a duplicate Submission.`,
				)
			let outcome: SubmissionOutcome
			if (rejected)
				outcome = {
					ok: true,
					record: await updateOwnSubmission(session.pb, session.user.id, rejected.id, { ...input, updated: rejected.updated }),
				}
			else outcome = await createSubmission(session.pb, session.user.id, input)
			if (!outcome.ok) return toolError(`The submission was not accepted: ${outcome.error}.`)
			const { record } = outcome
			const result: z.output<typeof outputSchema> = {
				id: record.id,
				name: record.name,
				status: record.status,
				url: submissionUrl(record.id),
				dashboard_url: DASHBOARD_URL,
			}
			return structuredResult(result)
		} catch (error) {
			return pocketBaseFailure(error)
		}
	},
}
