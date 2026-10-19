import { ClientResponseError } from "pocketbase"
import { z } from "zod"
import type { UpdateVariantKey } from "@/lib/icon-update"
import { createIconUpdate, type IconUpdateInput, loadUpdateTarget, updateOwnIconUpdate } from "@/lib/icon-update-service"
import { checkSubmittedSvg } from "@/lib/icons/svg-safety"
import type { Submission } from "@/lib/pb"
import { MAX_SUBMISSION_ASSETS, type SubmissionInput } from "@/lib/submission-service"
import { customVariantNameError, SUBMISSION_VARIANTS, type SubmissionVariant, variantKind } from "@/lib/submission-variants"
import { DASHBOARD_URL, pocketBaseAsUser, pocketBaseFailure, submissionUrl, toolError } from "@/mcp/tools/account"
import { submissionFields, submissionOutputSchema } from "@/mcp/tools/submission-schemas"
import { type AccountTool, structuredResult } from "@/mcp/tools/types"

class UpdateRefused extends Error {}

const removableVariant = z.union([
	z.enum(SUBMISSION_VARIANTS.filter((key) => key !== "base")),
	z
		.templateLiteral(["custom:", z.string()])
		.refine((key) => !customVariantNameError(key.slice(7)), "Use custom:<lowercase-kebab-case-name>, e.g. custom:4k"),
])

const inputSchema = z.object({
	...submissionFields,
	name: submissionFields.name.describe(
		"Exact slug of the existing published or community Icon to update. Use search_icons to find published slugs.",
	),
	submission_id: z
		.string()
		.regex(/^[a-z0-9]{15}$/, "Use the 15-character community Submission id")
		.optional()
		.describe(
			"Community Submission id when targeting a pending or approved community Icon instead of the published catalog. Must match name.",
		),
	svg: submissionFields.svg
		.optional()
		.describe("Optional replacement Base SVG, at most 48 KiB UTF-8. Omit to keep Base; Base cannot be removed."),
	variants: submissionFields.variants.describe(
		"Only Variant additions or replacements, using the same shape as submit_icon. Omitted Variants are preserved, NOT removed. Existing keys are replaced; new keys are added. Each SVG is at most 48 KiB UTF-8. The complete encoded JSON request must fit within 512 KiB.",
	),
	remove: z
		.array(
			z.strictObject({
				key: removableVariant.describe("Optional Variant key; Base cannot be removed"),
				note: z.string().trim().optional().describe("Optional reason for removing this Variant, shown to reviewers"),
			}),
		)
		.max(MAX_SUBMISSION_ASSETS)
		.optional()
		.describe(
			"Explicit optional Variant removals as { key, note? }, e.g. [{ key: 'custom:4k', note: 'Obsolete artwork' }]. Keys: light, dark, wordmark, wordmark_light, wordmark_dark or custom:<name>. Base cannot be removed. List each key once and do not also supply its SVG. Do not send file, destination or action; the server resolves the existing file.",
		),
	aliases: submissionFields.aliases.describe(
		"FINAL desired alias list, not additions only. Omit to preserve current aliases; [] explicitly removes all aliases.",
	),
	categories: submissionFields.categories.describe(
		"FINAL desired category list, not additions only. Omit to preserve current categories; [] explicitly removes all categories.",
	),
	description: submissionFields.description.describe(
		"Explain the proposed changes to reviewers; does not replace the target Icon's description.",
	),
})

export const proposeIconUpdateTool: AccountTool<typeof inputSchema, typeof submissionOutputSchema> = {
	name: "propose_icon_update",
	access: "account",
	config: {
		title: "Propose an icon update",
		description:
			"Propose changes to one existing published or community Icon for maintainer review, not direct publication. Needs the user to sign in to this MCP server; only propose changes the user asked for and has the right to share. Optional svg replaces Base; variants adds or replaces well-known and Custom inline SVGs in the same shape as submit_icon. Omitted files are preserved; remove explicitly lists { key, note? } objects for optional Variants to delete, never Base, with an optional per-Variant reason for reviewers. aliases and categories are FINAL desired lists: omit to preserve, [] to clear. Each SVG is capped at 48 KiB UTF-8; the complete encoded account request body at 512 KiB. Pinned to the target's current revision: if it changed meanwhile the call fails and nothing is stored, so retry. Calling again for the same Icon after a maintainer rejected your proposal resubmits it in place and replaces the whole rejected proposal with this call's changes. Returns the proposal Submission URL; track it with list_my_submissions.",
		inputSchema,
		outputSchema: submissionOutputSchema,
		annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
		_meta: { category: "account" },
	},
	async handler({ name, submission_id, svg, variants, remove, aliases, categories, description }, { pbToken }) {
		const inline: Partial<Record<SubmissionVariant, string>> = {}
		if (svg !== undefined) inline.base = svg
		if (variants) {
			const { custom, ...standard } = variants
			Object.assign(inline, standard)
			for (const [key, markup] of Object.entries(custom ?? {})) {
				const error = customVariantNameError(key)
				if (error) return toolError(`Custom variant "${key}" was not accepted: ${error}.`)
				inline[`custom:${key}`] = markup
			}
		}
		const removedKeys = new Set<string>()
		for (const { key } of remove ?? []) {
			if (removedKeys.has(key)) return toolError(`Variant "${key}" is listed for removal more than once. List each removed Variant once.`)
			removedKeys.add(key)
			if (inline[key as SubmissionVariant] !== undefined)
				return toolError(`Variant "${key}" cannot be supplied and removed in the same proposal.`)
		}
		for (const [key, markup] of Object.entries(inline)) {
			if (markup === undefined) continue
			const checked = checkSubmittedSvg(markup)
			if (!checked.ok) return toolError(`The ${variantKind(key as SubmissionVariant).label} SVG was not accepted: ${checked.reason}.`)
		}
		if (
			!Object.values(inline).some((markup) => markup !== undefined) &&
			!remove?.length &&
			aliases === undefined &&
			categories === undefined
		)
			return toolError("Supply an SVG addition/replacement, an explicit optional Variant removal, or a final aliases/categories list.")
		const session = await pocketBaseAsUser(pbToken)
		if (!session.ok) return session.result
		const targetSubmission = submission_id ?? ""
		try {
			const target = await loadUpdateTarget(session.pb, name, targetSubmission).catch((error: unknown) => {
				if (error instanceof ClientResponseError && (error.status === 400 || error.status === 404))
					throw new UpdateRefused(
						`Cannot propose an update for "${name}": ${error.message}. Check the slug with search_icons; new Icons go through submit_icon.`,
					)
				throw error
			})
			for (const { key } of remove ?? [])
				if (!target.files[key as UpdateVariantKey])
					throw new UpdateRefused(`"${name}" has no ${key} Variant to remove. Nothing was changed.`)
			const assets: SubmissionInput["assets"] = {}
			for (const [key, markup] of Object.entries(inline)) {
				if (markup === undefined) continue
				const variant = key as SubmissionVariant
				assets[variant] = new File([markup], `${name}${variantKind(variant).suffix}.svg`, { type: "image/svg+xml" })
			}
			const input: IconUpdateInput = {
				name,
				description: description ?? "",
				aliases: aliases ?? target.metadata.aliases,
				categories: categories ?? target.metadata.categories,
				targetSubmission,
				assets,
				kind: "update",
				revision: target.revision,
				removeVariants: remove,
			}
			const own = await session.pb.collection("submissions").getList(1, 20, {
				filter: session.pb.filter("created_by = {:userId} && name = {:name} && status = 'rejected'", {
					userId: session.user.id,
					name,
				}),
				sort: "-updated,-id",
				requestKey: null,
			})
			const rejected = own.items.find(
				(item) => item.created_by === session.user.id && item.status === "rejected" && item.icon_update?.target.id === target.id,
			)
			let record: Submission
			if (rejected)
				record = await updateOwnIconUpdate(session.pb, session.user.id, rejected.id, {
					...input,
					updated: rejected.updated,
					refreshTarget: true,
					retainVariants: [],
				})
			else {
				const outcome = await createIconUpdate(session.pb, session.user.id, input)
				if (!outcome.ok) throw new UpdateRefused(`The update proposal was not accepted: ${outcome.error} Nothing was stored.`)
				record = outcome.record
			}
			const result: z.output<typeof submissionOutputSchema> = {
				id: record.id,
				name: record.name,
				status: record.status,
				url: submissionUrl(record.id),
				dashboard_url: DASHBOARD_URL,
			}
			return structuredResult(result)
		} catch (error) {
			if (error instanceof UpdateRefused) return toolError(error.message)
			if (error instanceof ClientResponseError && error.status === 409)
				return toolError(`${error.message} Call propose_icon_update again to review the latest version. Nothing was stored.`)
			if (error instanceof ClientResponseError && error.status === 400)
				return toolError(`The update proposal was not accepted: ${error.message}`)
			return pocketBaseFailure(error)
		}
	},
}
