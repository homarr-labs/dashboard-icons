import { NextResponse } from "next/server"
import { ClientResponseError } from "pocketbase"
import type { UpdateTargetResponse, UpdateVariantKey } from "@/lib/icon-update"
import { iconUpdatePreviews } from "@/lib/icon-update-previews"
import { updateOwnIconUpdate } from "@/lib/icon-update-service"
import { createServerPB, type Submission } from "@/lib/pb"
import { readBoundedBytes } from "@/lib/read-bounded-bytes"
import { MAX_SEND_BODY_BYTES } from "@/lib/submission-limits"
import type { SubmissionInput } from "@/lib/submission-service"
import { loadOwnSubmission, updateOwnSubmission } from "@/lib/submission-update-service"
import { SUBMISSION_VARIANTS } from "@/lib/submission-variants"
import { refreshPocketBaseSession } from "@/mcp/auth/pocketbase"

export const runtime = "nodejs"
export const maxDuration = 60

function failure(status: number, error: string) {
	return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } })
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
	const token = req.headers.get("authorization")
	if (!token) return failure(401, "Sign in to edit your Submission.")
	const session = await refreshPocketBaseSession(token)
	if (!session.ok && session.reason === "invalid") return failure(401, "Your session expired. Sign in again.")
	if (!session.ok) return failure(502, "Sign-in could not be verified. Try again in a minute.")
	const pb = createServerPB()
	pb.authStore.save(session.token, null)
	try {
		const { id } = await context.params
		const record = await loadOwnSubmission(pb, session.user.id, id)
		let baseline: UpdateTargetResponse | undefined
		if (record.icon_update) baseline = iconUpdatePreviews(record.icon_update.target)
		return NextResponse.json({ record, baseline }, { headers: { "Cache-Control": "no-store" } })
	} catch (error) {
		if (error instanceof ClientResponseError) return failure(error.status || 502, error.message)
		console.error("Submission could not be loaded", error)
		return failure(502, "The Submission could not be loaded. Try again.")
	}
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
	const token = req.headers.get("authorization")
	if (!token) return failure(401, "Sign in to edit your Submission.")
	const session = await refreshPocketBaseSession(token)
	if (!session.ok && session.reason === "invalid") return failure(401, "Your session expired. Sign in again; your edits are still here.")
	if (!session.ok) return failure(502, "Sign-in could not be verified. Try again in a minute.")
	let form: FormData
	try {
		const body = await readBoundedBytes(req, MAX_SEND_BODY_BYTES)
		if (!body) return failure(413, "Keep the uploaded form below 64 MB. Your edits have not been saved.")
		form = await new Response(body, { headers: { "content-type": req.headers.get("content-type") ?? "" } }).formData()
	} catch {
		return failure(400, "The uploaded form could not be read. Your edits have not been saved.")
	}
	const text = (key: string) => {
		const value = form.get(key)
		if (typeof value === "string") return value
		return ""
	}
	const texts = (key: string) => form.getAll(key).filter((value): value is string => typeof value === "string")
	const updated = text("updated")
	if (!updated) return failure(409, "Reload the Submission before saving with its updated token.")
	const assets: SubmissionInput["assets"] = {}
	for (const [key, entry] of form.entries()) {
		const value: unknown = entry
		if (!(value instanceof File)) continue
		if (form.getAll(key).length !== 1) return failure(400, "Choose exactly one file per Variant.")
		if (SUBMISSION_VARIANTS.some((variant) => variant === key)) assets[key as (typeof SUBMISSION_VARIANTS)[number]] = value
		else if (key.startsWith("custom:")) assets[key as `custom:${string}`] = value
		else return failure(400, "Every file must belong to a recognised Variant slot.")
	}
	const pb = createServerPB()
	pb.authStore.save(session.token, null)
	try {
		const { id } = await context.params
		const input = {
			name: text("name"),
			description: text("description"),
			aliases: texts("aliases"),
			categories: texts("categories"),
			targetSubmission: text("target_submission"),
			assets,
			updated,
		}
		let record: Submission
		if (text("kind") === "update") {
			let retainVariants: UpdateVariantKey[] | undefined
			if (form.has("retain_variants")) {
				let parsed: unknown
				try {
					parsed = JSON.parse(text("retain_variants"))
				} catch {
					return failure(400, "Retained Variant changes must be a JSON list.")
				}
				if (
					!Array.isArray(parsed) ||
					parsed.length > 99 ||
					!parsed.every(
						(key): key is UpdateVariantKey =>
							typeof key === "string" &&
							(SUBMISSION_VARIANTS.some((variant) => variant === key) || /^custom:[a-z0-9]+(-[a-z0-9]+)*$/.test(key)),
					)
				)
					return failure(400, "Retained Variant changes must use recognised Variant keys.")
				retainVariants = parsed
			}
			record = await updateOwnIconUpdate(pb, session.user.id, id, {
				...input,
				kind: "update",
				revision: text("revision"),
				refreshTarget: text("refresh_target") === "true",
				retainVariants,
			})
		} else record = await updateOwnSubmission(pb, session.user.id, id, input)
		return NextResponse.json(record, { headers: { "Cache-Control": "no-store" } })
	} catch (error) {
		if (error instanceof ClientResponseError && error.status >= 400 && error.status < 500) {
			if (error.status === 404) return failure(403, "Only your own pending or rejected Submissions can be edited.")
			return failure(error.status, error.message)
		}
		console.error("Submission update failed", error)
		return failure(502, "The server could not confirm the save. Your edits remain here. Check your Submission before retrying.")
	}
}
