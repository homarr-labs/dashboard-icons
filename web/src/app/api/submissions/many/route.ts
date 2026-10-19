import { NextResponse } from "next/server"
import { ClientResponseError } from "pocketbase"
import { z } from "zod"
import { getAllIcons } from "@/lib/icons/service"
import { createServerPB } from "@/lib/pb"
import { readBoundedBytes } from "@/lib/read-bounded-bytes"
import { MAX_SEND_ASSET_BYTES, MAX_SEND_BODY_BYTES, MAX_SUBMISSIONS_PER_SEND } from "@/lib/submission-limits"
import { MAX_SUBMISSION_ASSETS, type PreparedSubmission, prepareSubmission, type SubmissionInput } from "@/lib/submission-service"
import { SUBMISSION_VARIANTS, type SubmissionVariant } from "@/lib/submission-variants"
import { refreshPocketBaseSession } from "@/mcp/auth/pocketbase"

export const runtime = "nodejs"
export const maxDuration = 60

const manifestSchema = z
	.array(
		z
			.object({
				name: z.string().max(80),
				description: z.string().max(10000),
				aliases: z.array(z.string().max(200)).max(100),
				categories: z.array(z.string().max(80)).max(100),
				variants: z.array(z.string().max(64)).min(1).max(MAX_SUBMISSION_ASSETS),
			})
			.strict(),
	)
	.min(1)
	.max(MAX_SUBMISSIONS_PER_SEND)

function failure(status: number, error: string, errors: Record<string, string> = {}) {
	return NextResponse.json({ error, errors }, { status, headers: { "Cache-Control": "no-store" } })
}

function isVariant(value: string): value is SubmissionVariant {
	return SUBMISSION_VARIANTS.some((variant) => variant === value) || value.startsWith("custom:")
}

function errorMessage(value: unknown): string | null {
	if (typeof value !== "object" || value === null) return null
	if ("data" in value && typeof value.data === "object" && value.data !== null) {
		const messages = Object.values(value.data)
			.map(errorMessage)
			.filter((message): message is string => Boolean(message))
		if (messages.length) return messages.join(" ")
	}
	if ("response" in value) return errorMessage(value.response)
	if ("message" in value && typeof value.message === "string") return value.message
	return null
}

function batchErrors(value: unknown): Record<string, string> {
	if (typeof value !== "object" || value === null || !("data" in value) || typeof value.data !== "object" || value.data === null) return {}
	if (!("requests" in value.data) || typeof value.data.requests !== "object" || value.data.requests === null) return {}
	return Object.fromEntries(
		Object.entries(value.data.requests).map(([index, error]) => [index, errorMessage(error) || "This Icon could not be saved."]),
	)
}

export async function POST(req: Request) {
	const token = req.headers.get("authorization")
	if (!token) return failure(401, "Sign in to send Icons.")
	const session = await refreshPocketBaseSession(token)
	if (!session.ok && session.reason === "invalid")
		return failure(401, "Your session expired. Sign in again; your files are still in the form.")
	if (!session.ok) return failure(502, "Sign-in could not be verified. Try again in a minute.")
	let form: FormData
	let manifest: z.infer<typeof manifestSchema>
	try {
		const body = await readBoundedBytes(req, MAX_SEND_BODY_BYTES)
		if (!body) return failure(413, "Send at most 12 Icons with 60 MB of files in total (64 MB including form data).")
		form = await new Response(body, { headers: { "content-type": req.headers.get("content-type") ?? "" } }).formData()
		const raw = form.get("icons")
		if (typeof raw !== "string" || form.getAll("icons").length !== 1) return failure(400, "Send exactly one Icon list with the form.")
		const parsed = manifestSchema.safeParse(JSON.parse(raw))
		if (!parsed.success) return failure(400, "Send 1–12 Icons, each with at most 99 files and complete metadata.")
		manifest = parsed.data
	} catch {
		return failure(400, "The uploaded form could not be read. Your files have not been saved.")
	}
	const prepared: Extract<PreparedSubmission, { ok: true }>["data"][] = []
	const errors: Record<string, string> = {}
	const consumed = new Set<string>(["icons"])
	let totalBytes = 0
	for (const [index, icon] of manifest.entries()) {
		const assets: SubmissionInput["assets"] = {}
		for (const variant of icon.variants) {
			if (!isVariant(variant)) {
				errors[index] = `Unknown Variant slot: ${variant}`
				continue
			}
			const key = `icons.${index}.${variant}`
			const values = form.getAll(key)
			if (consumed.has(key) || values.length !== 1 || !(values[0] instanceof File)) {
				errors[index] = "Each Variant must have exactly one uploaded file."
				continue
			}
			consumed.add(key)
			assets[variant] = values[0]
			totalBytes += values[0].size
		}
		if (manifest.some((other, otherIndex) => otherIndex !== index && other.name === icon.name))
			errors[index] = "Use one card per Icon slug."
		const result = prepareSubmission(session.user.id, { ...icon, assets, targetSubmission: "" })
		if (!result.ok) errors[index] = result.error
		else prepared.push(result.data)
	}
	for (const key of form.keys())
		if (!consumed.has(key)) return failure(400, "The form includes files or data not assigned to an Icon. Nothing was saved.")
	if (totalBytes > MAX_SEND_ASSET_BYTES) return failure(413, "Keep the total file size at or below 60 MB. Nothing was saved.")
	if (Object.keys(errors).length) return failure(400, "Fix the highlighted Icons. Nothing was saved.", errors)
	const pb = createServerPB()
	pb.authStore.save(session.token, null)
	try {
		const published = await getAllIcons()
		for (const [index, icon] of manifest.entries())
			if (Object.hasOwn(published, icon.name)) errors[index] = "This Icon is already published. Use Edit to propose an update."
		if (Object.keys(errors).length) return failure(400, "Existing Icons must be updated in Edit. Nothing was saved.", errors)
		const batch = pb.createBatch()
		for (const data of prepared) batch.collection("submissions").create(data)
		const results = await batch.send({ requestKey: null })
		const submissions = results.map((result) => {
			const record: unknown = result.body
			if (
				typeof record !== "object" ||
				record === null ||
				!("id" in record) ||
				typeof record.id !== "string" ||
				!("name" in record) ||
				typeof record.name !== "string"
			)
				throw new Error("Incomplete PocketBase batch response")
			return { id: record.id, name: record.name }
		})
		return NextResponse.json({ submissions }, { status: 201, headers: { "Cache-Control": "no-store" } })
	} catch (error: unknown) {
		if (error instanceof ClientResponseError && error.status >= 400 && error.status < 500)
			return failure(error.status, "The send was rolled back. Fix the highlighted Icon and try again.", batchErrors(error.response))
		console.error("Atomic submission send failed", error)
		return failure(502, "The server could not confirm the send. Your files remain here. Check your Submissions before retrying.")
	}
}
