import { z } from "zod"
import { WEB_URL } from "@/constants"
import { getAllIcons } from "@/lib/icons/service"
import { checkSubmittedSvg } from "@/lib/icons/svg-safety"
import type { Submission } from "@/lib/pb"
import { prepareSubmission, type SubmissionInput } from "@/lib/submission-service"
import { updateOwnSubmission } from "@/lib/submission-update-service"
import { customVariantNameError, resolveSubmissionAssets, type SubmissionVariant, variantKind } from "@/lib/submission-variants"
import { DASHBOARD_URL, pocketBaseAsUser, pocketBaseFailure, submissionUrl, toolError } from "@/mcp/tools/account"
import { submissionConflict } from "@/mcp/tools/submission-policy"
import { submissionOutputSchema as outputSchema, submissionFields } from "@/mcp/tools/submission-schemas"
import { type AccountTool, structuredResult } from "@/mcp/tools/types"

const inputSchema = z.object(submissionFields)

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
			let record: Submission
			if (rejected) record = await updateOwnSubmission(session.pb, session.user.id, rejected.id, { ...input, updated: rejected.updated })
			else record = await session.pb.collection("submissions").create<Submission>(prepared.data, { requestKey: null })
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
