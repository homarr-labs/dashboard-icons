import { ClientResponseError } from "pocketbase"
import type { createServerPB, Submission } from "@/lib/pb"
import { prepareSubmission, type SubmissionInput, type SubmissionOutcome } from "@/lib/submission-service"
import { loadOwnSubmission } from "@/lib/submission-update-service"
import { variantKind } from "@/lib/submission-variants"
import {
	destination,
	type IconUpdate,
	listDelta,
	type UpdateTarget,
	type UpdateVariantKey,
	validateDelta,
} from "../../backend/pb_hooks/icon-update-policy.js"

export type IconUpdateInput = SubmissionInput & { kind: "update"; revision: string }
export type OwnIconUpdateInput = IconUpdateInput & { updated: string; refreshTarget?: boolean; retainVariants?: UpdateVariantKey[] }

export async function loadUpdateTarget(pb: ReturnType<typeof createServerPB>, name: string, id = ""): Promise<UpdateTarget> {
	return pb.send<UpdateTarget>("/api/icon-updates/target", { method: "GET", query: { name, submission: id }, requestKey: null })
}

function prepareIconUpdate(userId: string, input: IconUpdateInput, target: UpdateTarget, retained: IconUpdate["variants"] = []) {
	if (target.unresolved)
		return {
			ok: false as const,
			error: "The target has unassigned artwork. Ask its contributor to assign every file before proposing an update.",
		}
	const prepared = prepareSubmission(userId, input, target.metadata.base)
	if (!prepared.ok) return prepared
	const keys = Object.keys(input.assets) as (keyof typeof input.assets)[]
	const update: IconUpdate = {
		version: 1,
		target,
		variants: [
			...retained
				.filter((change) => !keys.includes(change.key))
				.map((change) => {
					if (!("file" in change)) return change
					let action: "add" | "replace" = "add"
					if (target.files[change.key]) action = "replace"
					return { ...change, action, destination: destination(target.name, change.key, target) }
				}),
			...keys.map((key) => {
				const file = prepared.data.assets.find((file) => file.name.replace(/\.(svg|png)$/, "") === input.name + variantKind(key).suffix)
				if (!file) throw new Error(`Prepared file missing for ${key}`)
				let action: "add" | "replace" = "add"
				if (target.files[key]) action = "replace"
				return { key, action, file: file.name, destination: destination(input.name, key, target) }
			}),
		],
		aliases: listDelta(target.metadata.aliases, input.aliases),
		categories: listDelta(target.metadata.categories, input.categories),
	}
	const error = validateDelta(
		update,
		target,
		update.variants.flatMap((change) => ("file" in change ? [change.file] : [])),
	)
	if (error) return { ok: false as const, error }
	return { ok: true as const, data: prepared.data, update }
}

export async function createIconUpdate(
	pb: ReturnType<typeof createServerPB>,
	userId: string,
	input: IconUpdateInput,
): Promise<SubmissionOutcome> {
	const target = await loadUpdateTarget(pb, input.name, input.targetSubmission)
	if (target.revision !== input.revision)
		return { ok: false, error: "Target Icon changed. Choose it again and review the latest content before submitting." }
	const prepared = prepareIconUpdate(userId, input, target)
	if (!prepared.ok) return prepared
	const record = await pb
		.collection("submissions")
		.create<Submission>(
			{ ...prepared.data, icon_update: prepared.update, extras: { aliases: [], categories: [], base: target.metadata.base } },
			{ requestKey: null },
		)
	return { ok: true, record }
}

export async function updateOwnIconUpdate(
	pb: ReturnType<typeof createServerPB>,
	userId: string,
	id: string,
	input: OwnIconUpdateInput,
): Promise<Submission> {
	const current = await loadOwnSubmission(pb, userId, id)
	if (!input.updated || input.updated !== current.updated)
		throw new ClientResponseError({
			status: 409,
			response: { message: "Submission changed. Reload before saving; your edits have not been applied." },
		})
	const saved = current.icon_update
	if (!saved) throw new ClientResponseError({ status: 400, response: { message: "This Submission is not an Update proposal." } })
	if (input.name !== saved.target.name || input.targetSubmission !== saved.target.id)
		throw new ClientResponseError({ status: 400, response: { message: "An Update proposal must keep its target identity." } })
	const live = await loadUpdateTarget(pb, input.name, input.targetSubmission)
	if (
		live.kind !== saved.target.kind ||
		live.revision !== input.revision ||
		(live.revision !== saved.target.revision && !input.refreshTarget)
	)
		throw new ClientResponseError({
			status: 409,
			response: { message: "Target Icon changed. Explicitly review and choose the latest target before saving." },
		})
	let target = saved.target
	if (live.revision !== saved.target.revision) target = live
	const keys = input.retainVariants
	if (keys && (new Set(keys).size !== keys.length || keys.some((key) => !saved.variants.some((change) => change.key === key))))
		throw new ClientResponseError({ status: 400, response: { message: "Retain only existing proposal Variant changes, once each." } })
	const retained = saved.variants.filter((change) => !keys || keys.includes(change.key))
	const prepared = prepareIconUpdate(userId, input, target, retained)
	if (!prepared.ok) throw new ClientResponseError({ status: 400, response: { message: prepared.error } })
	const uploaded = new Set(prepared.data.assets.map((file) => file.name))
	const retainedFiles = prepared.update.variants.flatMap((change) => ("file" in change && !uploaded.has(change.file) ? [change.file] : []))
	if (retainedFiles.some((file) => !current.assets.includes(file)))
		throw new ClientResponseError({ status: 400, response: { message: "A retained proposal file is unavailable. Reload before saving." } })
	const headers: Record<string, string> = { "X-Submission-Updated": input.updated }
	if (target.revision !== saved.target.revision) headers["X-Icon-Update-Revision"] = target.revision
	return pb.collection("submissions").update<Submission>(
		id,
		{
			...prepared.data,
			assets: [...retainedFiles, ...prepared.data.assets],
			icon_update: prepared.update,
			extras: { aliases: [], categories: [], base: target.metadata.base },
		},
		{ requestKey: null, headers },
	)
}
