import { NextResponse } from "next/server"
import { ClientResponseError } from "pocketbase"
import { createIconUpdate, type IconUpdateInput } from "@/lib/icon-update-service"
import { getAllIcons } from "@/lib/icons/service"
import { createServerPB } from "@/lib/pb"
import { readBoundedBytes } from "@/lib/read-bounded-bytes"
import {
	createSubmission,
	MAX_ASSET_BYTES,
	MAX_SUBMISSION_ASSETS,
	type SubmissionInput,
	type SubmissionOutcome,
} from "@/lib/submission-service"
import { SUBMISSION_VARIANTS } from "@/lib/submission-variants"
import { refreshPocketBaseSession } from "@/mcp/auth/pocketbase"

export const runtime = "nodejs"
export const maxDuration = 60

const UNAVAILABLE = "dashboardicons.com could not save the submission. Try again in a minute."
const MAX_BODY_BYTES = 32 * 1024 * 1024

function failure(status: number, error: string) {
	return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } })
}

function text(form: FormData, key: string): string {
	const value = form.get(key)
	if (typeof value === "string") return value
	return ""
}

function texts(form: FormData, key: string): string[] {
	return form.getAll(key).filter((value): value is string => typeof value === "string")
}

function submissionInput(form: FormData): SubmissionInput {
	const assets: SubmissionInput["assets"] = {}
	for (const variant of SUBMISSION_VARIANTS) {
		const file = form.get(variant)
		if (file instanceof File) assets[variant] = file
	}
	for (const [key, value] of form.entries()) {
		const file: unknown = value
		if (key.startsWith("custom:") && file instanceof File) assets[key as `custom:${string}`] = file
	}
	return {
		name: text(form, "name"),
		description: text(form, "description"),
		aliases: texts(form, "aliases"),
		categories: texts(form, "categories"),
		targetSubmission: text(form, "target_submission"),
		assets,
	}
}

async function readForm(req: Request): Promise<FormData | null> {
	const body = await readBoundedBytes(req, MAX_BODY_BYTES)
	if (!body) return null
	return new Response(body, { headers: { "content-type": req.headers.get("content-type") ?? "" } }).formData()
}

export async function POST(req: Request) {
	const token = req.headers.get("authorization")
	if (!token) return failure(401, "You must be logged in to submit an icon")

	const session = await refreshPocketBaseSession(token)
	if (!session.ok && session.reason === "invalid") return failure(401, "Your session expired. Sign in again to submit an icon")
	if (!session.ok) return failure(502, UNAVAILABLE)

	let form: FormData | null
	try {
		form = await readForm(req)
	} catch {
		return failure(400, "The submission could not be read")
	}
	if (!form)
		return failure(
			413,
			`Keep the submission below 32 MB, with at most ${MAX_SUBMISSION_ASSETS} files of ${MAX_ASSET_BYTES / 1024 / 1024} MB each`,
		)

	const pb = createServerPB()
	pb.authStore.save(session.token, null)
	try {
		const kind = text(form, "kind")
		if (kind && kind !== "new" && kind !== "update") return failure(400, "Choose a new Icon or Update proposal")
		let outcome: SubmissionOutcome
		if (kind === "update") {
			let removeVariants: IconUpdateInput["removeVariants"]
			try {
				if (form.has("remove_variants")) removeVariants = JSON.parse(text(form, "remove_variants"))
			} catch {
				return failure(400, "Variant removals could not be read")
			}
			outcome = await createIconUpdate(pb, session.user.id, {
				...submissionInput(form),
				kind,
				revision: text(form, "revision"),
				removeVariants,
			})
		} else {
			const input = submissionInput(form)
			if (input.targetSubmission || Object.hasOwn(await getAllIcons(), input.name))
				return failure(400, "Choose this Icon in Edit to send an Update proposal against its current revision")
			outcome = await createSubmission(pb, session.user.id, input)
		}
		if (!outcome.ok) return failure(400, outcome.error)
		return NextResponse.json({ id: outcome.record.id }, { status: 201, headers: { "Cache-Control": "no-store" } })
	} catch (error) {
		if (error instanceof ClientResponseError && error.status >= 400 && error.status < 500) return failure(error.status, error.message)
		console.error("Submission creation failed", error)
		return failure(502, UNAVAILABLE)
	}
}
